import { ADVISED_MAX_ROWS, type Limits, SUPPORTED_KINDS } from "../config.ts";

// SessionStart stdout becomes context the model reads. One sentence is enough
// to steer it toward diagrams the Stop hook can actually draw.

export function sessionStartContext(limits: Limits): string {
  const kinds = SUPPORTED_KINDS.join(", ");
  const width = String(limits.maxWidth);
  const rows = String(ADVISED_MAX_ROWS);
  return (
    "Fenced ```mermaid blocks in your replies are drawn as Unicode box art in this terminal after each reply. " +
    `Supported: ${kinds}. Keep each diagram under ${width} columns wide and about ${rows} rows tall: ` +
    "short labels, few nodes. Wider or unsupported diagrams are replaced by a notice.\n"
  );
}
