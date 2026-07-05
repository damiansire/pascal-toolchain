import { formatPascalCode } from '../formatter';
import { parse } from 'pascal-parser';
import { FormattedPascalLine } from '../shared/types';
import { WhiteSpace, EmptyLine, DELIMITER_SEMICOLON } from '../shared/elements';
import {
  createProgramLine,
  createVarDeclarationLine,
  createVarDefinitionLine,
  createBeginLine,
  createEndLine,
  createWritelnLine,
  createIfStatementLine,
  createElseStatementLine,
  createFormattedLine,
} from './test-helpers';

describe('Simple Cases', () => {
  test('should handle basic string in writeln', () => {
    const input = "program Test; begin writeln('Hello, world!'); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine('Test'),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'Hello, world!'"),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });

  test('should handle escaped single quotes in strings', () => {
    const input = "program Test; begin writeln('It''s a beautiful day'); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine('Test'),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'It''s a beautiful day'"),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });

  test('should handle multiple writeln statements with escaped quotes', () => {
    const input = `program Test; 
    begin 
      writeln('Simple string');
      writeln('String with ''escaped'' quotes');
      writeln('String with multiple ''quotes'' here');
    end.`;
    const expected: FormattedPascalLine[] = [
      createProgramLine('Test'),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'Simple string'"),
      createWritelnLine("'String with ''escaped'' quotes'"),
      createWritelnLine("'String with multiple ''quotes'' here'"),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });

  test('should handle empty strings', () => {
    const input = "program Test; begin writeln(''); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine('Test'),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("''"),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });

  test('should handle strings with only escaped quotes', () => {
    const input = "program Test; begin writeln(''''); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine('Test'),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("''''"),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });

  test('should handle strings with multiple escaped quotes', () => {
    const input = "program Test; begin writeln(''''''''); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine('Test'),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("''''''''"),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });
});

describe('formatPascalCode', () => {
  test('should return correct result for simple program', () => {
    const input = 'program Test; var x: integer; y: integer; begin end.';
    const expected: FormattedPascalLine[] = [
      createProgramLine('Test'),
      EmptyLine,
      createVarDeclarationLine(),
      createVarDefinitionLine('x'),
      createVarDefinitionLine('y'),
      EmptyLine,
      createBeginLine(),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });

  test('indentation is case-insensitive: UPPERCASE keywords indent like lowercase ones', () => {
    // Pascal is case-insensitive; VAR/BEGIN/END must drive indentation exactly
    // like var/begin/end. Compare the indentation sequence (the IndentationTracker's
    // job), ignoring the preserved token casing in the output.
    const lower = 'program Test; var x: integer; y: integer; begin end.';
    const upper = 'PROGRAM Test; VAR x: INTEGER; y: INTEGER; BEGIN END.';
    const indents = (code: string) => formatPascalCode(code).map((line) => line.indentation);
    expect(indents(upper)).toMatchObject(indents(lower));
  });

  test('should format a simple Hello World program with comments', () => {
    const input =
      "program MiPrimerPrograma;begin writeln('Hola, mundo!'); (* Muestra un mensaje en pantalla *) end. (* El punto final es crucial! *)";
    const expected: FormattedPascalLine[] = [
      createProgramLine('MiPrimerPrograma'),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'Hola, mundo!'", { indent: 1, comment: 'Muestra un mensaje en pantalla' }),
      createFormattedLine(
        [
          { type: 'KEYWORD', value: 'end' },
          { type: 'DELIMITER_DOT', value: '.' },
          WhiteSpace,
          { type: 'COMMENT_STAR', value: '(* El punto final es crucial! *)' },
        ],
        0,
        'END_DECLARATION',
        'CODE_EXECUTION',
      ),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });

  test('should format if-then-else with comments', () => {
    const input = `program TestIfElse;
var temperaturaActual: integer;
begin
  temperaturaActual := 30;
  if temperaturaActual >= 25 then (* Comprueba si la temperatura es igual o superior a 25 grados *)
  begin
    writeln('¡Hace calor! Enciende el aire acondicionado.'); (* Acción si hace calor *)
  end else begin
    writeln('Temperatura agradable. Aire acondicionado apagado'); (* Acción si no hace calor *)
  end;
end.`;

    const expected: FormattedPascalLine[] = [
      createProgramLine('TestIfElse'),
      EmptyLine,
      createVarDeclarationLine(),
      createVarDefinitionLine('temperaturaActual'),
      EmptyLine,
      createBeginLine(),
      createFormattedLine(
        [
          { type: 'IDENTIFIER', value: 'temperaturaActual' },
          WhiteSpace,
          { type: 'OPERATOR_ASSIGN', value: ':=' },
          WhiteSpace,
          { type: 'NUMBER_INTEGER', value: '30' },
          DELIMITER_SEMICOLON,
        ],
        1,
        'ASSIGNMENT',
        'CODE_EXECUTION',
      ),
      EmptyLine,
      createIfStatementLine(
        [
          { type: 'IDENTIFIER', value: 'temperaturaActual' },
          WhiteSpace,
          { type: 'OPERATOR_GREATER_EQUAL', value: '>=' },
          WhiteSpace,
          { type: 'NUMBER_INTEGER', value: '25' },
        ],
        {
          indent: 1,
          comment: 'Comprueba si la temperatura es igual o superior a 25 grados',
          structuralType: 'CODE_EXECUTION',
        },
      ),
      createBeginLine({ indent: 1 }),
      createWritelnLine("'¡Hace calor! Enciende el aire acondicionado.'", {
        indent: 2,
        comment: 'Acción si hace calor',
      }),
      createEndLine({ indent: 1 }),
      createElseStatementLine(),
      createBeginLine({ indent: 1 }),
      createWritelnLine("'Temperatura agradable. Aire acondicionado apagado'", {
        indent: 2,
        comment: 'Acción si no hace calor',
      }),
      createFormattedLine(
        [
          { type: 'KEYWORD', value: 'end' },
          { type: 'DELIMITER_SEMICOLON', value: ';' },
        ],
        1,
        'END_DECLARATION',
        'CODE_EXECUTION',
      ),
      createEndLine({ indent: 0, withDot: true }),
    ];
    expect(formatPascalCode(input)).toMatchObject(expected);
  });
});

describe('fragments degrade gracefully (no crash)', () => {
  // A formatter must not throw on a fragment: the last real token has no next
  // token (the EOF sentinel is filtered out by ignoreEOF), so isEndOfLine must
  // not dereference an undefined nextToken. Regression for the `end`-terminated crash.
  test('input ending in the keyword `end` without a dot or semicolon does not throw', () => {
    expect(() => formatPascalCode('begin end')).not.toThrow();
  });

  test('bare `end` fragment still produces the end line', () => {
    const result = formatPascalCode('begin end');
    expect(result).toMatchObject([createBeginLine(), createEndLine({ indent: 0 })]);
  });
});

describe('spacing is case-insensitive (needWhiteSpace normalizes keywords)', () => {
  // if/then/program drive spacing; the tokenizer preserves casing, so uppercase
  // keywords must produce the same whitespace layout as lowercase ones.
  test('IF/THEN/PROGRAM in uppercase keep the same spacing as lowercase', () => {
    const lower = 'program Test; begin if x then y := 1; end.';
    const upper = 'PROGRAM Test; BEGIN IF x THEN y := 1; END.';
    const typeShape = (code: string) =>
      formatPascalCode(code).map((line) => line.tokens?.map((t) => t.type) ?? []);
    expect(typeShape(upper)).toMatchObject(typeShape(lower));
  });
});

describe('one line test', () => {
  const input = `if temperaturaActual > 25 then (* Comprueba si la temperatura supera los 25 grados *) begin writeln('¡Hace calor! Enciende el aire acondicionado.'); (* Acción si hace calor *) end else begin writeln('Temperatura agradable. Aire acondicionado apagado'); (* Acción si no hace calor *) end.`;
  const result = formatPascalCode(input);

  test('first line is only condition', () => {
    expect(result[0]).toMatchObject(
      createIfStatementLine(
        [
          { type: 'IDENTIFIER', value: 'temperaturaActual' },
          WhiteSpace,
          { type: 'OPERATOR_GREATER', value: '>' },
          WhiteSpace,
          { type: 'NUMBER_INTEGER', value: '25' },
        ],
        {
          indent: 0,
          comment: 'Comprueba si la temperatura supera los 25 grados',
          structuralType: 'CODE_EXECUTION',
        },
      ),
    );
  });

  test('the second line is begin', () => {
    expect(result[1]).toMatchObject(createBeginLine());
  });
});

describe('formatPascalCode output re-parses (round-trip)', () => {
  // Renders the structured lines back to a single Pascal string, the way a consumer
  // that wants text (not the line structure) would. If needWhiteSpace glues two word
  // tokens, the rendered text fails to tokenize/parse — which is exactly the bug this
  // guards. Bodies live on the SAME line as their for/while/if header here, the path
  // the older spacing tests never exercised.
  const render = (lines: FormattedPascalLine[]): string =>
    lines.map((l) => '  '.repeat(l.indentation) + l.tokens.map((t) => t.value).join('')).join('\n');

  const programs: Record<string, string> = {
    forLoop: 'program p; var i: integer; begin for i := 1 to 5 do writeln(i); end.',
    whileLoop: 'program p; var i: integer; begin i := 0; while i < 3 do i := i + 1; end.',
    ifThen: 'program p; var x: integer; begin if x > 0 then writeln(x); end.',
    caseOf:
      "program p; var n: integer; begin case n of 1: writeln('one'); 2: writeln('two'); end; end.",
  };

  for (const [name, src] of Object.entries(programs)) {
    it(`re-parses without throwing: ${name}`, () => {
      const rendered = render(formatPascalCode(src));
      expect(() => parse(rendered)).not.toThrow();
    });
  }

  it('keeps for/to/do/then separated from the surrounding tokens', () => {
    const text = render(
      formatPascalCode('program p; var i: integer; begin for i := 1 to 5 do writeln(i); end.'),
    );
    expect(text).toContain('for i := 1 to 5 do writeln(i);');
    // No glued word tokens (the bug this guards): `fori`, `1to`, `to5`, `5do`, `dowriteln`.
    expect(text).not.toMatch(/fori|1to|to5|5do|dowriteln/);
  });
});
