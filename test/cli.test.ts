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

function chunk(delta: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ delta, message_id: "m1", final: false, ...extra });
}

function displayed(stdout: string): string | undefined {
  if (stdout === "") return undefined;
  const output = JSON.parse(stdout) as {
    hookSpecificOutput: { hookEventName: string; displayContent: string };
  };
  expect(output.hookSpecificOutput.hookEventName).toBe("MessageDisplay");
  return output.hookSpecificOutput.displayContent;
}

describe("cli", () => {
  let binaryDirectory: string;
  let binaryPath: string;
  let scratch: string;

  beforeAll(async () => {
    binaryDirectory = await mkdtemp(path.join(tmpdir(), "claude-mermaid-hook-test-"));
    binaryPath = path.join(binaryDirectory, "claude-mermaid-hook");
    scratch = path.join(binaryDirectory, "scratch");
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
      expect(result.stdout).toContain("display");
      expect(result.stdout).toContain("session-start");
      expect(result.stdout).toContain("render");
      expect(result.stdout).not.toContain("stop");
    });

    test("display replaces a fenced diagram inside a chunk with its drawing", async () => {
      const result = await runCli(["display"], chunk(reply, { scratchpad_dir: scratch }));
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      const shown = displayed(result.stdout);
      expect(shown).toContain("Flow:\n\n");
      expect(shown).toContain("┌");
      expect(shown).not.toContain("```");
    });

    test("display leaves a chunk without diagrams to Claude Code", async () => {
      const result = await runCli(["display"], chunk("plain prose\n", { scratchpad_dir: scratch }));
      expect(result).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    });

    test("display holds an open fence across chunks and draws when it closes", async () => {
      const id = { message_id: `split-${target}`, scratchpad_dir: scratch };
      const first = await runCli(["display"], chunk("Intro\n```mermaid\nflowchart LR\n", id));
      expect(displayed(first.stdout)).toBe("Intro\n");
      const second = await runCli(["display"], chunk("  A --> B\n", id));
      expect(displayed(second.stdout)).toBe("");
      const third = await runCli(["display"], chunk("```\nOutro\n", id));
      const shown = displayed(third.stdout) ?? "";
      expect(shown.split("\n", 1)[0]).toContain("┌");
      expect(shown.endsWith("Outro\n")).toBe(true);
      const after = await runCli(["display"], chunk("later prose\n", id));
      expect(after.stdout, "state must be cleared once the fence closed").toBe("");
    });

    test("display flushes held source when the message ends inside a fence", async () => {
      const id = { message_id: `unclosed-${target}`, scratchpad_dir: scratch };
      await runCli(["display"], chunk("```mermaid\nflowchart LR\n", id));
      const last = await runCli(["display"], chunk("  A --> B\n", { ...id, final: true }));
      expect(displayed(last.stdout)).toBe("```mermaid\nflowchart LR\n  A --> B\n");
    });

    test("display prints nothing and exits 0 on malformed stdin", async () => {
      const result = await runCli(["display"], "{broken");
      expect(result).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    });

    test("display exits 0 even when a global flag is invalid", async () => {
      const result = await runCli(["--log-format", "bogus", "display"], chunk(reply));
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Invalid --log-format");
    });

    test("render still fails loudly on an invalid global flag", async () => {
      const result = await runCli(["--log-format", "bogus", "render"], reply);
      expect(result.exitCode).toBe(2);
    });

    test("a flag value equal to display does not make render exit 0", async () => {
      const result = await runCli(["render", "--log-format", "display"], reply);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid --log-format");
    });

    test("display honours the width limit from the environment", async () => {
      const result = await runCli(["display"], chunk(reply, { scratchpad_dir: scratch }), {
        CLAUDE_MERMAID_MAX_WIDTH: "20",
      });
      expect(displayed(result.stdout)).toMatch(/limit is 20\n$/);
    });

    test("session-start prints one context line that names the width and the supported kinds", async () => {
      const result = await runCli(["session-start"], undefined, { CLAUDE_MERMAID_MAX_WIDTH: "96" });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim().split("\n")).toHaveLength(1);
      expect(result.stdout).toContain("in place of the source");
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
