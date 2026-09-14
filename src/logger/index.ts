import pino, { type Logger, type LoggerOptions } from "pino";
import pretty from "pino-pretty";
import { z } from "zod";

// zod schemas are the single source of truth for the accepted values; the
// types below are derived from them so the runtime check and the type cannot drift.
export const logLevelSchema = z.enum([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
]);
export const logFormatSchema = z.enum(["pretty", "json"]);

export type LogLevel = z.infer<typeof logLevelSchema>;
export type LogFormat = z.infer<typeof logFormatSchema>;

export interface CreateLoggerOptions {
  level?: LogLevel;
  format?: LogFormat;
}

export function createLogger({ level = "info", format = "pretty" }: CreateLoggerOptions): Logger {
  const options: LoggerOptions = { level };
  if (format === "json") {
    return pino(options, process.stderr);
  }

  // A synchronous stream avoids worker module resolution in compiled Bun binaries.
  const prettyOptions = {
    destination: 2,
    sync: true,
    colorize: process.stderr.isTTY,
    translateTime: "SYS:HH:MM:ss",
    ignore: "pid,hostname",
  };
  return pino(options, pretty(prettyOptions));
}
