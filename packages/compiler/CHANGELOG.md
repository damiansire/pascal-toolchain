# pascal-js-compiler

## 0.4.0

### Minor Changes

- c043a37: Export a typed `CompileError`. Unsupported-Pascal errors — `var` (by-reference)
  parameters, bitwise `and`/`or`/`not` over integers, and wrong-arity builtin calls —
  now throw `CompileError` instead of a bare `Error`, so a consumer can `catch` and tell
  "this program uses an unsupported feature" apart from an internal compiler bug (which
  stays a plain `Error`). Mirrors `ParseError` in `pascal-parser`.

### Patch Changes

- 9020b19: Fix silent codegen corruption when two arrays in different scopes share a name. Array
  low-bounds were tracked in a single flat map keyed only by name, so a local `array[1..n]`
  inside a subprogram overwrote the low-bound of a same-named outer array, making the outer
  array's 1-based index offset wrong (writes/reads landed outside the allocated array). Array
  scope is now snapshotted and restored around each subprogram body, so a homonym array in one
  scope no longer changes the meaning of the same identifier in a sibling or outer scope.
- 7855f89: Reject builtins used in the wrong position with a `CompileError` instead of emitting a
  call to a nonexistent JS function. A value-returning builtin used as a statement
  (`abs(x);`) and a statement-only builtin used in an expression (`x := writeln(1)`) used to
  compile to `abs(x);` / `writeln(1)`, which throw `ReferenceError` at runtime. They now fail
  at compile time, consistent with how the compiler already rejects `var` parameters and
  wrong arity. A user subprogram sharing a builtin's name still shadows it in either position.
- a3f86d6: Declare `"type": "commonjs"` explicitly in package.json. The packages already ship
  CommonJS; stating it removes Node's module-type detection step for consumers (as flagged
  by publint) and brings these three in line with `pascal-code-formatter`.
- Updated dependencies [14fe8d3]
- Updated dependencies [a3f86d6]
- Updated dependencies [d8861ac]
- Updated dependencies [1965329]
  - pascal-parser@0.3.0

## 0.3.0

### Minor Changes

- d694653: Add Pascal builtins: `inc`/`dec` statements and `abs`, `sqr`, `sqrt`, `trunc`, `round`, `odd` functions.

## 0.2.0

### Minor Changes

- Grow the language: local `var`/`const` declarations inside procedures and functions,
  and one-dimensional arrays (`array[lo..hi] of T`) with Pascal 1-based indexing for
  both reads and assignments.

### Patch Changes

- Updated dependencies
  - pascal-parser@0.2.0
