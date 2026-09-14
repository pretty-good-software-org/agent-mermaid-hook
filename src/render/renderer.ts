import { diagramKind, render } from "grok-mermaid";

// Wraps grok-mermaid so the rest of the hook never sees a null: every outcome
// is named, and the reason a diagram did not draw survives to the notice.

export type Rendered =
  | { status: "art"; kind: string; lines: string[]; width: number }
  | { status: "unsupported"; kind: null }
  | { status: "invalid"; kind: string };

export function renderDiagram(source: string): Rendered {
  const art = render(source);
  if (art !== null) {
    return {
      status: "art",
      kind: diagramKind(source) ?? "diagram",
      lines: art.plain,
      width: art.width,
    };
  }
  const kind = diagramKind(source);
  return kind === null ? { status: "unsupported", kind: null } : { status: "invalid", kind };
}
