export interface Token {
    type: TokenType;
    value: string;
    location: {
        line: number;
        column: number;
        offset: number;
    };
}

export enum TokenType {
    // Keywords
    PROGRAM = 'PROGRAM',
    BEGIN = 'BEGIN',
    END = 'END',
    VAR = 'VAR',
    PROCEDURE = 'PROCEDURE',
    FUNCTION = 'FUNCTION',
    IF = 'IF',
    THEN = 'THEN',
    ELSE = 'ELSE',
    WHILE = 'WHILE',
    DO = 'DO',
    FOR = 'FOR',
    TO = 'TO',
    DOWNTO = 'DOWNTO',

    // Data types
    INTEGER = 'INTEGER',
    REAL = 'REAL',
    STRING = 'STRING',
    BOOLEAN = 'BOOLEAN',

    // Literals
    NUMBER = 'NUMBER',
    STRING_LITERAL = 'STRING_LITERAL',
    TRUE = 'TRUE',
    FALSE = 'FALSE',

    // Identifiers and symbols
    IDENTIFIER = 'IDENTIFIER',
    SEMICOLON = 'SEMICOLON',
    COLON = 'COLON',
    COMMA = 'COMMA',
    DOT = 'DOT',
    ASSIGN = 'ASSIGN',
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN',

    // Operators
    PLUS = 'PLUS',
    MINUS = 'MINUS',
    MULTIPLY = 'MULTIPLY',
    DIVIDE = 'DIVIDE',
    EQUALS = 'EQUALS',
    NOT_EQUALS = 'NOT_EQUALS',
    LESS_THAN = 'LESS_THAN',
    GREATER_THAN = 'GREATER_THAN',
    LESS_EQUALS = 'LESS_EQUALS',
    GREATER_EQUALS = 'GREATER_EQUALS',

    // Special
    EOF = 'EOF'
}

const KEYWORDS: { [key: string]: TokenType } = {
    'program': TokenType.PROGRAM,
    'begin': TokenType.BEGIN,
    'end': TokenType.END,
    'var': TokenType.VAR,
    'procedure': TokenType.PROCEDURE,
    'function': TokenType.FUNCTION,
    'if': TokenType.IF,
    'then': TokenType.THEN,
    'else': TokenType.ELSE,
    'while': TokenType.WHILE,
    'do': TokenType.DO,
    'for': TokenType.FOR,
    'to': TokenType.TO,
    'downto': TokenType.DOWNTO,
    'integer': TokenType.INTEGER,
    'real': TokenType.REAL,
    'string': TokenType.STRING,
    'boolean': TokenType.BOOLEAN,
    'true': TokenType.TRUE,
    'false': TokenType.FALSE
};

export class Lexer {
    private source: string;
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;
    private currentChar: string | null;

    constructor(source: string) {
        this.source = source;
        this.currentChar = this.source.length > 0 ? this.source[0] : null;
    }

    private advance(): void {
        this.position++;
        if (this.currentChar === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        this.currentChar = this.position < this.source.length ? this.source[this.position] : null;
    }

    private peek(): string | null {
        const peekPos = this.position + 1;
        return peekPos < this.source.length ? this.source[peekPos] : null;
    }

    private skipWhitespace(): void {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            this.advance();
        }
    }

    private skipComment(): void {
        if (this.currentChar as string === '{') {
            while (this.currentChar && (this.currentChar as string) !== '}') {
                this.advance();
            }
            if (this.currentChar === '}') {
                this.advance();
            }
        } else if (this.currentChar === '(' && this.peek() === '*') {
            this.advance(); // Skip (
            this.advance(); // Skip *
            while (this.currentChar && !(this.currentChar as string === '*' && this.peek() === ')')) {
                this.advance();
            }
            if (this.currentChar) {
                this.advance(); // Skip *
                this.advance(); // Skip )
            }
        }
    }

