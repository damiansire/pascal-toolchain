---
'pascal-tokenizer': minor
'pascal-parser': minor
'pascal-code-formatter': patch
---

Track source positions through the toolchain.

- **pascal-tokenizer**: every emitted token now carries `line` (1-based), `column`
  (1-based) and `offset` (0-based) marking where it starts in the source. Positions
  are computed with a forward-only cursor, so tokenizing stays O(n).
- **pascal-parser**: `ParseError` now reports where the input went wrong — its
  message is suffixed with `at line L, column C` and its `location` points at the
  offending token, instead of a bare, position-less message.
- **pascal-code-formatter**: tolerates the new token fields (indentation matching now
  compares tokens by structural identity, not deep object equality).
