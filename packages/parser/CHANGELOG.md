# pascal-parser

## 0.3.0

### Minor Changes

- 14fe8d3: `Declaration` is now a discriminated union (`VariableDeclaration | FunctionDeclaration
| ProcedureDeclaration | ConstantDeclaration`) instead of one wide interface where every
  field was optional. Each variant is exported and carries exactly the fields it has, so a
  `switch (decl.type)` narrows to the concrete node with no cast — matching how `Statement`
  and `Expression` already work. Consumers that switch on `decl.type` gain precise field
  types; code that read fields like `decl.parameters` off a bare `Declaration` without
  narrowing must now narrow first.
- d8861ac: Statement AST nodes now carry their real source location (`location.start` = the
  line/column/offset of their first token), stamped in `parseStatement`. Previously
  every node location was zeroed. This enables consumers to map a statement back to
  its source line — the playground step-debugger being the first such consumer.
  Expression and declaration nodes remain zeroed until they too have a position
  consumer.
- 1965329: Track source positions through the toolchain.

  - **pascal-tokenizer**: every emitted token now carries `line` (1-based), `column`
    (1-based) and `offset` (0-based) marking where it starts in the source. Positions
    are computed with a forward-only cursor, so tokenizing stays O(n).
  - **pascal-parser**: `ParseError` now reports where the input went wrong — its
    message is suffixed with `at line L, column C` and its `location` points at the
    offending token, instead of a bare, position-less message.
  - **pascal-code-formatter**: tolerates the new token fields (indentation matching now
    compares tokens by structural identity, not deep object equality).

### Patch Changes

- a3f86d6: Declare `"type": "commonjs"` explicitly in package.json. The packages already ship
  CommonJS; stating it removes Node's module-type detection step for consumers (as flagged
  by publint) and brings these three in line with `pascal-code-formatter`.
- Updated dependencies [a3f86d6]
- Updated dependencies [1965329]
  - pascal-tokenizer@0.1.0

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
