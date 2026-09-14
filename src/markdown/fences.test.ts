import { describe, expect, test } from "bun:test";

import { extractMermaidFences } from "./fences.ts";

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
});
