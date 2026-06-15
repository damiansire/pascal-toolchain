import { PROGRAM, WhiteSpace, DELIMITER_SEMICOLON, VAR, DELIMITER_COLON, KEYWORD_INTEGER, KEYWORD_BEGIN } from "../shared/elements";
import { LineType, StructuralType, FormattedPascalLine } from "../shared/types";
import { PascalToken, TokenType } from "pascal-tokenizer";

const createFormattedLine = (
    tokens: PascalToken[],
    indentation: number,
    type: LineType,
    structuralType: StructuralType
): FormattedPascalLine => ({
    tokens,
    indentation,
    type,
    structuralType
});

const createProgramLine = (name: string): FormattedPascalLine => createFormattedLine(
    [PROGRAM, WhiteSpace, { type: "IDENTIFIER" as TokenType, value: name }, DELIMITER_SEMICOLON],
    0,
    "PROGRAM_NAME_DECLARATION",
    "PROGRAM_NAME_DECLARATION"
);

const createVarDeclarationLine = (options: { indent: number } = { indent: 0 }): FormattedPascalLine => createFormattedLine(
    [VAR],
    options.indent,
    "VAR_DECLARATION",
    "VARS_DECLARATION"
);

const createVarDefinitionLine = (name: string, options: { indent: number, type: string } = { indent: 1, type: "integer" }): FormattedPascalLine => createFormattedLine(
    [{ type: "IDENTIFIER" as TokenType, value: name }, DELIMITER_COLON, WhiteSpace, KEYWORD_INTEGER, DELIMITER_SEMICOLON],
    options.indent,
    "DECLARATION",
    "VARS_DECLARATION"
);

const createBeginLine = (options: { indent: number } = { indent: 0 }): FormattedPascalLine => createFormattedLine(
    [KEYWORD_BEGIN],
    options.indent,
    "BEGIN_DECLARATION",
    "CODE_EXECUTION"
);

const createEndLine = (options: { indent: number, withDot?: boolean } = { indent: 0 }): FormattedPascalLine => createFormattedLine(
    [
        { type: "KEYWORD" as TokenType, value: "end" },
        ...(options.withDot ? [{ type: "DELIMITER_DOT" as TokenType, value: "." }] : [])
    ],
    options.indent,
    "END_DECLARATION",
    "CODE_EXECUTION"
);

const createWritelnLine = (message: string, options: { indent: number, comment?: string, structuralType?: StructuralType } = { indent: 1 }): FormattedPascalLine => createFormattedLine(
    [
        { type: "IDENTIFIER" as TokenType, value: "writeln" },
        { type: "DELIMITER_LPAREN" as TokenType, value: "(" },
        { type: "STRING_LITERAL" as TokenType, value: message },
        { type: "DELIMITER_RPAREN" as TokenType, value: ")" },
        DELIMITER_SEMICOLON,
        ...(options.comment ? [WhiteSpace, { type: "COMMENT_STAR" as TokenType, value: `(* ${options.comment} *)` }] : [])
    ],
    options.indent,
    "UNKNOWN",
    options.structuralType || "CODE_EXECUTION",
);

const createIfStatementLine = (conditions: PascalToken[], options: { indent: number, comment?: string, structuralType?: StructuralType } = { indent: 1 }): FormattedPascalLine => createFormattedLine(
    [
        { type: "KEYWORD" as TokenType, value: "if" },
        WhiteSpace,
        ...conditions,
        WhiteSpace,
        { type: "KEYWORD" as TokenType, value: "then" },
        ...(options.comment ? [WhiteSpace, { type: "COMMENT_STAR" as TokenType, value: `(* ${options.comment} *)` }] : [])
    ],
    options.indent,
    "IF_STATEMENT",
    options.structuralType || "CODE_EXECUTION"
);

const createElseStatementLine = (options: { indent: number } = { indent: 1 }): FormattedPascalLine => createFormattedLine(
    [{ type: "KEYWORD" as TokenType, value: "else" }],
    options.indent,
    "UNKNOWN",
    "CODE_EXECUTION"
);

export {
    createFormattedLine,
    createProgramLine,
    createVarDeclarationLine,
    createVarDefinitionLine,
    createBeginLine,
    createEndLine,
    createWritelnLine,
    createIfStatementLine,
    createElseStatementLine,
    type PascalToken,
    type TokenType
};
