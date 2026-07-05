import { formatPascalSource } from '../logic/ast-formatter';
import { parse } from 'pascal-parser';

/** Deep-compares two ASTs ignoring `location` (positions are zeroed and irrelevant here). */
const astWithoutLocation = (source: string): unknown =>
  JSON.parse(
    JSON.stringify(parse(source), (key, value) => (key === 'location' ? undefined : value)),
  );

describe('formatPascalSource (AST-driven)', () => {
  it('pretty-prints a program with grouped const/var, a function, and control flow', () => {
    const input =
      'program demo; const PI=3; var n:integer; xs:array[1..3] of integer; ' +
      'function double(x:integer):integer; begin double:=x*2; end; ' +
      'begin n:=double(PI); if (n>0) and (n<10) then writeln(n) else writeln(0); end.';
    expect(formatPascalSource(input)).toBe(
      [
        'program demo;',
        '',
        'const',
        '  PI = 3;',
        '',
        'var',
        '  n: integer;',
        '  xs: array[1..3] of integer;',
        '',
        'function double(x: integer): integer;',
        'begin',
        '  double := x * 2;',
        'end;',
        '',
        'begin',
        '  n := double(PI);',
        '  if (n > 0) and (n < 10) then',
        '    writeln(n)',
        '  else',
        '    writeln(0);',
        'end.',
        '',
      ].join('\n'),
    );
  });

  it('adds parentheses only where precedence requires them', () => {
    const input =
      'program p; var a: integer; begin a := 1 + 2 * 3; a := (1 + 2) * 3; a := 10 - (4 - 1); end.';
    const out = formatPascalSource(input);
    expect(out).toContain('a := 1 + 2 * 3;'); // '*' binds tighter, no parens
    expect(out).toContain('a := (1 + 2) * 3;'); // parens preserved (needed)
    expect(out).toContain('a := 10 - (4 - 1);'); // right-side same precedence keeps parens
  });

  it('respects a custom indent unit', () => {
    const out = formatPascalSource('program p; begin writeln(1); end.', { indent: '\t' });
    expect(out).toContain('\twriteln(1);');
  });

  const programs: Record<string, string> = {
    while: 'program p; var i: integer; begin i := 0; while i < 3 do i := i + 1; end.',
    repeat: 'program p; var i: integer; begin i := 0; repeat i := i + 1; until i > 3; end.',
    for: 'program p; var i: integer; begin for i := 1 to 5 do writeln(i); end.',
    nestedCompound:
      'program p; var x: integer; begin if x > 0 then begin x := 1; writeln(x); end; end.',
    procedure:
      "program p; procedure greet(name: string); begin writeln(name); end; begin greet('hi'); end.",
  };

  for (const [name, src] of Object.entries(programs)) {
    it(`round-trips and is idempotent: ${name}`, () => {
      const once = formatPascalSource(src);
      // Re-parses without throwing (valid Pascal out).
      expect(() => parse(once)).not.toThrow();
      // Formatting is stable: formatting the output again changes nothing.
      expect(formatPascalSource(once)).toBe(once);
      // Structure is preserved: the formatted source parses to the same AST.
      expect(astWithoutLocation(once)).toEqual(astWithoutLocation(src));
    });
  }

  it('escapes single quotes inside string literals', () => {
    const out = formatPascalSource("program p; begin writeln('it''s'); end.");
    expect(out).toContain("writeln('it''s');");
  });
});
