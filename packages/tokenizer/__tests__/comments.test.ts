// Area: comments — the three Pascal comment syntaxes ({ }, (* *), //),
// their interaction with surrounding tokens, the (non-)nesting semantics,
// and the unclosed-comment error paths.
import { tokenizePascal, TokenizeError } from '../src/index';

describe('comment kinds', () => {
  it('a brace comment can span multiple lines', () => {
    const tokens = tokenizePascal('a { line1\nline2\nline3 } b', false);
    expect(tokens).toMatchObject([
      { type: 'IDENTIFIER', value: 'a' },
      { type: 'COMMENT_BLOCK_BRACE', value: '{ line1\nline2\nline3 }' },
      { type: 'IDENTIFIER', value: 'b' },
      { type: 'EOF', value: '' },
    ]);
  });

  it('a star comment can span multiple lines', () => {
    const tokens = tokenizePascal('(* uno\ndos *)', false);
    expect(tokens[0]).toMatchObject({ type: 'COMMENT_STAR', value: '(* uno\ndos *)' });
  });

  it('a line comment stops at the newline; the next line still tokenizes', () => {
    const tokens = tokenizePascal('// solo esta linea\nx := 1;');
    expect(tokens).toMatchObject([
      { type: 'IDENTIFIER', value: 'x' },
      { type: 'OPERATOR_ASSIGN', value: ':=' },
      { type: 'NUMBER_INTEGER', value: '1' },
      { type: 'DELIMITER_SEMICOLON', value: ';' },
      { type: 'EOF', value: '' },
    ]);
  });

  it('a line comment at the very end of input (no trailing newline) is fine', () => {
    const tokens = tokenizePascal('x // hasta el final', false);
    expect(tokens).toMatchObject([
      { type: 'IDENTIFIER', value: 'x' },
      { type: 'COMMENT_LINE', value: '// hasta el final' },
      { type: 'EOF', value: '' },
    ]);
  });

  it('an empty brace comment ({}) is valid', () => {
    const tokens = tokenizePascal('{}', false);
    expect(tokens[0]).toMatchObject({ type: 'COMMENT_BLOCK_BRACE', value: '{}' });
  });

  it("'(*)' is an unclosed star comment, not paren + star + paren", () => {
    // '(' followed by '*' opens a comment; the lone ')' never forms '*)'.
    expect(() => tokenizePascal('(*)')).toThrow(/Unclosed '\(\*' comment/);
  });

  it('a division slash is not confused with a line comment', () => {
    const tokens = tokenizePascal('a / b');
    expect(tokens.map((t) => t.type)).toEqual([
      'IDENTIFIER',
      'OPERATOR_DIVIDE',
      'IDENTIFIER',
      'EOF',
    ]);
  });
});

describe('nesting semantics (documented: Pascal comments do NOT nest)', () => {
  it("a brace comment ends at the FIRST '}': '{ a { b } c }'", () => {
    // Standard Pascal brace comments do not nest. The scanner closes at the
    // first '}', leaving ' c }' as source; the dangling '}' is then a lexical
    // error because '}' alone is not a valid token.
    expect(() => tokenizePascal('{ a { b } c }')).toThrow(TokenizeError);
    expect(() => tokenizePascal('{ a { b } c }')).toThrow(/Unknown character '\}'/);
  });

  it("a star comment ends at the FIRST '*)'", () => {
    const tokens = tokenizePascal('(* a (* b *) c', false);
    expect(tokens[0]).toMatchObject({ type: 'COMMENT_STAR', value: '(* a (* b *)' });
    expect(tokens[1]).toMatchObject({ type: 'IDENTIFIER', value: 'c' });
  });

  it('mixed styles do not close each other: a brace comment ignores *)', () => {
    const tokens = tokenizePascal('{ tiene *) adentro } x', false);
    expect(tokens[0]).toMatchObject({
      type: 'COMMENT_BLOCK_BRACE',
      value: '{ tiene *) adentro }',
    });
    expect(tokens[1]).toMatchObject({ type: 'IDENTIFIER', value: 'x' });
  });

  it('a line comment swallows brace/star openers on that line', () => {
    const tokens = tokenizePascal('// { (* nada de esto abre\nx');
    expect(tokens.map((t) => t.type)).toEqual(['IDENTIFIER', 'EOF']);
  });
});

describe('unclosed comments (error paths carry position)', () => {
  it('unclosed brace comment reports its opening position', () => {
    expect(() => tokenizePascal('x := 1;\n{ nunca cierra')).toThrow(
      /Unclosed '\{' comment at line 2, column 1/,
    );
  });

  it('unclosed star comment reports its opening position', () => {
    expect(() => tokenizePascal('x := 1; (* nunca cierra')).toThrow(
      /Unclosed '\(\*' comment at line 1, column 9/,
    );
  });

  it('the unclosed-comment error is a typed TokenizeError', () => {
    let caught: unknown;
    try {
      tokenizePascal('{ abierto');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(TokenizeError);
    const err = caught as TokenizeError;
    expect(err.line).toBe(1);
    expect(err.column).toBe(1);
  });
});
