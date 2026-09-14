/* eslint-disable security/detect-non-literal-fs-filename -- the path is the session scratch dir plus a URL-encoded message id */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { type CarriedFence } from "../markdown/fences.ts";

// Each MessageDisplay chunk is a fresh process, so an open fence survives between
// chunks as a small file keyed by message id, in the session's scratch directory.

const DIRECTORY = "claude-mermaid-hook";

export class DisplayState {
  private readonly file: string;

  constructor(scratchpadDir: string | undefined, messageId: string) {
    const root = scratchpadDir ?? path.join(tmpdir(), DIRECTORY);
    this.file = path.join(root, DIRECTORY, `${encodeURIComponent(messageId)}.json`);
  }

  load(): CarriedFence | undefined {
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as CarriedFence;
    } catch {
      return undefined;
    }
  }

  save(carried: CarriedFence | undefined): void {
    if (carried === undefined) {
      rmSync(this.file, { force: true });
      return;
    }
    mkdirSync(path.dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(carried));
  }
}
