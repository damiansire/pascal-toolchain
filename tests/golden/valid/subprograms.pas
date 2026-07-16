program Subprograms;
var
  n: integer;

function double(value: integer): integer;
begin
  double := value * 2;
end;

function sumTo(n: integer): integer;
var
  i, total: integer;
begin
  total := 0;
  for i := 1 to n do
    total := total + i;
  sumTo := total;
end;

procedure reset(var target: integer);
begin
  target := 0;
end;

procedure greet(name: string; times: integer);
var
  i: integer;
begin
  for i := 1 to times do
    writeln(name);
end;

begin
  n := double(21);
  writeln(sumTo(n));
  reset(n);
  greet('hola', 2);
end.
