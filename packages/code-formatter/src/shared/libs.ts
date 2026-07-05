import { PascalToken } from 'pascal-tokenizer';
import { FormattedPascalLine, FormatterToken, LineType, StructuralType } from './types';
import { CounterweightStack } from 'counterweight-stack';

const isComment = (token: PascalToken): boolean => {
  return ['COMMENT_STAR', 'COMMENT_BLOCK_BRACE', 'COMMENT_LINE'].includes(token?.type);
};

const isOperator = (token: PascalToken): boolean => {
  return [
    'OPERATOR_EQUAL',
    'OPERATOR_ASSIGN',
    'OPERATOR_GREATER',
    'OPERATOR_LESS',
    'OPERATOR_NOT_EQUAL',
    'OPERATOR_GREATER_EQUAL',
    'OPERATOR_LESS_EQUAL',
  ].includes(token?.type);
};

// "Word" tokens render as their literal text, so two adjacent ones would merge into a
// single token on output (`to`+`5` -> `to5`, `do`+`writeln` -> `dowriteln`). Note the
// word operators (div/mod/and/or/not) are NOT keywords to the tokenizer — they arrive
// as identifiers — so IDENTIFIER covers them here too.
const isWordLike = (token: PascalToken): boolean => {
  return [
    'KEYWORD',
    'IDENTIFIER',
    'NUMBER_INTEGER',
    'NUMBER_REAL',
    'BOOLEAN_LITERAL',
    'STRING_LITERAL',
  ].includes(token?.type);
};

// Control keywords still need a leading space when they follow a closing paren/bracket
// or literal (`while (c) do`, `if (c) then`, `case x of`), which the word-word rule
// alone would miss because the preceding `)`/`]` is not word-like.
const CONTROL_KEYWORDS = new Set(['then', 'else', 'do', 'of', 'to', 'downto']);

const isStatement = (type: LineType): boolean => {
  return ['IF_STATEMENT', 'WHILE_STATEMENT', 'REPEAT_STATEMENT', 'FOR_STATEMENT'].includes(type);
};

const isEndOfLine = (currentToken: PascalToken, nextToken: PascalToken | undefined): boolean => {
  // No next token means the current one closes the line. Guard first so no branch
  // below dereferences an undefined nextToken (e.g. `end` as the last real token
  // once the EOF sentinel is filtered out by ignoreEOF).
  if (nextToken === undefined) {
    return true;
  }
  if (isComment(nextToken)) {
    return false;
  }
  if (isComment(currentToken)) {
    return true;
  }

  if (currentToken.type === 'DELIMITER_SEMICOLON') {
    return true;
  }
  if (currentToken.type === 'KEYWORD') {
    if (['begin', 'var', 'else'].includes(currentToken.value.toLowerCase())) {
      return true;
    }
    if (currentToken.value.toLowerCase() === 'end') {
      if (nextToken.value !== '.' && nextToken.value !== ';') {
        return true;
      }
    }
  }
  if (nextToken.type === 'EOF') {
    return true;
  }

  return false;
};

const needWhiteSpace = (currentToken: PascalToken, nextToken: PascalToken | undefined) => {
  if (!nextToken) {
    return false;
  }

  // Comments always get a leading space.
  if (isComment(nextToken)) {
    return true;
  }

  // Two adjacent word tokens must be separated or the output re-tokenizes wrong
  // (`for`+`i`, `to`+`5`, `do`+`writeln`, `a`+`div`). This is the general rule that
  // keeps formatPascalCode output re-parseable; the specific rules below only add
  // spacing around punctuation the word-word rule doesn't reach.
  if (isWordLike(currentToken) && isWordLike(nextToken)) {
    return true;
  }

  // A control keyword after a `)`/`]`/other non-word token: `while (c) do`, `case x of`.
  // Normalized to lower-case since the tokenizer preserves the source casing.
  if (nextToken.type === 'KEYWORD' && CONTROL_KEYWORDS.has(nextToken.value.toLowerCase())) {
    return true;
  }

  if (currentToken.type === 'IDENTIFIER' && isOperator(nextToken)) {
    return true;
  }

  if (currentToken.type === 'OPERATOR_ASSIGN') {
    return true;
  }

  if (currentToken.type === 'DELIMITER_COLON' && nextToken.type !== 'OPERATOR_EQUAL') {
    return true;
  }

  if (isOperator(currentToken)) {
    return true;
  }

  return false;
};

