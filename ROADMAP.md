# Roadmap — pascal-toolchain

Pending work, roughly in priority order. The toolchain already supports a usable
procedural subset (see README); these extend it.

## Parser / language features

- [x] **Local variables** in procedures/functions (the `Block` AST node now carries
      its own declarations). _Shipped in pascal-parser@0.2.0._
- [x] **Arrays** — `array[lo..hi] of T`, indexing (1-based), assignment targets.
      _Shipped in pascal-parser@0.2.0 / pascal-js-compiler@0.2.0._
- [ ] **Multi-dimensional arrays** — `array[1..3, 1..3]`.
- [ ] **Records** — `record ... end`, field access.
- [ ] **Sets** — `set of`, `in` operator.
- [ ] **More builtins** — `read`/`readln`, `length`, string helpers. (`inc`/`dec` and
      `abs`/`sqrt`/`sqr`/`trunc`/`round`/`odd` already ship.)
- [x] **Real source locations (tokens)** — the tokenizer stamps 1-based line/column and
      0-based offset on every token, and `ParseError` reports `at line L, column C` with a
      `location` (pending release via Changesets).
- [~] **AST node source locations** — statement nodes now carry a real start position
      (stamped from their first token in `parseStatement`), for the playground debugger.
      Still pending: expression/declaration nodes, and the full first-token..last-token
      span (statements currently carry only the start token's span).

## Compiler (pascal-js-compiler)

- [ ] Honor `var` (by-reference) parameters — today they are rejected with a
      `CompileError` (emitting by-value would silently compute the wrong result).
- [ ] Map Pascal types to richer JS runtime where it matters (integer vs real division).
- [ ] Optional source maps.

## Tooling / infra

- [x] **Interactive playground** (`playground/`) — live tokens / AST / formatted / compiled
      JS with a Run button, editor highlighted by the toolchain's own lexer. Consumes the
      packages from source via Vite aliases; samples are the compiler golden fixtures.
- [ ] **Publish to GitHub** + GitHub Actions CI (build, test, changesets release).
- [ ] First npm release via Changesets (`pascal-parser` is unpublished; `pascal-js-compiler` is new).
- [ ] **FPC conformance harness** — clone `FPCSource/tests/`, attempt to compile each
      `.pas`, classify (parses / fails-parse / runs-ok), and report language-coverage %.
      Best run as a multi-agent fan-out; shows exactly which features to add next.

## Cleanup

- [ ] Archive the upstream single-package repos (`pascal-tokenizer`, `pascal-parser`,
      `pascal-code-formatter`) with a pointer to this monorepo — only after publishing.
- [ ] The standalone `pascal-interpreter` repo is a stub (name collides with an
      unrelated npm package); archive it. A real codegen lives here as `pascal-js-compiler`.
