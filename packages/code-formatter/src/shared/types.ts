import { PascalToken } from "pascal-tokenizer";

export type LineType = "ASSIGNMENT" | "PROGRAM_NAME_DECLARATION" | "LIBRARY_IMPORT" | "CONST_DECLARATION" | "TYPE_DECLARATION" | "VAR_DECLARATION" | "PROCEDURE_DEFINITION" | "FUNCTION_DEFINITION" | "CODE_DECLARATION" | "UNKNOWN" | "INITIAL" | "EMPTY" | "BEGIN_DECLARATION" | "END_DECLARATION" | "DECLARATION" | "EOF" | "IF_STATEMENT" | "WHILE_STATEMENT" | "REPEAT_STATEMENT" | "FOR_STATEMENT";

export type StructuralType = "PROGRAM_NAME_DECLARATION" | "LIBRARIES_IMPORT" | "CONSTS_DECLARATION" | "TYPES_DECLARATION" | "VARS_DECLARATION" | "PROCEDURES_DEFINITIONS" | "FUNCTIONS_DEFINITIONS" | "CODE_EXECUTION" | "EMPTY" | "NONE" | "UNKNOWN";

export interface FormattedPascalLine {
  tokens: PascalToken[];
  indentation: number;
  type: LineType;
  structuralType: StructuralType;
}

export interface InternalFormattedPascalLine {
  tokens: PascalToken[];
  indentation: number;
}

export interface FormatPascalCodeOptions {
  ignoreEOF?: boolean;
  addEmptyFinalLine?: boolean;
}

