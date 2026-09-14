// The reader sees these, the model never does, so they name the fix for a human.

export interface DiagramPosition {
  index: number;
  total: number;
}

function header({ index, total }: DiagramPosition, kind = "unknown type"): string {
  return `could not render diagram ${String(index)}/${String(total)} (${kind})`;
}

export function tooWideNotice(
  position: DiagramPosition,
  kind: string,
  width: number,
  limit: number,
): string {
  return `${header(position, kind)}: ${String(width)} columns wide, limit is ${String(limit)}`;
}

export function budgetNotice(position: DiagramPosition, kind: string, budget: number): string {
  const perReply = budget.toLocaleString("en-US");
  return `${header(position, kind)}: output budget exhausted (${perReply} chars per reply)`;
}

export function unsupportedNotice(position: DiagramPosition, supported: readonly string[]): string {
  return `${header(position)}: supported types are ${supported.join(", ")}`;
}

export function invalidNotice(position: DiagramPosition, kind: string): string {
  return `${header(position, kind)}: syntax error`;
}
