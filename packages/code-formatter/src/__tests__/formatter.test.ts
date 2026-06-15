import { formatPascalCode } from "../formatter";
import { FormattedPascalLine, LineType, StructuralType } from "../shared/types";
import { WhiteSpace, EmptyLine, VAR, PROGRAM, DELIMITER_SEMICOLON, DELIMITER_COLON, KEYWORD_INTEGER, KEYWORD_BEGIN } from "../shared/elements";
import { createProgramLine, createVarDeclarationLine, createVarDefinitionLine, createBeginLine, createEndLine, createWritelnLine, createIfStatementLine, createElseStatementLine, createFormattedLine } from "./test-helpers";


describe("Simple Cases", () => {
  test("should handle basic string in writeln", () => {
    const input = "program Test; begin writeln('Hello, world!'); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine("Test"),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'Hello, world!'"),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

  test("should handle escaped single quotes in strings", () => {
    const input = "program Test; begin writeln('It''s a beautiful day'); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine("Test"),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'It''s a beautiful day'"),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

  test("should handle multiple writeln statements with escaped quotes", () => {
    const input = `program Test; 
    begin 
      writeln('Simple string');
      writeln('String with ''escaped'' quotes');
      writeln('String with multiple ''quotes'' here');
    end.`;
    const expected: FormattedPascalLine[] = [
      createProgramLine("Test"),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'Simple string'"),
      createWritelnLine("'String with ''escaped'' quotes'"),
      createWritelnLine("'String with multiple ''quotes'' here'"),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

  test("should handle empty strings", () => {
    const input = "program Test; begin writeln(''); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine("Test"),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("''"),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

  test("should handle strings with only escaped quotes", () => {
    const input = "program Test; begin writeln(''''); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine("Test"),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("''''"),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

  test("should handle strings with multiple escaped quotes", () => {
    const input = "program Test; begin writeln(''''''''); end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine("Test"),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("''''''''"),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });
})

describe("formatPascalCode", () => {
  test("should return correct result for simple program", () => {
    const input = "program Test; var x: integer; y: integer; begin end.";
    const expected: FormattedPascalLine[] = [
      createProgramLine("Test"),
      EmptyLine,
      createVarDeclarationLine(),
      createVarDefinitionLine("x"),
      createVarDefinitionLine("y"),
      EmptyLine,
      createBeginLine(),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

  test("should format a simple Hello World program with comments", () => {
    const input = "program MiPrimerPrograma;begin writeln('Hola, mundo!'); (* Muestra un mensaje en pantalla *) end. (* El punto final es crucial! *)";
    const expected: FormattedPascalLine[] = [
      createProgramLine("MiPrimerPrograma"),
      EmptyLine,
      createBeginLine(),
      createWritelnLine("'Hola, mundo!'", { indent: 1, comment: "Muestra un mensaje en pantalla" }),
      createFormattedLine(
        [
          { type: "KEYWORD", value: "end" },
          { type: "DELIMITER_DOT", value: "." },
          WhiteSpace,
          { type: "COMMENT_STAR", value: "(* El punto final es crucial! *)" }
        ],
        0,
        "END_DECLARATION",
        "CODE_EXECUTION"
      )
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

  test("should format if-then-else with comments", () => {
    const input = `program TestIfElse;
var temperaturaActual: integer;
begin
  temperaturaActual := 30;
  if temperaturaActual >= 25 then (* Comprueba si la temperatura es igual o superior a 25 grados *)
  begin
    writeln('¡Hace calor! Enciende el aire acondicionado.'); (* Acción si hace calor *)
  end else begin
    writeln('Temperatura agradable. Aire acondicionado apagado'); (* Acción si no hace calor *)
  end;
end.`;

    const expected: FormattedPascalLine[] = [
      createProgramLine("TestIfElse"),
      EmptyLine,
      createVarDeclarationLine(),
      createVarDefinitionLine("temperaturaActual"),
      EmptyLine,
      createBeginLine(),
      createFormattedLine(
        [
          { type: "IDENTIFIER", value: "temperaturaActual" },
          WhiteSpace,
          { type: "OPERATOR_ASSIGN", value: ":=" },
          WhiteSpace,
          { type: "NUMBER_INTEGER", value: "30" },
          DELIMITER_SEMICOLON
        ],
        1,
        "ASSIGNMENT",
        "CODE_EXECUTION"
      ),
      EmptyLine,
      createIfStatementLine([
        { type: "IDENTIFIER", value: "temperaturaActual" },
        WhiteSpace,
        { type: "OPERATOR_GREATER_EQUAL", value: ">=" },
        WhiteSpace,
        { type: "NUMBER_INTEGER", value: "25" },
      ], { indent: 1, comment: "Comprueba si la temperatura es igual o superior a 25 grados", structuralType: "CODE_EXECUTION" }),
      createBeginLine({ indent: 1 }),
      createWritelnLine("'¡Hace calor! Enciende el aire acondicionado.'", { indent: 2, comment: "Acción si hace calor" }),
      createEndLine({ indent: 1 }),
      createElseStatementLine(),
      createBeginLine({ indent: 1 }),
      createWritelnLine("'Temperatura agradable. Aire acondicionado apagado'", { indent: 2, comment: "Acción si no hace calor" }),
      createFormattedLine(
        [
          { type: "KEYWORD", value: "end" },
          { type: "DELIMITER_SEMICOLON", value: ";" },
        ], 1, "END_DECLARATION", "CODE_EXECUTION"),
      createEndLine({ indent: 0, withDot: true })
    ];
    expect(formatPascalCode(input)).toEqual(expected);
  });

});

describe("one line test", () => {
  const input = `if temperaturaActual > 25 then (* Comprueba si la temperatura supera los 25 grados *) begin writeln('¡Hace calor! Enciende el aire acondicionado.'); (* Acción si hace calor *) end else begin writeln('Temperatura agradable. Aire acondicionado apagado'); (* Acción si no hace calor *) end.`
  const result = formatPascalCode(input);

  test("first line is only condition", () => {
    expect(result[0]).toEqual(
      createIfStatementLine([
        { type: "IDENTIFIER", value: "temperaturaActual" },
        WhiteSpace,
        { type: "OPERATOR_GREATER", value: ">" },
        WhiteSpace,
        { type: "NUMBER_INTEGER", value: "25" },
      ], { indent: 0, comment: "Comprueba si la temperatura supera los 25 grados", structuralType: "CODE_EXECUTION" })
    );
  })

  test("the second line is begin", () => {
    expect(result[1]).toEqual(createBeginLine());
  })
})
