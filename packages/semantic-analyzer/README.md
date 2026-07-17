# pascal-semantic-analyzer

Symbol table, scope resolution and basic type checking over the AST produced
by [`pascal-parser`](../parser). Not yet published to npm, and not wired into
`pascal-js-compiler`: it runs standalone against a parsed `Program`.

## Usage

```typescript
import { parse } from 'pascal-parser';
import { analyze, analyzeStrict } from 'pascal-semantic-analyzer';

const program = parse(source);

// Never throws: every finding comes back as a diagnostic.
const { scope, diagnostics } = analyze(program);

// Throws SemanticError if any diagnostic has severity 'error'.
const result = analyzeStrict(program);
```

## What it checks

- **Symbol table / scope resolution** (`scope.ts`, `symbolTable.ts`): declares
  variables, constants, parameters, functions and procedures per scope,
  case-insensitively, and reports redeclarations and undeclared identifiers.
- **Type checking** (`typeChecker.ts`): the five built-in scalar types
  (`integer`, `real`, `string`, `boolean`, `char`) plus one-dimensional
  `array[lo..hi] of T`. An `'unknown'` type (undeclared identifier or an
  expression shape this subset doesn't model) is treated as compatible with
  anything, so one root-cause error doesn't cascade into unrelated
  type-mismatch diagnostics for the same expression.

Nested/multi-dimensional arrays and records are not modeled (see the
repo-root [`ROADMAP.md`](../../ROADMAP.md)).

## Development

```bash
npm run build   # tsc
npm test        # jest
npm run docs    # typedoc
```

## License

MIT © Damian Sire
