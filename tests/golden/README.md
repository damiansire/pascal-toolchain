# Golden corpus

Corpus of Pascal programs with their expected outcome, exercised end to end
on every `npm test` run by `packages/parser/src/__tests__/golden.test.ts`.

## Layout

```
tests/golden/
  valid/     <name>.pas + <name>.ast.json    parse must produce exactly this AST
  invalid/   <name>.pas + <name>.error.txt   parse must throw exactly this diagnostic
```

- `*.ast.json` is the full AST as JSON (locations included).
- `*.error.txt` is one line: `ErrorName: message` (`ParseError` or
  `TokenizeError`, with its `at line L, column C` suffix). Generic exceptions
  never count as a pass: the runner asserts the error is a typed diagnostic.

## Adding a case

1. Drop a `.pas` file in `valid/` or `invalid/`.
2. Regenerate the goldens:

   ```bash
   UPDATE_GOLDEN=1 npm test -w pascal-parser -- golden
   ```

3. Review the generated `.ast.json` / `.error.txt` in the diff like any other
   code change: the golden IS the assertion, so a wrong golden locks in a bug.

The same command regenerates every golden after an intentional AST or
diagnostic change. The runner also fails if a golden file has no matching
`.pas` source, so stale snapshots cannot linger.

Note on line endings: the runner normalizes CRLF to LF before parsing and
before comparing, so the recorded offsets/columns are stable regardless of
`core.autocrlf`.
