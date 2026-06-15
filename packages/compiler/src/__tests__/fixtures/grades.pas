program Grades;
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
end.
