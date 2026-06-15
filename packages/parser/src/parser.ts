import {
    Program,
    ParseError,
    Declaration,
    Parameter,
    Block,
    Statement,
    AssignmentStatement,
    IfStatement,
    WhileStatement,
    ForStatement,
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
    SourceLocation,
} from './types';
import { tokenizePascal, PascalToken, TokenType } from 'pascal-tokenizer';

/** Symbol-operator tokens mapped to their Pascal spelling. */
const SYMBOL_OPERATORS: Partial<Record<TokenType, string>> = {
    OPERATOR_EQUAL: '=',
    OPERATOR_NOT_EQUAL: '<>',
    OPERATOR_LESS_EQUAL: '<=',
    OPERATOR_GREATER_EQUAL: '>=',
    OPERATOR_LESS: '<',
    OPERATOR_GREATER: '>',
    OPERATOR_PLUS: '+',
    OPERATOR_MINUS: '-',
    OPERATOR_MULTIPLY: '*',
    OPERATOR_DIVIDE: '/',
};

// Word operators arrive from the tokenizer as identifiers.
const RELATIONAL_OPS = new Set(['=', '<>', '<=', '>=', '<', '>']);
const ADDITIVE_OPS = new Set(['+', '-', 'or']);
const MULTIPLICATIVE_OPS = new Set(['*', '/', 'div', 'mod', 'and']);
const WORD_BINARY_OPS = new Set(['div', 'mod', 'and', 'or']);
const TYPE_KEYWORDS = new Set(['integer', 'real', 'char', 'string', 'boolean']);

class Parser {
    private tokens: PascalToken[] = [];
    private current: number = 0;

    constructor(source: string) {
        this.tokens = tokenizePascal(source);
    }

    // ---- token helpers -----------------------------------------------------

    private peek(): PascalToken {
        return this.tokens[this.current];
    }

    private previous(): PascalToken {
        return this.tokens[this.current - 1];
    }

    private isAtEnd(): boolean {
        return this.peek().type === 'EOF';
    }

