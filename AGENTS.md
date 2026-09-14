---
last_validated: 2026-09-14T22:42:58Z
project_type: typescript-cli
---

# Agent Instructions: claude-mermaid-hook

## Repository Overview

Claude Code hooks that show fenced Mermaid blocks as Unicode box art in place of the source while a reply streams
(Claude Code 2.1.152 or newer). A Bun and citty CLI with three commands: `display` (the MessageDisplay hook),
`session-start` (the SessionStart hook) and `render` (the same pipeline by hand). Rendering is grok-mermaid; the width
limit and output budget live in `src/config.ts`.

## Repository Structure

```text
.
├── .actionlint.yml
├── .changes
│   ├── header.tpl.md
│   ├── unreleased
│   │   ├── .gitkeep
│   │   ├── Added-20260915-004120.yaml
│   │   ├── Changed-20260915-004120.yaml
│   │   └── Removed-20260915-004120.yaml
│   └── v0.1.0.md
├── .changie.yaml
├── .claude
│   └── logs
│       └── sessions.json
├── .coderabbit.yaml
├── .editorconfig
├── .github
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yml
│   └── workflows
│       ├── ci.yml
│       ├── lint.yml
│       └── release.yml
├── .gitignore
├── .mise.ci.toml
├── .mise.development.toml
├── .mise.toml
├── .miserc.toml
├── .npmrc
├── .prettierignore
├── .rumdl.toml
├── .yamllint.yml
├── AGENTS.md
├── CHANGELOG.md
├── CLAUDE.md
├── LICENSE
├── README.md
├── bun.lock
├── cog.toml
├── cspell.json
├── eslint.config.js
├── lefthook
│   ├── commit-msg.yml
│   ├── files.yml
│   ├── lint.yml
│   ├── secrets.yml
│   └── ts.yml
├── lefthook.yml
├── mise-tasks
│   ├── check
│   │   └── markdown-format
│   ├── format
│   │   └── markdown
│   ├── lint
│   │   ├── actionlint
│   │   ├── default
│   │   ├── format
│   │   ├── post-install
│   │   ├── rumdl
│   │   ├── spell
│   │   ├── ts
│   │   ├── typecheck
│   │   └── yamllint
│   ├── setup
│   │   └── default
│   └── test
│       └── default
├── mise.development.lock
├── mise.lock
├── package.json
├── src
│   ├── cli.ts
│   ├── commands
│   │   ├── display.ts
│   │   ├── render.ts
│   │   ├── session-start.ts
│   │   └── version.ts
│   ├── compiler.test.ts
│   ├── config.ts
│   ├── errors
│   │   ├── errors.test.ts
│   │   └── index.ts
│   ├── hook
│   │   ├── display-state.ts
│   │   ├── display.test.ts
│   │   ├── display.ts
│   │   └── session-start.ts
│   ├── lockfile.test.ts
│   ├── logger
│   │   └── index.ts
│   ├── markdown
│   │   ├── fences.test.ts
│   │   └── fences.ts
│   ├── policy
│   │   ├── budget.test.ts
│   │   └── budget.ts
│   ├── render
│   │   ├── notice.ts
│   │   ├── renderer.test.ts
│   │   └── renderer.ts
│   ├── tooling.test.ts
│   └── version.ts
├── test
│   ├── cli.test.ts
│   ├── golden
│   │   ├── sequence.mmd
│   │   └── sequence.txt
│   └── helpers
│       └── columns.ts
└── tsconfig.json
```

## Development Guidelines

- Hook commands (`display`, `session-start`) always exit 0. `display` prints nothing, which leaves the chunk as
  Claude Code streamed it, or one JSON object whose `hookSpecificOutput.displayContent` replaces the chunk; the
  field must sit under `hookSpecificOutput`, a top-level `displayContent` is ignored.
- Keep the fence extraction, rendering and budget policy as pure functions in `src/markdown`, `src/render` and
  `src/policy`; only `src/commands` touches stdin, stdout and the environment.
- Keep the fence extraction, rendering and budget policy as pure functions in `src/markdown`, `src/render` and
  `src/policy`; only `src/commands` touches stdin, stdout and the environment.
- Keep TypeScript strict and ESM-based. Use citty for commands and zod to validate external input.
- Put command registration in `src/commands`, business logic in domain modules, and exit handling only in `src/cli.ts`.
- Throw `CliError` for expected CLI failures. Send user output to stdout and diagnostics through pino.
- Preserve the Bun-targeted JavaScript build and the separate single-binary build.
- Preserve ESLint inheritance from `@pretty-good-software-org/ts-config/eslint`, plus shared Prettier, cspell, and
  strict TypeScript inheritance. Keep the CLI-specific cspell words.
- Keep package dependencies in `package.json` and `bun.lock`. Do not add unrelated tools to Mise.
- Keep ESLint plugins and `@eslint/js` owned by the shared `ts-config` package; do not add redundant overrides.
- Keep the `typescript` API within the shared package's declared peer range so typed linting remains supported.
- Preserve Microsoft's side-by-side aliases: `tsc` checks types with TS7 while ESLint uses the TS6 API. Bun still builds
  and runs the application. See README's toolchain compatibility section for the authoritative shared setup.
- Use the pinned Bun toolchain for correct alias resolution; compiler identity tests verify this boundary in CI.

## Testing

Keep domain unit tests next to source and CLI process tests in `test/cli.test.ts`; `test/golden/sequence.txt`
is the full-output snapshot of one rendered sequence diagram. Run the same process contracts
against source and a temporary compiled binary. Test help, typed errors, output, stderr, and exit status.
Keep logging in-process and diagnostics on stderr so standalone binaries need no external worker modules.

## Required Commands

```bash
mise run setup:default
mise run test:default
mise run lint:default
bun test
bun run build
bun run build:binary
```

`test:default` runs the Bun suite, including a regression test for test-task delegation and failure propagation.
CI runs that task in the `Test` job. `lint:default` includes Markdown formatting; CI does not run it twice.
`bun run check` also verifies Bun frozen-lockfile compatibility before running the other checks.

## Git Workflow

Create a feature branch from current `main`, make one coherent change, run the complete lint, test, and build
checks, and open a pull request. Rebase current `main` before the final push. Do not work directly on `main` or merge
without the organization ruleset checks.
