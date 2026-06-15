program Fibonacci;
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
end.
