---
'pascal-code-formatter': patch
---

Drop the `objects-deep-compare` dependency and simplify the indentation tracker. The
begin/end/var nesting is now an explicit local marker stack instead of a general-purpose
counterweight structure plus per-token deep-equality — clearer, testable without an
external dependency, and one fewer package to install. Output is unchanged.
