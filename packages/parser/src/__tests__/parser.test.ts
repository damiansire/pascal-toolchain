import { parse, isValid } from '../parser';
import { ParseError } from '../types';

describe('Pascal Parser', () => {
    describe('Hello World Program', () => {
        it('should parse a valid Hello World program', () => {
            const source = `
program HelloWorld;
begin
    writeln('Hello, World!');
end.`;

            const ast = parse(source);

            expect(ast).toEqual({
                type: 'Program',
                name: 'HelloWorld',
                declarations: [],
                statements: [
                    {
                        type: 'CallStatement',
                        name: 'writeln',
                        arguments: [
                            {
                                type: 'StringLiteral',
                                value: 'Hello, World!',
                                location: {
                                    start: { line: 0, column: 0, offset: 0 },
                                    end: { line: 0, column: 0, offset: 0 }
                                }
                            }
                        ],
                        location: {
                            start: { line: 0, column: 0, offset: 0 },
                            end: { line: 0, column: 0, offset: 0 }
                        }
                    }
                ],
                location: {
                    start: { line: 0, column: 0, offset: 0 },
                    end: { line: 0, column: 0, offset: 0 }
                }
            });
        });

        it('should validate a correct Hello World program', () => {
            const source = `
program HelloWorld;
begin
    writeln('Hello, World!');
end.`;

            expect(isValid(source)).toBe(true);
        });

        describe('Error cases', () => {
            it('should fail when program keyword is missing', () => {
                const source = `
HelloWorld;
begin
    writeln('Hello, World!');
end.`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });

            it('should fail when semicolon is missing after program name', () => {
                const source = `
program HelloWorld
begin
    writeln('Hello, World!');
end.`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });

            it('should fail when begin keyword is missing', () => {
                const source = `
program HelloWorld;
    writeln('Hello, World!');
end.`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });

            it('should fail when end keyword is missing', () => {
                const source = `
program HelloWorld;
begin
    writeln('Hello, World!');
.`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });

            it('should fail when final dot is missing', () => {
                const source = `
program HelloWorld;
begin
    writeln('Hello, World!');
end`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });

            it('should fail when writeln is missing parentheses', () => {
                const source = `
program HelloWorld;
begin
    writeln'Hello, World!';
end.`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });

            it('should fail when string literal is missing quotes', () => {
                const source = `
program HelloWorld;
begin
    writeln(Hello, World!);
end.`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });

            it('should fail when statement semicolon is missing', () => {
                const source = `
program HelloWorld;
begin
    writeln('Hello, World!')
end.`;

                expect(() => parse(source)).toThrow(ParseError);
                expect(isValid(source)).toBe(false);
            });
        });
    });
}); 