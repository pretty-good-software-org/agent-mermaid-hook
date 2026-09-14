#!/usr/bin/env bun
import { defineCommand, runCommand, runMain } from "citty";

import { renderCommand } from "./commands/render.ts";
import { sessionStartCommand } from "./commands/session-start.ts";
import { stopCommand } from "./commands/stop.ts";
import { versionCommand } from "./commands/version.ts";
import { CliError, ErrorCode } from "./errors/index.ts";
import { createLogger, logFormatSchema, type LogLevel } from "./logger/index.ts";
import { NAME, VERSION } from "./version.ts";

const main = defineCommand({
  meta: {
    name: NAME,
    version: VERSION,
    description:
      "Claude Code hooks that draw fenced Mermaid blocks as Unicode box art in the terminal",
  },
  args: {
    debug: {
      type: "boolean",
      description: "Enable debug logging",
      default: false,
    },
    "log-format": {
      type: "string",
      description: "Log format: pretty or json",
      default: "pretty",
    },
  },
  setup({ args }) {
    const level: LogLevel = args.debug ? "debug" : "info";
    const format = logFormatSchema.safeParse(args["log-format"]);
    if (!format.success) {
      throw new CliError(
        ErrorCode.InvalidInput,
        `Invalid --log-format: "${args["log-format"]}". Supported: ${logFormatSchema.options.join(", ")}.`,
        { exitCode: 2 },
      );
    }
    const logger = createLogger({ level, format: format.data });
    logger.debug({ args }, "CLI started");
  },
  subCommands: {
    stop: stopCommand,
    "session-start": sessionStartCommand,
    render: renderCommand,
    version: versionCommand,
  },
});

const rawArgs = process.argv.slice(2);
const helpFlags = new Set(["--help", "-h"]);
const options = { rawArgs };

try {
  // runMain owns help rendering but converts all failures to exit 1.
  // Keep normal execution here so CliError retains its declared exit code.
  const runner = rawArgs.some((arg) => helpFlags.has(arg)) ? runMain : runCommand;
  await runner(main, options);
} catch (error) {
  if (error instanceof CliError) {
    process.stderr.write(`error: ${error.message}\n`);
    process.exit(error.exitCode);
  }
  throw error;
}
