import { describe, expect, test } from "bun:test";

import { CliError, ErrorCode } from "./index.ts";

describe("CliError", () => {
  test("captures code and default exitCode", () => {
    const err = new CliError(ErrorCode.Internal, "boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe(ErrorCode.Internal);
    expect(err.exitCode).toBe(1);
    expect(err.message).toBe("boom");
  });

  test("respects custom exitCode", () => {
    const err = new CliError(ErrorCode.InvalidInput, "bad", { exitCode: 64 });
    expect(err.exitCode).toBe(64);
  });

  test("preserves cause", () => {
    const cause = new Error("original");
    const err = new CliError(ErrorCode.Internal, "wrapped", { cause });
    expect(err.cause).toBe(cause);
  });
});