    private readNumber(): Token {
        let result = '';
        const startColumn = this.column;
        const startLine = this.line;
        const startOffset = this.position;

        while (this.currentChar && /\d/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        if (this.currentChar === '.' && this.peek() && /\d/.test(this.peek()!)) {
            result += this.currentChar;
            this.advance();

            while (this.currentChar && /\d/.test(this.currentChar)) {
                result += this.currentChar;
                this.advance();
            }
        }

        return {
            type: TokenType.NUMBER,
            value: result,
            location: {
                line: startLine,
                column: startColumn,
                offset: startOffset
            }
        };
    }

    private readString(): Token {
        let result = '';
        const startColumn = this.column;
        const startLine = this.line;
        const startOffset = this.position;
        
        // Skip the opening quote
        this.advance();

        while (this.currentChar && this.currentChar !== '\'') {
            if (this.currentChar === '\'') {
                if (this.peek() === '\'') {
                    result += this.currentChar;
                    this.advance(); // Skip first quote
                    this.advance(); // Skip second quote
                    continue;
                }
                break;
            }
            result += this.currentChar;
            this.advance();
        }

        // Skip the closing quote
        if (this.currentChar === '\'') {
            this.advance();
        }

        return {
            type: TokenType.STRING_LITERAL,
            value: result,
            location: {
                line: startLine,
                column: startColumn,
                offset: startOffset
            }
        };
    }

    private readIdentifier(): Token {
        let result = '';
        const startColumn = this.column;
        const startLine = this.line;
        const startOffset = this.position;

        while (this.currentChar && /[a-zA-Z0-9_]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        const lowerResult = result.toLowerCase();
        const type = KEYWORDS[lowerResult] || TokenType.IDENTIFIER;

        return {
            type,
            value: result,
            location: {
                line: startLine,
                column: startColumn,
                offset: startOffset
            }
        };
    }

    public nextToken(): Token {
        while (this.currentChar !== null) {
            // Skip whitespace
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }

            // Skip comments
            if (this.currentChar === '{' || (this.currentChar === '(' && this.peek() === '*')) {
                this.skipComment();
                continue;
            }

            // Location for current token
            const location = {
                line: this.line,
                column: this.column,
                offset: this.position
            };

            // Handle numbers
            if (/\d/.test(this.currentChar)) {
                return this.readNumber();
            }

            // Handle strings
            if (this.currentChar === '\'') {
                return this.readString();
            }

            // Handle identifiers and keywords
            if (/[a-zA-Z_]/.test(this.currentChar)) {
                return this.readIdentifier();
            }

            // Handle operators and symbols
            let token: Token | null = null;
            switch (this.currentChar) {
                case '+':
                    token = { type: TokenType.PLUS, value: '+', location };
                    break;
                case '-':
                    token = { type: TokenType.MINUS, value: '-', location };
                    break;
                case '*':
                    token = { type: TokenType.MULTIPLY, value: '*', location };
                    break;
                case '/':
                    token = { type: TokenType.DIVIDE, value: '/', location };
                    break;
                case '=':
                    token = { type: TokenType.EQUALS, value: '=', location };
                    break;
                case '<':
                    if (this.peek() === '>') {
                        this.advance();
                        token = { type: TokenType.NOT_EQUALS, value: '<>', location };
                    } else if (this.peek() === '=') {
                        this.advance();
                        token = { type: TokenType.LESS_EQUALS, value: '<=', location };
                    } else {
                        token = { type: TokenType.LESS_THAN, value: '<', location };
                    }
                    break;
                case '>':
                    if (this.peek() === '=') {
                        this.advance();
                        token = { type: TokenType.GREATER_EQUALS, value: '>=', location };
                    } else {
                        token = { type: TokenType.GREATER_THAN, value: '>', location };
                    }
                    break;
                case ':':
                    if (this.peek() === '=') {
                        this.advance();
                        token = { type: TokenType.ASSIGN, value: ':=', location };
                    } else {
                        token = { type: TokenType.COLON, value: ':', location };
                    }
                    break;
                case ';':
                    token = { type: TokenType.SEMICOLON, value: ';', location };
                    break;
                case ',':
                    token = { type: TokenType.COMMA, value: ',', location };
                    break;
                case '.':
                    token = { type: TokenType.DOT, value: '.', location };
                    break;
                case '(':
                    token = { type: TokenType.LPAREN, value: '(', location };
                    break;
                case ')':
                    token = { type: TokenType.RPAREN, value: ')', location };
                    break;
            }

            if (token) {
                this.advance();
                return token;
            }

            throw new Error(`Unexpected character: ${this.currentChar} at line ${this.line}, column ${this.column}`);
        }

        return {
            type: TokenType.EOF,
            value: '',
            location: {
                line: this.line,
                column: this.column,
                offset: this.position
            }
        };
    }
} 