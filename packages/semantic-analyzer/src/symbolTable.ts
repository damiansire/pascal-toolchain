/**
 * Builds the scope tree and declares every symbol from a parsed `Program`: global
 * `var`/`const`/`function`/`procedure` declarations, and — recursively — each
 * subprogram's parameters and local declarations. Does not walk statement bodies;
 * that is `typeChecker.ts`'s job, once the full scope tree (including forward
 * subprograms) already exists.
 *
 * @module pascal-semantic-analyzer/symbolTable
 */
import {
  Declaration,
  Expression,
  FunctionDeclaration,
  ProcedureDeclaration,
  Program,
} from 'pascal-parser';
import { Scope } from './scope';
import { Diagnostic, ParameterInfo, PascalType, PrimitiveType, SymbolEntry } from './types';

export interface SymbolTableResult {
  /** The program's top-level scope. Walk `.children` for nested subprogram scopes. */
  global: Scope;
  /** Maps each function/procedure declaration node to the scope created for its body. */
  scopeOf: WeakMap<FunctionDeclaration | ProcedureDeclaration, Scope>;
  diagnostics: Diagnostic[];
}

/** Converts a parsed type name (+ optional array bounds) into a resolved `PascalType`. */
export function toPascalType(
  typeName: string,
  arrayBounds?: { low: number; high: number },
): PascalType {
  const elementType = typeName as PrimitiveType;
  if (arrayBounds) {
    return { kind: 'array', elementType, low: arrayBounds.low, high: arrayBounds.high };
  }
  return elementType;
}

/**
 * Infers a constant's type from its initializer. Only literal initializers are
 * supported (`const Pi = 3.14;`) — a constant bound to a non-literal expression
 * (e.g. another constant, or an arithmetic expression) resolves to `'unknown'`
 * rather than guessed, so it never triggers a false-positive type mismatch later.
 * The tokenizer has no distinct char-literal token (see AGENTS.md / parser.ts), so
 * a quoted literal of any length resolves to `'string'`; `isAssignable` in
 * `typeChecker.ts` treats `'char'` and `'string'` as mutually compatible to
 * compensate.
 */
function inferLiteralType(expr: Expression): PascalType {
  switch (expr.type) {
    case 'NumericLiteral':
      return Number.isInteger(expr.value) ? 'integer' : 'real';
    case 'StringLiteral':
      return 'string';
    case 'BooleanLiteral':
      return 'boolean';
    default:
      return 'unknown';
  }
}

function declareOrReport(scope: Scope, entry: SymbolEntry, diagnostics: Diagnostic[]): void {
  const existing = scope.declare(entry);
  if (existing) {
    diagnostics.push({
      severity: 'error',
      message:
        `'${entry.name}' ya fue declarado en este ámbito ` +
        `(declaración previa: ${existing.kind} '${existing.name}')`,
      location: entry.location,
    });
  }
}

function declareSubprogram(
  scope: Scope,
  decl: FunctionDeclaration | ProcedureDeclaration,
  scopeOf: WeakMap<FunctionDeclaration | ProcedureDeclaration, Scope>,
  diagnostics: Diagnostic[],
): void {
  const isFunction = decl.type === 'FunctionDeclaration';
  const parameters: ParameterInfo[] = decl.parameters.map((p) => ({
    name: p.name,
    type: toPascalType(p.paramType),
    isVar: p.isVar,
  }));
  const returnType: PascalType = isFunction ? toPascalType(decl.returnType) : 'void';

  declareOrReport(
    scope,
    { name: decl.name, kind: isFunction ? 'function' : 'procedure', type: returnType, parameters, location: decl.location },
    diagnostics,
  );

  const child = scope.createChild(decl.name);
  scopeOf.set(decl, child);
  for (const p of parameters) {
    declareOrReport(child, { name: p.name, kind: 'parameter', type: p.type }, diagnostics);
  }
  if (isFunction) {
    // Pascal sets a function's return value by assigning to its own name inside the
    // body (`FunctionName := value;`). Model that as an implicit variable of the
    // return type in the function's own scope, so assignment-compatibility checks
    // apply to it exactly like any other target.
    declareOrReport(child, { name: decl.name, kind: 'variable', type: returnType, location: decl.location }, diagnostics);
  }
  if (decl.body.declarations) {
    declareAll(child, decl.body.declarations, scopeOf, diagnostics);
  }
}

function declareAll(
  scope: Scope,
  declarations: readonly Declaration[],
  scopeOf: WeakMap<FunctionDeclaration | ProcedureDeclaration, Scope>,
  diagnostics: Diagnostic[],
): void {
  for (const decl of declarations) {
    switch (decl.type) {
      case 'VariableDeclaration':
        declareOrReport(
          scope,
          {
            name: decl.name,
            kind: 'variable',
            type: toPascalType(decl.varType, decl.arrayBounds),
            location: decl.location,
          },
          diagnostics,
        );
        break;
      case 'ConstantDeclaration':
        declareOrReport(
          scope,
          { name: decl.name, kind: 'constant', type: inferLiteralType(decl.value), location: decl.location },
          diagnostics,
        );
        break;
      case 'FunctionDeclaration':
      case 'ProcedureDeclaration':
        declareSubprogram(scope, decl, scopeOf, diagnostics);
        break;
      /* istanbul ignore next -- Declaration is a closed union; no other variant exists. */
      default: {
        const exhaustive: never = decl;
        throw new Error(`Unhandled declaration type: ${JSON.stringify(exhaustive)}`);
      }
    }
  }
}

/** Builds the full scope tree for a program: global scope + one nested scope per subprogram. */
export function buildSymbolTable(program: Program): SymbolTableResult {
  const diagnostics: Diagnostic[] = [];
  const scopeOf = new WeakMap<FunctionDeclaration | ProcedureDeclaration, Scope>();
  const global = new Scope('global', program.name, null);
  declareAll(global, program.declarations, scopeOf, diagnostics);
  return { global, scopeOf, diagnostics };
}
