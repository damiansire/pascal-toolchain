// Area: expression precedence and associativity. The parser uses precedence
// climbing (relational < additive < multiplicative < unary < primary); these
// tests pin the exact tree shape for each level and their interactions.
import { parse } from '../parser';
import { Expression, AssignmentStatement } from '../types';

/** Parses `x := <expr>` and returns the right-hand-side expression tree. */
function expr(source: string): Expression {
  const ast = parse(`program P; begin x := ${source}; end.`);
  return (ast.statements[0] as AssignmentStatement).right;
}

/** Strips locations so trees compare structurally. */
function shape(e: Expression): unknown {
  return JSON.parse(
    JSON.stringify(e, (key, value: unknown) => (key === 'location' ? undefined : value)),
  );
}

const num = (value: number) => ({ type: 'NumericLiteral', value });
const id = (name: string) => ({ type: 'Identifier', name });
const bin = (operator: string, left: unknown, right: unknown) => ({
  type: 'BinaryExpression',
  operator,
  left,
  right,
});
const un = (operator: string, argument: unknown) => ({
  type: 'UnaryExpression',
  operator,
  argument,
});

describe('precedence levels', () => {
  it('multiplicative binds tighter than additive: 2 + 3 * 4', () => {
    expect(shape(expr('2 + 3 * 4'))).toEqual(bin('+', num(2), bin('*', num(3), num(4))));
  });

  it('additive binds tighter than relational: 1 + 2 < 3 + 4', () => {
    expect(shape(expr('1 + 2 < 3 + 4'))).toEqual(
      bin('<', bin('+', num(1), num(2)), bin('+', num(3), num(4))),
    );
  });

  it("word operators sit at their Pascal level: 'a or b and c' parses as a or (b and c)", () => {
    // 'and' is multiplicative, 'or' is additive in this grammar.
    expect(shape(expr('a or b and c'))).toEqual(bin('or', id('a'), bin('and', id('b'), id('c'))));
  });

  it("div and mod bind like '*': 1 + 10 div 3", () => {
    expect(shape(expr('1 + 10 div 3'))).toEqual(bin('+', num(1), bin('div', num(10), num(3))));
    expect(shape(expr('1 + 10 mod 3'))).toEqual(bin('+', num(1), bin('mod', num(10), num(3))));
  });

  it('relational is the lowest level: a + b * c = d - e', () => {
    expect(shape(expr('a + b * c = d - e'))).toEqual(
      bin('=', bin('+', id('a'), bin('*', id('b'), id('c'))), bin('-', id('d'), id('e'))),
    );
  });
});

describe('associativity', () => {
  it('additive operators are left-associative: 10 - 4 - 3 = (10 - 4) - 3', () => {
    expect(shape(expr('10 - 4 - 3'))).toEqual(bin('-', bin('-', num(10), num(4)), num(3)));
  });

  it('multiplicative operators are left-associative: 100 div 5 div 2', () => {
    expect(shape(expr('100 div 5 div 2'))).toEqual(
      bin('div', bin('div', num(100), num(5)), num(2)),
    );
  });

  it('mixed same-level operators chain left: 1 + 2 - 3 + 4', () => {
    expect(shape(expr('1 + 2 - 3 + 4'))).toEqual(
      bin('+', bin('-', bin('+', num(1), num(2)), num(3)), num(4)),
    );
  });
});

describe('parentheses and unary operators', () => {
  it('parentheses override precedence: (2 + 3) * 4', () => {
    expect(shape(expr('(2 + 3) * 4'))).toEqual(bin('*', bin('+', num(2), num(3)), num(4)));
  });

  it('unary minus binds tighter than multiplication: -2 * 3 = (-2) * 3', () => {
    expect(shape(expr('-2 * 3'))).toEqual(bin('*', un('-', num(2)), num(3)));
  });

  it('unary operators nest: not not a, - - 1', () => {
    expect(shape(expr('not not a'))).toEqual(un('not', un('not', id('a'))));
    expect(shape(expr('- - 1'))).toEqual(un('-', un('-', num(1))));
  });

  it("'not' applies to its operand only, not the whole comparison", () => {
    // not a = b parses as (not a) = b: unary sits above relational.
    expect(shape(expr('not a = b'))).toEqual(bin('=', un('not', id('a')), id('b')));
  });

  it('deeply nested parens collapse to the inner expression', () => {
    expect(shape(expr('((((5))))'))).toEqual(num(5));
  });
});

describe('primaries inside operator chains', () => {
  it('a call expression participates as a primary: f(1) + g(2) * 3', () => {
    expect(shape(expr('f(1) + g(2) * 3'))).toEqual(
      bin(
        '+',
        { type: 'CallExpression', callee: 'f', arguments: [num(1)] },
        bin('*', { type: 'CallExpression', callee: 'g', arguments: [num(2)] }, num(3)),
      ),
    );
  });

  it('an indexed access participates as a primary: a[i] * 2', () => {
    expect(shape(expr('a[i] * 2'))).toEqual(
      bin('*', { type: 'IndexExpression', array: id('a'), index: id('i') }, num(2)),
    );
  });
});
