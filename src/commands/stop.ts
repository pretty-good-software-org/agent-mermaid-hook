import { defineCommand } from "citty";

import { limitsFromEnv } from "../config.ts";
import { runStopHook } from "../hook/stop.ts";

export const stopCommand = defineCommand({
  meta: {
    name: "stop",
    description:
      "Claude Code Stop hook: read the hook JSON on stdin, print rendered diagrams as systemMessage",
  },
  async run() {
    // Any failure here must still exit 0: a failing Stop hook can keep Claude
    // from ending its turn. The reason goes to stderr for the debug log.
    try {
      const stdin = await Bun.stdin.text();
      process.stdout.write(runStopHook(stdin, limitsFromEnv()));
    } catch (error) {
      process.stderr.write(
        `claude-mermaid-hook: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  },
});
