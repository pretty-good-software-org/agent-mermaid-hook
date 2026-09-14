import { describe, expect, test } from "bun:test";

import { runStopHook } from "./stop.ts";

const limits = { maxWidth: 120, budget: 9800 };
const reply = "Here is the flow:\n\n```mermaid\nflowchart LR\n  A --> B\n```\n";

describe("runStopHook", () => {
  test("prints one JSON object whose systemMessage holds the drawing", () => {
    const result = runStopHook(JSON.stringify({ last_assistant_message: reply }), limits);
    expect(result.diagrams).toBe(1);
    const output = JSON.parse(result.stdout) as { systemMessage: string };
    expect(Object.keys(output)).toEqual(["systemMessage"]);
    expect(output.systemMessage).toMatch(/^\n.*┌/s);
    expect(result.stdout.endsWith("\n")).toBe(true);
  });

  test("prints nothing when the reply has no diagrams", () => {
    expect(runStopHook(JSON.stringify({ last_assistant_message: "plain text" }), limits)).toEqual({
      stdout: "",
      diagrams: 0,
    });
  });

  test.each([
    ["empty stdin", ""],
    ["malformed JSON", "{not json"],
    ["a JSON array", "[1,2]"],
    ["a message of the wrong type", JSON.stringify({ last_assistant_message: 42 })],
    ["no message field", JSON.stringify({ session_id: "x", stop_hook_active: true })],
  ])("prints nothing for %s", (_, stdin) => {
    expect(runStopHook(stdin, limits)).toEqual({ stdout: "", diagrams: 0 });
  });

  test("never emits a decision field that could block the turn", () => {
    const result = runStopHook(
      JSON.stringify({ last_assistant_message: reply, stop_hook_active: true }),
      limits,
    );
    const output = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(output).not.toHaveProperty("decision");
    expect(output).not.toHaveProperty("continue");
  });
});
