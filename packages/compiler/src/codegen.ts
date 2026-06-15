/**
 * Pascal -> JavaScript code generator.
 *
 * Walks the AST produced by `pascal-parser` and emits equivalent JavaScript.
 * The generator targets the full AST contract (declarations, control flow and
 * expressions), so it keeps working as the parser grows beyond its current
 * subset.
 *
 * @module pascal-js-compiler
 */
import {
    parse,
    Program,
    Declaration,
    Block,
    Statement,
    AssignmentStatement,
    IfStatement,
    WhileStatement,
    ForStatement,
    RepeatStatement,
    CaseStatement,
    CallStatement,
    CompoundStatement,
    Expression,
    BinaryExpression,
    UnaryExpression,
    Identifier,
    NumericLiteral,
    StringLiteral,
    BooleanLiteral,
    CallExpression,
} from 'pascal-parser';

/** Options controlling the generated output. */
export interface CompileOptions {
    /** Indentation unit. Defaults to two spaces. */
    indent?: string;
}

/** Maps Pascal binary operators to their JavaScript equivalent. */
const BINARY_OPERATORS: Record<string, string> = {
    '=': '===',
    '<>': '!==',
    '<=': '<=',
    '>=': '>=',
    '<': '<',
    '>': '>',
    '+': '+',
    '-': '-',
    '*': '*',
    '/': '/',
    mod: '%',
    and: '&&',
    or: '||',
};

/** Maps Pascal unary operators to their JavaScript equivalent. */
const UNARY_OPERATORS: Record<string, string> = {
    not: '!',
    '-': '-',
    '+': '+',
};

class CodeGenerator {
    private readonly indentUnit: string;
    /** Name of the function currently being generated, for return-by-name lowering. */
    private currentFunction: string | null = null;

    constructor(options: CompileOptions = {}) {
        this.indentUnit = options.indent ?? '  ';
    }

    generate(program: Program): string {
        const lines: string[] = [`// Generated from Pascal program: ${program.name}`];
        for (const declaration of program.declarations) {
            lines.push(...this.genDeclaration(declaration, 0));
        }
        for (const statement of program.statements) {
            lines.push(...this.genStatement(statement, 0));
        }
        return lines.join('\n') + '\n';
    }

    private pad(level: number): string {
        return this.indentUnit.repeat(level);
    }

    private genDeclaration(declaration: Declaration, level: number): string[] {
        const pad = this.pad(level);
        switch (declaration.type) {
            case 'VariableDeclaration': {
                const typeComment = declaration.varType ? ` // ${declaration.varType}` : '';
                return [`${pad}let ${declaration.name};${typeComment}`];
            }
            case 'ConstantDeclaration': {
                const value = declaration.value ? this.genExpression(declaration.value) : 'undefined';
                return [`${pad}const ${declaration.name} = ${value};`];
            }
            case 'ProcedureDeclaration': {
                const params = (declaration.parameters ?? []).map((p) => p.name).join(', ');
                const lines = [`${pad}function ${declaration.name}(${params}) {`];
                if (declaration.body) lines.push(...this.genBlock(declaration.body, level + 1));
                lines.push(`${pad}}`);
                return lines;
            }
            case 'FunctionDeclaration': {
                const params = (declaration.parameters ?? []).map((p) => p.name).join(', ');
                const lines = [`${pad}function ${declaration.name}(${params}) {`];
                // Pascal functions return by assigning to their own name; lower it to `$result`.
                lines.push(`${this.pad(level + 1)}let $result;`);
                const previous = this.currentFunction;
                this.currentFunction = declaration.name;
                if (declaration.body) lines.push(...this.genBlock(declaration.body, level + 1));
                this.currentFunction = previous;
                lines.push(`${this.pad(level + 1)}return $result;`);
                lines.push(`${pad}}`);
                return lines;
            }
            default:
                throw new Error(`Unsupported declaration: ${(declaration as Declaration).type}`);
        }
    }

    private genBlock(block: Block, level: number): string[] {
        const lines: string[] = [];
        for (const declaration of block.declarations ?? []) {
            lines.push(...this.genDeclaration(declaration, level));
        }
        for (const statement of block.statements) {
            lines.push(...this.genStatement(statement, level));
        }
        return lines;
    }

    /** Emits the statements of a body (then/else/loop body) without braces. */
    private genBody(statement: Statement, level: number): string[] {
        if (statement.type === 'CompoundStatement') {
            const lines: string[] = [];
            for (const inner of (statement as CompoundStatement).statements) {
                lines.push(...this.genStatement(inner, level));
            }
            return lines;
        }
        return this.genStatement(statement, level);
    }

