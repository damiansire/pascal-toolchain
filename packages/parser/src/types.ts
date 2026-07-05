/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  type: string;
  location?: SourceLocation;
}

/**
 * Represents a location in the source code
 */
export interface SourceLocation {
  start: Position;
  end: Position;
}

/**
 * Represents a position in the source code
 */
export interface Position {
  line: number;
  column: number;
  offset: number;
}

/**
 * Represents a Pascal program
 */
export interface Program extends ASTNode {
  type: 'Program';
  name: string;
  declarations: Declaration[];
  statements: Statement[];
}

/**
 * Any Pascal declaration. Discriminated union over `type`, so a `switch (decl.type)`
 * narrows to the concrete node in each branch with no cast — matching Statement and
 * Expression. Each variant carries exactly the fields it needs (a `var` has a
 * `varType`, a `function` a `returnType`, …) instead of one wide interface where
 * every field is optional and any combination is representable.
 */
export type Declaration =
  | VariableDeclaration
  | FunctionDeclaration
  | ProcedureDeclaration
  | ConstantDeclaration;

/** A `var` declaration: `name: varType`, optionally `array[low..high] of varType`. */
export interface VariableDeclaration extends ASTNode {
  type: 'VariableDeclaration';
  name: string;
  varType: string;
  arrayBounds?: { low: number; high: number };
}

/** A `function` declaration: parameters plus a return type and a body. */
export interface FunctionDeclaration extends ASTNode {
  type: 'FunctionDeclaration';
  name: string;
  parameters: Parameter[];
  returnType: string;
  body: Block;
}

/** A `procedure` declaration: like a function but with no return type. */
export interface ProcedureDeclaration extends ASTNode {
  type: 'ProcedureDeclaration';
  name: string;
  parameters: Parameter[];
  body: Block;
}

/** A `const` declaration bound to a constant expression. */
export interface ConstantDeclaration extends ASTNode {
  type: 'ConstantDeclaration';
  name: string;
  value: Expression;
}

/**
 * Represents a function/procedure parameter
 */
export interface Parameter extends ASTNode {
  type: 'Parameter';
  name: string;
  paramType: string;
  isVar: boolean;
}

/**
 * Represents a block of code (begin..end)
 */
export interface Block extends ASTNode {
  type: 'Block';
  declarations?: Declaration[];
  statements: Statement[];
}

/**
 * Any Pascal statement. Discriminated union over `type`, so a `switch (stmt.type)`
 * narrows to the concrete node in each branch with no cast.
 */
export type Statement =
  | AssignmentStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | RepeatStatement
  | CaseStatement
  | CallStatement
  | CompoundStatement;

/**
 * Represents an assignment statement
 */
export interface AssignmentStatement extends ASTNode {
  type: 'AssignmentStatement';
  left: Identifier | IndexExpression;
  right: Expression;
}

/**
 * Represents an if statement
 */
export interface IfStatement extends ASTNode {
  type: 'IfStatement';
  condition: Expression;
  thenBranch: Statement;
  elseBranch?: Statement;
}

/**
 * Represents a while statement
 */
export interface WhileStatement extends ASTNode {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement;
}

/**
 * Represents a for statement
 */
export interface ForStatement extends ASTNode {
  type: 'ForStatement';
  variable: Identifier;
  start: Expression;
  end: Expression;
  body: Statement;
  direction: 'to' | 'downto';
}

/**
 * Represents a repeat..until statement (post-condition loop)
 */
export interface RepeatStatement extends ASTNode {
  type: 'RepeatStatement';
  body: Statement[];
  condition: Expression;
}

/**
 * A single branch of a case statement: one or more labels and a body.
 */
export interface CaseClause {
  labels: Expression[];
  body: Statement;
}

/**
 * Represents a case..of statement (multi-way branch)
 */
export interface CaseStatement extends ASTNode {
  type: 'CaseStatement';
  expression: Expression;
  clauses: CaseClause[];
  elseBranch?: Statement;
}

/**
 * Represents a procedure/function call
 */
export interface CallStatement extends ASTNode {
  type: 'CallStatement';
  name: string;
  arguments: Expression[];
}

/**
 * Represents a compound statement (multiple statements)
 */
export interface CompoundStatement extends ASTNode {
  type: 'CompoundStatement';
  statements: Statement[];
}

/**
 * Any Pascal expression. Discriminated union over `type`, so a `switch (expr.type)`
 * narrows to the concrete node in each branch with no cast.
 */
export type Expression =
  | BinaryExpression
  | UnaryExpression
  | Identifier
  | NumericLiteral
  | StringLiteral
  | BooleanLiteral
  | CallExpression
  | IndexExpression;

/**
 * Represents a binary expression
 */
export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

/**
 * Represents a unary expression
 */
export interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
}

/**
 * Represents an identifier
 */
export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}

/**
 * Represents a numeric literal
 */
export interface NumericLiteral extends ASTNode {
  type: 'NumericLiteral';
  value: number;
}

/**
 * Represents a string literal
 */
export interface StringLiteral extends ASTNode {
  type: 'StringLiteral';
  value: string;
}

/**
 * Represents a boolean literal
 */
export interface BooleanLiteral extends ASTNode {
  type: 'BooleanLiteral';
  value: boolean;
}

/**
 * Represents a function call expression
 */
export interface CallExpression extends ASTNode {
  type: 'CallExpression';
  callee: string;
  arguments: Expression[];
}

/**
 * Represents an array index access, e.g. a[i]
 */
export interface IndexExpression extends ASTNode {
  type: 'IndexExpression';
  array: Expression;
  index: Expression;
}

/**
 * Error thrown when parsing fails
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public location?: SourceLocation,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}
