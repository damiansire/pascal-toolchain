// Area: abrupt end-of-input — every scanner state cut short at EOF must either
// finish the token cleanly or throw a typed TokenizeError, never hang, never
// emit a corrupt stream. Also pins down the EOF sentinel contract.
import { tokenizePascal, TokenizeError } from '../src/index';

const nonEof = (code: string) => tokenizePascal(code).filter((t) => t.type !== 'EOF');

describe('EOF sentinel contract', () => {
  it('the token stream always ends with exactly one EOF token', () => {
    for (const code of ['', 'x', 'x := 1;', '   ', '// comentario']) {
      const tokens = tokenizePascal(code);
      const eofs = tokens.filter((t) => t.type === 'EOF');
      expect(eofs).toHaveLength(1);
      expect(tokens[tokens.length - 1]).toMatchObject({ type: 'EOF', value: '' });
    }
  });

  it('the EOF sentinel is stamped at the end of the source', () => {
    const tokens = tokenizePascal('ab\nc');
    expect(tokens[tokens.length - 1]).toMatchObject({
      type: 'EOF',
      line: 2,
      column: 2,
      offset: 4,
    });
  });
});

describe('tokens cut short at EOF', () => {
  it('an identifier running into EOF is emitted complete', () => {
    expect(nonEof('contador')).toMatchObject([{ type: 'IDENTIFIER', value: 'contador' }]);
  });

  it('an integer running into EOF is emitted complete', () => {
    expect(nonEof('12345')).toMatchObject([{ type: 'NUMBER_INTEGER', value: '12345' }]);
  });

  it('a real running into EOF is emitted complete', () => {
    expect(nonEof('3.14')).toMatchObject([{ type: 'NUMBER_REAL', value: '3.14' }]);
  });

  it("a lone ':' at EOF is a colon delimiter, not half an ':='", () => {
    expect(nonEof('x :')).toMatchObject([
      { type: 'IDENTIFIER', value: 'x' },
      { type: 'DELIMITER_COLON', value: ':' },
    ]);
  });

  it("a lone '<' or '>' at EOF stays a simple relational operator", () => {
    expect(nonEof('a <')).toMatchObject([
      { type: 'IDENTIFIER', value: 'a' },
      { type: 'OPERATOR_LESS', value: '<' },
    ]);
    expect(nonEof('a >')).toMatchObject([
      { type: 'IDENTIFIER', value: 'a' },
      { type: 'OPERATOR_GREATER', value: '>' },
    ]);
  });

  it("a lone '.' at EOF is the dot delimiter (as in 'end.')", () => {
    expect(nonEof('end.')).toMatchObject([
      { type: 'KEYWORD', value: 'end' },
      { type: 'DELIMITER_DOT', value: '.' },
    ]);
  });

  it("a lone '(' at EOF is a paren, not the start of a star comment", () => {
    expect(nonEof('(')).toMatchObject([{ type: 'DELIMITER_LPAREN', value: '(' }]);
  });

  it("a lone '/' at EOF is division, not the start of a line comment", () => {
    expect(nonEof('/')).toMatchObject([{ type: 'OPERATOR_DIVIDE', value: '/' }]);
  });
});

describe('unterminated constructs at EOF throw a typed error', () => {
  it.each([
    ["'sin cerrar", /Unclosed string literal/],
    ["'", /Unclosed string literal/],
    ['{ sin cerrar', /Unclosed '\{' comment/],
    ['(* sin cerrar', /Unclosed '\(\*' comment/],
    ['(*', /Unclosed '\(\*' comment/],
  ])('input %j throws %s', (code, message) => {
    expect(() => tokenizePascal(code)).toThrow(TokenizeError);
    expect(() => tokenizePascal(code)).toThrow(message);
  });

  it('an unterminated string spanning to EOF reports the opening quote position', () => {
    expect(() => tokenizePascal("x := 'abc")).toThrow(/at line 1, column 6/);
  });
});
