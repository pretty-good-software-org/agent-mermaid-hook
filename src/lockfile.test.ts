import { expect, test } from "bun:test";

// Dependabot parses bun.lock version 1 only, while bun 1.4 writes version 2 on
// a fresh install. When this fails, rebuild the lock from a version 1 lock with
// `bun install` instead of deleting it. bun.lock is JSONC, so match the text.
test("bun.lock stays at lockfileVersion 1 so Dependabot can parse it", async () => {
  const lock = await Bun.file(new URL("../bun.lock", import.meta.url)).text();
  const version = /"lockfileVersion": (\d+)/.exec(lock)?.[1];
  expect(version).toBe("1");
});
