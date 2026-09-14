import { describe, expect, test } from "bun:test";

import { displayChunk } from "./display.ts";

const limits = { maxWidth: 120, budget: 9800 };
const fence = "```mermaid\nflowchart LR\n  A --> B\n```\n";

describe("displayChunk", () => {
  test("leaves a chunk with no diagram and nothing carried untouched", () => {
    expect(displayChunk({ delta: "Just prose.\n", final: false }, undefined, limits)).toEqual({});
  });

  test("replaces a complete fence with its drawing and keeps the prose around it", () => {
    const { display, carried } = displayChunk(
      { delta: `Before\n${fence}After\n`, final: false },
      undefined,
      limits,
    );
    expect(carried).toBeUndefined();
    expect(display?.startsWith("Before\n┌")).toBe(true);
    expect(display?.endsWith("┘\nAfter\n")).toBe(true);
    expect(display).not.toContain("```");
  });

  test("passes a non-mermaid fence through unchanged", () => {
    const delta = "```ts\nconst x = 1\n```\n";
    expect(displayChunk({ delta, final: false }, undefined, limits)).toEqual({});
  });

  test("holds an open mermaid fence and shows only the prose before it", () => {
    const { display, carried } = displayChunk(
      { delta: "Intro\n```mermaid\nflowchart LR\n", final: false },
      undefined,
      limits,
    );
    expect(display).toBe("Intro\n");
    expect(carried).toEqual({
      open: { indent: 0, marker: "```", info: "mermaid" },
      body: ["flowchart LR"],
    });
  });

  test("shows nothing for a chunk that is entirely inside a held fence", () => {
    const carried = { open: { indent: 0, marker: "```", info: "mermaid" }, body: ["flowchart LR"] };
    const result = displayChunk({ delta: "  A --> B\n", final: false }, carried, limits);
    expect(result.display).toBe("");
    expect(result.carried?.body).toEqual(["flowchart LR", "  A --> B"]);
  });

  test("draws the carried fence when its closing line arrives", () => {
    const carried = {
      open: { indent: 0, marker: "```", info: "mermaid" },
      body: ["flowchart LR", "  A --> B"],
    };
    const { display, carried: next } = displayChunk(
      { delta: "```\nOutro\n", final: false },
      carried,
      limits,
    );
    expect(next).toBeUndefined();
    expect(display?.split("\n", 1)[0]).toContain("┌");
    expect(display?.endsWith("Outro\n")).toBe(true);
  });

  test("flushes the held source on the final chunk of a message that never closes its fence", () => {
    const carried = { open: { indent: 2, marker: "~~~", info: "mermaid" }, body: ["flowchart LR"] };
    const { display, carried: next } = displayChunk(
      { delta: "  A --> B\n", final: true },
      carried,
      limits,
    );
    expect(next).toBeUndefined();
    expect(display).toBe("  ~~~mermaid\nflowchart LR\n  A --> B\n");
  });

  test("keeps a chunk without a trailing newline without one", () => {
    const { display } = displayChunk({ delta: `${fence}tail`, final: true }, undefined, limits);
    expect(display?.endsWith("┘\ntail")).toBe(true);
  });

  test("applies the width notice inside the stream", () => {
    const wide = "```mermaid\nflowchart LR\n  A[a very long label indeed] --> B[another]\n```\n";
    const { display } = displayChunk({ delta: wide, final: false }, undefined, {
      ...limits,
      maxWidth: 20,
    });
    expect(display).toMatch(
      /^could not render diagram 1\/1 \(flowchart\): \d+ columns wide, limit is 20\n$/,
    );
  });
});
