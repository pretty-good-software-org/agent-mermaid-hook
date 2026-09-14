import { type Limits } from "../config.ts";
import { type CarriedFence, heldLines, scanFenceChunk } from "../markdown/fences.ts";
import { composePayload } from "../policy/budget.ts";

// MessageDisplay shows each chunk of completed lines as it streams. A chunk with
// no mermaid in it and nothing carried is left to Claude Code (undefined display),
// so ordinary text is never re-rendered by this hook. One output budget covers
// the whole chunk: prose counts, and each drawing gets what the earlier lines left.

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

function isMermaid(carried: CarriedFence | undefined): carried is CarriedFence {
  return carried?.open.info === "mermaid";
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

  const lines: string[] = [];
  let used = 0;
  const push = (more: string[]): void => {
    lines.push(...more);
    used += more.reduce((total, line) => total + line.length + 1, 0);
  };
  for (const segment of scanned.segments) {
    if (segment.kind === "text") {
      push(segment.lines);
    } else {
      const drawing = composePayload([segment.source], limits, used);
      if (drawing !== null) push(drawing.split("\n"));
    }
  }
  // A message that ends inside a mermaid fence shows the held source rather than
  // losing it; a non-mermaid fence was never held, so there is nothing to flush.
  if (chunk.final && isMermaid(scanned.carried)) push(heldLines(scanned.carried));

  const trailing = scanned.endsWithNewline ? "\n" : "";
  const display = lines.length === 0 ? "" : lines.join("\n") + trailing;
  return { display, carried: chunk.final ? undefined : scanned.carried };
}
