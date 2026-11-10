import { errorMessage } from "../errors/index.ts";

// A hook reports a failure here instead of exiting non-zero: the reason goes to
// stderr for whoever debugs the hook, and the host keeps its own output.
export function reportHookError(error: unknown): void {
  process.stderr.write(`agent-mermaid-hook: ${errorMessage(error)}\n`);
}
