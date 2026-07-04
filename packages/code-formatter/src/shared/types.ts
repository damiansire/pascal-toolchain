import { PascalToken } from 'pascal-tokenizer';

/**
 * A token in formatter output. The formatter injects a synthetic whitespace
 * marker that the tokenizer never emits, so it is modeled here as a superset of
 * PascalToken instead of leaking a 'WHITESPACE' member into the tokenizer's
 * public TokenType (a boundary the formatter must not shape).
 */
export type FormatterToken = PascalToken | { type: 'WHITESPACE'; value: string };

export type LineType =
  | 'ASSIGNMENT'
  | 'PROGRAM_NAME_DECLARATION'
  | 'CONST_DECLARATION'
  | 'TYPE_DECLARATION'
  | 'VAR_DECLARATION'
  | 'PROCEDURE_DEFINITION'
  | 'FUNCTION_DEFINITION'
  | 'UNKNOWN'
  | 'EMPTY'
  | 'BEGIN_DECLARATION'
  | 'END_DECLARATION'
  | 'DECLARATION'
  | 'IF_STATEMENT'
  | 'WHILE_STATEMENT'
  | 'REPEAT_STATEMENT'
  | 'FOR_STATEMENT';

export type StructuralType =
  | 'PROGRAM_NAME_DECLARATION'
  | 'LIBRARIES_IMPORT'
  | 'CONSTS_DECLARATION'
  | 'TYPES_DECLARATION'
  | 'VARS_DECLARATION'
  | 'PROCEDURES_DEFINITIONS'
  | 'FUNCTIONS_DEFINITIONS'
  | 'CODE_EXECUTION'
  | 'EMPTY'
  | 'NONE'
  | 'UNKNOWN';

export interface FormattedPascalLine {
  tokens: FormatterToken[];
  indentation: number;
  type: LineType;
  structuralType: StructuralType;
}

export interface InternalFormattedPascalLine {
  tokens: FormatterToken[];
  indentation: number;
}

export interface FormatPascalCodeOptions {
  ignoreEOF?: boolean;
  addEmptyFinalLine?: boolean;
}
