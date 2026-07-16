import { parse } from 'pascal-parser';
import { buildSymbolTable, toPascalType } from '../symbolTable';

describe('toPascalType', () => {
  it('returns a scalar type as-is', () => {
    expect(toPascalType('integer')).toBe('integer');
  });

  it('wraps array bounds into an ArrayType', () => {
    expect(toPascalType('integer', { low: 1, high: 10 })).toEqual({
      kind: 'array',
      elementType: 'integer',
      low: 1,
      high: 10,
    });
  });
});

describe('buildSymbolTable', () => {
  it('declares global variables, constants, functions and procedures', () => {
    const program = parse(`
      program Demo;
      const Pi = 3;
      var Total: integer;
      function Square(n: integer): integer;
      begin
        Square := n * n;
      end;
      procedure Greet(name: string);
      begin
      end;
      begin
      end.
    `);

    const { global, diagnostics } = buildSymbolTable(program);
    expect(diagnostics).toEqual([]);

    expect(global.resolveLocal('Total')).toMatchObject({ kind: 'variable', type: 'integer' });
    expect(global.resolveLocal('Pi')).toMatchObject({ kind: 'constant', type: 'integer' });
    expect(global.resolveLocal('Square')).toMatchObject({
      kind: 'function',
      type: 'integer',
      parameters: [{ name: 'n', type: 'integer', isVar: false }],
    });
    expect(global.resolveLocal('Greet')).toMatchObject({
      kind: 'procedure',
      type: 'void',
      parameters: [{ name: 'name', type: 'string', isVar: false }],
    });
  });

  it('records an array variable with its element type and bounds', () => {
    const program = parse(`
      program Demo;
      var Items: array[1..5] of integer;
      begin
      end.
    `);
    const { global } = buildSymbolTable(program);
    expect(global.resolveLocal('Items')?.type).toEqual({
      kind: 'array',
      elementType: 'integer',
      low: 1,
      high: 5,
    });
  });

  it('creates a nested scope per subprogram, reachable from global.children', () => {
    const program = parse(`
      program Demo;
      procedure Foo;
      var Local: integer;
      begin
      end;
      begin
      end.
    `);
    const { global } = buildSymbolTable(program);
    expect(global.children).toHaveLength(1);
    const fooScope = global.children[0]!;
    expect(fooScope.name).toBe('Foo');
    expect(fooScope.resolveLocal('Local')).toMatchObject({ kind: 'variable', type: 'integer' });
  });

  it('a function scope can see its own name as an implicit return-value variable', () => {
    const program = parse(`
      program Demo;
      function Double(n: integer): integer;
      begin
        Double := n * 2;
      end;
      begin
      end.
    `);
    const { global } = buildSymbolTable(program);
    const doubleScope = global.children[0]!;
    expect(doubleScope.resolveLocal('Double')).toMatchObject({ kind: 'variable', type: 'integer' });
    // The outer declaration is still the function symbol, unaffected by the inner shadow.
    expect(global.resolveLocal('Double')).toMatchObject({ kind: 'function', type: 'integer' });
  });

  it('a nested subprogram can resolve an outer variable through the scope chain', () => {
    const program = parse(`
      program Demo;
      var Outer: integer;
      procedure Foo;
      begin
      end;
      begin
      end.
    `);
    const { global } = buildSymbolTable(program);
    const fooScope = global.children[0]!;
    expect(fooScope.resolve('Outer')).toMatchObject({ kind: 'variable', type: 'integer' });
  });

  it('reports a redeclaration of a global variable as a diagnostic, not a throw', () => {
    const program = parse(`
      program Demo;
      var X: integer;
      var X: string;
      begin
      end.
    `);
    const { diagnostics } = buildSymbolTable(program);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ severity: 'error' });
    expect(diagnostics[0]!.message).toMatch(/'X' ya fue declarado/);
  });

  it('redeclaration is case-insensitive (Pascal identifiers are)', () => {
    const program = parse(`
      program Demo;
      var Count: integer;
      var COUNT: integer;
      begin
      end.
    `);
    const { diagnostics } = buildSymbolTable(program);
    expect(diagnostics).toHaveLength(1);
  });

  it('reports a parameter name colliding with a sibling parameter', () => {
    const program = parse(`
      program Demo;
      procedure Foo(a: integer; a: integer);
      begin
      end;
      begin
      end.
    `);
    const { diagnostics } = buildSymbolTable(program);
    expect(diagnostics.some((d) => d.message.match(/'a' ya fue declarado/))).toBe(true);
  });

  it('a local variable may reuse a global name; only its own scope sees the shadow', () => {
    const program = parse(`
      program Demo;
      var X: integer;
      procedure Foo;
      var X: string;
      begin
      end;
      begin
      end.
    `);
    const { global, diagnostics } = buildSymbolTable(program);
    expect(diagnostics).toEqual([]);
    const fooScope = global.children[0]!;
    expect(fooScope.resolveLocal('X')?.type).toBe('string');
    expect(global.resolveLocal('X')?.type).toBe('integer');
  });

  it('infers a numeric constant type as integer or real from its literal', () => {
    const program = parse(`
      program Demo;
      const Count = 5;
      const Ratio = 1.5;
      const Name = 'hi';
      const Flag = true;
      begin
      end.
    `);
    const { global } = buildSymbolTable(program);
    expect(global.resolveLocal('Count')?.type).toBe('integer');
    expect(global.resolveLocal('Ratio')?.type).toBe('real');
    expect(global.resolveLocal('Name')?.type).toBe('string');
    expect(global.resolveLocal('Flag')?.type).toBe('boolean');
  });
});
