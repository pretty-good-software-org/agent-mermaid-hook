import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import pkg from "../package.json" with { type: "json" };

const CLI = new URL("../src/cli.ts", import.meta.url).pathname;
const GOLDEN_SOURCE = new URL("golden/sequence.mmd", import.meta.url).pathname;
const GOLDEN_OUTPUT = new URL("golden/sequence.txt", import.meta.url).pathname;

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runProcess(
  command: string[],
  stdin?: string,
  env?: Record<string, string>,
): Promise<ProcessResult> {
  const proc = Bun.spawn(command, {
    stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

const reply =
  "Flow:\n\n```mermaid\nflowchart LR\n  A[first long label] --> B[second long label]\n```\n";

describe("cli", () => {
  let binaryDirectory: string;
  let binaryPath: string;

  beforeAll(async () => {
    binaryDirectory = await mkdtemp(path.join(tmpdir(), "claude-mermaid-hook-test-"));
    binaryPath = path.join(binaryDirectory, "claude-mermaid-hook");
    const result = await runProcess([
      process.execPath,
      "build",
      CLI,
      "--compile",
      "--outfile",
      binaryPath,
    ]);
    expect(result.exitCode, `compile CLI: ${result.stderr}`).toBe(0);
  });

  afterAll(async () => {
    if (binaryDirectory) {
      await rm(binaryDirectory, { recursive: true, force: true });
    }
  });

  describe.each(["source", "binary"])("%s", (target) => {
    const runCli = (args: string[], stdin?: string, env?: Record<string, string>) => {
      const entry = target === "source" ? [process.execPath, "run", CLI] : [binaryPath];
      return runProcess([...entry, ...args], stdin, env);
    };

    test("--help lists the hook commands", async () => {
      const result = await runCli(["--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("stop");
      expect(result.stdout).toContain("session-start");
      expect(result.stdout).toContain("render");
    });

    test("stop prints a systemMessage JSON line for a reply with a diagram", async () => {
      const result = await runCli(["stop"], JSON.stringify({ last_assistant_message: reply }));
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      const output = JSON.parse(result.stdout) as { systemMessage: string };
      expect(output.systemMessage).toContain("┌");
    });

    test("stop prints nothing and exits 0 for a reply without diagrams", async () => {
      const result = await runCli(
        ["stop"],
        JSON.stringify({ last_assistant_message: "no diagrams here" }),
      );
      expect(result).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    });

    test("stop prints nothing and exits 0 on malformed stdin", async () => {
      const result = await runCli(["stop"], "{broken");
      expect(result).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    });

    test("stop exits 0 even when a global flag is invalid", async () => {
      const input = JSON.stringify({ last_assistant_message: reply });
      const result = await runCli(["--log-format", "bogus", "stop"], input);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Invalid --log-format");
    });

    test("render still fails loudly on an invalid global flag", async () => {
      const result = await runCli(["--log-format", "bogus", "render"], reply);
      expect(result.exitCode).toBe(2);
    });

    test("a flag value equal to stop does not make render exit 0", async () => {
      const result = await runCli(["render", "--log-format", "stop"], reply);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid --log-format");
    });

    test("stop after a global flag still exits 0 on error", async () => {
      const input = JSON.stringify({ last_assistant_message: reply });
      const result = await runCli(["--debug", "--log-format", "bogus", "stop"], input);
      expect(result.exitCode).toBe(0);
    });

    test("stop honours the width limit from the environment", async () => {
      const result = await runCli(["stop"], JSON.stringify({ last_assistant_message: reply }), {
        CLAUDE_MERMAID_MAX_WIDTH: "20",
      });
      const output = JSON.parse(result.stdout) as { systemMessage: string };
      expect(output.systemMessage).toMatch(/limit is 20$/);
    });

    test("session-start prints one context line that names the width and the supported kinds", async () => {
      const result = await runCli(["session-start"], undefined, { CLAUDE_MERMAID_MAX_WIDTH: "96" });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim().split("\n")).toHaveLength(1);
      expect(result.stdout).toContain("under 96 columns");
      expect(result.stdout).toContain("flowchart, sequence, state, class, er");
    });

    test("render draws a bare diagram file exactly as the golden file", async () => {
      const result = await runCli(["render", "--file", GOLDEN_SOURCE]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toBe(await Bun.file(GOLDEN_OUTPUT).text());
    });

    test("render reads Markdown from stdin and applies --width", async () => {
      const result = await runCli(["render", "--width", "20"], reply);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(
        /^could not render diagram 1\/1 \(flowchart\): \d+ columns wide, limit is 20\n$/,
      );
    });

    test("render rejects an unusable --width", async () => {
      const result = await runCli(["render", "--width", "abc"], reply);
      expect(result).toEqual({
        stdout: "",
        stderr: 'error: Invalid --width: "abc". Expected an integer from 20 to 1000.\n',
        exitCode: 2,
      });
    });

    test("version prints package identity", async () => {
      const result = await runCli(["version"]);
      expect(result).toEqual({ stdout: `${pkg.name} ${pkg.version}\n`, stderr: "", exitCode: 0 });
    });
  });
});
