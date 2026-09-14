import { describe, expect, test } from "bun:test";

import { extractMermaidFences, heldLines, scanFenceChunk } from "./fences.ts";

function sources(markdown: string): string[] {
  return extractMermaidFences(markdown).map((fence) => fence.source);
}

describe("extractMermaidFences", () => {
  test("returns nothing for a reply without fences", () => {
    expect(sources("Just prose.\n\nMore prose.")).toEqual([]);
  });

  test("returns nothing for an empty reply", () => {
    expect(sources("")).toEqual([]);
  });

  test("extracts a backtick fence's source", () => {
    expect(sources("Intro\n\n```mermaid\ngraph LR\n  A --> B\n```\n\nOutro")).toEqual([
      "graph LR\n  A --> B",
    ]);
  });

  test("extracts a tilde fence", () => {
    expect(sources("~~~mermaid\ngraph TD\n  A --> B\n~~~")).toEqual(["graph TD\n  A --> B"]);
  });

  test("ignores fences of other languages and unlabeled fences", () => {
    const markdown =
      "```ts\nconst x = 1\n```\n```\nplain\n```\n```mermaid\ngraph LR\n  A --> B\n```";
    expect(sources(markdown)).toEqual(["graph LR\n  A --> B"]);
  });

  test("matches the info string case-insensitively and with trailing attributes", () => {
    expect(sources("```Mermaid {title=x}\ngraph LR\n  A --> B\n```")).toHaveLength(1);
  });

  test("keeps every diagram in document order", () => {
    const markdown =
      "```mermaid\ngraph LR\n  A --> B\n```\ntext\n```mermaid\nsequenceDiagram\n  A->>B: hi\n```";
    expect(sources(markdown)).toEqual(["graph LR\n  A --> B", "sequenceDiagram\n  A->>B: hi"]);
  });

  test("strips the fence's own indentation inside a list item", () => {
    expect(sources("- step\n\n  ```mermaid\n  graph LR\n    A --> B\n  ```")).toEqual([
      "graph LR\n  A --> B",
    ]);
  });

  test("runs an unclosed fence to the end of the reply", () => {
    expect(sources("```mermaid\ngraph LR\n  A --> B")).toEqual(["graph LR\n  A --> B"]);
  });

  test("does not close on a shorter fence and does close on a longer one", () => {
    expect(sources("````mermaid\ngraph LR\n```\n  A --> B\n`````\nafter")).toEqual([
      "graph LR\n```\n  A --> B",
    ]);
  });

  test("treats a mermaid fence nested inside another fence as content", () => {
    expect(sources("````markdown\n```mermaid\ngraph LR\n  A --> B\n```\n````")).toEqual([]);
  });

  test("accepts CRLF line endings", () => {
    expect(sources("```mermaid\r\ngraph LR\r\n  A --> B\r\n```\r\n")).toEqual([
      "graph LR\n  A --> B",
    ]);
  });

  test("rejects a backtick fence whose info string contains a backtick", () => {
    expect(sources("```mermaid `x\ngraph LR\n  A --> B\n```")).toEqual([]);
  });

  test("accepts a tilde fence whose info string contains a backtick", () => {
    expect(sources("~~~mermaid `x\ngraph LR\n  A --> B\n~~~")).toEqual(["graph LR\n  A --> B"]);
  });
});

describe("scanFenceChunk", () => {
  const open = { indent: 0, marker: "```", info: "mermaid" };

  test("reports whether the chunk ended with a newline", () => {
    expect(scanFenceChunk("a\n").endsWithNewline).toBe(true);
    expect(scanFenceChunk("a").endsWithNewline).toBe(false);
  });

  test("splits prose, a closed mermaid fence and trailing prose into segments", () => {
    const { segments, carried } = scanFenceChunk("x\n```mermaid\ngraph LR\n  A --> B\n```\ny\n");
    expect(carried).toBeUndefined();
    expect(segments).toEqual([
      { kind: "text", lines: ["x"] },
      { kind: "mermaid", source: "graph LR\n  A --> B" },
      { kind: "text", lines: ["y"] },
    ]);
  });

  test("carries a mermaid fence that is still open, holding its lines", () => {
    const { segments, carried } = scanFenceChunk("x\n```mermaid\ngraph LR\n");
    expect(segments).toEqual([{ kind: "text", lines: ["x"] }]);
    expect(carried).toEqual({ open, body: ["graph LR"] });
  });

  test("continues a carried fence and closes it in a later chunk", () => {
    const middle = scanFenceChunk("  A --> B\n", { open, body: ["graph LR"] });
    expect(middle.segments).toEqual([]);
    expect(middle.carried).toEqual({ open, body: ["graph LR", "  A --> B"] });
    const end = scanFenceChunk("```\nafter\n", middle.carried);
    expect(end.carried).toBeUndefined();
    expect(end.segments).toEqual([
      { kind: "mermaid", source: "graph LR\n  A --> B" },
      { kind: "text", lines: ["after"] },
    ]);
  });

  test("carries a non-mermaid fence without holding its lines, so nested mermaid stays content", () => {
    const first = scanFenceChunk("````markdown\n```mermaid\n");
    expect(first.segments).toEqual([{ kind: "text", lines: ["````markdown", "```mermaid"] }]);
    expect(first.carried?.open.info).toBe("markdown");
    const second = scanFenceChunk("graph LR\n```\n````\n", first.carried);
    expect(second.carried).toBeUndefined();
    expect(second.segments).toEqual([{ kind: "text", lines: ["graph LR", "```", "````"] }]);
  });

  test("heldLines reconstructs the opening fence and body with the original indentation", () => {
    expect(
      heldLines({ open: { indent: 2, marker: "~~~", info: "mermaid" }, body: ["a", "b"] }),
    ).toEqual(["  ~~~mermaid", "a", "b"]);
  });
});
