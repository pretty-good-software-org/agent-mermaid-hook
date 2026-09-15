# agent-mermaid-hook

Claude Code and Codex print fenced Mermaid blocks as raw text. This tool is a set of hooks that show them as Unicode
box art in the terminal, with no browser and nothing to install at runtime beyond one binary. In Claude Code 2.1.152 or
newer the drawing replaces the source while the reply streams; in Codex it follows the reply.

```text
┌─────────────┐                     ┌──────────────┐       ┌──────────┐
│ Claude Code │                     │ display hook │       │ renderer │
└──────┬──────┘                     └──────┬───────┘       └─────┬────┘
       │ chunk of completed lines          │                     │
       ├──────────────────────────────────▶│ each closed fence   │
       │                                   ├────────────────────▶│
       │                                   │   Unicode boxes     │
       │ displayContent replaces the chunk │◄╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
       │◄╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤                     │
```

## How it works

- `agent-mermaid-hook display` runs as a `MessageDisplay` hook. Claude Code calls it with each chunk of completed
  lines as the reply streams. Prose passes through untouched. A closed ` ```mermaid ` fence is replaced by its drawing
  from [grok-mermaid](https://github.com/xl0/grok-mermaid). A fence that is still open at the end of a chunk is held,
  shown as nothing, and drawn when its closing line arrives; the open fence survives between chunks as a small file in
  the session scratch directory. If a message ends inside a fence, the held source is shown as it was written.
- `agent-mermaid-hook session-start` runs as a `SessionStart` hook. It prints one line of context that tells the
  model diagrams are drawn in the terminal, which kinds are supported, and how wide they may be.
- `agent-mermaid-hook codex-stop` runs as a Codex `Stop` hook. Codex has no hook that rewrites a reply, so when a turn
  ends it reads the final reply, draws its Mermaid fences, and returns them as the hook message: a title on the first
  line and the drawings under it, fitted to the four columns Codex indents them by.
- `agent-mermaid-hook render` runs the same pipeline by hand on a file or stdin, for trying a diagram before
  committing it to a reply.

Supported diagram kinds: flowchart, sequence, state, class, and ER. Anything else, a diagram with a syntax error, or
one wider than the limit is replaced by a one-line notice naming the diagram and the reason. Nothing is ever truncated.

The transcript and the model's context keep the original fence, so the same reply still renders natively in pi and in
Claude Desktop, and `--resume` replays the source. Hook commands always exit 0; a failing hook must never disturb the
stream it decorates.

## Installation

Download the archive for your platform from the latest release and put `agent-mermaid-hook` on `PATH`, or let mise
do it:

```toml
[tools]
"github:pretty-good-software-org/agent-mermaid-hook" = "latest"
```

## Usage

Register the hooks in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "agent-mermaid-hook session-start", "timeout": 5 }
        ]
      }
    ],
    "MessageDisplay": [
      { "hooks": [{ "type": "command", "command": "agent-mermaid-hook display", "timeout": 5 }] }
    ]
  }
}
```

For Codex, register the Stop hook in `~/.codex/config.toml` and approve it once in `/hooks`, or install it for every
user in `/etc/codex/requirements.toml`, where managed hooks need no approval:

```toml
[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command = "agent-mermaid-hook codex-stop"
timeout = 10
```

Try a diagram before putting it in a reply:

```bash
agent-mermaid-hook render --file diagram.mmd --width 100
```

## Limits

| Limit          | Default | Why                                                                                      |
| -------------- | ------- | ---------------------------------------------------------------------------------------- |
| Width          | 120     | A hook cannot see the terminal width. Override with `AGENT_MERMAID_MAX_WIDTH=<columns>`. |
| Output per run | 9,800   | The same cap applies to every hook output; a chunk with several diagrams shares it.      |

Every diagram in a chunk is tried in order against what is left of the budget, so a small diagram after a skipped large
one still draws.

## Development

```bash
mise run setup:default   # tools, hooks, packages
bun run check            # lockfile, typecheck, lint, format, spell, test
bun run src/cli.ts render --file test/golden/sequence.mmd
```

## License

MIT. See [LICENSE](LICENSE).

Releases are cut by tagging `vX.Y.Z` after `changie batch`; the release workflow builds standalone binaries for
darwin-arm64, linux-arm64, and linux-x64 and attaches them with checksums and attestations.
