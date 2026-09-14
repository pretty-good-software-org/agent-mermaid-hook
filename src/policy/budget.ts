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
// misleads, a notice does not. Notices count against the budget like drawings;
// when even the notice does not fit, the diagram is dropped without a trace.

const SEPARATOR = "\n\n";

function block(position: DiagramPosition, rendered: Rendered, limits: Limits): string {
  if (rendered.status === "unsupported") return unsupportedNotice(position, SUPPORTED_KINDS);
  if (rendered.status === "invalid") return invalidNotice(position, rendered.kind);
  if (rendered.width > limits.maxWidth) {
    return tooWideNotice(position, rendered.kind, rendered.width, limits.maxWidth);
  }
  return rendered.lines.join("\n");
}

function fitted(position: DiagramPosition, rendered: Rendered, limits: Limits, remaining: number) {
  const candidate = block(position, rendered, limits);
  if (candidate.length <= remaining) return candidate;
  const kind = rendered.kind ?? "unknown type";
  const notice = budgetNotice(position, kind, limits.budget);
  return notice.length <= remaining ? notice : undefined;
}

// `reserved` is what the caller wraps around the text; both fit limits.budget.
export function composePayload(
  sources: readonly string[],
  limits: Limits,
  reserved = 0,
): string | null {
  const blocks: string[] = [];
  let used = reserved;
  for (const [offset, source] of sources.entries()) {
    const position = { index: offset + 1, total: sources.length };
    const separator = blocks.length === 0 ? 0 : SEPARATOR.length;
    const text = fitted(position, renderDiagram(source), limits, limits.budget - used - separator);
    if (text === undefined) continue;
    blocks.push(text);
    used += separator + text.length;
  }
  return blocks.length === 0 ? null : blocks.join(SEPARATOR);
}
