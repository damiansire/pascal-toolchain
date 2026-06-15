import { Program, ParseError, Statement, CallStatement, Expression, StringLiteral, SourceLocation } from './types';
import { tokenizePascal, PascalToken, TokenType } from 'pascal-tokenizer';

class Parser {
    private tokens: PascalToken[] = [];
    private current: number = 0;

    constructor(private source: string) {
        this.tokens = tokenizePascal(source);
    }

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
        if (!this.isAtEnd()) {
            this.current++;
        }
        return this.previous();
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
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

    private createLocation(startToken: PascalToken, endToken: PascalToken): SourceLocation {
        // Since pascal-tokenizer doesn't provide location info, we'll create a simple one
        return {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 }
        };
    }

    private parseProgram(): Program {
        // Parse 'program' keyword
        const programToken = this.consume('KEYWORD', "Expected 'program' keyword");
        if (programToken.value.toLowerCase() !== 'program') {
            throw new ParseError("Expected 'program' keyword");
        }

        // Parse program name
        const nameToken = this.consume('IDENTIFIER', 'Expected program name');

        // Parse semicolon
        this.consume('DELIMITER_SEMICOLON', "Expected ';' after program name");

        // Parse 'begin' keyword
        const beginToken = this.consume('KEYWORD', "Expected 'begin' keyword");
        if (beginToken.value.toLowerCase() !== 'begin') {
            throw new ParseError("Expected 'begin' keyword");
        }

        // Parse statements
        const statements: Statement[] = [];

        while (!this.isAtEnd() && !this.check('KEYWORD')) {
            // For now, we only handle writeln statements
            if (this.match('IDENTIFIER')) {
                const identToken = this.previous();
                
                if (identToken.value.toLowerCase() === 'writeln') {
                    // Parse writeln statement
                    this.consume('DELIMITER_LPAREN', "Expected '(' after writeln");
                    
                    // Parse string argument
                    const stringToken = this.consume('STRING_LITERAL', "Expected string argument for writeln");
                    
                    const stringLiteral: StringLiteral = {
                        type: 'StringLiteral',
                        value: stringToken.value,
                        location: this.createLocation(stringToken, stringToken)
                    };
                    
                    this.consume('DELIMITER_RPAREN', "Expected ')' after string argument");
                    
                    const callStatement: CallStatement = {
                        type: 'CallStatement',
                        name: 'writeln',
                        arguments: [stringLiteral],
                        location: this.createLocation(identToken, this.previous())
                    };
                    
                    statements.push(callStatement);
                    
                    // Parse semicolon
                    this.consume('DELIMITER_SEMICOLON', "Expected ';' after writeln statement");
                } else {
                    throw new ParseError(`Unexpected identifier: ${identToken.value}`);
                }
            } else {
                throw new ParseError('Expected statement');
            }
        }

        // Parse 'end' keyword
        const endToken = this.consume('KEYWORD', "Expected 'end' keyword");
        if (endToken.value.toLowerCase() !== 'end') {
            throw new ParseError("Expected 'end' keyword");
        }

        // Parse final dot
        this.consume('DELIMITER_DOT', "Expected '.' after end");

        return {
            type: 'Program',
            name: nameToken.value,
            declarations: [],
            statements,
            location: this.createLocation(programToken, this.previous())
        };
    }

    parse(): Program {
        return this.parseProgram();
    }
}

/**
 * Parses Pascal source code into an Abstract Syntax Tree (AST)
 * @param source - The Pascal source code to parse
 * @returns The AST representation of the source code
 * @throws {ParseError} If the source code cannot be parsed
 */
export function parse(source: string): Program {
    const parser = new Parser(source);
    return parser.parse();
}

/**
 * Validates if the given source code is valid Pascal
 * @param source - The Pascal source code to validate
 * @returns true if the source code is valid Pascal, false otherwise
 */
export function isValid(source: string): boolean {
    try {
        parse(source);
        return true;
    } catch (error) {
        return false;
    }
} 