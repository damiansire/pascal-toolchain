# Roadmap — pascal-toolchain

Pending work, roughly in priority order. The toolchain already supports a usable
procedural subset (see README); these extend it.

## Parser / language features
- [ ] **Local variables** in procedures/functions — requires extending the `Block`
      AST node to carry its own declarations (today subprograms only have parameters).
- [ ] **Arrays** — `array[lo..hi] of T`, indexing, `for` over ranges.
- [ ] **Records** — `record ... end`, field access.
- [ ] **Sets** — `set of`, `in` operator.
- [ ] **More builtins** — `read`/`readln`, `length`, `inc`/`dec`, string helpers.
- [ ] **Real source locations** — the tokenizer currently emits zeroed positions;
      track line/column to produce meaningful parse-error messages.

## Compiler (pascal-js-compiler)
- [ ] Honor `var` (by-reference) parameters — today they compile as by-value.
- [ ] Map Pascal types to richer JS runtime where it matters (integer vs real division).
- [ ] Optional source maps.

## Tooling / infra
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
