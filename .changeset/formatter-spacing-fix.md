---
'pascal-code-formatter': patch
---

Fix `formatPascalCode` producing output that its own parser would reject. `needWhiteSpace`
had an ad-hoc allow-list with no rule to separate two adjacent word tokens, so control
keywords glued to their neighbours (`for`+`i`, `to`+`5`, `do`+`writeln`, `then`+the body).
Spacing is now driven by a general rule — a space between any two word-like tokens
(keyword/identifier/number/boolean/string, which also covers the `div`/`mod`/`and`/`or`/`not`
word operators) plus a leading space before control keywords after `)`/`]`. Trailing
whitespace is no longer emitted on a token that ends its line. Added a round-trip test
harness that renders the formatted lines and re-parses them, covering for/while/if-then/case
bodies on the same line as their header.
