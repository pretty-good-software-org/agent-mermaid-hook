import { fileURLToPath } from "node:url";

import { expect, test } from "bun:test";

test("the test task delegates to Bun and propagates its failure status", () => {
  const task = fileURLToPath(new URL("../mise-tasks/test/default", import.meta.url));
  const failingBun = String.raw`
    bun() { printf '%s\n' "$@"; return 23; }
    export -f bun
    bash "$1"
  `;
  const command = ["bash", "-c", failingBun, "test-task", task];
  const result = Bun.spawnSync(command);

  expect(result.stdout.toString()).toBe("test\n");
  expect(result.stderr.toString()).toBe("");
  expect(result.exitCode).toBe(23);
});
