import { defineCommand } from "citty";

import { limitsFromEnv } from "../config.ts";
import { CliError, ErrorCode } from "../errors/index.ts";
import { extractMermaidFences } from "../markdown/fences.ts";
import { composePayload } from "../policy/budget.ts";

// Manual entry point for trying the same pipeline the hook runs: feed Markdown
// or a bare diagram and see exactly what the Stop hook would print.

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
    const limits = limitsFromEnv();
    if (args.width !== undefined) {
      const width = Number(args.width);
      if (!Number.isSafeInteger(width) || width < 20) {
        throw new CliError(
          ErrorCode.InvalidInput,
          `Invalid --width: "${args.width}". Expected an integer of at least 20.`,
          {
            exitCode: 2,
          },
        );
      }
      limits.maxWidth = width;
    }
    const input =
      args.file === undefined ? await Bun.stdin.text() : await Bun.file(args.file).text();
    const fences = extractMermaidFences(input);
    // A bare diagram file has no fence; treat the whole input as one diagram.
    const sources = fences.length > 0 ? fences.map((fence) => fence.source) : [input];
    const payload = composePayload(sources, limits);
    process.stdout.write(`${(payload ?? "").replace(/^\n/, "")}\n`);
  },
});
