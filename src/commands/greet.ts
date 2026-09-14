import { defineCommand } from "citty";

import { greet } from "../greeting.ts";

export const greetCommand = defineCommand({
  meta: {
    name: "greet",
    description: "Greet a specific person",
  },
  args: {
    name: {
      type: "string",
      description: "Name to greet",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Emit JSON instead of plain text",
      default: false,
    },
  },
  run({ args }) {
    const message = greet(args.name);
    if (args.json) {
      const output = { message };
      process.stdout.write(`${JSON.stringify(output)}\n`);
      return;
    }
    process.stdout.write(`${message}\n`);
  },
});
