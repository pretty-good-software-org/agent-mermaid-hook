import { describe, expect, test } from "bun:test";

import { columns } from "../../test/helpers/columns.ts";
import { composePayload } from "./budget.ts";

const limits = { maxWidth: 120, budget: 9800 };
const small = "flowchart LR\n  A --> B";

const node = (i: number): string => `N${String(i)}`;
const labelled = (i: number): string => `${node(i)}[node number ${String(i)}]`;
const edge = (i: number): string => `${node(i)} --> ${node(i + 1)}`;
const wide = `flowchart LR\n  ${Array.from({ length: 12 }, (_, i) => labelled(i)).join(" --> ")}`;
const tall = `flowchart TD\n  ${Array.from({ length: 40 }, (_, i) => edge(i)).join("\n  ")}`;

function widest(text: string): number {
  return Math.max(...text.split("\n").map((line) => columns(line)));
}

describe("composePayload", () => {
  test("returns null when there are no diagrams", () => {
    expect(composePayload([], limits)).toBeNull();
  });

  test("opens with a newline so the first row does not continue the Stop says prefix", () => {
    const payload = composePayload([small], limits);
    expect(payload?.startsWith("\n")).toBe(true);
    expect(payload).toContain("┌");
  });

  test("replaces a diagram wider than the limit with a notice naming both widths", () => {
    const payload = composePayload([wide], { ...limits, maxWidth: 40 });
    expect(payload).toMatch(
      /^\ncould not render diagram 1\/1 \(flowchart\): \d+ columns wide, limit is 40$/,
    );
  });

  test("keeps a diagram exactly at the width limit and drops it one column below", () => {
    const probe = composePayload([small], { ...limits, maxWidth: 1000 });
    expect(probe).not.toBeNull();
    const width = widest(probe ?? "");
    expect(composePayload([small], { ...limits, maxWidth: width })).toBe(probe);
    expect(composePayload([small], { ...limits, maxWidth: width - 1 })).toContain("limit is");
  });

  test("skips a diagram the budget cannot hold and still draws the smaller one after it", () => {
    const payload = composePayload([small, tall, small], { ...limits, budget: 400 }) ?? "";
    const blocks = payload.slice(1).split("\n\n");
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toContain("┌");
    expect(blocks[1]).toBe(
      "could not render diagram 2/3 (flowchart): output budget exhausted (400 chars per reply)",
    );
    expect(blocks[2]).toContain("┌");
    expect(payload.length).toBeLessThanOrEqual(400);
  });

  test("names unsupported and invalid diagrams by position", () => {
    const payload = composePayload(
      ["gantt\n  title x", "erDiagram\n  this is not a relation"],
      limits,
    );
    expect(payload).toBe(
      "\ncould not render diagram 1/2 (unknown type): supported types are flowchart, sequence, state, class, er" +
        "\n\ncould not render diagram 2/2 (er): syntax error",
    );
  });
});
