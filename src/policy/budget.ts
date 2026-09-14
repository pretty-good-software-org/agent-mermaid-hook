import { type Limits, SUPPORTED_KINDS } from "../config.ts";
import {
  budgetNotice,
  type DiagramPosition,
  invalidNotice,
  tooWideNotice,
  unsupportedNotice,
} from "../render/notice.ts";
import { renderDiagram, type Rendered } from "../render/renderer.ts";

// Every diagram is tried against what is left of the budget, so a small diagram
// after a skipped huge one still draws. Nothing is truncated: a partial drawing
// misleads, a notice does not.

const SEPARATOR = "\n\n";

function block(
  position: DiagramPosition,
  rendered: Rendered,
  limits: Limits,
  remaining: number,
): string {
  if (rendered.status === "unsupported") return unsupportedNotice(position, SUPPORTED_KINDS);
  if (rendered.status === "invalid") return invalidNotice(position, rendered.kind);
  if (rendered.width > limits.maxWidth) {
    return tooWideNotice(position, rendered.kind, rendered.width, limits.maxWidth);
  }
  const art = rendered.lines.join("\n");
  if (art.length > remaining) return budgetNotice(position, rendered.kind, limits.budget);
  return art;
}

// `reserved` is what the caller wraps around the text; both fit limits.budget.
export function composePayload(
  sources: readonly string[],
  limits: Limits,
  reserved = 0,
): string | null {
  if (sources.length === 0) return null;
  const blocks: string[] = [];
  let used = reserved;
  for (const [offset, source] of sources.entries()) {
    const position = { index: offset + 1, total: sources.length };
    const separator = blocks.length === 0 ? 0 : SEPARATOR.length;
    const remaining = limits.budget - used - separator;
    const text = block(position, renderDiagram(source), limits, remaining);
    blocks.push(text);
    used += separator + text.length;
  }
  return blocks.join(SEPARATOR);
}
