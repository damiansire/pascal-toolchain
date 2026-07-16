import { parse } from 'pascal-parser';
import { analyze } from '../analyzer';

function errors(source: string): string[] {
  const program = parse(source);
  return analyze(program)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
}

describe('undeclared identifiers', () => {
  it('flags an undeclared variable used in an assignment', () => {
    const msgs = errors(`
      program Demo;
      begin
        X := 5;
      end.
    `);
    expect(msgs).toEqual(["'X' no está declarado"]);
  });

  it('flags an undeclared identifier used in an expression', () => {
    const msgs = errors(`
      program Demo;
      var Y: integer;
      begin
        Y := X + 1;
      end.
    `);
    expect(msgs).toEqual(["'X' no está declarado"]);
  });

  it('flags a call to an undeclared function', () => {
    const msgs = errors(`
      program Demo;
      var Y: integer;
      begin
        Y := Mystery(1);
      end.
    `);
    expect(msgs).toEqual(["'Mystery' no está declarado"]);
  });

  it('accepts a declared variable with no diagnostics', () => {
    expect(
      errors(`
      program Demo;
      var X: integer;
      begin
        X := 5;
      end.
    `),
    ).toEqual([]);
  });
});

describe('assignment type mismatches', () => {
  it('flags assigning a string literal to an integer variable', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      begin
        X := 'hello';
      end.
    `);
    expect(msgs).toEqual(["No se puede asignar string a 'X' de tipo integer"]);
  });

  it('flags assigning a boolean to an integer variable', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      begin
        X := true;
      end.
    `);
    expect(msgs).toEqual(["No se puede asignar boolean a 'X' de tipo integer"]);
  });

  it('allows assigning an integer to a real variable (widening)', () => {
    expect(
      errors(`
      program Demo;
      var X: real;
      begin
        X := 5;
      end.
    `),
    ).toEqual([]);
  });

  it('flags assigning a real to an integer variable (narrowing)', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      begin
        X := 5.5;
      end.
    `);
    expect(msgs).toEqual(["No se puede asignar real a 'X' de tipo integer"]);
  });

  it('flags assigning to a constant', () => {
    const msgs = errors(`
      program Demo;
      const Pi = 3;
      begin
        Pi := 4;
      end.
    `);
    expect(msgs).toEqual(["No se puede asignar a la constante 'Pi'"]);
  });

  it('flags a type mismatch on an array element assignment', () => {
    const msgs = errors(`
      program Demo;
      var Items: array[1..3] of integer;
      begin
        Items[1] := 'no';
      end.
    `);
    expect(msgs).toEqual(["No se puede asignar string a un elemento de tipo integer"]);
  });
});

describe('function/procedure call arity', () => {
  it('flags calling a function with too few arguments', () => {
    const msgs = errors(`
      program Demo;
      var Y: integer;
      function Add(a: integer; b: integer): integer;
      begin
        Add := a + b;
      end;
      begin
        Y := Add(1);
      end.
    `);
    expect(msgs).toEqual(["'Add' espera 2 argumento(s), recibió 1"]);
  });

  it('flags calling a procedure with too many arguments', () => {
    const msgs = errors(`
      program Demo;
      procedure Greet(name: string);
      begin
      end;
      begin
        Greet('a', 'b');
      end.
    `);
    expect(msgs).toEqual(["'Greet' espera 1 argumento(s), recibió 2"]);
  });

  it('accepts a call with the exact declared arity', () => {
    expect(
      errors(`
      program Demo;
      var Y: integer;
      function Add(a: integer; b: integer): integer;
      begin
        Add := a + b;
      end;
      begin
        Y := Add(1, 2);
      end.
    `),
    ).toEqual([]);
  });

  it('flags an argument of the wrong type even when arity matches', () => {
    const msgs = errors(`
      program Demo;
      var Y: integer;
      function Add(a: integer; b: integer): integer;
      begin
        Add := a + b;
      end;
      begin
        Y := Add(1, 'x');
      end.
    `);
    expect(msgs).toEqual(["Argumento 2 de 'Add' debe ser integer, no string"]);
  });

  it('flags calling a variable as if it were a function', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      begin
        X := X(1);
      end.
    `);
    expect(msgs).toEqual(["'X' no es una función y no puede llamarse"]);
  });
});

describe('builtins', () => {
  it('does not flag writeln with any number of arguments', () => {
    expect(
      errors(`
      program Demo;
      var X: integer;
      begin
        X := 1;
        writeln('x = ', X);
      end.
    `),
    ).toEqual([]);
  });

  it('checks abs/sqrt/odd arity and operand type', () => {
    expect(
      errors(`
      program Demo;
      var X: integer;
      begin
        X := abs(-5);
      end.
    `),
    ).toEqual([]);
    expect(
      errors(`
      program Demo;
      var X: boolean;
      begin
        X := odd('no');
      end.
    `),
    ).toEqual(["'odd' espera un argumento integer, no string"]);
  });

  it('a user-declared subprogram with a builtin name shadows the builtin', () => {
    expect(
      errors(`
      program Demo;
      var X: integer;
      function Abs(a: integer; b: integer): integer;
      begin
        Abs := a + b;
      end;
      begin
        X := Abs(1, 2);
      end.
    `),
    ).toEqual([]);
  });
});

describe('condition and control-flow type checks', () => {
  it('flags a non-boolean if condition', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      begin
        if X then
          X := 1;
      end.
    `);
    expect(msgs).toEqual(["La condición de 'if' debe ser boolean, no integer"]);
  });

  it('accepts a comparison expression as an if condition', () => {
    expect(
      errors(`
      program Demo;
      var X: integer;
      begin
        if X > 0 then
          X := 1;
      end.
    `),
    ).toEqual([]);
  });

  it('flags a non-integer for-loop control variable', () => {
    const msgs = errors(`
      program Demo;
      var X: real;
      begin
        for X := 1 to 10 do
        begin
        end;
      end.
    `);
    expect(msgs).toEqual(["La variable de control de 'for' debe ser integer, no real"]);
  });
});

describe('operator type checks', () => {
  it('flags arithmetic on a boolean operand', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      var Flag: boolean;
      begin
        X := Flag + 1;
      end.
    `);
    expect(msgs).toEqual(["Operando izquierdo de '+' debe ser numérico, no boolean"]);
  });

  it('allows string concatenation with +', () => {
    expect(
      errors(`
      program Demo;
      var S: string;
      begin
        S := 'a' + 'b';
      end.
    `),
    ).toEqual([]);
  });

  it('flags a logical and over non-boolean operands', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      var Flag: boolean;
      begin
        Flag := X and true;
      end.
    `);
    expect(msgs).toEqual(["Operando izquierdo de 'and' debe ser boolean, no integer"]);
  });

  it('flags indexing a non-array value', () => {
    const msgs = errors(`
      program Demo;
      var X: integer;
      begin
        X := X[1];
      end.
    `);
    expect(msgs).toEqual(['No se puede indexar un valor de tipo integer']);
  });
});

describe('one root-cause error does not cascade', () => {
  it('an undeclared identifier only produces one diagnostic even when reused', () => {
    const msgs = errors(`
      program Demo;
      var Y: integer;
      begin
        Y := X + X;
      end.
    `);
    // Two separate uses of the same undeclared name are two real occurrences, but
    // neither should ALSO produce a spurious "+ needs numeric operands" error
    // since 'unknown' is treated as compatible with everything.
    expect(msgs).toEqual(["'X' no está declarado", "'X' no está declarado"]);
  });
});
