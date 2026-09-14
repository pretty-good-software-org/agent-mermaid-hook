import { defineCommand } from "citty";

import { NAME, VERSION } from "../version.ts";

export const versionCommand = defineCommand({
  meta: {
    name: "version",
    description: "Print the CLI version",
  },
  args: {
    json: {
      type: "boolean",
      description: "Emit JSON instead of plain text",
      default: false,
    },
  },
  run({ args }) {
    if (args.json) {
      process.stdout.write(`${JSON.stringify({ name: NAME, version: VERSION })}\n`);
      return;
    }
    process.stdout.write(`${NAME} ${VERSION}\n`);
  },
});
