---
'pascal-js-compiler': minor
---

Export a typed `CompileError`. Unsupported-Pascal errors — `var` (by-reference)
parameters, bitwise `and`/`or`/`not` over integers, and wrong-arity builtin calls —
now throw `CompileError` instead of a bare `Error`, so a consumer can `catch` and tell
"this program uses an unsupported feature" apart from an internal compiler bug (which
stays a plain `Error`). Mirrors `ParseError` in `pascal-parser`.
