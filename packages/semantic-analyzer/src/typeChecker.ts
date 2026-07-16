/**
 * Walks statement/expression bodies using the scope tree `symbolTable.ts` already
 * built: resolves every identifier/call against it (undeclared-name diagnostics)
 * and infers expression types to catch obvious mismatches (assigning a string to
 * an integer variable, calling a function with the wrong number of arguments, …).
 *
 * Explicitly NOT covered (documented, not silently wrong):
 * - Full Pascal numeric promotion rules beyond integer->real widening.
 * - `record` / `pointer` / `set` / `unit` types (out of scope for this package;
 *   see pt-2's conformance matrix for those constructs at the codegen level).
 * - Uninitialized-variable analysis and control-flow-sensitive narrowing.
 * - `var`-parameter aliasing checks.
 * - Verifying a function returns a value on every code path.
 * - Forward declarations / mutual recursion (a subprogram must be declared before
 *   it is called, same restriction the parser's single-pass grammar already implies).
 *
 * @module pascal-semantic-analyzer/typeChecker
 */
import {
  AssignmentStatement,
  CallStatement,
  CaseStatement,
  Declaration,
  Expression,
  ForStatement,
  FunctionDeclaration,
  IfStatement,
  Program,
  ProcedureDeclaration,
  RepeatStatement,
  Statement,
  WhileStatement,
} from 'pascal-parser';
import { Scope } from './scope';
import { ArrayType, Diagnostic, PascalType, PrimitiveType, formatType } from './types';

// Mirrors packages/compiler/src/codegen.ts's EXPRESSION_BUILTINS / STATEMENT_BUILTINS
// exactly, since those are the builtins the compiler actually knows how to emit.
// Duplicated rather than imported: nothing may depend on `pascal-js-compiler` per
// AGENTS.md's dependency direction (compiler -> parser -> tokenizer). If the
// compiler's builtin set changes, this list must be updated to match by hand.
const NUMERIC_UNARY_BUILTINS = new Set(['abs', 'sqr']); // return type = argument's type
const ROUNDING_BUILTINS = new Set(['trunc', 'round']); // real -> integer
const STATEMENT_BUILTINS = new Set(['writeln', 'write', 'inc', 'dec']);

const NUMERIC: ReadonlySet<PrimitiveType> = new Set(['integer', 'real']);
const TEXTUAL: ReadonlySet<PrimitiveType> = new Set(['string', 'char']);

function isNumeric(type: PascalType): boolean {
  return typeof type === 'string' && NUMERIC.has(type as PrimitiveType);
}

function isTextual(type: PascalType): boolean {
  return typeof type === 'string' && TEXTUAL.has(type as PrimitiveType);
}

/**
 * Whether a value of type `source` may be assigned to (or passed where) a
 * `target`-typed slot expects. `'unknown'` is compatible with anything, so one
 * undeclared-identifier error does not cascade into unrelated type errors for the
 * same expression. `char`/`string` are mutually compatible because the tokenizer
 * cannot distinguish them at the literal level (see symbolTable.ts).
 */
export function isAssignable(target: PascalType, source: PascalType): boolean {
  if (target === 'unknown' || source === 'unknown') return true;
  if (target === source) return true;
  if (target === 'real' && source === 'integer') return true;
  if (typeof target === 'string' && typeof source === 'string') {
    return TEXTUAL.has(target as PrimitiveType) && TEXTUAL.has(source as PrimitiveType);
  }
  if (typeof target === 'object' && typeof source === 'object') {
    return (
      target.elementType === source.elementType &&
      target.low === source.low &&
      target.high === source.high
    );
  }
  return false;
}

class TypeChecker {
  readonly diagnostics: Diagnostic[] = [];

  private error(message: string, location: Expression['location'] | undefined): void {
    this.diagnostics.push({ severity: 'error', message, location });
  }

  // ---- expressions --------------------------------------------------------

