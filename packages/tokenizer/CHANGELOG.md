# pascal-tokenizer

## 0.1.0

### Minor Changes

- 1965329: Track source positions through the toolchain.

  - **pascal-tokenizer**: every emitted token now carries `line` (1-based), `column`
    (1-based) and `offset` (0-based) marking where it starts in the source. Positions
    are computed with a forward-only cursor, so tokenizing stays O(n).
  - **pascal-parser**: `ParseError` now reports where the input went wrong — its
    message is suffixed with `at line L, column C` and its `location` points at the
    offending token, instead of a bare, position-less message.
  - **pascal-code-formatter**: tolerates the new token fields (indentation matching now
    compares tokens by structural identity, not deep object equality).

### Patch Changes

- a3f86d6: Declare `"type": "commonjs"` explicitly in package.json. The packages already ship
  CommonJS; stating it removes Node's module-type detection step for consumers (as flagged
  by publint) and brings these three in line with `pascal-code-formatter`.
