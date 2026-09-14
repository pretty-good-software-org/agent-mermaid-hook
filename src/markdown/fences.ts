// CommonMark rules that matter: a fence is 3+ backticks or tildes, may be indented
// up to 3 spaces, closes on a fence of the same character at least as long, and
// runs to end of input if never closed. A fence inside another fence is content.

export interface MermaidFence {
  source: string;
}

interface OpenFence {
  indent: number;
  marker: string;
  info: string;
}

const OPEN_FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*([^`\s]*)/;
const CLOSE_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

function parseOpenFence(line: string): OpenFence | undefined {
  const match = OPEN_FENCE.exec(line);
  if (match === null) return undefined;
  const [, indent = "", marker = "", info = ""] = match;
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

export function extractMermaidFences(markdown: string): MermaidFence[] {
  const fences: MermaidFence[] = [];
  let open: OpenFence | undefined;
  let body: string[] = [];

  const close = (): void => {
    if (open?.info === "mermaid") fences.push({ source: stripIndent(body, open.indent) });
    open = undefined;
    body = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    if (open === undefined) {
      open = parseOpenFence(line);
    } else if (isClosingFence(line, open)) {
      close();
    } else {
      body.push(line);
    }
  }
  // An unclosed fence runs to the end of the reply.
  close();
  return fences;
}
