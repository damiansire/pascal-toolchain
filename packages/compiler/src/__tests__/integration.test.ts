import { compile } from '../codegen';

/** Compiles Pascal, runs the generated JS, and returns everything logged. */
function run(source: string): unknown[] {
  const js = compile(source);
  const logged: unknown[] = [];
  const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logged.push(args.length === 1 ? args[0] : args);
  });
  try {
    new Function(js)();
  } finally {
    spy.mockRestore();
  }
  return logged;
}

describe('pascal-toolchain — full pipeline (Pascal source → running JS)', () => {
  it('runs a program with variables and a for..to loop', () => {
    const output = run(`
program Sum;
var
    i, total: integer;
begin
    total := 0;
    for i := 1 to 5 do
        total := total + i;
    writeln(total);
end.`);
    expect(output).toEqual([15]);
  });

  it('runs if/else with the mod operator', () => {
    const output = run(`
program Parity;
var
    n: integer;
begin
    n := 7;
    if n mod 2 = 0 then
        writeln('even')
    else
        writeln('odd');
end.`);
    expect(output).toEqual(['odd']);
  });

  it('runs a while loop with integer division (div)', () => {
    const output = run(`
program Halving;
var
    x: integer;
begin
    x := 8;
    while x > 1 do
        x := x div 2;
    writeln(x);
end.`);
    expect(output).toEqual([1]);
  });

  it('respects operator precedence in arithmetic', () => {
    const output = run(`
program Math;
var
    r: integer;
begin
    r := 2 + 3 * 4;
    writeln(r);
end.`);
    expect(output).toEqual([14]);
  });

  it('runs a function (return-by-name lowered to return)', () => {
    const output = run(`
program Doubler;
function double(n: integer): integer;
begin
    double := n * 2;
end;
begin
    writeln(double(21));
end.`);
    expect(output).toEqual([42]);
  });

  it('runs a procedure call', () => {
    const output = run(`
program Greeter;
procedure greet(name: string);
begin
    writeln(name);
end;
begin
    greet('hola');
end.`);
    expect(output).toEqual(['hola']);
  });

  it('runs a recursive function (factorial)', () => {
    const output = run(`
program Fact;
function fact(n: integer): integer;
begin
    if n <= 1 then
        fact := 1
    else
        fact := n * fact(n - 1);
end;
begin
    writeln(fact(5));
end.`);
    expect(output).toEqual([120]);
  });

  it('runs a program using arrays with 1-based indexing', () => {
    const output = run(`
program Squares;
var
    a: array[1..5] of integer;
    i, total: integer;
begin
    for i := 1 to 5 do
        a[i] := i * i;
    total := 0;
    for i := 1 to 5 do
        total := total + a[i];
    writeln(total);
end.`);
    expect(output).toEqual([55]);
  });

  it('supports builtins: inc/dec (statements) and abs/sqr (expressions)', () => {
    const output = run(`
program Builtins;
var
    x: integer;
begin
    x := 5;
    inc(x);
    inc(x, 4);
    dec(x, 3);
    writeln(x);
    writeln(abs(0 - 3));
    writeln(sqr(4));
end.`);
    expect(output).toEqual([7, 3, 16]);
  });

  it('runs a function with local variables', () => {
    const output = run(`
program LocalVars;
function sumTo(n: integer): integer;
var
    i, total: integer;
begin
    total := 0;
    for i := 1 to n do
        total := total + i;
    sumTo := total;
end;
begin
    writeln(sumTo(5));
end.`);
    expect(output).toEqual([15]);
  });

  it('runs a repeat..until loop', () => {
    const output = run(`
program Countup;
var
    x: integer;
begin
    x := 0;
    repeat
        x := x + 1
    until x >= 3;
    writeln(x);
end.`);
    expect(output).toEqual([3]);
  });

  it('uses const declarations', () => {
    const output = run(`
program Area;
const
    PI = 3;
var
    r, area: integer;
begin
    r := 2;
    area := PI * r * r;
    writeln(area);
end.`);
    expect(output).toEqual([12]);
  });

  it('runs a case..of statement (with else)', () => {
    const output = run(`
program Classify;
var
    n: integer;
begin
    n := 3;
    case n of
        1: writeln('one');
        2, 3: writeln('two or three');
    else
        writeln('other');
    end;
end.`);
    expect(output).toEqual(['two or three']);
  });

  it('evaluates real boolean and/or/not (not just the integer-rejection path)', () => {
    const output = run(`
program Bools;
var
    n: integer;
begin
    n := 5;
    if (n > 0) and (n < 10) then
        writeln('and');
    if (n < 0) or (n > 3) then
        writeln('or');
    if not (n = 0) then
        writeln('not');
end.`);
    expect(output).toEqual(['and', 'or', 'not']);
  });

  it('supports real division (/) and real literals', () => {
    const output = run(`
program Reals;
var
    x: real;
begin
    x := 10 / 4;
    writeln(x);
    writeln(3.14);
end.`);
    expect(output).toEqual([2.5, 3.14]);
  });

  it('supports the sqrt/trunc/round/odd builtins', () => {
    const output = run(`
program MoreBuiltins;
begin
    writeln(sqrt(9));
    writeln(trunc(2.9));
    writeln(round(2.6));
    writeln(odd(3));
    writeln(odd(4));
end.`);
    expect(output).toEqual([3, 2, 3, true, false]);
  });

  it('write (no newline) coerces each argument with String()', () => {
    const chunks: string[] = [];
    const spy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        chunks.push(String(chunk));
        return true;
      });
    try {
      const js = compile(`program W;
begin
    write('x');
    write(42);
    write(true);
end.`);
      new Function(js)();
    } finally {
      spy.mockRestore();
    }
    expect(chunks.join('')).toBe('x42true');
  });

  it('a homonym array in a subprogram does not corrupt an outer array of the same name', () => {
    // Regression: array low-bounds were tracked in a single flat map keyed by name, so
    // the local `a` (low 1) overwrote the global `a` (low 5) and the global index offset
    // came out wrong. The global write/read must use its own low bound (5) → index 0.
    const output = run(`program H;
var
  a: array[5..7] of integer;
procedure fill;
var
  a: array[1..3] of integer;
begin
  a[1] := 99;
end;
begin
  a[5] := 42;
  writeln(a[5]);
end.`);
    expect(output).toEqual([42]);
  });
});
