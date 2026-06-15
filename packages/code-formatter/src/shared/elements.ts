import { PascalToken } from "pascal-tokenizer";
import { FormattedPascalLine, StructuralType } from "./types";

export const WhiteSpace: PascalToken = { type: "WHITESPACE", value: " " };

export const VAR: PascalToken = { type: "KEYWORD", value: "var" };

export const PROGRAM: PascalToken = { type: "KEYWORD", value: "program" };
export const DELIMITER_SEMICOLON: PascalToken = { type: "DELIMITER_SEMICOLON", value: ";" }
export const DELIMITER_COLON: PascalToken = { type: "DELIMITER_COLON", value: ":" }
export const KEYWORD_INTEGER: PascalToken = { type: "KEYWORD", value: "integer" };
export const KEYWORD_BEGIN: PascalToken = { type: "KEYWORD", value: "begin" };
export const EmptyLine: FormattedPascalLine = {
  tokens: [],
  indentation: 0,
  type: "EMPTY",
  structuralType: "EMPTY",
};

const StructuralElements: StructuralType[] = ["PROGRAM_NAME_DECLARATION", "LIBRARIES_IMPORT", "CONSTS_DECLARATION", "TYPES_DECLARATION", "VARS_DECLARATION", "PROCEDURES_DEFINITIONS", "FUNCTIONS_DEFINITIONS", "CODE_EXECUTION"]

export const StructuralElementsWeightRules = StructuralElements.map(element => {
  return {
    mainElement: element,
    counterweights: StructuralElements,
  }
});