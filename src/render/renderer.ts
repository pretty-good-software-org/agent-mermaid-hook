import { diagramKind, render } from "grok-mermaid";

// Wraps grok-mermaid so the rest of the hook never sees a null: every outcome
// is named, and the reason a diagram did not draw survives to the notice.

export type Rendered =
  | { status: "art"; kind: string; lines: string[]; width: number }
  | { status: "unsupported"; kind: null }
  | { status: "invalid"; kind: string };

export function renderDiagram(source: string): Rendered {
  // grok-mermaid only draws the kinds it can name, so an unnamed header is
  // unsupported before any drawing is attempted.
  const kind = diagramKind(source);
  if (kind === null) return { status: "unsupported", kind: null };
  const art = render(source);
  if (art === null) return { status: "invalid", kind };
  return { status: "art", kind, lines: art.plain, width: art.width };
}
