---
'pascal-js-compiler': patch
---

Reject builtins used in the wrong position with a `CompileError` instead of emitting a
call to a nonexistent JS function. A value-returning builtin used as a statement
(`abs(x);`) and a statement-only builtin used in an expression (`x := writeln(1)`) used to
compile to `abs(x);` / `writeln(1)`, which throw `ReferenceError` at runtime. They now fail
at compile time, consistent with how the compiler already rejects `var` parameters and
wrong arity. A user subprogram sharing a builtin's name still shadows it in either position.
