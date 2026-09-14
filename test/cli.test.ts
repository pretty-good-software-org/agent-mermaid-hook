import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import pkg from "../package.json" with { type: "json" };

const CLI = new URL("../src/cli.ts", import.meta.url).pathname;

async function runProcess(
  command: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const options = { stdout: "pipe", stderr: "pipe" } as const;
  const proc = Bun.spawn(command, options);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe("cli", () => {
  let binaryDirectory: string;
  let binaryPath: string;

  beforeAll(async () => {
    binaryDirectory = await mkdtemp(path.join(tmpdir(), "ts-cli-test-"));
    binaryPath = path.join(binaryDirectory, "hello-cli");
    const command = [process.execPath, "build", CLI, "--compile", "--outfile", binaryPath];
    const result = await runProcess(command);
    expect(result.exitCode, `compile CLI: ${result.stderr}`).toBe(0);
  });

  afterAll(async () => {
    if (binaryDirectory) {
      await rm(binaryDirectory, { recursive: true, force: true });
    }
  });

  describe.each(["source", "binary"])("%s", (target) => {
    const runCli = (args: string[]) => {
      const entry = target === "source" ? [process.execPath, "run", CLI] : [binaryPath];
      const command = [...entry, ...args];
      return runProcess(command);
    };

    test.each(["--help", "-h"])("%s prints root usage", async (flag) => {
      const result = await runCli([flag]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("USAGE");
      expect(result.stdout).toContain("greet");
      expect(result.stdout).toContain("version");
    });

    test("greet --help prints command usage without requiring a name", async () => {
      const result = await runCli(["greet", "--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("--name");
      expect(result.stdout).toContain("--json");
    });

    test.each(["pretty", "json"])("%s diagnostics stay on stderr", async (format) => {
      const result = await runCli([
        "--debug",
        "--log-format",
        format,
        "greet",
        "--name",
        "Alice",
        "--json",
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('{"message":"Hello, Alice!"}\n');
      if (format === "json") {
        expect(JSON.parse(result.stderr)).toMatchObject({ level: 20, msg: "CLI started" });
      } else {
        expect(result.stderr).toContain("DEBUG");
        expect(result.stderr).toContain("CLI started");
      }
    });
    test("greet prints the named greeting", async () => {
      const result = await runCli(["greet", "--name", "Alice"]);
      expect(result).toEqual({ stdout: "Hello, Alice!\n", stderr: "", exitCode: 0 });
    });

    test("greet --json emits only the message field", async () => {
      const result = await runCli(["greet", "--name", "Alice", "--json"]);
      expect(result).toEqual({
        stdout: '{"message":"Hello, Alice!"}\n',
        stderr: "",
        exitCode: 0,
      });
    });

    test("greet preserves an explicitly empty name", async () => {
      const result = await runCli(["greet", "--name", ""]);
      expect(result).toEqual({ stdout: "Hello, !\n", stderr: "", exitCode: 0 });
    });

    test("greet --json escapes user input", async () => {
      const result = await runCli(["greet", "--name", 'Alice\n"Bob"', "--json"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual({ message: 'Hello, Alice\n"Bob"!' });
    });

    test("greet requires a name", async () => {
      const result = await runCli(["greet"]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Missing required argument: --name");
    });

    test("removed hello command fails", async () => {
      const result = await runCli(["hello"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe("");
    });

    test("invalid --log-format preserves its error and exit status", async () => {
      const result = await runCli(["greet", "--name", "Alice", "--log-format", "bogus"]);
      expect(result).toEqual({
        stdout: "",
        stderr: 'error: Invalid --log-format: "bogus". Supported: pretty, json.\n',
        exitCode: 2,
      });
    });

    test("version prints package identity", async () => {
      const result = await runCli(["version"]);
      expect(result).toEqual({
        stdout: `${pkg.name} ${pkg.version}\n`,
        stderr: "",
        exitCode: 0,
      });
    });

    test("version --json emits package identity", async () => {
      const result = await runCli(["version", "--json"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual({ name: pkg.name, version: pkg.version });
    });
  });
});
