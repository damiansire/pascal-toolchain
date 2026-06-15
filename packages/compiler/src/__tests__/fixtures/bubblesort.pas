program BubbleSort;
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
end.
