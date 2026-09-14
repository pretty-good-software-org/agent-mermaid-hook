import { fileURLToPath } from "node:url";

import { expect, test } from "bun:test";
import ts from "typescript";

test("the local tsc command runs the native TypeScript 7 compiler", () => {
  const compiler = fileURLToPath(new URL("../node_modules/.bin/tsc", import.meta.url));
  const command = [compiler, "--version"];
  const result = Bun.spawnSync(command);
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  expect(result.stdout.toString().trim()).toBe("Version 7.0.2");
});

test("the typescript import exposes the TypeScript 6 compiler API", () => {
  expect(ts.version).toBe("6.0.3");
  expect(typeof ts.createProgram).toBe("function");
});
