# pascal-toolchain playground

An interactive browser playground for the toolchain. Type Pascal on the left and
watch four live views on the right update as you type:

- **Tokens** — the lexer output (`pascal-tokenizer`), as a typed table with source positions.
- **AST** — the parse tree (`pascal-parser`).
- **Formatted** — pretty-printed Pascal (`pascal-code-formatter`).
- **JavaScript** — the compiled output (`pascal-js-compiler`), with a **Run** button
  that executes it and shows the console output.

The editor's syntax highlighting is produced by the toolchain's own tokenizer, so the
playground is coloured by the exact lexer it demonstrates.

## Run it

```bash
npm install        # from this directory
npm run dev        # http://localhost:5173  (or --port 5233 to match .claude/launch.json)
```

The packages are consumed straight from their TypeScript source via Vite aliases (see
`vite.config.ts`), so there is **no build step** — the playground always reflects the
working tree of `../packages`.

## Scripts

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR.                               |
| `npm run build`     | Production build to `dist/` (relative `base`, host-agnostic). |
| `npm run preview`   | Serve the production build.                             |
| `npm test`          | Vitest: highlighter round-trip + end-to-end compile/run. |
| `npm run typecheck` | `tsc --noEmit` against the packages' built `.d.ts`.     |

## Samples

Every sample in the picker is a real golden fixture from
`../packages/compiler/src/__tests__/fixtures/`, so each is guaranteed to tokenize,
parse, format and compile-and-run. Keep `src/samples.ts` in sync if the fixtures change.

## Tests

The playground's own logic is tested without a DOM:

- **`highlight.test.ts`** — the round-trip invariant: stripping the highlight markup must
  reproduce the source verbatim, including string literals (whose `token.value` the lexer
  normalizes) and leading whitespace.
- **`toolchain.test.ts`** — every sample passes all four stages, and the compiled
  FizzBuzz / GCD actually run to the expected output with `console.log` restored afterwards.
