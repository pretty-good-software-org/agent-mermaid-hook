import { type Limits } from "../config.ts";
import { type CarriedFence, heldLines, scanFenceChunk } from "../markdown/fences.ts";
import { composePayload } from "../policy/budget.ts";

// MessageDisplay shows each chunk of completed lines as it streams. A chunk with
// no mermaid in it and nothing carried is left to Claude Code (undefined display),
// so ordinary text is never re-rendered by this hook.

export interface DisplayChunk {
  delta: string;
  final: boolean;
}

export interface DisplayResult {
  /**
  Text to show in place of the chunk; undefined leaves the chunk as it is.
  */
  display?: string;
  /**
  Open mermaid fence to hand to the next chunk of the same message.
  */
  carried?: CarriedFence | undefined;
}

export function displayChunk(
  chunk: DisplayChunk,
  carried: CarriedFence | undefined,
  limits: Limits,
): DisplayResult {
  const scanned = scanFenceChunk(chunk.delta, carried);
  const hasMermaid = scanned.segments.some((segment) => segment.kind === "mermaid");
  const isUntouched = carried === undefined && scanned.carried === undefined && !hasMermaid;
  if (isUntouched) return {};

  const lines = scanned.segments.flatMap((segment) => {
    if (segment.kind === "text") return segment.lines;
    const drawing = composePayload([segment.source], limits);
    return drawing === null ? [] : drawing.split("\n");
  });
  // A message that ends inside a fence shows the held source rather than losing it.
  if (chunk.final && scanned.carried !== undefined) lines.push(...heldLines(scanned.carried));

  const trailing = scanned.endsWithNewline ? "\n" : "";
  const display = lines.length === 0 ? "" : lines.join("\n") + trailing;
  return { display, carried: chunk.final ? undefined : scanned.carried };
}