  inferExpression(expr: Expression, scope: Scope): PascalType {
    switch (expr.type) {
      case 'NumericLiteral':
        return Number.isInteger(expr.value) ? 'integer' : 'real';
      case 'StringLiteral':
        return 'string';
      case 'BooleanLiteral':
        return 'boolean';
      case 'Identifier':
        return this.resolveIdentifier(expr.name, scope, expr.location);
      case 'BinaryExpression':
        return this.inferBinary(expr.operator, expr.left, expr.right, scope, expr.location);
      case 'UnaryExpression':
        return this.inferUnary(expr.operator, expr.argument, scope, expr.location);
      case 'IndexExpression':
        return this.inferIndex(expr.array, expr.index, scope, expr.location);
      case 'CallExpression':
        return this.inferCall(expr.callee, expr.arguments, scope, expr.location);
      /* istanbul ignore next -- Expression is a closed union; no other variant exists. */
      default: {
        const exhaustive: never = expr;
        throw new Error(`Unhandled expression type: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  private resolveIdentifier(
    name: string,
    scope: Scope,
    location: Expression['location'],
  ): PascalType {
    const symbol = scope.resolve(name);
    if (!symbol) {
      this.error(`'${name}' no está declarado`, location);
      return 'unknown';
    }
    if (symbol.kind === 'procedure') {
      this.error(`'${name}' es un procedimiento y no puede usarse como valor`, location);
      return 'unknown';
    }
    return symbol.type;
  }

  private inferBinary(
    operator: string,
    left: Expression,
    right: Expression,
    scope: Scope,
    location: Expression['location'],
  ): PascalType {
    const leftType = this.inferExpression(left, scope);
    const rightType = this.inferExpression(right, scope);
    const op = operator.toLowerCase();

    if (op === '+' && isTextual(leftType) && isTextual(rightType)) return 'string';

    if (['+', '-', '*', '/', 'mod'].includes(op)) {
      if (!isNumeric(leftType) && leftType !== 'unknown') {
        this.error(
          `Operando izquierdo de '${operator}' debe ser numérico, no ${formatType(leftType)}`,
          location,
        );
      }
      if (!isNumeric(rightType) && rightType !== 'unknown') {
        this.error(
          `Operando derecho de '${operator}' debe ser numérico, no ${formatType(rightType)}`,
          location,
        );
      }
      if (op === 'mod') return 'integer';
      return leftType === 'real' || rightType === 'real' ? 'real' : 'integer';
    }

    if (['=', '<>', '<', '<=', '>', '>='].includes(op)) {
      if (!isAssignable(leftType, rightType) && !isAssignable(rightType, leftType)) {
        this.error(
          `No se puede comparar ${formatType(leftType)} con ${formatType(rightType)}`,
          location,
        );
      }
      return 'boolean';
    }

    if (op === 'and' || op === 'or') {
      if (leftType !== 'boolean' && leftType !== 'unknown') {
        this.error(
          `Operando izquierdo de '${operator}' debe ser boolean, no ${formatType(leftType)}`,
          location,
        );
      }
      if (rightType !== 'boolean' && rightType !== 'unknown') {
        this.error(
          `Operando derecho de '${operator}' debe ser boolean, no ${formatType(rightType)}`,
          location,
        );
      }
      return 'boolean';
    }

    return 'unknown';
  }

  private inferUnary(
    operator: string,
    argument: Expression,
    scope: Scope,
    location: Expression['location'],
  ): PascalType {
    const argType = this.inferExpression(argument, scope);
    const op = operator.toLowerCase();
    if (op === 'not') {
      if (argType !== 'boolean' && argType !== 'unknown') {
        this.error(`Operando de 'not' debe ser boolean, no ${formatType(argType)}`, location);
      }
      return 'boolean';
    }
    // Unary +/-
    if (!isNumeric(argType) && argType !== 'unknown') {
      this.error(
        `Operando de '${operator}' unario debe ser numérico, no ${formatType(argType)}`,
        location,
      );
    }
    return argType;
  }

  private inferIndex(
    array: Expression,
    index: Expression,
    scope: Scope,
    location: Expression['location'],
  ): PascalType {
    const arrayType = this.inferExpression(array, scope);
    const indexType = this.inferExpression(index, scope);
    if (indexType !== 'integer' && indexType !== 'unknown') {
      this.error(`El índice de un arreglo debe ser integer, no ${formatType(indexType)}`, location);
    }
    if (arrayType === 'unknown') return 'unknown';
    if (typeof arrayType === 'object' && arrayType.kind === 'array') {
      return (arrayType as ArrayType).elementType;
    }
    this.error(`No se puede indexar un valor de tipo ${formatType(arrayType)}`, location);
    return 'unknown';
  }

  private inferCall(
    callee: string,
    args: readonly Expression[],
    scope: Scope,
    location: Expression['location'],
  ): PascalType {
    const lower = callee.toLowerCase();
    const shadowed = scope.resolve(callee) !== undefined;

    if (
      !shadowed &&
      (NUMERIC_UNARY_BUILTINS.has(lower) ||
        ROUNDING_BUILTINS.has(lower) ||
        lower === 'sqrt' ||
        lower === 'odd')
    ) {
      return this.inferBuiltinCall(lower, args, scope, location);
    }

    const symbol = scope.resolve(callee);
    if (!symbol) {
      this.error(`'${callee}' no está declarado`, location);
      for (const arg of args) this.inferExpression(arg, scope);
      return 'unknown';
    }
    if (symbol.kind !== 'function' && symbol.kind !== 'procedure') {
      this.error(`'${callee}' no es una función y no puede llamarse`, location);
      for (const arg of args) this.inferExpression(arg, scope);
      return 'unknown';
    }
    this.checkArity(callee, symbol.parameters ?? [], args, scope, location);
    return symbol.kind === 'function' ? symbol.type : 'void';
  }

  private inferBuiltinCall(
    name: string,
    args: readonly Expression[],
    scope: Scope,
    location: Expression['location'],
  ): PascalType {
    if (args.length !== 1) {
      this.error(`'${name}' espera exactamente 1 argumento, recibió ${args.length}`, location);
      for (const arg of args) this.inferExpression(arg, scope);
      return 'unknown';
    }
    const argType = this.inferExpression(args[0]!, scope);
    if (name === 'odd') {
      if (argType !== 'integer' && argType !== 'unknown') {
        this.error(`'odd' espera un argumento integer, no ${formatType(argType)}`, location);
      }
      return 'boolean';
    }
    if (!isNumeric(argType) && argType !== 'unknown') {
      this.error(`'${name}' espera un argumento numérico, no ${formatType(argType)}`, location);
    }
    if (name === 'sqrt') return 'real';
    if (ROUNDING_BUILTINS.has(name)) return 'integer';
    return argType; // abs / sqr preserve the operand's numeric type
  }

  private checkArity(
    name: string,
    parameters: readonly { type: PascalType }[],
    args: readonly Expression[],
    scope: Scope,
    location: Expression['location'],
  ): void {
    if (args.length !== parameters.length) {
      this.error(
        `'${name}' espera ${parameters.length} argumento(s), recibió ${args.length}`,
        location,
      );
    }
    const count = Math.min(args.length, parameters.length);
    for (let i = 0; i < count; i++) {
      const argType = this.inferExpression(args[i]!, scope);
      const paramType = parameters[i]!.type;
      if (!isAssignable(paramType, argType)) {
        this.error(
          `Argumento ${i + 1} de '${name}' debe ser ${formatType(paramType)}, no ${formatType(argType)}`,
          location,
        );
      }
    }
    // Extra args beyond the declared arity still get walked, so undeclared
    // identifiers inside them are reported even though the arity already failed.
    for (let i = count; i < args.length; i++) this.inferExpression(args[i]!, scope);
  }

  // ---- statements -----------------------------------------------------------

  checkStatement(stmt: Statement, scope: Scope): void {
    switch (stmt.type) {
      case 'AssignmentStatement':
        this.checkAssignment(stmt, scope);
        return;
      case 'IfStatement':
        this.checkIf(stmt, scope);
        return;
      case 'WhileStatement':
        this.checkWhile(stmt, scope);
        return;
      case 'ForStatement':
        this.checkFor(stmt, scope);
        return;
      case 'RepeatStatement':
        this.checkRepeat(stmt, scope);
        return;
      case 'CaseStatement':
        this.checkCase(stmt, scope);
        return;
      case 'CallStatement':
        this.checkCall(stmt, scope);
        return;
      case 'CompoundStatement':
        for (const s of stmt.statements) this.checkStatement(s, scope);
        return;
      /* istanbul ignore next -- Statement is a closed union; no other variant exists. */
      default: {
        const exhaustive: never = stmt;
        throw new Error(`Unhandled statement type: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  private checkAssignment(stmt: AssignmentStatement, scope: Scope): void {
    const rightType = this.inferExpression(stmt.right, scope);
    if (stmt.left.type === 'Identifier') {
      const symbol = scope.resolve(stmt.left.name);
      if (!symbol) {
        this.error(`'${stmt.left.name}' no está declarado`, stmt.left.location);
        return;
      }
      if (symbol.kind === 'constant') {
        this.error(`No se puede asignar a la constante '${stmt.left.name}'`, stmt.location);
        return;
      }
      if (symbol.kind === 'procedure' || symbol.kind === 'function') {
        this.error(`'${stmt.left.name}' no es una variable asignable`, stmt.location);
        return;
      }
      if (!isAssignable(symbol.type, rightType)) {
        this.error(
          `No se puede asignar ${formatType(rightType)} a '${stmt.left.name}' de tipo ${formatType(symbol.type)}`,
          stmt.location,
        );
      }
      return;
    }
    // IndexExpression target: a[i] := expr
    const leftType = this.inferExpression(stmt.left, scope);
    if (!isAssignable(leftType, rightType)) {
      this.error(
        `No se puede asignar ${formatType(rightType)} a un elemento de tipo ${formatType(leftType)}`,
        stmt.location,
      );
    }
  }

  private checkCondition(condition: Expression, scope: Scope, context: string): void {
    const type = this.inferExpression(condition, scope);
    if (type !== 'boolean' && type !== 'unknown') {
      this.error(
        `La condición de '${context}' debe ser boolean, no ${formatType(type)}`,
        condition.location,
      );
    }
  }

  private checkIf(stmt: IfStatement, scope: Scope): void {
    this.checkCondition(stmt.condition, scope, 'if');
    this.checkStatement(stmt.thenBranch, scope);
    if (stmt.elseBranch) this.checkStatement(stmt.elseBranch, scope);
  }

  private checkWhile(stmt: WhileStatement, scope: Scope): void {
    this.checkCondition(stmt.condition, scope, 'while');
    this.checkStatement(stmt.body, scope);
  }

  private checkFor(stmt: ForStatement, scope: Scope): void {
    const varType = this.resolveIdentifier(stmt.variable.name, scope, stmt.variable.location);
    if (varType !== 'integer' && varType !== 'unknown') {
      this.error(
        `La variable de control de 'for' debe ser integer, no ${formatType(varType)}`,
        stmt.variable.location,
      );
    }
    const startType = this.inferExpression(stmt.start, scope);
    if (startType !== 'integer' && startType !== 'unknown') {
      this.error(
        `El valor inicial de 'for' debe ser integer, no ${formatType(startType)}`,
        stmt.location,
      );
    }
    const endType = this.inferExpression(stmt.end, scope);
    if (endType !== 'integer' && endType !== 'unknown') {
      this.error(
        `El valor final de 'for' debe ser integer, no ${formatType(endType)}`,
        stmt.location,
      );
    }
    this.checkStatement(stmt.body, scope);
  }

  private checkRepeat(stmt: RepeatStatement, scope: Scope): void {
    for (const s of stmt.body) this.checkStatement(s, scope);
    this.checkCondition(stmt.condition, scope, 'repeat..until');
  }

  private checkCase(stmt: CaseStatement, scope: Scope): void {
    this.inferExpression(stmt.expression, scope);
    for (const clause of stmt.clauses) {
      for (const label of clause.labels) this.inferExpression(label, scope);
      this.checkStatement(clause.body, scope);
    }
    if (stmt.elseBranch) this.checkStatement(stmt.elseBranch, scope);
  }

  private checkCall(stmt: CallStatement, scope: Scope): void {
    const lower = stmt.name.toLowerCase();
    const shadowed = scope.resolve(stmt.name) !== undefined;
    if (!shadowed && STATEMENT_BUILTINS.has(lower)) {
      // writeln/write are variadic in this compiler; inc/dec take 1-2 args. Neither
      // shape is checked strictly here — just walk the arguments for undeclared names.
      for (const arg of stmt.arguments) this.inferExpression(arg, scope);
      return;
    }
    const symbol = scope.resolve(stmt.name);
    if (!symbol) {
      this.error(`'${stmt.name}' no está declarado`, stmt.location);
      for (const arg of stmt.arguments) this.inferExpression(arg, scope);
      return;
    }
    if (symbol.kind !== 'function' && symbol.kind !== 'procedure') {
      this.error(
        `'${stmt.name}' no es un procedimiento o función y no puede llamarse`,
        stmt.location,
      );
      for (const arg of stmt.arguments) this.inferExpression(arg, scope);
      return;
    }
    this.checkArity(stmt.name, symbol.parameters ?? [], stmt.arguments, scope, stmt.location);
  }
}

/**
 * Type-checks every declaration body and top-level statement in `program`,
 * resolving identifiers against the scope tree `buildSymbolTable` already built.
 */
export function checkProgram(
  program: Program,
  global: Scope,
  scopeOf: WeakMap<FunctionDeclaration | ProcedureDeclaration, Scope>,
): Diagnostic[] {
  const checker = new TypeChecker();

  const walkDeclarations = (declarations: readonly Declaration[], scope: Scope): void => {
    for (const decl of declarations) {
      if (decl.type === 'ConstantDeclaration') {
        // ConstantDeclaration.value may reference earlier constants; walk it for
        // undeclared-name diagnostics even though its type was already inferred.
        checker.inferExpression(decl.value, scope);
      } else if (decl.type === 'FunctionDeclaration' || decl.type === 'ProcedureDeclaration') {
        const child = scopeOf.get(decl);
        /* istanbul ignore next -- every subprogram gets a scope in buildSymbolTable. */
        if (!child) continue;
        if (decl.body.declarations) walkDeclarations(decl.body.declarations, child);
        for (const stmt of decl.body.statements) checker.checkStatement(stmt, child);
      }
    }
  };

  walkDeclarations(program.declarations, global);
  for (const stmt of program.statements) checker.checkStatement(stmt, global);

  return checker.diagnostics;
}
