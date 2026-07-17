# pascal-code-formatter

## 0.1.0

### Minor Changes

- 00944ab: Add `formatPascalSource(code, options?)`: an AST-driven formatter that parses the
  source and pretty-prints the parser's AST into clean, consistently indented Pascal
  text (a string). Because structure comes from the AST rather than string-matching the
  token stream, classification is exact and parentheses are precedence-aware (`a + b * c`,
  not `(a + (b * c))`). Verified to round-trip (output re-parses), be idempotent, and
  preserve semantics (the formatted source compiles to identical JS) across the golden
  fixtures. Also exports `AstFormatter` and the `AstFormatOptions` type.

  The existing token-stream `formatPascalCode` is unchanged. This adds a dependency on
  `pascal-parser`.

### Patch Changes

- 3035567: Drop the `objects-deep-compare` dependency and simplify the indentation tracker. The
  begin/end/var nesting is now an explicit local marker stack instead of a general-purpose
  counterweight structure plus per-token deep-equality — clearer, testable without an
  external dependency, and one fewer package to install. Output is unchanged.
- f5e4ec8: Fix `formatPascalCode` producing output that its own parser would reject. `needWhiteSpace`
  had an ad-hoc allow-list with no rule to separate two adjacent word tokens, so control
  keywords glued to their neighbours (`for`+`i`, `to`+`5`, `do`+`writeln`, `then`+the body).
  Spacing is now driven by a general rule — a space between any two word-like tokens
  (keyword/identifier/number/boolean/string, which also covers the `div`/`mod`/`and`/`or`/`not`
  word operators) plus a leading space before control keywords after `)`/`]`. Trailing
  whitespace is no longer emitted on a token that ends its line. Added a round-trip test
  harness that renders the formatted lines and re-parses them, covering for/while/if-then/case
  bodies on the same line as their header.
- 1965329: Track source positions through the toolchain.

  - **pascal-tokenizer**: every emitted token now carries `line` (1-based), `column`
    (1-based) and `offset` (0-based) marking where it starts in the source. Positions
    are computed with a forward-only cursor, so tokenizing stays O(n).
  - **pascal-parser**: `ParseError` now reports where the input went wrong — its
    message is suffixed with `at line L, column C` and its `location` points at the
    offending token, instead of a bare, position-less message.
  - **pascal-code-formatter**: tolerates the new token fields (indentation matching now
    compares tokens by structural identity, not deep object equality).

- Updated dependencies [14fe8d3]
- Updated dependencies [a3f86d6]
- Updated dependencies [d8861ac]
- Updated dependencies [1965329]
  - pascal-parser@0.3.0
  - pascal-tokenizer@0.1.0
