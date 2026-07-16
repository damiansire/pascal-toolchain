// Area: literals — strings (quoting/escaping), numbers (integer/real/range
// interplay) and booleans. Complements tokenizer.test.ts (general smoke tests)
// with the literal-scanning edge cases a lexer lives or dies by.
import { tokenizePascal, TokenizeError } from '../src/index';

const nonEof = (code: string) => tokenizePascal(code).filter((t) => t.type !== 'EOF');

describe('string literals', () => {
  it('tokenizes an empty string', () => {
    expect(nonEof("s := '';")).toMatchObject([
      { type: 'IDENTIFIER', value: 's' },
      { type: 'OPERATOR_ASSIGN', value: ':=' },
      { type: 'STRING_LITERAL', value: '' },
      { type: 'DELIMITER_SEMICOLON', value: ';' },
    ]);
  });

  it("a string of only an escaped quote ('''') yields a single quote", () => {
    const tokens = nonEof("s := '''';");
    expect(tokens[2]).toMatchObject({ type: 'STRING_LITERAL', value: "'" });
  });

  it('handles several escaped quotes in one literal', () => {
    const tokens = nonEof("s := 'a''b''''c';");
    expect(tokens[2]).toMatchObject({ type: 'STRING_LITERAL', value: "a'b''c" });
  });

  it('keeps whitespace and Pascal symbols verbatim inside a string', () => {
    const tokens = nonEof("s := ' begin := end. { } ';");
    expect(tokens[2]).toMatchObject({
      type: 'STRING_LITERAL',
      value: ' begin := end. { } ',
    });
  });

  it('a newline does NOT terminate a string: it is consumed until the closing quote', () => {
    // The scanner accepts any character until "'" — documented current behavior.
    const tokens = nonEof("s := 'line1\nline2';");
    expect(tokens[2]).toMatchObject({ type: 'STRING_LITERAL', value: 'line1\nline2' });
  });

  it('two adjacent string literals are two tokens, not one', () => {
    const strings = tokenizePascal("'a' 'b'").filter((t) => t.type === 'STRING_LITERAL');
    expect(strings).toMatchObject([{ value: 'a' }, { value: 'b' }]);
  });
});

describe('numeric literals', () => {
  it('tokenizes zero and multi-digit integers', () => {
    expect(nonEof('0 007 123456789')).toMatchObject([
      { type: 'NUMBER_INTEGER', value: '0' },
      { type: 'NUMBER_INTEGER', value: '007' },
      { type: 'NUMBER_INTEGER', value: '123456789' },
    ]);
  });

  it('tokenizes reals with integer and fractional parts', () => {
    expect(nonEof('3.14 0.5 100.001')).toMatchObject([
      { type: 'NUMBER_REAL', value: '3.14' },
      { type: 'NUMBER_REAL', value: '0.5' },
      { type: 'NUMBER_REAL', value: '100.001' },
    ]);
  });

  it("a leading-dot real ('.5') is a single real token", () => {
    expect(nonEof('.5')).toMatchObject([{ type: 'NUMBER_REAL', value: '.5' }]);
  });

  it("a minus sign is a separate operator, not part of the number ('-42')", () => {
    expect(nonEof('-42')).toMatchObject([
      { type: 'OPERATOR_MINUS', value: '-' },
      { type: 'NUMBER_INTEGER', value: '42' },
    ]);
  });

  it("'1.2.3' scans as real '1.2' then leading-dot real '.3'", () => {
    // Documented behavior: after consuming '1.2', the remaining '.3' matches
    // the leading-dot real rule, so no DELIMITER_DOT is emitted here.
    expect(nonEof('1.2.3')).toMatchObject([
      { type: 'NUMBER_REAL', value: '1.2' },
      { type: 'NUMBER_REAL', value: '.3' },
    ]);
  });

  it("a real followed by the range operator ('1.5..2') keeps both intact", () => {
    expect(nonEof('1.5..2')).toMatchObject([
      { type: 'NUMBER_REAL', value: '1.5' },
      { type: 'OPERATOR_RANGE', value: '..' },
      { type: 'NUMBER_INTEGER', value: '2' },
    ]);
  });

  it('a digit glued to an identifier splits at the letter boundary (Pascal identifiers cannot start with a digit)', () => {
    expect(nonEof('2x')).toMatchObject([
      { type: 'NUMBER_INTEGER', value: '2' },
      { type: 'IDENTIFIER', value: 'x' },
    ]);
  });
});

describe('boolean literals and identifier-like tokens', () => {
  it('recognizes true/false in any casing, preserving the original spelling', () => {
    const booleans = tokenizePascal('true FALSE TrUe').filter((t) => t.type === 'BOOLEAN_LITERAL');
    expect(booleans).toMatchObject([{ value: 'true' }, { value: 'FALSE' }, { value: 'TrUe' }]);
  });

  it("an identifier merely containing 'true' is not a boolean", () => {
    expect(nonEof('trueish')).toMatchObject([{ type: 'IDENTIFIER', value: 'trueish' }]);
  });

  it('identifiers may contain underscores and digits after the first letter', () => {
    expect(nonEof('my_var_2')).toMatchObject([{ type: 'IDENTIFIER', value: 'my_var_2' }]);
  });

  it('keywords are recognized case-insensitively, preserving the original spelling', () => {
    expect(nonEof('BEGIN End wHiLe')).toMatchObject([
      { type: 'KEYWORD', value: 'BEGIN' },
      { type: 'KEYWORD', value: 'End' },
      { type: 'KEYWORD', value: 'wHiLe' },
    ]);
  });
});

describe('lexical errors in literals', () => {
  it('an unclosed string throws a TokenizeError, not a generic Error', () => {
    expect(() => tokenizePascal("s := 'sin cerrar")).toThrow(TokenizeError);
  });

  it('a string closed only by an escaped quote at EOF is unclosed', () => {
    // 'ab'' — the '' is an escaped quote, so the literal never terminates.
    expect(() => tokenizePascal("'ab''")).toThrow(/Unclosed string literal/);
  });
});
