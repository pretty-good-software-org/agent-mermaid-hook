---
last_validated: 2026-09-08T19:26:33Z
project_type: typescript-cli
---

# Agent Instructions: template-ts-cli

## Repository Overview

Canonical private TypeScript CLI template for Pretty Good Software. It combines Bun, citty, zod, pino, strict
TypeScript and shared organization configs.

## Repository Structure

```text
.
├── .actionlint.yml
├── .changes
│   ├── header.tpl.md
│   └── unreleased
│       ├── .gitkeep
│       ├── Changed-20260722-142100.yaml
│       ├── Changed-20260906-010544.yaml
│       ├── Changed-20260908-173809.yaml
│       ├── Changed-20260908-175948.yaml
│       ├── Changed-20260908-184028.yaml
│       ├── Changed-20260908-194317.yaml
│       ├── Changed-20260908-200848.yaml
│       └── Changed-20260908-212633.yaml
├── .changie.yaml
├── .coderabbit.yaml
├── .editorconfig
├── .github
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yml
│   └── workflows
│       ├── ci.yml
│       └── lint.yml
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
├── scripts
│   ├── setup-hooks.sh
│   └── template-init.sh
├── src
│   ├── cli.ts
│   ├── commands
│   │   ├── greet.ts
│   │   └── version.ts
│   ├── compiler.test.ts
│   ├── errors
│   │   ├── errors.test.ts
│   │   └── index.ts
│   ├── greeting.test.ts
│   ├── greeting.ts
│   ├── logger
│   │   └── index.ts
│   ├── tooling.test.ts
│   └── version.ts
├── test
│   └── cli.test.ts
└── tsconfig.json
```

## Development Guidelines

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

Keep domain unit tests next to source and CLI process tests in `test/cli.test.ts`. Run the same process contracts
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