    private advance(): PascalToken {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private check(type: TokenType): boolean {
        return !this.isAtEnd() && this.peek().type === type;
    }

    private checkKeyword(word: string): boolean {
        return this.check('KEYWORD') && this.peek().value.toLowerCase() === word;
    }

    private match(type: TokenType): boolean {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }

    private consume(type: TokenType, message: string): PascalToken {
        if (this.check(type)) return this.advance();
        throw new ParseError(message);
    }

    private consumeKeyword(word: string, message: string): PascalToken {
        if (this.checkKeyword(word)) return this.advance();
        throw new ParseError(message);
    }

    // The tokenizer doesn't track positions yet; emit a zeroed location.
    private location(): SourceLocation {
        return {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
        };
    }

    // ---- program / declarations -------------------------------------------

    private parseProgram(): Program {
        this.consumeKeyword('program', "Expected 'program' keyword");
        const nameToken = this.consume('IDENTIFIER', 'Expected program name');
        this.consume('DELIMITER_SEMICOLON', "Expected ';' after program name");

        const declarations = this.parseDeclarations();

        this.consumeKeyword('begin', "Expected 'begin' keyword");
        const statements = this.parseStatementList();
        this.consumeKeyword('end', "Expected 'end' keyword");
        this.consume('DELIMITER_DOT', "Expected '.' after end");

        return {
            type: 'Program',
            name: nameToken.value,
            declarations,
            statements,
            location: this.location(),
        };
    }

    private parseDeclarations(): Declaration[] {
        const declarations: Declaration[] = [];
        while (this.checkKeyword('var') || this.checkKeyword('procedure') || this.checkKeyword('function')) {
            if (this.checkKeyword('var')) {
                declarations.push(...this.parseVarSection());
            } else {
                declarations.push(this.parseSubprogram());
            }
        }
        return declarations;
    }

    private parseVarSection(): Declaration[] {
        this.consumeKeyword('var', "Expected 'var'");
        const declarations: Declaration[] = [];
        while (this.check('IDENTIFIER')) {
            const names = [this.consume('IDENTIFIER', 'Expected variable name').value];
            while (this.match('DELIMITER_COMMA')) {
                names.push(this.consume('IDENTIFIER', 'Expected variable name').value);
            }
            this.consume('DELIMITER_COLON', "Expected ':' in variable declaration");
            const varType = this.parseTypeName();
            this.consume('DELIMITER_SEMICOLON', "Expected ';' after variable declaration");
            for (const name of names) {
                declarations.push({ type: 'VariableDeclaration', name, varType, location: this.location() });
            }
        }
        return declarations;
    }

    private parseSubprogram(): Declaration {
        const isFunction = this.checkKeyword('function');
        this.advance(); // 'procedure' | 'function'
        const nameToken = this.consume('IDENTIFIER', 'Expected subprogram name');
        const parameters = this.check('DELIMITER_LPAREN') ? this.parseParameterList() : [];
        let returnType: string | undefined;
        if (isFunction) {
            this.consume('DELIMITER_COLON', "Expected ':' before function return type");
            returnType = this.parseTypeName();
        }
        this.consume('DELIMITER_SEMICOLON', "Expected ';' after subprogram header");
        const body = this.parseBlock();
        this.consume('DELIMITER_SEMICOLON', "Expected ';' after subprogram body");
        return {
            type: isFunction ? 'FunctionDeclaration' : 'ProcedureDeclaration',
            name: nameToken.value,
            parameters,
            returnType,
            body,
            location: this.location(),
        };
    }

    private parseParameterList(): Parameter[] {
        this.consume('DELIMITER_LPAREN', "Expected '('");
        const params: Parameter[] = [];
        if (!this.check('DELIMITER_RPAREN')) {
            do {
                const isVar = this.checkKeyword('var');
                if (isVar) this.advance();
                const names = [this.consume('IDENTIFIER', 'Expected parameter name').value];
                while (this.match('DELIMITER_COMMA')) {
                    names.push(this.consume('IDENTIFIER', 'Expected parameter name').value);
                }
                this.consume('DELIMITER_COLON', "Expected ':' in parameter list");
                const paramType = this.parseTypeName();
                for (const name of names) {
                    params.push({ type: 'Parameter', name, paramType, isVar, location: this.location() });
                }
            } while (this.match('DELIMITER_SEMICOLON'));
        }
        this.consume('DELIMITER_RPAREN', "Expected ')'");
        return params;
    }

    private parseBlock(): Block {
        this.consumeKeyword('begin', "Expected 'begin'");
        const statements = this.parseStatementList();
        this.consumeKeyword('end', "Expected 'end'");
        return { type: 'Block', statements, location: this.location() };
    }

    private parseTypeName(): string {
        if (this.check('KEYWORD') && TYPE_KEYWORDS.has(this.peek().value.toLowerCase())) {
            return this.advance().value;
        }
        if (this.check('IDENTIFIER')) {
            return this.advance().value;
        }
        throw new ParseError('Expected a type name');
    }

    // ---- statements --------------------------------------------------------

    /** Parses statements until `end`, requiring a `;` after each one. */
    private parseStatementList(): Statement[] {
        const statements: Statement[] = [];
        while (!this.isAtEnd() && !this.checkKeyword('end')) {
            statements.push(this.parseStatement());
            this.consume('DELIMITER_SEMICOLON', "Expected ';' after statement");
        }
        return statements;
    }

    private parseStatement(): Statement {
        if (this.checkKeyword('begin')) return this.parseCompound();
        if (this.checkKeyword('if')) return this.parseIf();
        if (this.checkKeyword('while')) return this.parseWhile();
        if (this.checkKeyword('for')) return this.parseFor();
        if (this.check('IDENTIFIER')) return this.parseIdentifierStatement();
        throw new ParseError(`Unexpected token in statement: '${this.peek().value}'`);
    }

    private parseCompound(): CompoundStatement {
        this.consumeKeyword('begin', "Expected 'begin'");
        const statements = this.parseStatementList();
        this.consumeKeyword('end', "Expected 'end'");
        return { type: 'CompoundStatement', statements, location: this.location() };
    }

    private parseIf(): IfStatement {
        this.consumeKeyword('if', "Expected 'if'");
        const condition = this.parseExpression();
        this.consumeKeyword('then', "Expected 'then'");
        const thenBranch = this.parseStatement();
        let elseBranch: Statement | undefined;
        if (this.checkKeyword('else')) {
            this.advance();
            elseBranch = this.parseStatement();
        }
        return { type: 'IfStatement', condition, thenBranch, elseBranch, location: this.location() };
    }

    private parseWhile(): WhileStatement {
        this.consumeKeyword('while', "Expected 'while'");
        const condition = this.parseExpression();
        this.consumeKeyword('do', "Expected 'do'");
        const body = this.parseStatement();
        return { type: 'WhileStatement', condition, body, location: this.location() };
    }

    private parseFor(): ForStatement {
        this.consumeKeyword('for', "Expected 'for'");
        const variableToken = this.consume('IDENTIFIER', 'Expected loop variable');
        const variable: Identifier = {
            type: 'Identifier',
            name: variableToken.value,
            location: this.location(),
        };
        this.consume('OPERATOR_ASSIGN', "Expected ':=' in for loop");
        const start = this.parseExpression();
        let direction: 'to' | 'downto';
        if (this.checkKeyword('to')) {
            direction = 'to';
            this.advance();
        } else if (this.checkKeyword('downto')) {
            direction = 'downto';
            this.advance();
        } else {
            throw new ParseError("Expected 'to' or 'downto' in for loop");
        }
        const end = this.parseExpression();
        this.consumeKeyword('do', "Expected 'do'");
        const body = this.parseStatement();
        return { type: 'ForStatement', variable, start, end, body, direction, location: this.location() };
    }

    /** An identifier-led statement is either an assignment or a procedure call. */
    private parseIdentifierStatement(): Statement {
        const idToken = this.consume('IDENTIFIER', 'Expected identifier');

        if (this.check('OPERATOR_ASSIGN')) {
            this.advance();
            const right = this.parseExpression();
            const assignment: AssignmentStatement = {
                type: 'AssignmentStatement',
                left: { type: 'Identifier', name: idToken.value, location: this.location() },
                right,
                location: this.location(),
            };
            return assignment;
        }

        const args = this.check('DELIMITER_LPAREN') ? this.parseArguments() : [];
        const call: CallStatement = {
            type: 'CallStatement',
            name: idToken.value,
            arguments: args,
            location: this.location(),
        };
        return call;
    }

    private parseArguments(): Expression[] {
        this.consume('DELIMITER_LPAREN', "Expected '('");
        const args: Expression[] = [];
        if (!this.check('DELIMITER_RPAREN')) {
            args.push(this.parseExpression());
            while (this.match('DELIMITER_COMMA')) {
                args.push(this.parseExpression());
            }
        }
        this.consume('DELIMITER_RPAREN', "Expected ')'");
        return args;
    }

    // ---- expressions (precedence climbing) --------------------------------

    private parseExpression(): Expression {
        return this.parseRelational();
    }

    private currentOperator(): string | null {
        const token = this.peek();
        const symbol = SYMBOL_OPERATORS[token.type];
        if (symbol) return symbol;
        if (token.type === 'IDENTIFIER' && WORD_BINARY_OPS.has(token.value.toLowerCase())) {
            return token.value.toLowerCase();
        }
        return null;
    }

    private parseBinaryLevel(operators: Set<string>, next: () => Expression): Expression {
        let left = next();
        let operator = this.currentOperator();
        while (operator !== null && operators.has(operator)) {
            this.advance();
            const right = next();
            const node: BinaryExpression = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
                location: this.location(),
            };
            left = node;
            operator = this.currentOperator();
        }
        return left;
    }

