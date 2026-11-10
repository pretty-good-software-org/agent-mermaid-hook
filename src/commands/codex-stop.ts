import { defineCommand } from "citty";

import { limitsFromEnv } from "../config.ts";
import { codexStopOutput } from "../hook/codex-stop.ts";
import { reportHookError } from "./hook-error.ts";

export const codexStopCommand = defineCommand({
  meta: {
    name: "codex-stop",
    description: "Codex Stop hook: show the reply's fenced Mermaid drawings under it",
  },
  async run() {
    // Whatever fails, print nothing and exit 0: Codex then ends the turn as usual.
    try {
      process.stdout.write(codexStopOutput(await Bun.stdin.text(), limitsFromEnv()));
    } catch (error) {
      reportHookError(error);
    }
  },
});
