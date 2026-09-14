import { defineCommand } from "citty";

import { limitsFromEnv } from "../config.ts";
import { sessionStartContext } from "../hook/session-start.ts";

export const sessionStartCommand = defineCommand({
  meta: {
    name: "session-start",
    description:
      "Claude Code SessionStart hook: print one context line about terminal Mermaid rendering",
  },
  run() {
    process.stdout.write(sessionStartContext(limitsFromEnv()));
  },
});
