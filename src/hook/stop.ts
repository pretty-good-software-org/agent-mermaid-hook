import { z } from "zod";

import { type Limits } from "../config.ts";
import { extractMermaidFences } from "../markdown/fences.ts";
import { composePayload } from "../policy/budget.ts";

// Never throws: a Stop hook that exits non-zero can block Claude from ending
// its turn, which a drawing helper must never do.

const stopInputSchema = z.object({
  last_assistant_message: z.string().optional(),
});

// Claude Code prints the message after a "Stop says:" prefix on the same line.
const PREFIX_BREAK = "\n";

export function runStopHook(stdin: string, limits: Limits): string {
  const parsed = stopInputSchema.safeParse(tryJson(stdin));
  if (!parsed.success || parsed.data.last_assistant_message === undefined) return "";
  const sources = extractMermaidFences(parsed.data.last_assistant_message).map(
    (fence) => fence.source,
  );
  const payload = composePayload(sources, limits, PREFIX_BREAK.length);
  if (payload === null) return "";
  return `${JSON.stringify({ systemMessage: PREFIX_BREAK + payload })}\n`;
}

function tryJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
