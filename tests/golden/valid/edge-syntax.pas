program EdgeSyntax;
{ brace comment before declarations }
var
  s: string;
  x: integer;
begin
  (* star comment inside the body *)
  s := 'it''s escaped';
  s := '';
  // line comment
  x := 5;;
  writeln(s);
  writeln(x)
end.
