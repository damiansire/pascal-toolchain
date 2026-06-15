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
 * Represents a declaration in Pascal
 */
export interface Declaration extends ASTNode {
  type:
    | 'VariableDeclaration'
    | 'FunctionDeclaration'
    | 'ProcedureDeclaration'
    | 'ConstantDeclaration';
  name: string;
  // For variable declarations
  varType?: string;
  // For function/procedure declarations
  parameters?: Parameter[];
  returnType?: string;
  body?: Block;
  // For constant declarations
  value?: Expression;
  // For array variable declarations: array[low..high] of <varType>
  arrayBounds?: { low: number; high: number };
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
 * Represents a statement in Pascal
 */
export interface Statement extends ASTNode {
  type:
    | 'AssignmentStatement'
    | 'IfStatement'
    | 'WhileStatement'
    | 'ForStatement'
    | 'RepeatStatement'
    | 'CaseStatement'
    | 'CallStatement'
    | 'CompoundStatement';
}

/**
 * Represents an assignment statement
 */
export interface AssignmentStatement extends Statement {
  type: 'AssignmentStatement';
  left: Identifier | IndexExpression;
  right: Expression;
}

/**
 * Represents an if statement
 */
export interface IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenBranch: Statement;
  elseBranch?: Statement;
}

/**
 * Represents a while statement
 */
export interface WhileStatement extends Statement {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement;
}

/**
 * Represents a for statement
 */
export interface ForStatement extends Statement {
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
export interface RepeatStatement extends Statement {
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
export interface CaseStatement extends Statement {
  type: 'CaseStatement';
  expression: Expression;
  clauses: CaseClause[];
  elseBranch?: Statement;
}

/**
 * Represents a procedure/function call
 */
export interface CallStatement extends Statement {
  type: 'CallStatement';
  name: string;
  arguments: Expression[];
}

/**
 * Represents a compound statement (multiple statements)
 */
export interface CompoundStatement extends Statement {
  type: 'CompoundStatement';
  statements: Statement[];
}

/**
 * Represents an expression in Pascal
 */
export interface Expression extends ASTNode {
  type:
    | 'BinaryExpression'
    | 'UnaryExpression'
    | 'Identifier'
    | 'NumericLiteral'
    | 'StringLiteral'
    | 'BooleanLiteral'
    | 'CallExpression'
    | 'IndexExpression';
}

/**
 * Represents a binary expression
 */
export interface BinaryExpression extends Expression {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

/**
 * Represents a unary expression
 */
export interface UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
}

/**
 * Represents an identifier
 */
export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
}

/**
 * Represents a numeric literal
 */
export interface NumericLiteral extends Expression {
  type: 'NumericLiteral';
  value: number;
}

/**
 * Represents a string literal
 */
export interface StringLiteral extends Expression {
  type: 'StringLiteral';
  value: string;
}

/**
 * Represents a boolean literal
 */
export interface BooleanLiteral extends Expression {
  type: 'BooleanLiteral';
  value: boolean;
}

/**
 * Represents a function call expression
 */
export interface CallExpression extends Expression {
  type: 'CallExpression';
  callee: string;
  arguments: Expression[];
}

/**
 * Represents an array index access, e.g. a[i]
 */
export interface IndexExpression extends Expression {
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
