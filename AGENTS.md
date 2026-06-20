# AGENTS.md

Operational map for AI agents (and humans) working on **pascal-toolchain**.
This is the single source of truth; `CLAUDE.md` just points here.

## Hard rules

- **Evidence rule.** Never assert that a function, module, or behavior exists
  without proof: an exact file path + line number, or a code snippet. If you
  cannot produce evidence, say so explicitly instead of guessing.
- **Read before you edit.** Read the whole file (or the relevant region) before
  making non-trivial changes. Do not edit blind.
- **No emojis** in commits, PR descriptions, code, or output.
- **Conventional commits in Spanish** (`feat(scope): …`, `fix(…)`, `chore(…)`,
  `docs(…)`, `refactor(…)`). The message describes the change only.
- **Keep the build green.** After any code change run `npm run build` and
  `npm test`. If something goes red and you cannot fix it quickly, revert that
  change rather than leaving the tree broken.
- **Reject verbose PR summaries** for simple changes. Match the summary to the
  size of the diff.

## Repository layout

This is an npm-workspaces monorepo. Each pipeline stage is its own package and
is published independently to npm under its own name.

```
source.pas → tokenizer → parser → compiler → output.js
                            └────→ code-formatter → pretty Pascal
```

| Package (npm name) | Path | Role |
|--------------------|------|------|
| `pascal-tokenizer` | `packages/tokenizer` | Lexer: Pascal source → token stream. |
| `pascal-parser` | `packages/parser` | Builds the AST from tokens. Depends on `pascal-tokenizer`. |
| `pascal-js-compiler` | `packages/compiler` | Code generation: AST → JavaScript. Depends on `pascal-parser`. |
| `pascal-code-formatter` | `packages/code-formatter` | Pretty-prints Pascal. Depends on `pascal-tokenizer`. |

**Dependency direction** (never import against it):
`compiler → parser → tokenizer`, and `code-formatter → tokenizer`. Nothing
depends on the compiler or the formatter.

## Where tests go

Each package owns its tests under `src/__tests__/` (tokenizer uses
`__tests__/`). They run with Jest via `ts-jest`. The compiler additionally uses
**golden fixtures**: `packages/compiler/src/__tests__/fixtures/<name>.pas`
exercised by `fixtures.test.ts`. Adding compiler coverage = adding a `.pas`
fixture, not new test boilerplate.

## Essential commands

```bash
npm install          # install + link workspaces (run this first; fixes symlinks)
npm run build        # build every package in dependency order
npm test             # run every package's tests
npm run changeset    # describe a user-facing change + version bump
```

Focus a single package with `-w <npm-name>`, e.g.
`npm run build -w pascal-parser` or `npm test -w pascal-tokenizer`.

## Releasing

Versioning/publishing is handled with Changesets; each package keeps its own
version. User-facing changes require a changeset (`.changeset/*.md`).
