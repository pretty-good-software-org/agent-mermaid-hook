#!/usr/bin/env bun
import { defineCommand, runCommand, runMain } from "citty";

import { codexStopCommand } from "./commands/codex-stop.ts";
import { displayCommand } from "./commands/display.ts";
import { renderCommand } from "./commands/render.ts";
import { sessionStartCommand } from "./commands/session-start.ts";
import { versionCommand } from "./commands/version.ts";
import { CliError, ErrorCode } from "./errors/index.ts";
import { createLogger, logFormatSchema, type LogLevel } from "./logger/index.ts";
import { NAME, VERSION } from "./version.ts";

const main = defineCommand({
  meta: {
    name: NAME,
    version: VERSION,
    description:
      "Claude Code and Codex hooks that show fenced Mermaid blocks as Unicode box art in the terminal",
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
    display: displayCommand,
    "codex-stop": codexStopCommand,
    "session-start": sessionStartCommand,
    render: renderCommand,
    version: versionCommand,
  },
});

const rawArgs = process.argv.slice(2);
const helpFlags = new Set(["--help", "-h"]);
const options = { rawArgs };
// Hook commands must exit 0 whatever goes wrong, even before the command runs:
// a failing hook process must never disturb the stream it decorates. The command
// is the first positional argument; root flags that take a value are skipped with it.
const hookCommands = new Set(["display", "session-start", "codex-stop"]);
const valueFlags = new Set(["--log-format"]);
function invokedCommand(args: readonly string[]): string | undefined {
  let shouldSkipValue = false;
  for (const arg of args) {
    if (shouldSkipValue) {
      shouldSkipValue = false;
    } else if (valueFlags.has(arg)) {
      shouldSkipValue = true;
    } else if (!arg.startsWith("-")) {
      return arg;
    }
  }
  return undefined;
}
const isHook = hookCommands.has(invokedCommand(rawArgs) ?? "");

try {
  // runMain owns help rendering but converts all failures to exit 1.
  // Keep normal execution here so CliError retains its declared exit code.
  const runner = rawArgs.some((arg) => helpFlags.has(arg)) ? runMain : runCommand;
  await runner(main, options);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  if (isHook) process.exit(0);
  if (error instanceof CliError) process.exit(error.exitCode);
  process.exit(1);
}
