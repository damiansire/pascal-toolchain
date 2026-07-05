---
'pascal-code-formatter': minor
---

Add `formatPascalSource(code, options?)`: an AST-driven formatter that parses the
source and pretty-prints the parser's AST into clean, consistently indented Pascal
text (a string). Because structure comes from the AST rather than string-matching the
token stream, classification is exact and parentheses are precedence-aware (`a + b * c`,
not `(a + (b * c))`). Verified to round-trip (output re-parses), be idempotent, and
preserve semantics (the formatted source compiles to identical JS) across the golden
fixtures. Also exports `AstFormatter` and the `AstFormatOptions` type.

The existing token-stream `formatPascalCode` is unchanged. This adds a dependency on
`pascal-parser`.
