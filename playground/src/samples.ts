/**
 * Sample programs. Every one is a real golden fixture from
 * `packages/compiler/src/__tests__/fixtures/`, so each is guaranteed to
 * tokenize, parse, format and compile-and-run. Keep them in sync with the
 * fixtures if the supported language subset changes.
 */
export interface Sample {
  readonly id: string;
  readonly label: string;
  readonly code: string;
}

export const SAMPLES: readonly Sample[] = [
  {
    id: 'fizzbuzz',
    label: 'FizzBuzz',
    code: `program FizzBuzz;
var
    i: integer;
begin
    for i := 1 to 15 do
        if i mod 15 = 0 then
            writeln('FizzBuzz')
        else if i mod 3 = 0 then
            writeln('Fizz')
        else if i mod 5 = 0 then
            writeln('Buzz')
        else
            writeln(i);
end.`,
  },
  {
    id: 'fibonacci',
    label: 'Fibonacci (recursive)',
    code: `program Fibonacci;
var
    f: integer;
function fib(n: integer): integer;
begin
    if n < 2 then
        fib := n
    else
        fib := fib(n - 1) + fib(n - 2);
end;
begin
    f := fib(10);
    writeln(f);
end.`,
  },
  {
    id: 'gcd',
    label: 'GCD (Euclid)',
    code: `program Euclid;
var
    g: integer;
function gcd(a, b: integer): integer;
begin
    while a <> b do
        if a > b then
            a := a - b
        else
            b := b - a;
    gcd := a;
end;
begin
    g := gcd(48, 18);
    writeln(g);
end.`,
  },
  {
    id: 'bubblesort',
    label: 'Bubble sort (arrays)',
    code: `program BubbleSort;
var
    a: array[1..5] of integer;
    i, j, temp: integer;
begin
    a[1] := 5;
    a[2] := 2;
    a[3] := 8;
    a[4] := 1;
    a[5] := 9;
    for i := 1 to 4 do
        for j := 1 to 5 - i do
            if a[j] > a[j + 1] then
            begin
                temp := a[j];
                a[j] := a[j + 1];
                a[j + 1] := temp;
            end;
    for i := 1 to 5 do
        writeln(a[i]);
end.`,
  },
  {
    id: 'grades',
    label: 'Grades (case)',
    code: `program Grades;
var
    score: integer;
begin
    score := 2;
    case score of
        1: writeln('bad');
        2, 3: writeln('ok');
        4, 5: writeln('great');
    else
        writeln('invalid');
    end;
end.`,
  },
];

export const DEFAULT_SAMPLE = SAMPLES[0];
