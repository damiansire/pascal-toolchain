import {
  parse,
  Program,
  Declaration,
  FunctionDeclaration,
  ProcedureDeclaration,
  Parameter,
  Block,
  Statement,
  Expression,
} from 'pascal-parser';

/** Options for the AST-driven formatter. */
export interface AstFormatOptions {
  /** Indentation unit. Defaults to two spaces. */
  indent?: string;
}

// Binary operator precedence, matching pascal-parser (higher binds tighter). Used to
// decide where parentheses are actually needed, so the output is `a + b * c`, not
// `(a + (b * c))`. Operators arrive lower-cased from `formatOperator`.
const PRECEDENCE: Record<string, number> = {
  '=': 1,
  '<>': 1,
  '<': 1,
  '<=': 1,
  '>': 1,
  '>=': 1,
  '+': 2,
  '-': 2,
  or: 2,
  '*': 3,
  '/': 3,
  div: 3,
  mod: 3,
  and: 3,
};

// Word operators render with surrounding spaces (`a div b`), symbols too (`a + b`),
// but a unary word operator needs a trailing space (`not x`) and a unary symbol does
// not (`-x`). WORD_OPERATORS drives that spacing decision.
const WORD_OPERATORS = new Set(['div', 'mod', 'and', 'or', 'not']);

/**
 * Formats a Pascal AST back into clean, indented Pascal source. Unlike the
 * token-stream formatter (`formatPascalCode`), structure comes from the parser's
 * AST, so classification is exact — no string-matching token values, no
 * misclassification, precedence-aware parentheses.
 */
class AstFormatter {
  private readonly indentUnit: string;

  constructor(options: AstFormatOptions = {}) {
    this.indentUnit = options.indent ?? '  ';
  }

  format(program: Program): string {
    const lines: string[] = [`program ${program.name};`];
    if (program.declarations.length > 0) {
      lines.push('');
      lines.push(...this.formatDeclarations(program.declarations, 0));
    }
    lines.push('');
    lines.push('begin');
    lines.push(...this.formatStatementList(program.statements, 1));
    lines.push('end.');
    return lines.join('\n') + '\n';
  }

  private pad(level: number): string {
    return this.indentUnit.repeat(level);
  }

  // Groups consecutive const/var declarations under a single `const`/`var` header
  // (the parser emits one node per name), and emits each subprogram as its own block.
  private formatDeclarations(declarations: readonly Declaration[], level: number): string[] {
    const lines: string[] = [];
    const pad = this.pad(level);
    let index = 0;
    let firstGroup = true;
    const spacer = (): void => {
      if (!firstGroup) lines.push('');
      firstGroup = false;
    };
    while (index < declarations.length) {
      const declaration = declarations[index];
      if (declaration === undefined) break; // satisfies noUncheckedIndexedAccess
      if (declaration.type === 'ConstantDeclaration') {
        spacer();
        lines.push(`${pad}const`);
        while (index < declarations.length && declarations[index]?.type === 'ConstantDeclaration') {
          const c = declarations[index] as Extract<Declaration, { type: 'ConstantDeclaration' }>;
          lines.push(`${this.pad(level + 1)}${c.name} = ${this.formatExpression(c.value)};`);
          index++;
        }
      } else if (declaration.type === 'VariableDeclaration') {
        spacer();
        lines.push(`${pad}var`);
        while (index < declarations.length && declarations[index]?.type === 'VariableDeclaration') {
          const v = declarations[index] as Extract<Declaration, { type: 'VariableDeclaration' }>;
          lines.push(`${this.pad(level + 1)}${v.name}: ${this.formatVarType(v)};`);
          index++;
        }
      } else {
        spacer();
        lines.push(...this.formatSubprogram(declaration, level));
        index++;
      }
    }
    return lines;
  }

  private formatVarType(v: Extract<Declaration, { type: 'VariableDeclaration' }>): string {
    if (v.arrayBounds) {
      return `array[${v.arrayBounds.low}..${v.arrayBounds.high}] of ${v.varType}`;
    }
    return v.varType;
  }

