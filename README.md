# template-ts-cli

TypeScript CLI template powered by [Bun](https://bun.sh) and [citty](https://github.com/unjs/citty). Strict TS, pino
logging, typed errors, and a single-binary build via `bun build --compile`.

Mirrors the structure of
[`template-go-cli`](https://github.com/pretty-good-software-org/template-go-cli).

## Stack

| Concern                                           | Tool                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Runtime / package manager / bundler / test runner | Bun                                                                                            |
| CLI framework                                     | [citty](https://github.com/unjs/citty) (UnJS)                                                  |
| Logging                                           | [pino](https://github.com/pinojs/pino) + pino-pretty                                           |
| Shared configs                                    | [`@pretty-good-software-org/ts-config`](https://github.com/pretty-good-software-org/ts-config) |
| Toolchain version manager                         | [mise](https://mise.jdx.dev)                                                                   |
| Git hooks                                         | [lefthook](https://lefthook.dev)                                                               |
| Commit lint                                       | [cocogitto](https://docs.cocogitto.io) (`cog`)                                                 |
| Changelog                                         | [Changie](https://github.com/miniscruff/changie)                                               |
| CI                                                | GitHub Actions                                                                                 |

## Installation

This template installs `@pretty-good-software-org/ts-config` from GitHub Packages. You need a token with
`read:packages` scope.

```bash
export NODE_AUTH_TOKEN=$(gh auth token)   # gh token needs read:packages
mise run setup:default                    # installs tools, hooks, and packages
mise run test:default                     # regression tests
mise run lint:default
bun test
bun run build                             # Bun-targeted JavaScript bundle
bun run build:binary                      # ./dist/hello-cli single binary
bun run dev greet --name Alice            # runs cli.ts directly
```

If your `gh` token lacks `read:packages`:

```bash
gh auth refresh -h github.com -s read:packages
```

## Usage

```bash
hello-cli greet --name Alice             # Hello, Alice!
hello-cli greet --name Alice --json      # {"message":"Hello, Alice!"}
hello-cli --help
hello-cli greet --help
hello-cli version
hello-cli version --json
hello-cli --debug greet --name Alice     # debug-level logs to stderr
hello-cli --log-format json greet --name Alice
```

## Project structure

See [AGENTS.md](AGENTS.md) for the generated file tree.

- `src/cli.ts` registers commands and handles expected errors.
- `src/commands/` parses arguments and writes user output.
- `src/greeting.ts` contains the sample domain function, with adjacent unit tests.
- `src/logger/` and `src/errors/` own diagnostics and typed failures.
- `src/version.ts` reads package identity.
- `test/cli.test.ts` runs the same subprocess checks against source and a temporary compiled binary.

Diagnostics always go to stderr, leaving stdout available for command output. Pretty logging uses a synchronous,
in-process stream so the standalone binary does not need worker modules on disk. JSON logging also writes to stderr.
Citty handles help requests; normal execution retains the template's typed error exit codes.

### Migrating the previous sample

Replace `hello` with `greet --name World`. The `greet` command now supports only `--name` and `--json`;
`--lang`, `--emoji`, and `--list-languages` are no longer supported. Greeting JSON contains only `message`.
Replace imports from `src/greeting/index.ts` with `src/greeting.ts` and call `greet(name)` instead of passing options.
Language exports and the language-specific error helper/code were removed. No compatibility aliases are provided.

## Using as a template

```bash
gh repo create my-cli --template pretty-good-software-org/template-ts-cli --private
cd my-cli
./scripts/template-init.sh   # rewrite initial commit + tag v0.0.0
export NODE_AUTH_TOKEN=$(gh auth token)
mise install
bun install
./scripts/setup-hooks.sh
```

Then:

1. Rename `hello-cli` in `package.json` (`bin`)
2. Replace `src/greeting.ts` with your domain
3. Add commands under `src/commands/`

## Toolchain compatibility

`package.json` pins the shared `ts-config` 2.x package and its supported ESLint and TypeScript peers.
The shared package owns `@eslint/js` and the ESLint plugins; do not duplicate those dependencies or override them here.
Typechecking uses the native TypeScript 7 compiler; typed linting retains the TypeScript 6 API. Bun still builds and
runs the application. The pinned aliases follow the [shared package's Microsoft side-by-side setup][typescript-setup].
Use the Bun version pinned in `.mise.toml` before installing; older Bun alias resolution can break the lint API.
Compiler identity tests run in CI. Compiler and lint diagnostics can differ because they use different type semantics.

[typescript-setup]: https://github.com/pretty-good-software-org/ts-config/blob/v2.1.0/README.md#side-by-side-typescript-7-compiler-and-typescript-6-lint-api

## Lint policy

Linting uses the repository's native tool configuration in `.yamllint.yml`, `.rumdl.toml`, and TypeScript configuration
files. Local setup does not download private policy or require private credentials.

`mise run test:default` runs the Bun suite and returns its exit status. CI uses it in the `Test` job.
`mise run lint:default` includes Markdown formatting, so CI invokes only that lint entry point.
Markdown tasks inspect Git-tracked files and leave dependency documentation untouched.

`bun run check` starts with `check:lockfile`, which checks compatibility with Bun's frozen-install policy without
modifying files. Like CI, it rejects incompatible dependency versions but may accept unused lock entries after
dependency removal.

```bash
mise run test:default
```

## License

MIT

## Markdown formatting

Markdown formatting uses the native rumdl binary pinned by Mise. The toolchain is POSIX-only; `mise.lock`
records release checksums and GitHub artifact provenance. `.rumdl.toml` owns linting and formatting policy. Only
Git-tracked Markdown is formatted.
