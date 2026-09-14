import { describe, expect, test } from "bun:test";

import { extractMermaidFences } from "./fences.ts";

describe("extractMermaidFences", () => {
  test("returns nothing for a reply without fences", () => {
    expect(extractMermaidFences("Just prose.\n\nMore prose.")).toEqual([]);
  });

  test("returns nothing for an empty reply", () => {
    expect(extractMermaidFences("")).toEqual([]);
  });

  test("extracts a backtick fence with its source and opening line", () => {
    const markdown = "Intro\n\n```mermaid\ngraph LR\n  A --> B\n```\n\nOutro";
    expect(extractMermaidFences(markdown)).toEqual([{ source: "graph LR\n  A --> B", line: 3 }]);
  });

  test("extracts a tilde fence", () => {
    const markdown = "~~~mermaid\ngraph TD\n  A --> B\n~~~";
    expect(extractMermaidFences(markdown)).toEqual([{ source: "graph TD\n  A --> B", line: 1 }]);
  });

  test("ignores fences of other languages and unlabeled fences", () => {
    const markdown =
      "```ts\nconst x = 1\n```\n```\nplain\n```\n```mermaid\ngraph LR\n  A --> B\n```";
    expect(extractMermaidFences(markdown).map((fence) => fence.line)).toEqual([7]);
  });

  test("matches the info string case-insensitively and with trailing attributes", () => {
    const markdown = "```Mermaid {title=x}\ngraph LR\n  A --> B\n```";
    expect(extractMermaidFences(markdown)).toHaveLength(1);
  });

  test("keeps every diagram in document order", () => {
    const markdown =
      "```mermaid\ngraph LR\n  A --> B\n```\ntext\n```mermaid\nsequenceDiagram\n  A->>B: hi\n```";
    expect(extractMermaidFences(markdown).map((fence) => fence.source)).toEqual([
      "graph LR\n  A --> B",
      "sequenceDiagram\n  A->>B: hi",
    ]);
  });

  test("strips the fence's own indentation inside a list item", () => {
    const markdown = "- step\n\n  ```mermaid\n  graph LR\n    A --> B\n  ```";
    expect(extractMermaidFences(markdown)).toEqual([{ source: "graph LR\n  A --> B", line: 3 }]);
  });

  test("runs an unclosed fence to the end of the reply", () => {
    const markdown = "```mermaid\ngraph LR\n  A --> B";
    expect(extractMermaidFences(markdown)).toEqual([{ source: "graph LR\n  A --> B", line: 1 }]);
  });

  test("does not close on a shorter fence and does close on a longer one", () => {
    const markdown = "````mermaid\ngraph LR\n```\n  A --> B\n`````\nafter";
    expect(extractMermaidFences(markdown)).toEqual([
      { source: "graph LR\n```\n  A --> B", line: 1 },
    ]);
  });

  test("treats a mermaid fence nested inside another fence as content", () => {
    const markdown = "````markdown\n```mermaid\ngraph LR\n  A --> B\n```\n````";
    expect(extractMermaidFences(markdown)).toEqual([]);
  });

  test("accepts CRLF line endings", () => {
    const markdown = "```mermaid\r\ngraph LR\r\n  A --> B\r\n```\r\n";
    expect(extractMermaidFences(markdown)).toEqual([{ source: "graph LR\n  A --> B", line: 1 }]);
  });
});
