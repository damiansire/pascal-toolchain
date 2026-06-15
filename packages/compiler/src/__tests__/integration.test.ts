import { compile } from '../codegen';

/** Compiles Pascal, runs the generated JS, and returns everything logged. */
function run(source: string): unknown[] {
    const js = compile(source);
    const logged: unknown[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logged.push(args.length === 1 ? args[0] : args);
    });
    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
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
});
