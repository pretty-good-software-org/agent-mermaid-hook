import { z } from "zod";

// A hook cannot see the terminal (no tty, no COLUMNS), so width is a configured
// ceiling, not a measurement.

// Claude Code spills a hook's systemMessage to a file near 10,000 characters.
export const OUTPUT_BUDGET = 9800;

export const DEFAULT_MAX_WIDTH = 120;

export const ADVISED_MAX_ROWS = 60;

export const MAX_WIDTH_ENV = "AGENT_MERMAID_MAX_WIDTH";

export const SUPPORTED_KINDS = ["flowchart", "sequence", "state", "class", "er"] as const;

export const MIN_MAX_WIDTH = 20;

export const MAX_MAX_WIDTH = 1000;

const maxWidthSchema = z.coerce.number().int().min(MIN_MAX_WIDTH).max(MAX_MAX_WIDTH);

export interface Limits {
  readonly maxWidth: number;
  readonly budget: number;
}

export function parseMaxWidth(raw: unknown): number | undefined {
  const parsed = maxWidthSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export function limitsFromEnv(env: NodeJS.ProcessEnv = process.env): Limits {
  // eslint-disable-next-line security/detect-object-injection -- constant key, not input
  const maxWidth = parseMaxWidth(env[MAX_WIDTH_ENV]) ?? DEFAULT_MAX_WIDTH;
  return { maxWidth, budget: OUTPUT_BUDGET };
}
