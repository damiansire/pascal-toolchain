// Area: error recovery (parseWithRecovery) — panic-mode synchronization at
// statement boundaries: every error in one pass, best-effort AST, diagnostics
// as values (never uncaught exceptions), and no behavior change for parse().
import { parse, parseWithRecovery } from '../parser';
import { ParseError } from '../types';

describe('parseWithRecovery', () => {
  it('reports every bad statement in one pass instead of stopping at the first', () => {
    const source = `
program MultiError;
begin
    x := ;
    y := 5;
    z := ;
    w := 10;
end.`;
    const { program, errors } = parseWithRecovery(source);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toBeInstanceOf(ParseError);
    expect(errors[1]).toBeInstanceOf(ParseError);

    // The two well-formed statements still make it into the AST.
    expect(program.statements).toHaveLength(2);
    expect(program.statements[0]).toMatchObject({
      type: 'AssignmentStatement',
      left: { name: 'y' },
    });
    expect(program.statements[1]).toMatchObject({
      type: 'AssignmentStatement',
      left: { name: 'w' },
    });
  });

  it('recovers from a token that cannot start a statement, not just a bad expression', () => {
    const source = `
program Bad;
begin
    x := 1;
    123;
    y := 2;
end.`;
    const { program, errors } = parseWithRecovery(source);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Unexpected token in statement/);
    // Only the two well-formed assignments (x, y) survive; the bare `123;`
    // is neither.
    expect(program.statements).toHaveLength(2);
    expect(program.statements.map((s) => s.type)).toEqual([
      'AssignmentStatement',
      'AssignmentStatement',
    ]);
  });

  it('returns zero errors for source that is already valid', () => {
    const source = `program Ok; begin writeln('fine'); end.`;
    const { program, errors } = parseWithRecovery(source);
    expect(errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);
  });

  it('does not change default parse() behavior: still throws on the first error', () => {
    const source = `
program MultiError;
begin
    x := ;
    y := 5;
end.`;
    expect(() => parse(source)).toThrow(ParseError);
    // Confirms recovery mode is strictly additive: parseWithRecovery on the
    // same source instead collects the error and keeps going.
    const { errors } = parseWithRecovery(source);
    expect(errors).toHaveLength(1);
  });

  it('recovers inside a compound statement nested in an if/while', () => {
    const source = `
program Nested;
var i: integer;
begin
    i := 0;
    while i <= 3 do
    begin
        writeln(i);
        := ;
        i := i + 1;
    end;
end.`;
    const { errors } = parseWithRecovery(source);
    expect(errors).toHaveLength(1);
  });

  it('every collected diagnostic carries a source position', () => {
    const source = `
program Positions;
begin
    x := ;
    y := ;
end.`;
    const { errors } = parseWithRecovery(source);
    expect(errors).toHaveLength(2);
    for (const error of errors) {
      expect(error.message).toMatch(/at line \d+, column \d+/);
      expect(error.location?.start.line).toBeGreaterThan(0);
    }
    // And they point at the right lines.
    expect(errors[0].location?.start.line).toBe(4);
    expect(errors[1].location?.start.line).toBe(5);
  });

  it('synchronizes on a statement-starting keyword when the bad statement has no ;', () => {
    // The broken assignment is followed directly by 'if' (no semicolon):
    // synchronize() must stop at the keyword, not swallow the if statement.
    const source = `
program SyncKeyword;
begin
    x :=
    if true then writeln('kept');
end.`;
    const { program, errors } = parseWithRecovery(source);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(program.statements.some((s) => s.type === 'IfStatement')).toBe(true);
  });

  it('collects errors from several nesting levels in the same pass', () => {
    const source = `
program Multi;
begin
    := ;
    begin
        := ;
    end;
    if true then
    begin
        := ;
    end;
end.`;
    const { errors } = parseWithRecovery(source);
    expect(errors).toHaveLength(3);
    for (const error of errors) {
      expect(error).toBeInstanceOf(ParseError);
    }
  });

  it('a malformed program header still throws (recovery only covers statement lists)', () => {
    expect(() => parseWithRecovery('prog X; begin end.')).toThrow(ParseError);
    expect(() => parseWithRecovery('program ; begin end.')).toThrow(ParseError);
  });

  it('recovers inside a repeat body', () => {
    const source = `
program Rep;
var x: integer;
begin
    x := 0;
    repeat
        x := x + 1
    until x > ;
end.`;
    // The 'until' condition is broken: that error is thrown from the repeat
    // statement itself, recorded, and the parse still reaches 'end.'.
    const { errors } = parseWithRecovery(source);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]).toBeInstanceOf(ParseError);
  });

  it('an error in the last statement before end still leaves earlier statements intact', () => {
    const source = `
program Tail;
begin
    a := 1;
    b := 2;
    c :=
end.`;
    const { program, errors } = parseWithRecovery(source);
    expect(errors).toHaveLength(1);
    expect(program.statements.map((s) => s.type)).toEqual([
      'AssignmentStatement',
      'AssignmentStatement',
    ]);
  });
});
