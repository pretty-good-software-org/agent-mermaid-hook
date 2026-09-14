import { z } from "zod";

// One place for every limit the hook enforces. The Stop hook cannot see the
// terminal (no tty, no COLUMNS), so width is a configured ceiling, not a measurement.

/**
Observed cap on a hook's systemMessage before Claude Code spills it to a file.
*/
export const HOOK_OUTPUT_CAP = 10_000;

/**
Characters left after the cap for headers, notices and the leading newline.
*/
export const OUTPUT_BUDGET = 9800;

export const DEFAULT_MAX_WIDTH = 120;

/**
Rows a diagram may reasonably take before it stops fitting one screen; advisory only.
*/
export const ADVISED_MAX_ROWS = 60;

export const MAX_WIDTH_ENV = "CLAUDE_MERMAID_MAX_WIDTH";

export const SUPPORTED_KINDS = ["flowchart", "sequence", "state", "class", "er"] as const;
export type SupportedKind = (typeof SUPPORTED_KINDS)[number];

const maxWidthSchema = z.coerce.number().int().min(20).max(1000);

export interface Limits {
  maxWidth: number;
  budget: number;
}

/**
Reads the width limit from the environment; anything unusable falls back to the default.
*/
export function limitsFromEnv(env: NodeJS.ProcessEnv = process.env): Limits {
  const raw = env[MAX_WIDTH_ENV];
  const parsed = raw === undefined || raw === "" ? undefined : maxWidthSchema.safeParse(raw);
  const maxWidth = parsed?.success ? parsed.data : DEFAULT_MAX_WIDTH;
  return { maxWidth, budget: OUTPUT_BUDGET };
}
