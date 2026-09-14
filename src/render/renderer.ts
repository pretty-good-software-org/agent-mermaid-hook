import { diagramKind, render } from "grok-mermaid";

// Every outcome is named so the reason a diagram did not draw reaches the notice.

export type Rendered =
  | { status: "art"; kind: string; lines: string[]; width: number }
  | { status: "unsupported"; kind: null }
  | { status: "invalid"; kind: string };

export function renderDiagram(source: string): Rendered {
  // grok-mermaid only draws kinds it can name.
  const kind = diagramKind(source);
  if (kind === null) return { status: "unsupported", kind: null };
  const art = render(source);
  if (art === null) return { status: "invalid", kind };
  return { status: "art", kind, lines: art.plain, width: art.width };
}
