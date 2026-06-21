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
    IndexExpression,
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
    /** Low bound of each declared array, to offset Pascal indices to 0-based JS. */
    private arrayLowBounds = new Map<string, number>();

    constructor(options: CompileOptions = {}) {
        this.indentUnit = options.indent ?? '  ';
    }

    generate(program: Program): string {
        this.arrayLowBounds = new Map();
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
                const name = this.mapIdentifier(declaration.name);
                if (declaration.arrayBounds) {
                    const { low, high } = declaration.arrayBounds;
                    this.arrayLowBounds.set(name, low);
                    const size = high - low + 1;
                    return [
                        `${pad}let ${name} = new Array(${size}).fill(0); // array[${low}..${high}] of ${declaration.varType}`,
                    ];
                }
                const typeComment = declaration.varType ? ` // ${declaration.varType}` : '';
                return [`${pad}let ${name};${typeComment}`];
            }
            case 'ConstantDeclaration': {
                const value = declaration.value ? this.genExpression(declaration.value) : 'undefined';
                return [`${pad}const ${this.mapIdentifier(declaration.name)} = ${value};`];
            }
            case 'ProcedureDeclaration': {
                const params = this.genParameters(declaration);
                const lines = [`${pad}function ${this.mapIdentifier(declaration.name)}(${params}) {`];
                if (declaration.body) lines.push(...this.genBlock(declaration.body, level + 1));
                lines.push(`${pad}}`);
                return lines;
            }
            case 'FunctionDeclaration': {
                const params = this.genParameters(declaration);
                const lines = [`${pad}function ${this.mapIdentifier(declaration.name)}(${params}) {`];
                // Pascal functions return by assigning to their own name; lower it to `$result`.
                lines.push(`${this.pad(level + 1)}let $result;`);
                const previous = this.currentFunction;
                this.currentFunction = declaration.name.toLowerCase();
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

    /**
     * Renders a subprogram's parameter list. `var` (by-reference) parameters are
     * NOT supported: JS passes scalars by value, so mutating a `var` parameter
     * would silently fail to propagate to the caller. Reject them loudly instead
     * of emitting code that quietly computes the wrong result.
     */
    private genParameters(declaration: Declaration): string {
        const parameters = declaration.parameters ?? [];
        const byRef = parameters.find((p) => p.isVar);
        if (byRef) {
            throw new Error(
                `'var' (by-reference) parameter '${byRef.name}' in '${declaration.name}' is not supported.`,
            );
        }
        return parameters.map((p) => this.mapIdentifier(p.name)).join(', ');
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
                if (this.currentFunction && s.left.type === 'Identifier' && s.left.name.toLowerCase() === this.currentFunction) {
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
            const joined = args.length === 1 ? args[0] : `[${args.join(', ')}].join('')`;
            // process.stdout.write only accepts strings/Buffers, so coerce; console.log tolerates anything.
            const payload = name === 'write' ? `String(${joined})` : joined;
            return `${pad}${sink}(${payload});`;
        }

        // inc(x[, n]) / dec(x[, n]) mutate their first argument.
        if (name === 'inc' || name === 'dec') {
            const op = name === 'inc' ? '+=' : '-=';
            const amount = args.length > 1 ? args[1] : '1';
            return `${pad}${args[0]} ${op} ${amount};`;
        }

        return `${pad}${this.mapIdentifier(statement.name)}(${args.join(', ')});`;
    }

    /** Maps Pascal builtin functions used in expressions to JavaScript. */
    private genBuiltinCall(callee: string, args: string[]): string | null {
        switch (callee.toLowerCase()) {
            case 'abs':
                return `Math.abs(${args[0]})`;
            case 'sqrt':
                return `Math.sqrt(${args[0]})`;
            case 'sqr':
                return `((${args[0]}) ** 2)`;
            case 'trunc':
                return `Math.trunc(${args[0]})`;
            case 'round':
                return `Math.round(${args[0]})`;
            case 'odd':
                return `((${args[0]}) % 2 !== 0)`;
            default:
                return null;
        }
    }

    private genExpression(expression: Expression): string {
        switch (expression.type) {
            case 'BinaryExpression': {
                const e = expression as BinaryExpression;
                const op = e.operator.toLowerCase();
                // and/or are lowered to the boolean operators &&/||. Pascal also overloads
                // them bitwise over integers ('12 and 10' = 8), which this subset does NOT
                // support; reject clearly-integer operands instead of emitting wrong logic.
                if ((op === 'and' || op === 'or') && (this.isIntegerExpression(e.left) || this.isIntegerExpression(e.right))) {
                    throw new Error(
                        `Bitwise '${op}' over integers is not supported; only boolean '${op}' is.`,
                    );
                }
                const left = this.genExpression(e.left);
                const right = this.genExpression(e.right);
                // Pascal integer division has no direct JS operator.
                if (op === 'div') {
                    return `Math.trunc(${left} / ${right})`;
                }
                return `(${left} ${this.mapBinary(e.operator)} ${right})`;
            }
            case 'UnaryExpression': {
                const e = expression as UnaryExpression;
                // 'not' is lowered to '!'. Pascal's bitwise 'not' over integers ('not 0' = -1)
                // is not supported by this boolean-only subset; reject clearly-integer operands.
                if (e.operator.toLowerCase() === 'not' && this.isIntegerExpression(e.argument)) {
                    throw new Error("Bitwise 'not' over integers is not supported; only boolean 'not' is.");
                }
                return `(${this.mapUnary(e.operator)}${this.genExpression(e.argument)})`;
            }
            case 'Identifier':
                return this.mapIdentifier((expression as Identifier).name);
            case 'NumericLiteral':
                return String((expression as NumericLiteral).value);
            case 'StringLiteral':
                // Re-quote: the tokenizer strips the surrounding quotes.
                return JSON.stringify((expression as StringLiteral).value);
            case 'BooleanLiteral':
                return (expression as BooleanLiteral).value ? 'true' : 'false';
            case 'CallExpression': {
                const e = expression as CallExpression;
                const args = e.arguments.map((a) => this.genExpression(a));
                const builtin = this.genBuiltinCall(e.callee, args);
                return builtin ?? `${this.mapIdentifier(e.callee)}(${args.join(', ')})`;
            }
            case 'IndexExpression': {
                const e = expression as IndexExpression;
                const arr = this.genExpression(e.array);
                const idx = this.genExpression(e.index);
                // Offset Pascal's (possibly non-zero) low bound to 0-based JS indexing.
                const low =
                    e.array.type === 'Identifier'
                        ? this.arrayLowBounds.get(this.mapIdentifier((e.array as Identifier).name))
                        : undefined;
                if (low !== undefined && low !== 0) return `${arr}[${idx} - ${low}]`;
                return `${arr}[${idx}]`;
            }
            default:
                throw new Error(`Unsupported expression: ${expression.type}`);
        }
    }

    /**
     * Conservatively decides whether an expression is *clearly* an integer, so that
     * applying and/or/not to it would be a bitwise (unsupported) rather than boolean
     * operation. Only returns true for cases with no boolean reading at all; anything
     * ambiguous (identifiers, calls) returns false to avoid rejecting valid boolean code.
     */
    private isIntegerExpression(expression: Expression): boolean {
        if (expression.type === 'NumericLiteral') {
            return Number.isInteger((expression as NumericLiteral).value);
        }
        if (expression.type === 'BinaryExpression') {
            const e = expression as BinaryExpression;
            const arithmetic = new Set(['+', '-', '*', 'div', 'mod']);
            if (arithmetic.has(e.operator.toLowerCase())) {
                return this.isIntegerExpression(e.left) && this.isIntegerExpression(e.right);
            }
            return false;
        }
        if (expression.type === 'UnaryExpression') {
            const e = expression as UnaryExpression;
            const op = e.operator.toLowerCase();
            if (op === '-' || op === '+') return this.isIntegerExpression(e.argument);
            return false;
        }
        return false;
    }

    /** JS reserved words / globals a canonicalized Pascal name must not shadow. */
    private static readonly JS_RESERVED = new Set([
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
        'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
        'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super',
        'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while',
        'with', 'yield', 'let', 'static', 'await', 'async', 'arguments', 'eval',
        'undefined', 'nan', 'infinity',
    ]);

    /**
     * Maps a Pascal identifier to its JavaScript form. Pascal is case-insensitive
     * for identifiers (ISO 7185 / FPC), so every spelling is canonicalized to
     * lower-case: 'Count' and 'count' therefore resolve to the same JS variable
     * instead of two distinct ones. Names that would collide with a JS reserved
     * word are prefixed with '$' — a character Pascal identifiers cannot contain,
     * so no user name can ever clash with the escaped form.
     */
    private mapIdentifier(name: string): string {
        const canonical = name.toLowerCase();
        return CodeGenerator.JS_RESERVED.has(canonical) ? `$${canonical}` : canonical;
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
