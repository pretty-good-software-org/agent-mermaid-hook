import { z } from "zod";

// One place for every limit the hook enforces. The Stop hook cannot see the
// terminal (no tty, no COLUMNS), so width is a configured ceiling, not a measurement.

/**
Characters a reply's payload may use. Claude Code spills a hook's systemMessage
to a file near 10,000 characters; the margin covers notices and separators.
*/
export const OUTPUT_BUDGET = 9800;

export const DEFAULT_MAX_WIDTH = 120;

/**
Rows a diagram may reasonably take before it stops fitting one screen; advisory only.
*/
export const ADVISED_MAX_ROWS = 60;

export const MAX_WIDTH_ENV = "CLAUDE_MERMAID_MAX_WIDTH";

export const SUPPORTED_KINDS = ["flowchart", "sequence", "state", "class", "er"] as const;

export const MIN_MAX_WIDTH = 20;

const maxWidthSchema = z.coerce.number().int().min(MIN_MAX_WIDTH).max(1000);

export interface Limits {
  readonly maxWidth: number;
  readonly budget: number;
}

/**
Parses a width limit from user input; undefined when the value is unusable.
*/
export function parseMaxWidth(raw: unknown): number | undefined {
  const parsed = maxWidthSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/**
Reads the width limit from the environment; anything unusable falls back to the default.
*/
export function limitsFromEnv(env: NodeJS.ProcessEnv = process.env): Limits {
  const maxWidth = parseMaxWidth(env[MAX_WIDTH_ENV]) ?? DEFAULT_MAX_WIDTH;
  return { maxWidth, budget: OUTPUT_BUDGET };
}
