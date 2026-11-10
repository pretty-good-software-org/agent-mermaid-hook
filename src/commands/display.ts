import { defineCommand } from "citty";
import { z } from "zod";

import { limitsFromEnv } from "../config.ts";
import { displayChunk } from "../hook/display.ts";
import { DisplayState } from "../hook/display-state.ts";
import { parseHookInput } from "../hook/input.ts";

const inputSchema = z.object({
  delta: z.string(),
  message_id: z.string(),
  final: z.boolean().optional(),
  scratchpad_dir: z.string().optional(),
});

export const displayCommand = defineCommand({
  meta: {
    name: "display",
    description:
      "Claude Code MessageDisplay hook: replace fenced Mermaid in the streamed reply with its drawing",
  },
  async run() {
    // Whatever fails, print nothing: Claude Code then shows the original chunk.
    try {
      const input = parseHookInput(inputSchema, await Bun.stdin.text());
      if (input === undefined) return;
      const { delta, message_id, final = false, scratchpad_dir } = input;
      const state = new DisplayState(scratchpad_dir, message_id);
      const result = displayChunk({ delta, final }, state.load(), limitsFromEnv());
      state.save(result.carried);
      if (result.display === undefined) return;
      const output = {
        hookSpecificOutput: { hookEventName: "MessageDisplay", displayContent: result.display },
      };
      process.stdout.write(`${JSON.stringify(output)}\n`);
    } catch (error) {
      process.stderr.write(
        `agent-mermaid-hook: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  },
});
