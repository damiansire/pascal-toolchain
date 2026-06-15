When you have a label, for example: 
```pascal
program CompleteDeclarationsExample;

label
  StartLoop, EndProgram;

begin
  ShowMessage('Pointer usage:');
  writeln('  Initial value of TargetNumber: ', TargetNumber);
  writeln('  Value pointed to by PointerVar: ', PointerVar^); // ^ is used to access the value
StartLoop: // Start label
  Counter := Counter + 1;
  writeln('  Iteration number: ', Counter);
  if Counter >= 3 then
    goto EndProgram; // Jump to the end label

  goto StartLoop; // Go back to the start of the loop

EndProgram: // End label
  ShowMessage('Loop with GOTO finished.');
  writeln;

  ShowMessage('--- End of demonstration ---');

  // readln; // Uncomment to pause the console at the end if necessary
end.
```
You need to put the label at the start of the line.