  private formatSubprogram(
    declaration: FunctionDeclaration | ProcedureDeclaration,
    level: number,
  ): string[] {
    const pad = this.pad(level);
    const params = this.formatParameters(declaration.parameters);
    const header =
      declaration.type === 'FunctionDeclaration'
        ? `${pad}function ${declaration.name}${params}: ${declaration.returnType};`
        : `${pad}procedure ${declaration.name}${params};`;
    return [header, ...this.formatBlock(declaration.body, level)];
  }

  private formatParameters(parameters: readonly Parameter[]): string {
    if (parameters.length === 0) return '';
    const parts = parameters.map((p) => `${p.isVar ? 'var ' : ''}${p.name}: ${p.paramType}`);
    return `(${parts.join('; ')})`;
  }

  // A subprogram body: optional local declarations, then a `begin`..`end` block.
  private formatBlock(block: Block, level: number): string[] {
    const pad = this.pad(level);
    const lines: string[] = [];
    if (block.declarations && block.declarations.length > 0) {
      lines.push(...this.formatDeclarations(block.declarations, level));
    }
    lines.push(`${pad}begin`);
    lines.push(...this.formatStatementList(block.statements, level + 1));
    lines.push(`${pad}end;`);
    return lines;
  }

  // Formats a `;`-separated statement sequence: each statement is emitted without a
  // terminator, then `;` is appended to its last line. This keeps the terminator on
  // the whole statement (e.g. after a nested `end`), not on an inner sub-statement.
  private formatStatementList(statements: readonly Statement[], level: number): string[] {
    const lines: string[] = [];
    for (const statement of statements) {
      const stmtLines = this.formatStatement(statement, level);
      if (stmtLines.length > 0) {
        stmtLines[stmtLines.length - 1] += ';';
      }
      lines.push(...stmtLines);
    }
    return lines;
  }

  // Returns the lines for one statement, indented at `level`, WITHOUT a trailing `;`
  // (the caller adds it). Sub-statements used as control-flow bodies go through
  // `formatBranch`, which handles the begin/end-vs-single-line indentation.
  private formatStatement(statement: Statement, level: number): string[] {
    const pad = this.pad(level);
    switch (statement.type) {
      case 'AssignmentStatement':
        return [
          `${pad}${this.formatExpression(statement.left)} := ${this.formatExpression(statement.right)}`,
        ];
      case 'CallStatement': {
        const args = statement.arguments.map((a) => this.formatExpression(a));
        return [
          args.length > 0
            ? `${pad}${statement.name}(${args.join(', ')})`
            : `${pad}${statement.name}`,
        ];
      }
      case 'CompoundStatement':
        return [
          `${pad}begin`,
          ...this.formatStatementList(statement.statements, level + 1),
          `${pad}end`,
        ];
      case 'IfStatement': {
        const lines = [`${pad}if ${this.formatExpression(statement.condition)} then`];
        lines.push(...this.formatBranch(statement.thenBranch, level));
        if (statement.elseBranch) {
          lines.push(`${pad}else`);
          lines.push(...this.formatBranch(statement.elseBranch, level));
        }
        return lines;
      }
      case 'WhileStatement': {
        const lines = [`${pad}while ${this.formatExpression(statement.condition)} do`];
        lines.push(...this.formatBranch(statement.body, level));
        return lines;
      }
      case 'ForStatement': {
        const start = this.formatExpression(statement.start);
        const end = this.formatExpression(statement.end);
        const header = `${pad}for ${statement.variable.name} := ${start} ${statement.direction} ${end} do`;
        return [header, ...this.formatBranch(statement.body, level)];
      }
      case 'RepeatStatement':
        return [
          `${pad}repeat`,
          ...this.formatStatementList(statement.body, level + 1),
          `${pad}until ${this.formatExpression(statement.condition)}`,
        ];
      case 'CaseStatement': {
        const lines = [`${pad}case ${this.formatExpression(statement.expression)} of`];
        for (const clause of statement.clauses) {
          const labels = clause.labels.map((l) => this.formatExpression(l)).join(', ');
          const body = this.formatStatement(clause.body, level + 1);
          // Inline a single-line body after the label; otherwise start it on the next line.
          if (body.length === 1) {
            lines.push(`${this.pad(level + 1)}${labels}: ${body[0]!.trimStart()};`);
          } else {
            lines.push(`${this.pad(level + 1)}${labels}:`);
            if (body.length > 0) body[body.length - 1] += ';';
            lines.push(...body);
          }
        }
        if (statement.elseBranch) {
          lines.push(`${this.pad(level + 1)}else`);
          const elseLines = this.formatStatement(statement.elseBranch, level + 2);
          if (elseLines.length > 0) elseLines[elseLines.length - 1] += ';';
          lines.push(...elseLines);
        }
        lines.push(`${pad}end`);
        return lines;
      }
      default:
        return this.assertNever(statement);
    }
  }

