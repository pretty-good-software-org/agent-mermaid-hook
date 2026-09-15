import { z } from "zod";

import { type Limits } from "../config.ts";
import { extractMermaidFences } from "../markdown/fences.ts";
import { composePayload } from "../policy/budget.ts";

// Codex has no hook that rewrites a reply, so the drawings follow it as the Stop
// hook's systemMessage. Codex prints the first line after "↳ Hook · " and every
// later line indented by four columns, so the title takes the first line and the
// drawings are fitted to the width that indent leaves.
const BODY_INDENT = 4;

const inputSchema = z.object({
  last_assistant_message: z.string().nullable().optional(),
});

function tryJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function title(count: number): string {
  return count === 1 ? "Mermaid diagram" : `Mermaid diagrams (${String(count)})`;
}

// Returns the hook's stdout: one JSON line, or "" when there is nothing to draw.
// Never emits `decision` or `continue`, so it can never block or stop the turn.
export function codexStopOutput(stdin: string, limits: Limits): string {
  const parsed = inputSchema.safeParse(tryJson(stdin));
  const message = parsed.success ? parsed.data.last_assistant_message : undefined;
  if (message === undefined || message === null) return "";
  const sources = extractMermaidFences(message).map((fence) => fence.source);
  if (sources.length === 0) return "";
  const heading = title(sources.length);
  const bodyLimits = { ...limits, maxWidth: limits.maxWidth - BODY_INDENT };
  const drawings = composePayload(sources, bodyLimits, heading.length + 1);
  if (drawings === null) return "";
  const systemMessage = `${heading}\n${drawings}`;
  return `${JSON.stringify({ systemMessage })}\n`;
}
