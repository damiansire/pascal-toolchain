program Declarations;
const
  LIMIT = 100;
  GREETING = 'hola';
  NEG = -5;
var
  x, y: integer;
  price: real;
  name: string;
  ok: boolean;
  scores: array[1..10] of integer;
  offsets: array[-3..3] of real;
begin
  x := LIMIT;
  y := NEG;
  price := 9.99;
  name := GREETING;
  ok := true;
  scores[1] := x;
  offsets[-2] := price;
end.