  // A control-flow body: a compound statement keeps its `begin`/`end` at the control
  // keyword's level; any other statement is indented one level under it.
  private formatBranch(statement: Statement, level: number): string[] {
    if (statement.type === 'CompoundStatement') {
      return this.formatStatement(statement, level);
    }
    return this.formatStatement(statement, level + 1);
  }

  private formatExpression(expression: Expression): string {
    switch (expression.type) {
      case 'BinaryExpression': {
        const op = this.formatOperator(expression.operator);
        const parentPrec = PRECEDENCE[op] ?? 0;
        const left = this.formatOperand(expression.left, parentPrec, false);
        const right = this.formatOperand(expression.right, parentPrec, true);
        return `${left} ${op} ${right}`;
      }
      case 'UnaryExpression': {
        const op = this.formatOperator(expression.operator);
        const arg = this.formatExpression(expression.argument);
        // Parenthesize a binary argument so `not a and b` cannot be misread.
        const inner = expression.argument.type === 'BinaryExpression' ? `(${arg})` : arg;
        return WORD_OPERATORS.has(op) ? `${op} ${inner}` : `${op}${inner}`;
      }
      case 'Identifier':
        return expression.name;
      case 'NumericLiteral':
        return String(expression.value);
      case 'StringLiteral':
        return `'${expression.value.replace(/'/g, "''")}'`;
      case 'BooleanLiteral':
        return expression.value ? 'true' : 'false';
      case 'CallExpression': {
        const args = expression.arguments.map((a) => this.formatExpression(a));
        return `${expression.callee}(${args.join(', ')})`;
      }
      case 'IndexExpression':
        return `${this.formatExpression(expression.array)}[${this.formatExpression(expression.index)}]`;
      default:
        return this.assertNever(expression);
    }
  }

  // Renders a binary operand, adding parentheses only when precedence requires it.
  // For the right operand, equal precedence also needs parens to preserve the
  // left-associative grouping the parser built (`a - (b - c)` must not become `a - b - c`).
  private formatOperand(expression: Expression, parentPrec: number, isRight: boolean): string {
    const text = this.formatExpression(expression);
    if (expression.type !== 'BinaryExpression') return text;
    const childPrec = PRECEDENCE[this.formatOperator(expression.operator)] ?? 0;
    const needsParens = isRight ? childPrec <= parentPrec : childPrec < parentPrec;
    return needsParens ? `(${text})` : text;
  }

  private formatOperator(operator: string): string {
    return operator.toLowerCase();
  }

  private assertNever(node: never): never {
    throw new Error(`Unsupported AST node: ${(node as { type: string }).type}`);
  }
}

/**
 * Formats Pascal source by parsing it to an AST and pretty-printing the AST. Produces
 * clean, consistently indented Pascal text. Throws `ParseError`/`TokenizeError` (from
 * pascal-parser) if the input is not valid Pascal.
 */
export const formatPascalSource = (code: string, options: AstFormatOptions = {}): string => {
  return new AstFormatter(options).format(parse(code));
};

export { AstFormatter };
