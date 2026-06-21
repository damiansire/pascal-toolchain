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

| Package (npm name)      | Path                      | Role                                                           |
| ----------------------- | ------------------------- | -------------------------------------------------------------- |
| `pascal-tokenizer`      | `packages/tokenizer`      | Lexer: Pascal source → token stream.                           |
| `pascal-parser`         | `packages/parser`         | Builds the AST from tokens. Depends on `pascal-tokenizer`.     |
| `pascal-js-compiler`    | `packages/compiler`       | Code generation: AST → JavaScript. Depends on `pascal-parser`. |
| `pascal-code-formatter` | `packages/code-formatter` | Pretty-prints Pascal. Depends on `pascal-tokenizer`.           |

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

## Dependency-pinning policy

Two kinds of coupling exist; they are versioned differently on purpose.

- **Intra-monorepo deps** (`pascal-tokenizer`, `pascal-parser`, `pascal-js-compiler`)
  use a caret range (`^x.y.z`). They are released together through Changesets,
  so the workspace always resolves to a compatible sibling and the caret is
  safe and intended.
- **Cross-repo deps** (libraries published from _other_ repos — currently
  `counterweight-stack` and `objects-deep-compare`, consumed by
  `pascal-code-formatter`) are **pinned to an exact version** (no caret, no
  tilde). These come from a separate release train we do not control in this
  repo, so a `^`/`~` range would let an upstream patch/minor change behavior
  silently. Bumping one of these is a deliberate, reviewed change: update the
  exact version, run `npm run build && npm test`, and ship a changeset.

When you add a new dependency, classify it first: same-repo sibling → caret;
anything published from another repo → exact pin.

## CI gates

`.github/workflows/ci.yml` runs on every PR:

- `build-test` across a Node matrix (18, 20, 22): build in dependency order,
  full test suite, and **type-tests** of the public API (`npm run test:types`,
  tsd against each package's built `.d.ts`).
- `bundle-size`: `npm run size` enforces the per-package budget in
  `.size-limit.json` (minified + brotli). A package that grows past its budget
  fails the check.

Type-tests live in each package's `test-d/*.test-d.ts` and are excluded from the
published tarball by the `files` allowlist.

## Releasing

Versioning/publishing is handled with Changesets; each package keeps its own
version. User-facing changes require a changeset (`.changeset/*.md`).
