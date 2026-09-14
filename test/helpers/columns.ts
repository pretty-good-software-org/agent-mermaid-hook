// Counts code points, which is how grok-mermaid measures width; box-drawing
// characters are one code point each, so this matches what the terminal shows.
export function columns(line: string): number {
  return (line.match(/./gu) ?? []).length;
}
