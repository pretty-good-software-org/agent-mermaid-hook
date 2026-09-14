import { defineCommand } from "citty";

import { limitsFromEnv, MAX_MAX_WIDTH, MIN_MAX_WIDTH, parseMaxWidth } from "../config.ts";
import { CliError, ErrorCode } from "../errors/index.ts";
import { extractMermaidFences } from "../markdown/fences.ts";
import { composePayload } from "../policy/budget.ts";

export const renderCommand = defineCommand({
  meta: {
    name: "render",
    description: "Render Mermaid from a file or stdin the way the Stop hook would",
  },
  args: {
    file: {
      type: "string",
      description: "Markdown or .mmd file to read; stdin when omitted",
    },
    width: {
      type: "string",
      description: "Column limit; overrides the environment",
    },
  },
  async run({ args }) {
    const limits = args.width === undefined ? limitsFromEnv() : withWidth(args.width);
    const input =
      args.file === undefined ? await Bun.stdin.text() : await Bun.file(args.file).text();
    const fences = extractMermaidFences(input);
    // A bare diagram file has no fence; treat the whole input as one diagram.
    const sources = fences.length > 0 ? fences.map((fence) => fence.source) : [input];
    process.stdout.write(`${composePayload(sources, limits) ?? ""}\n`);
  },
});

function withWidth(raw: string) {
  const maxWidth = parseMaxWidth(raw);
  if (maxWidth === undefined) {
    throw new CliError(
      ErrorCode.InvalidInput,
      `Invalid --width: "${raw}". Expected an integer from ${String(MIN_MAX_WIDTH)} to ${String(MAX_MAX_WIDTH)}.`,
      { exitCode: 2 },
    );
  }
  return { ...limitsFromEnv(), maxWidth };
}