    private genStatement(statement: Statement, level: number): string[] {
        const pad = this.pad(level);
        switch (statement.type) {
            case 'AssignmentStatement': {
                const s = statement as AssignmentStatement;
                // Assignment to the enclosing function's name is a return value.
                if (this.currentFunction && s.left.type === 'Identifier' && s.left.name === this.currentFunction) {
                    return [`${pad}$result = ${this.genExpression(s.right)};`];
                }
                return [`${pad}${this.genExpression(s.left)} = ${this.genExpression(s.right)};`];
            }
            case 'IfStatement': {
                const s = statement as IfStatement;
                const lines = [`${pad}if (${this.genExpression(s.condition)}) {`];
                lines.push(...this.genBody(s.thenBranch, level + 1));
                if (s.elseBranch) {
                    lines.push(`${pad}} else {`);
                    lines.push(...this.genBody(s.elseBranch, level + 1));
                }
                lines.push(`${pad}}`);
                return lines;
            }
            case 'WhileStatement': {
                const s = statement as WhileStatement;
                const lines = [`${pad}while (${this.genExpression(s.condition)}) {`];
                lines.push(...this.genBody(s.body, level + 1));
                lines.push(`${pad}}`);
                return lines;
            }
            case 'ForStatement': {
                const s = statement as ForStatement;
                const v = this.genExpression(s.variable);
                const op = s.direction === 'to' ? '<=' : '>=';
                const step = s.direction === 'to' ? '++' : '--';
                const lines = [
                    `${pad}for (let ${v} = ${this.genExpression(s.start)}; ${v} ${op} ${this.genExpression(
                        s.end,
                    )}; ${v}${step}) {`,
                ];
                lines.push(...this.genBody(s.body, level + 1));
                lines.push(`${pad}}`);
                return lines;
            }
            case 'RepeatStatement': {
                const s = statement as RepeatStatement;
                const lines = [`${pad}do {`];
                for (const inner of s.body) lines.push(...this.genStatement(inner, level + 1));
                // repeat..until loops *until* the condition holds → while not condition.
                lines.push(`${pad}} while (!(${this.genExpression(s.condition)}));`);
                return lines;
            }
            case 'CaseStatement': {
                const s = statement as CaseStatement;
                const lines = [`${pad}switch (${this.genExpression(s.expression)}) {`];
                for (const clause of s.clauses) {
                    for (const label of clause.labels) {
                        lines.push(`${this.pad(level + 1)}case ${this.genExpression(label)}:`);
                    }
                    lines.push(...this.genBody(clause.body, level + 2));
                    lines.push(`${this.pad(level + 2)}break;`);
                }
                if (s.elseBranch) {
                    lines.push(`${this.pad(level + 1)}default:`);
                    lines.push(...this.genBody(s.elseBranch, level + 2));
                }
                lines.push(`${pad}}`);
                return lines;
            }
            case 'CompoundStatement': {
                return this.genBody(statement, level);
            }
            case 'CallStatement': {
                return [this.genCall(statement as CallStatement, pad)];
            }
            default:
                throw new Error(`Unsupported statement: ${statement.type}`);
        }
    }

    /** Emits a call statement, mapping Pascal I/O builtins to JS. */
    private genCall(statement: CallStatement, pad: string): string {
        const name = statement.name.toLowerCase();
        const args = statement.arguments.map((a) => this.genExpression(a));

        if (name === 'writeln' || name === 'write') {
            const sink = name === 'writeln' ? 'console.log' : 'process.stdout.write';
            if (args.length === 0) return `${pad}${sink}('');`;
            // Pascal concatenates arguments with no separator.
            const payload = args.length === 1 ? args[0] : `[${args.join(', ')}].join('')`;
            return `${pad}${sink}(${payload});`;
        }

        return `${pad}${statement.name}(${args.join(', ')});`;
    }

    private genExpression(expression: Expression): string {
        switch (expression.type) {
            case 'BinaryExpression': {
                const e = expression as BinaryExpression;
                const left = this.genExpression(e.left);
                const right = this.genExpression(e.right);
                // Pascal integer division has no direct JS operator.
                if (e.operator.toLowerCase() === 'div') {
                    return `Math.trunc(${left} / ${right})`;
                }
                return `(${left} ${this.mapBinary(e.operator)} ${right})`;
            }
            case 'UnaryExpression': {
                const e = expression as UnaryExpression;
                return `(${this.mapUnary(e.operator)}${this.genExpression(e.argument)})`;
            }
            case 'Identifier':
                return (expression as Identifier).name;
            case 'NumericLiteral':
                return String((expression as NumericLiteral).value);
            case 'StringLiteral':
                // Re-quote: the tokenizer strips the surrounding quotes.
                return JSON.stringify((expression as StringLiteral).value);
            case 'BooleanLiteral':
                return (expression as BooleanLiteral).value ? 'true' : 'false';
            case 'CallExpression': {
                const e = expression as CallExpression;
                return `${e.callee}(${e.arguments.map((a) => this.genExpression(a)).join(', ')})`;
            }
            default:
                throw new Error(`Unsupported expression: ${expression.type}`);
        }
    }

    private mapBinary(operator: string): string {
        const mapped = BINARY_OPERATORS[operator.toLowerCase()];
        if (mapped === undefined) throw new Error(`Unknown binary operator: ${operator}`);
        return mapped;
    }

    private mapUnary(operator: string): string {
        const mapped = UNARY_OPERATORS[operator.toLowerCase()];
        if (mapped === undefined) throw new Error(`Unknown unary operator: ${operator}`);
        return mapped;
    }
}

/**
 * Generates JavaScript source from a parsed Pascal {@link Program} AST.
 *
 * @param program - The AST produced by `pascal-parser`.
 * @param options - Optional formatting options.
 * @returns The generated JavaScript source.
 */
export function generate(program: Program, options?: CompileOptions): string {
    return new CodeGenerator(options).generate(program);
}

/**
 * Compiles Pascal source code into JavaScript.
 *
 * This is the end-to-end entry point: it tokenizes and parses the Pascal
 * source (via `pascal-parser`) and emits JavaScript.
 *
 * @param source - The Pascal source code.
 * @param options - Optional formatting options.
 * @returns The generated JavaScript source.
 * @throws {ParseError} If the Pascal source cannot be parsed.
 */
export function compile(source: string, options?: CompileOptions): string {
    return generate(parse(source), options);
}
