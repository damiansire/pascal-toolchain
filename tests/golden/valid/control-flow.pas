program ControlFlow;
var
  i, n: integer;
begin
  n := 10;
  if n mod 2 = 0 then
    writeln('even')
  else
    writeln('odd');

  while n > 0 do
    n := n - 1;

  for i := 1 to 5 do
    writeln(i);

  for i := 5 downto 1 do
    writeln(i);

  repeat
    n := n + 1
  until n >= 3;

  case n of
    1: writeln('one');
    2, 3: writeln('two or three');
  else
    writeln('many');
  end;
end.