const LineToStructure: Partial<Record<LineType, StructuralType>> = {
  PROGRAM_NAME_DECLARATION: 'PROGRAM_NAME_DECLARATION',
  VAR_DECLARATION: 'VARS_DECLARATION',
  PROCEDURE_DEFINITION: 'PROCEDURES_DEFINITIONS',
  FUNCTION_DEFINITION: 'FUNCTIONS_DEFINITIONS',
  CONST_DECLARATION: 'CONSTS_DECLARATION',
  TYPE_DECLARATION: 'TYPES_DECLARATION',
  EMPTY: 'NONE',
};

const getStructuralType = (
  lineType: LineType,
  typeStack: CounterweightStack<StructuralType>,
): StructuralType => {
  if (lineType in LineToStructure) {
    return LineToStructure[lineType]!;
  }
  if (lineType === 'BEGIN_DECLARATION') {
    return 'CODE_EXECUTION';
  }
  if (lineType === 'END_DECLARATION') {
    return 'CODE_EXECUTION';
  }
  return typeStack.peek() || 'CODE_EXECUTION';
};

const getLineType = (tokens: FormatterToken[]): LineType => {
  // Lower-case each token value ONCE into a lookup set, instead of re-scanning the
  // whole line and re-lowering every token for each of the 14 keyword probes below
  // (O(14 x tokens) with as many throwaway toLowerCase allocations). This is also
  // the single place the line's keyword casing is normalized.
  const values = new Set(tokens.map((token) => token.value.toLowerCase()));
  const has = (value: string) => values.has(value);
  if (has('program')) {
    return 'PROGRAM_NAME_DECLARATION';
  }
  // Control-flow keywords are checked before ':=' so a one-line statement like
  // `if x then y := 1` classifies as the control statement, not as an ASSIGNMENT.
  if (has('if')) {
    return 'IF_STATEMENT';
  }
  if (has('while')) {
    return 'WHILE_STATEMENT';
  }
  if (has('repeat')) {
    return 'REPEAT_STATEMENT';
  }
  if (has('for')) {
    return 'FOR_STATEMENT';
  }
  if (has(':=')) {
    return 'ASSIGNMENT';
  }
  if (has('var')) {
    return 'VAR_DECLARATION';
  }
  if (has('begin')) {
    return 'BEGIN_DECLARATION';
  }
  if (has('end')) {
    return 'END_DECLARATION';
  }
  if (has('procedure')) {
    return 'PROCEDURE_DEFINITION';
  }
  if (has('function')) {
    return 'FUNCTION_DEFINITION';
  }
  if (has('const')) {
    return 'CONST_DECLARATION';
  }
  if (has('type')) {
    return 'TYPE_DECLARATION';
  }
  if (has(':')) {
    return 'DECLARATION';
  }
  if (tokens.length === 0) {
    return 'EMPTY';
  }
  return 'UNKNOWN';
};

const needAddEmptyLine = (
  prevLine: FormattedPascalLine | undefined,
  currentLine: FormattedPascalLine,
) => {
  if (!prevLine) {
    return false;
  }
  if (prevLine.structuralType !== currentLine.structuralType) {
    return true;
  }

  if (isStatement(currentLine.type) && prevLine.type === 'ASSIGNMENT') {
    return true;
  }

  return false;
};

const cleanToken = (token: PascalToken) => {
  if (token.type === 'STRING_LITERAL') {
    const value = token.value.replace(/'/g, "''");
    return {
      ...token,
      value: `'${value}'`,
    };
  }
  return token;
};

const cleanTokens = (tokens: PascalToken[]): PascalToken[] => {
  return tokens.map(cleanToken);
};

export {
  isComment,
  isOperator,
  isEndOfLine,
  needWhiteSpace,
  getLineType,
  getStructuralType,
  needAddEmptyLine,
  cleanTokens,
};
