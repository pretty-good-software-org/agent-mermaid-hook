import { expect, test } from "bun:test";

import pkg from "../package.json" with { type: "json" };

const RELEASE_NOTES = /^v(\d+)\.(\d+)\.(\d+)\.md$/;

// The CLI reports package.json's version, and v0.3.0 shipped reporting 0.2.0
// because the release batch did not bump it. The newest release notes file is
// the release being cut, so the two versions must match.
async function newestChangelogVersion(): Promise<string> {
  const changesDir = new URL("../.changes", import.meta.url).pathname;
  const files = await Array.fromAsync(new Bun.Glob("v*.md").scan({ cwd: changesDir }));
  const versions = files
    .map((file) => RELEASE_NOTES.exec(file))
    .filter((match) => match !== null)
    .map((match) => [Number(match[1]), Number(match[2]), Number(match[3])] as const)
    .toSorted((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const newest = versions.at(-1);
  if (newest === undefined) throw new Error("no .changes/vX.Y.Z.md release notes found");
  return newest.join(".");
}

test("package.json version matches the newest release notes version", async () => {
  expect(pkg.version).toBe(await newestChangelogVersion());
});
