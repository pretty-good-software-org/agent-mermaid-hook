import { describe, expect, test } from "bun:test";

import { greet } from "./greeting.ts";

describe("greet", () => {
  test("greets the provided name", () => {
    expect(greet("Alice")).toBe("Hello, Alice!");
  });

  test("preserves an empty name", () => {
    expect(greet("")).toBe("Hello, !");
  });

  test("preserves Unicode and punctuation", () => {
    expect(greet("Alice <&> 👋")).toBe("Hello, Alice <&> 👋!");
  });
});
