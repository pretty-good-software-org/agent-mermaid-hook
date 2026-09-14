import { z } from "zod";

import { type Limits } from "../config.ts";
import { extractMermaidFences } from "../markdown/fences.ts";
import { composePayload } from "../policy/budget.ts";

// The Stop hook boundary. Input is whatever Claude Code sends on stdin; only
// last_assistant_message matters and it may be missing on an older client.
// Output is either nothing (no diagrams) or one JSON object with systemMessage.
// This function never throws upward: a Stop hook that exits non-zero can block
// Claude from finishing its turn, which a drawing helper must never do.

const stopInputSchema = z.object({
  last_assistant_message: z.string().optional(),
});

// Claude Code prints the message after a "Stop says:" prefix on the same line,
// so the message opens with a newline to keep the first diagram row aligned.
const PREFIX_BREAK = "\n";

/**
Returns the exact stdout for one Stop hook run: empty, or one JSON line.
*/
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
