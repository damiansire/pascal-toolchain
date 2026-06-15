program Euclid;
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
end.
