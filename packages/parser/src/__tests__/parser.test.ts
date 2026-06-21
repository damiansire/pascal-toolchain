import { parse, isValid } from '../parser';
import {
  ParseError,
  IfStatement,
  Declaration,
  Block,
  RepeatStatement,
  CaseStatement,
  CompoundStatement,
} from '../types';

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
                  end: { line: 0, column: 0, offset: 0 },
                },
              },
            ],
            location: {
              start: { line: 0, column: 0, offset: 0 },
              end: { line: 0, column: 0, offset: 0 },
            },
          },
        ],
        location: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
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

    it('should accept a program whose last statement has no trailing semicolon', () => {
      // ';' is a separator in Pascal, so it is optional before 'end'.
      const source = `
program NoTrailingSemicolon;
begin
    writeln('a');
    writeln('b')
end.`;

      expect(isValid(source)).toBe(true);
      const ast = parse(source);
      expect(ast.statements).toHaveLength(2);
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

      it('should fail when a separator is missing between two statements', () => {
        // A trailing ';' before 'end' is optional, but two statements still
        // need a ';' separator between them.
        const source = `
program HelloWorld;
begin
    writeln('a')
    writeln('b')
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
      expect(ast.declarations[0]).toMatchObject({
        type: 'VariableDeclaration',
        name: 'x',
        varType: 'integer',
      });
      expect(ast.declarations[1]).toMatchObject({
        type: 'VariableDeclaration',
        name: 'y',
        varType: 'integer',
      });
      expect(ast.declarations[2]).toMatchObject({
        type: 'VariableDeclaration',
        name: 'name',
        varType: 'string',
      });
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
      const ast = parse(
        `program P; var n: integer; begin if n = 0 then writeln('zero') else writeln('nonzero'); end.`,
      );
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
      const down = parse(
        `program P; var i: integer; begin for i := 10 downto 1 do writeln(i); end.`,
      );
      expect(down.statements[0]).toMatchObject({ type: 'ForStatement', direction: 'downto' });
    });

    it('parses begin..end compound statements and word operators (div, mod, and)', () => {
      const ast = parse(
        `program P; var x: integer; begin if (x mod 2 = 0) and (x div 2 > 0) then begin writeln('even'); writeln('positive'); end; end.`,
      );
      const ifStmt = ast.statements[0] as IfStatement;
      expect(ifStmt.type).toBe('IfStatement');
      expect(ifStmt.thenBranch).toMatchObject({ type: 'CompoundStatement' });
      expect((ifStmt.thenBranch as CompoundStatement).statements).toHaveLength(2);
    });

    it('parses a function declaration with parameters and return type', () => {
      const ast = parse(`
program P;
function double(n: integer): integer;
begin
    double := n * 2;
end;
begin
    writeln(double(21));
end.`);
      expect(ast.declarations[0]).toMatchObject({
        type: 'FunctionDeclaration',
        name: 'double',
        returnType: 'integer',
        parameters: [{ type: 'Parameter', name: 'n', paramType: 'integer', isVar: false }],
        body: { type: 'Block' },
      });
    });

    it('parses array declarations and indexed access', () => {
      const ast = parse(
        `program P; var a: array[1..5] of integer; i: integer; begin a[1] := 10; i := a[1]; end.`,
      );
      expect(ast.declarations[0]).toMatchObject({
        type: 'VariableDeclaration',
        name: 'a',
        varType: 'integer',
        arrayBounds: { low: 1, high: 5 },
      });
      expect(ast.statements[0]).toMatchObject({
        type: 'AssignmentStatement',
        left: { type: 'IndexExpression', index: { type: 'NumericLiteral', value: 1 } },
      });
      expect(ast.statements[1]).toMatchObject({
        type: 'AssignmentStatement',
        right: { type: 'IndexExpression' },
      });
    });

    it('parses local var declarations inside a subprogram body', () => {
      const ast = parse(`
program P;
function sumTo(n: integer): integer;
var
  i, total: integer;
begin
  total := 0;
  for i := 1 to n do total := total + i;
  sumTo := total;
end;
begin
  writeln(sumTo(5));
end.`);
      const fn = ast.declarations[0] as Declaration;
      expect(fn.type).toBe('FunctionDeclaration');
      const body = fn.body as Block;
      expect(body.declarations).toHaveLength(2);
      expect(body.declarations?.[0]).toMatchObject({
        type: 'VariableDeclaration',
        name: 'i',
        varType: 'integer',
      });
    });

    it('parses a procedure with a var (by-reference) parameter', () => {
      const ast = parse(`
program P;
procedure reset(var x: integer);
begin
    x := 0;
end;
begin
    writeln('ok');
end.`);
      expect(ast.declarations[0]).toMatchObject({
        type: 'ProcedureDeclaration',
        name: 'reset',
        parameters: [{ type: 'Parameter', name: 'x', paramType: 'integer', isVar: true }],
      });
    });

    it('parses a const section', () => {
      const ast = parse(`program P; const PI = 314; GREETING = 'hi'; begin writeln(PI); end.`);
      expect(ast.declarations[0]).toMatchObject({
        type: 'ConstantDeclaration',
        name: 'PI',
        value: { type: 'NumericLiteral', value: 314 },
      });
      expect(ast.declarations[1]).toMatchObject({
        type: 'ConstantDeclaration',
        name: 'GREETING',
        value: { type: 'StringLiteral', value: 'hi' },
      });
    });

    it('parses repeat..until loops', () => {
      const ast = parse(
        `program P; var x: integer; begin x := 0; repeat x := x + 1 until x >= 3; end.`,
      );
      expect(ast.statements[1]).toMatchObject({
        type: 'RepeatStatement',
        condition: { type: 'BinaryExpression', operator: '>=' },
      });
      expect((ast.statements[1] as RepeatStatement).body).toHaveLength(1);
    });

    it('parses case..of with multiple labels and an else branch', () => {
      const ast = parse(`
program P;
var n: integer;
begin
    case n of
        1: writeln('one');
        2, 3: writeln('two or three');
    else
        writeln('other');
    end;
end.`);
      const caseStmt = ast.statements[0] as CaseStatement;
      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.clauses).toHaveLength(2);
      expect(caseStmt.clauses[1].labels).toHaveLength(2);
      expect(caseStmt.elseBranch).toMatchObject({ type: 'CallStatement', name: 'writeln' });
    });

    it('accepts empty statements (stray semicolons)', () => {
      const ast = parse(`program P; begin writeln('a');; writeln('b'); end.`);
      expect(ast.statements).toHaveLength(2);
      expect(ast.statements[0]).toMatchObject({ type: 'CallStatement', name: 'writeln' });
      expect(ast.statements[1]).toMatchObject({ type: 'CallStatement', name: 'writeln' });
    });

    it('throws a catchable ParseError (not a RangeError) on pathologically deep nesting', () => {
      const deep = `program P; begin x := ${'('.repeat(5000)}1${')'.repeat(5000)}; end.`;
      expect(() => parse(deep)).toThrow(ParseError);
      expect(isValid(deep)).toBe(false);
    });
  });
});
