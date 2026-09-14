import { describe, expect, test } from "bun:test";

import { columns } from "../../test/helpers/columns.ts";
import { renderDiagram } from "./renderer.ts";

describe("renderDiagram", () => {
  test.each([
    ["flowchart", "flowchart LR\n  A[Start] --> B[Done]"],
    ["sequence", "sequenceDiagram\n  A->>B: hello"],
    ["state", "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy"],
    ["class", "classDiagram\n  class Hook {\n    +run()\n  }"],
    ["er", "erDiagram\n  HOST ||--o{ VM : runs"],
  ])("draws a %s diagram with a measured width", (kind, source) => {
    const rendered = renderDiagram(source);
    expect(rendered.status, `expected art for ${kind}`).toBe("art");
    if (rendered.status !== "art") return;
    expect(rendered.kind).toBe(kind);
    expect(rendered.lines.length).toBeGreaterThan(2);
    const widest = Math.max(...rendered.lines.map((line) => columns(line)));
    expect(rendered.width, "reported width must match the widest row").toBe(widest);
  });

  test("names an unsupported diagram type", () => {
    expect(renderDiagram("gantt\n  title Release")).toEqual({ status: "unsupported", kind: null });
  });

  test.each([
    ["er", "erDiagram\n  this is not a relation"],
    ["sequence", "sequenceDiagram\n  garbage only"],
    ["flowchart", "flowchart LR\n  --> --> -->"],
  ])("names the kind of an unreadable %s diagram", (kind, source) => {
    expect(renderDiagram(source)).toEqual({ status: "invalid", kind });
  });

  test("treats blank input as unsupported", () => {
    expect(renderDiagram("   \n")).toEqual({ status: "unsupported", kind: null });
  });
});
