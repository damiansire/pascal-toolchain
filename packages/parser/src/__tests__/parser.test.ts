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

    describe('Language features', () => {
        it('parses a var section into VariableDeclaration nodes', () => {
            const ast = parse(`
program P;
var
    x, y: integer;
    name: string;
begin
    writeln('hi');
end.`);
            expect(ast.declarations).toHaveLength(3);
            expect(ast.declarations[0]).toMatchObject({ type: 'VariableDeclaration', name: 'x', varType: 'integer' });
            expect(ast.declarations[1]).toMatchObject({ type: 'VariableDeclaration', name: 'y', varType: 'integer' });
            expect(ast.declarations[2]).toMatchObject({ type: 'VariableDeclaration', name: 'name', varType: 'string' });
        });

        it('parses assignments with operator precedence (2 + 3 * 4)', () => {
            const ast = parse(`program P; var x: integer; begin x := 2 + 3 * 4; end.`);
            expect(ast.statements[0]).toMatchObject({
                type: 'AssignmentStatement',
                left: { type: 'Identifier', name: 'x' },
                right: {
                    type: 'BinaryExpression',
                    operator: '+',
                    left: { type: 'NumericLiteral', value: 2 },
                    right: {
                        type: 'BinaryExpression',
                        operator: '*',
                        left: { type: 'NumericLiteral', value: 3 },
                        right: { type: 'NumericLiteral', value: 4 },
                    },
                },
            });
        });

        it('accepts expression arguments in writeln (e.g. variables)', () => {
            const source = `program P; var x: integer; begin x := 5; writeln(x); end.`;
            expect(isValid(source)).toBe(true);
        });

        it('parses if/then/else', () => {
            const ast = parse(`program P; var n: integer; begin if n = 0 then writeln('zero') else writeln('nonzero'); end.`);
            expect(ast.statements[0]).toMatchObject({
                type: 'IfStatement',
                condition: { type: 'BinaryExpression', operator: '=' },
                thenBranch: { type: 'CallStatement', name: 'writeln' },
                elseBranch: { type: 'CallStatement', name: 'writeln' },
            });
        });

        it('parses while loops', () => {
            const ast = parse(`program P; var x: integer; begin while x < 10 do x := x + 1; end.`);
            expect(ast.statements[0]).toMatchObject({
                type: 'WhileStatement',
                condition: { type: 'BinaryExpression', operator: '<' },
                body: { type: 'AssignmentStatement' },
            });
        });

        it('parses for..to and for..downto loops', () => {
            const up = parse(`program P; var i: integer; begin for i := 1 to 10 do writeln(i); end.`);
            expect(up.statements[0]).toMatchObject({ type: 'ForStatement', direction: 'to' });
            const down = parse(`program P; var i: integer; begin for i := 10 downto 1 do writeln(i); end.`);
            expect(down.statements[0]).toMatchObject({ type: 'ForStatement', direction: 'downto' });
        });

        it('parses begin..end compound statements and word operators (div, mod, and)', () => {
            const ast = parse(`program P; var x: integer; begin if (x mod 2 = 0) and (x div 2 > 0) then begin writeln('even'); writeln('positive'); end; end.`);
            const ifStmt: any = ast.statements[0];
            expect(ifStmt.type).toBe('IfStatement');
            expect(ifStmt.thenBranch).toMatchObject({ type: 'CompoundStatement' });
            expect(ifStmt.thenBranch.statements).toHaveLength(2);
        });
    });
});
