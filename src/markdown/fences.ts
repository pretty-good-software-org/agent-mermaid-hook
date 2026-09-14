// CommonMark rules that matter: a fence is 3+ backticks or tildes, may be indented
// up to 3 spaces, closes on a fence of the same character at least as long, and
// runs to end of input if never closed. A backtick fence's info string may not
// contain a backtick. A fence inside another fence is content.
//
// Text arrives in chunks of completed lines, so a fence can open in one chunk and
// close in a later one; `carried` is the open fence handed from chunk to chunk.

export interface OpenFence {
  indent: number;
  marker: string;
  info: string;
}

export interface CarriedFence {
  open: OpenFence;
  /**
  Lines held back so far; only a mermaid fence holds its lines.
  */
  body: string[];
}

export type Segment = { kind: "text"; lines: string[] } | { kind: "mermaid"; source: string };

export interface ScanResult {
  segments: Segment[];
  carried?: CarriedFence | undefined;
  endsWithNewline: boolean;
}

export interface MermaidFence {
  source: string;
}

const OPEN_FENCE = /^( {0,3})(`{3,}|~{3,})/;
const CLOSE_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

function parseOpenFence(line: string): OpenFence | undefined {
  const match = OPEN_FENCE.exec(line);
  if (match === null) return undefined;
  const [, indent = "", marker = ""] = match;
  const infoString = line.slice(indent.length + marker.length).trim();
  if (marker.startsWith("`") && infoString.includes("`")) return undefined;
  const [info = ""] = infoString.split(/[ \t]/, 1);
  return { indent: indent.length, marker, info: info.toLowerCase() };
}

function isClosingFence(line: string, open: OpenFence): boolean {
  const match = CLOSE_FENCE.exec(line);
  if (match === null) return false;
  const [, marker = ""] = match;
  return marker.startsWith(open.marker.slice(0, 1)) && marker.length >= open.marker.length;
}

function leadingSpaces(line: string): number {
  let count = 0;
  while (count < line.length && line.charAt(count) === " ") count += 1;
  return count;
}

function stripIndent(lines: string[], indent: number): string {
  if (indent === 0) return lines.join("\n");
  return lines.map((line) => line.slice(Math.min(indent, leadingSpaces(line)))).join("\n");
}

function isHeld(open: OpenFence): boolean {
  return open.info === "mermaid";
}

// Scanner state: the segments emitted so far, the text lines not yet flushed
// into a segment, and the fence currently open with its held body.
class Scan {
  private text: string[] = [];
  readonly segments: Segment[] = [];
  open: OpenFence | undefined;
  body: string[];

  constructor(carried: CarriedFence | undefined) {
    this.open = carried?.open;
    this.body = carried?.body ?? [];
  }

  private startFence(line: string): void {
    this.open = parseOpenFence(line);
    if (this.open !== undefined && isHeld(this.open)) {
      this.flushText();
      this.body = [];
    } else {
      this.text.push(line);
    }
  }

  private closeFence(line: string, open: OpenFence): void {
    if (isHeld(open)) {
      this.segments.push({ kind: "mermaid", source: stripIndent(this.body, open.indent) });
    } else {
      this.text.push(line);
    }
    this.open = undefined;
    this.body = [];
  }

  take(line: string): void {
    if (this.open === undefined) {
      this.startFence(line);
    } else if (isClosingFence(line, this.open)) {
      this.closeFence(line, this.open);
    } else if (isHeld(this.open)) {
      this.body.push(line);
    } else {
      this.text.push(line);
    }
  }

  flushText(): void {
    if (this.text.length > 0) this.segments.push({ kind: "text", lines: this.text });
    this.text = [];
  }

  carried(): CarriedFence | undefined {
    return this.open === undefined ? undefined : { open: this.open, body: this.body };
  }
}

/**
Scans one chunk of completed lines. Prose and non-mermaid fences pass through as
text segments; a closed mermaid fence becomes a mermaid segment; a mermaid fence
still open at the end of the chunk is returned as `carried` with its lines held.
*/
export function scanFenceChunk(chunk: string, carried?: CarriedFence): ScanResult {
  const isEndsWithNewline = chunk.endsWith("\n");
  const lines = chunk.split(/\r?\n/);
  if (isEndsWithNewline) lines.pop();

  const scan = new Scan(carried);
  for (const line of lines) scan.take(line);
  scan.flushText();
  return { segments: scan.segments, carried: scan.carried(), endsWithNewline: isEndsWithNewline };
}

/**
The lines a held fence would have shown, for flushing when a message ends mid-fence.
*/
export function heldLines(carried: CarriedFence): string[] {
  const indent = " ".repeat(carried.open.indent);
  return [`${indent}${carried.open.marker}${carried.open.info}`, ...carried.body];
}

/**
All mermaid fences of a complete text; an unclosed fence runs to the end.
*/
export function extractMermaidFences(markdown: string): MermaidFence[] {
  const { segments, carried } = scanFenceChunk(markdown);
  const fences = segments.flatMap((segment) =>
    segment.kind === "mermaid" ? [{ source: segment.source }] : [],
  );
  if (carried !== undefined && isHeld(carried.open)) {
    fences.push({ source: stripIndent(carried.body, carried.open.indent) });
  }
  return fences;
}
