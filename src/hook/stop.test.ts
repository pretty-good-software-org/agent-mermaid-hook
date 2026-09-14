import { describe, expect, test } from "bun:test";

import { runStopHook } from "./stop.ts";

const limits = { maxWidth: 120, budget: 9800 };
const reply = "Here is the flow:\n\n```mermaid\nflowchart LR\n  A --> B\n```\n";

const edge = (i: number): string => `N${String(i)} --> N${String(i + 1)}`;
const tallReply = `\`\`\`mermaid\nflowchart TD\n  ${Array.from({ length: 40 }, (_, i) => edge(i)).join("\n  ")}\n\`\`\``;

function systemMessage(stdout: string): string {
  const output = JSON.parse(stdout) as Record<string, unknown>;
  expect(Object.keys(output)).toEqual(["systemMessage"]);
  return output.systemMessage as string;
}

describe("runStopHook", () => {
  test("prints one JSON line whose systemMessage holds the drawing", () => {
    const stdout = runStopHook(JSON.stringify({ last_assistant_message: reply }), limits);
    expect(stdout.endsWith("\n")).toBe(true);
    expect(systemMessage(stdout)).toContain("┌");
  });

  test("opens the message with a newline so the first row does not continue the Stop says prefix", () => {
    const stdout = runStopHook(JSON.stringify({ last_assistant_message: reply }), limits);
    expect(systemMessage(stdout).startsWith("\n┌")).toBe(true);
  });

  test("keeps the whole message, prefix break included, within the configured budget", () => {
    const budget = 300;
    const stdout = runStopHook(JSON.stringify({ last_assistant_message: tallReply }), {
      ...limits,
      budget,
    });
    const message = systemMessage(stdout);
    expect(message).toContain("output budget exhausted (300 chars per reply)");
    expect(message.length).toBeLessThanOrEqual(budget);
  });

  test("prints nothing when the reply has no diagrams", () => {
    expect(runStopHook(JSON.stringify({ last_assistant_message: "plain text" }), limits)).toBe("");
  });

  test.each([
    ["empty stdin", ""],
    ["malformed JSON", "{not json"],
    ["a JSON array", "[1,2]"],
    ["a message of the wrong type", JSON.stringify({ last_assistant_message: 42 })],
    ["no message field", JSON.stringify({ session_id: "x", stop_hook_active: true })],
  ])("prints nothing for %s", (_, stdin) => {
    expect(runStopHook(stdin, limits)).toBe("");
  });

  test("never emits a decision field that could block the turn", () => {
    const stdout = runStopHook(
      JSON.stringify({ last_assistant_message: reply, stop_hook_active: true }),
      limits,
    );
    const output = JSON.parse(stdout) as Record<string, unknown>;
    expect(output).not.toHaveProperty("decision");
    expect(output).not.toHaveProperty("continue");
  });
});
