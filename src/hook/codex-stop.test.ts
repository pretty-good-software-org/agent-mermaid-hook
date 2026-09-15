import { describe, expect, test } from "bun:test";

import { codexStopOutput } from "./codex-stop.ts";

const limits = { maxWidth: 120, budget: 9800 };
const flow = "```mermaid\nflowchart LR\n  A --> B\n```";
const reply = `Here is the flow:\n\n${flow}\n`;
const drawing = "┌───┐    ┌───┐\n│ A ├───▶│ B │\n└───┘    └───┘";

const edge = (i: number): string => `N${String(i)} --> N${String(i + 1)}`;
const tallReply = `\`\`\`mermaid\nflowchart TD\n  ${Array.from({ length: 40 }, (_, i) => edge(i)).join("\n  ")}\n\`\`\``;

const stdin = (message: unknown): string => JSON.stringify({ last_assistant_message: message });

function systemMessage(stdout: string): string {
  expect(stdout.endsWith("\n"), "the hook prints exactly one JSON line").toBe(true);
  const output = JSON.parse(stdout) as Record<string, unknown>;
  expect(Object.keys(output), "only systemMessage, never decision or continue").toEqual([
    "systemMessage",
  ]);
  return output.systemMessage as string;
}

const shown = (input: string, applied = limits): string =>
  systemMessage(codexStopOutput(input, applied));

describe("codexStopOutput", () => {
  test("titles the first line and puts the drawing on the lines under it", () => {
    expect(shown(stdin(reply))).toBe(`Mermaid diagram\n${drawing}`);
  });

  test("counts several diagrams in the title and keeps them in reply order", () => {
    const two = `${flow}\n\nand\n\n\`\`\`mermaid\nflowchart LR\n  C --> D\n\`\`\`\n`;
    const message = shown(stdin(two));
    const [heading, ...body] = message.split("\n");
    expect(heading).toBe("Mermaid diagrams (2)");
    const text = body.join("\n");
    expect(text.indexOf("│ A "), "first diagram drawn").toBeGreaterThan(-1);
    expect(text.indexOf("│ C "), "second diagram after the first").toBeGreaterThan(
      text.indexOf("│ A "),
    );
  });

  test("fits drawings to the width Codex leaves after its four-column indent", () => {
    // The drawing is 14 columns: 18 leaves exactly 14, 17 leaves 13.
    expect(shown(stdin(reply), { ...limits, maxWidth: 18 })).toBe(`Mermaid diagram\n${drawing}`);
    expect(shown(stdin(reply), { ...limits, maxWidth: 17 })).toBe(
      "Mermaid diagram\ncould not render diagram 1/1 (flowchart): 14 columns wide, limit is 13",
    );
  });

  test("keeps the whole message, title included, within the budget", () => {
    const budget = 300;
    const message = shown(stdin(tallReply), { ...limits, budget });
    expect(message).toBe(
      "Mermaid diagram\ncould not render diagram 1/1 (flowchart): output budget exhausted (300 chars per reply)",
    );
    expect(message.length).toBeLessThanOrEqual(budget);
  });

  test("prints nothing when the reply has no diagrams", () => {
    expect(codexStopOutput(stdin("plain text\n```ts\nconst a = 1;\n```"), limits)).toBe("");
  });

  test.each([
    ["empty stdin", ""],
    ["malformed JSON", "{not json"],
    ["a JSON array", "[1,2]"],
    ["a null message", stdin(null)],
    ["a message of the wrong type", stdin(42)],
    ["no message field", JSON.stringify({ session_id: "x", stop_hook_active: true })],
  ])("prints nothing for %s", (_, input) => {
    expect(codexStopOutput(input, limits)).toBe("");
  });

  test("ignores the other Codex Stop fields", () => {
    const input = JSON.stringify({
      session_id: "s",
      turn_id: "t",
      hook_event_name: "Stop",
      stop_hook_active: true,
      last_assistant_message: reply,
    });
    expect(shown(input)).toBe(`Mermaid diagram\n${drawing}`);
  });
});
