# pascal-js-compiler

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
