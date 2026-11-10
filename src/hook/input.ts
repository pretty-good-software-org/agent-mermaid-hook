import { type z } from "zod";

// A hook must never fail on what its host sends, so input that is not JSON or
// does not match the schema is reported as absent rather than thrown.
export function parseHookInput<T>(schema: z.ZodType<T>, stdin: string): T | undefined {
  const parsed = schema.safeParse(parseJson(stdin));
  return parsed.success ? parsed.data : undefined;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