    private parseRelational(): Expression {
        return this.parseBinaryLevel(RELATIONAL_OPS, () => this.parseAdditive());
    }

    private parseAdditive(): Expression {
        return this.parseBinaryLevel(ADDITIVE_OPS, () => this.parseMultiplicative());
    }

    private parseMultiplicative(): Expression {
        return this.parseBinaryLevel(MULTIPLICATIVE_OPS, () => this.parseUnary());
    }

    private parseUnary(): Expression {
        const token = this.peek();
        let operator: string | null = null;
        if (token.type === 'OPERATOR_MINUS') operator = '-';
        else if (token.type === 'OPERATOR_PLUS') operator = '+';
        else if (token.type === 'IDENTIFIER' && token.value.toLowerCase() === 'not') operator = 'not';

        if (operator !== null) {
            this.advance();
            const node: UnaryExpression = {
                type: 'UnaryExpression',
                operator,
                argument: this.parseUnary(),
                location: this.location(),
            };
            return node;
        }
        return this.parsePrimary();
    }

    private parsePrimary(): Expression {
        const token = this.peek();

        if (token.type === 'NUMBER_INTEGER') {
            this.advance();
            return { type: 'NumericLiteral', value: parseInt(token.value, 10), location: this.location() } as NumericLiteral;
        }
        if (token.type === 'NUMBER_REAL') {
            this.advance();
            return { type: 'NumericLiteral', value: parseFloat(token.value), location: this.location() } as NumericLiteral;
        }
        if (token.type === 'STRING_LITERAL') {
            this.advance();
            return { type: 'StringLiteral', value: token.value, location: this.location() } as StringLiteral;
        }
        if (token.type === 'BOOLEAN_LITERAL') {
            this.advance();
            return {
                type: 'BooleanLiteral',
                value: token.value.toLowerCase() === 'true',
                location: this.location(),
            } as BooleanLiteral;
        }
        if (token.type === 'DELIMITER_LPAREN') {
            this.advance();
            const expression = this.parseExpression();
            this.consume('DELIMITER_RPAREN', "Expected ')' after expression");
            return expression;
        }
        if (token.type === 'IDENTIFIER') {
            this.advance();
            if (this.check('DELIMITER_LPAREN')) {
                const args = this.parseArguments();
                return {
                    type: 'CallExpression',
                    callee: token.value,
                    arguments: args,
                    location: this.location(),
                } as CallExpression;
            }
            return { type: 'Identifier', name: token.value, location: this.location() } as Identifier;
        }

        throw new ParseError(`Unexpected token in expression: '${token.value}'`);
    }

    parse(): Program {
        return this.parseProgram();
    }
}

/**
 * Parses Pascal source code into an Abstract Syntax Tree (AST).
 * @param source - The Pascal source code to parse
 * @returns The AST representation of the source code
 * @throws {ParseError} If the source code cannot be parsed
 */
export function parse(source: string): Program {
    return new Parser(source).parse();
}

/**
 * Validates if the given source code is valid Pascal.
 * @param source - The Pascal source code to validate
 * @returns true if the source code is valid Pascal, false otherwise
 */
export function isValid(source: string): boolean {
    try {
        parse(source);
        return true;
    } catch {
        return false;
    }
}
