program Expressions;
var
  a, b, c: integer;
  r: real;
  flag: boolean;
begin
  a := 2 + 3 * 4;
  b := (2 + 3) * 4;
  c := 100 div 5 div 2;
  a := 10 mod 3 + a;
  r := 1.5 + .5;
  r := r / 2;
  b := -a + +c;
  flag := not (a = b) and (c <> 0) or (a <= b);
  flag := (a < b) = (b > c);
  a := abs(b - c) + sqr(2);
  c := a * b - a div b;
end.
