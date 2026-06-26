# pascal-parser

## 0.2.1

### Patch Changes

- 5076723: El parser ahora trata `;` como separador y no como terminador: el punto y coma
  final antes de `end` (o `until`) es opcional, como en Pascal estándar. Dos
  sentencias consecutivas siguen requiriendo `;` entre ellas.

## 0.2.0

### Minor Changes

- Grow the language: local `var`/`const` declarations inside procedures and functions,
  and one-dimensional arrays (`array[lo..hi] of T`) with Pascal 1-based indexing for
  both reads and assignments.
