/**
 * Shared vocabulary for the semantic analyzer: the resolved type system, symbol
 * table entries, and diagnostics. Kept separate from `scope.ts`/`symbolTable.ts`/
 * `typeChecker.ts` so every module can depend on the vocabulary without a cycle.
 *
 * @module pascal-semantic-analyzer/types
 */
import { SourceLocation } from 'pascal-parser';

/**
 * The five built-in Pascal scalar types this analyzer knows about. Matches the
 * parser's `TYPE_KEYWORDS` set (packages/parser/src/parser.ts) exactly — that is
 * the only vocabulary a `VariableDeclaration.varType` or `Parameter.paramType` can
 * ever contain, so casting a parsed type-name string into `PrimitiveType` is safe.
 */
export type PrimitiveType = 'integer' | 'real' | 'string' | 'boolean' | 'char';

/** An `array[low..high] of elementType` declaration. Nested/multi-dim arrays are not modeled. */
export interface ArrayType {
  kind: 'array';
  elementType: PrimitiveType;
  low: number;
  high: number;
}

/**
 * A resolved Pascal type.
 * - `'void'` is a procedure's non-return (never a variable's type).
 * - `'unknown'` means the analyzer could not determine a type — an undeclared
 *   identifier, or an expression shape this subset does not model. Every
 *   compatibility check treats `'unknown'` as compatible with anything, so one
 *   root-cause error (e.g. an undeclared identifier) does not cascade into a wall
 *   of unrelated type-mismatch diagnostics for the same expression.
 */
export type PascalType = PrimitiveType | ArrayType | 'void' | 'unknown';

export function formatType(type: PascalType): string {
  if (typeof type === 'string') return type;
  return `array[${type.low}..${type.high}] of ${type.elementType}`;
}

export type SymbolKind = 'variable' | 'constant' | 'parameter' | 'function' | 'procedure';

export interface ParameterInfo {
  name: string;
  type: PascalType;
  isVar: boolean;
}

/** One declared name, as recorded in a `Scope`. */
export interface SymbolEntry {
  /** Original-case spelling (for diagnostics); lookups are case-insensitive. */
  name: string;
  kind: SymbolKind;
  /** Variable/constant/parameter type; return type for a function; `'void'` for a procedure. */
  type: PascalType;
  /** Present only for `kind: 'function' | 'procedure'`. */
  parameters?: ParameterInfo[];
  location?: SourceLocation;
}

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  location?: SourceLocation;
}

/** Thrown by `analyzeStrict` when analysis produced at least one error diagnostic. */
export class SemanticError extends Error {
  constructor(
    message: string,
    public readonly diagnostics: Diagnostic[],
  ) {
    super(message);
    this.name = 'SemanticError';
  }
}
