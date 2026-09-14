# claude-mermaid-hook

Claude Code prints fenced Mermaid blocks as raw text. This tool is a pair of Claude Code hooks that draw them as
Unicode box art under each reply, in the terminal, with no browser and nothing to install at runtime beyond one
binary.

```text
┌─────────────┐                    ┌───────────┐       ┌──────────┐
│ Claude Code │                    │ Stop hook │       │ renderer │
└──────┬──────┘                    └─────┬─────┘       └─────┬────┘
       │JSON with last_assistant_message │                   │
       ├────────────────────────────────▶│each mermaid block │
       │                                 ├──────────────────▶│
       │                                 │   Unicode boxes   │
       │  {"systemMessage": "<boxes>"}   │◄╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
       │◄╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤                   │
```

## How it works

- `claude-mermaid-hook stop` runs as a `Stop` hook. It reads the hook JSON on stdin, extracts every ` ```mermaid `
  fence from `last_assistant_message`, renders each with [grok-mermaid](https://github.com/xl0/grok-mermaid), and
  prints one JSON object whose `systemMessage` Claude Code shows under the reply. A reply without diagrams produces no
  output at all.
- `claude-mermaid-hook session-start` runs as a `SessionStart` hook. It prints one line of context that tells the
  model diagrams are drawn in the terminal, which kinds are supported, and how wide they may be.
- `claude-mermaid-hook render` runs the same pipeline by hand on a file or stdin, for trying a diagram before
  committing it to a reply.

Supported diagram kinds: flowchart, sequence, state, class, and ER. Anything else, a diagram with a syntax error, or
one wider than the limit is replaced by a one-line notice naming the diagram and the reason. Nothing is ever truncated.

The `Stop` hook always exits 0. A `Stop` hook that exits 2 keeps Claude from ending its turn, and a drawing helper
must never do that.

## Install

Download the archive for your platform from the latest release and put `claude-mermaid-hook` on `PATH`, or let mise
do it:

```toml
[tools]
"github:pretty-good-software-org/claude-mermaid-hook" = "latest"
```

Then register the hooks in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "claude-mermaid-hook session-start", "timeout": 5 }
        ]
      }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "claude-mermaid-hook stop", "timeout": 15 }] }
    ]
  }
}
```

## Limits

| Limit          | Default | Why                                                                                                  |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| Width          | 120     | A hook cannot see the terminal width. Override with `CLAUDE_MERMAID_MAX_WIDTH=<columns>`.            |
| Output per run | 9,800   | Claude Code caps a hook's `systemMessage` near 10,000 characters and spills longer output to a file. |

Every diagram in a reply is tried in order against what is left of the budget, so a small diagram after a skipped
large one still draws.

## Development

```bash
mise run setup:default   # tools, hooks, packages
bun run check            # lockfile, typecheck, lint, format, spell, test
bun run src/cli.ts render --file test/golden/sequence.mmd
```

Releases are cut by tagging `vX.Y.Z` after `changie batch`; the release workflow builds standalone binaries for
darwin-arm64, linux-arm64, and linux-x64 and attaches them with checksums and attestations.
