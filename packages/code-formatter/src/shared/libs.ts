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

const isStatement = (type: LineType): boolean => {
  return ['IF_STATEMENT', 'WHILE_STATEMENT', 'REPEAT_STATEMENT', 'FOR_STATEMENT'].includes(type);
};

const isEndOfLine = (currentToken: PascalToken, nextToken: PascalToken): boolean => {
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

const needWhiteSpace = (currentToken: PascalToken, nextToken: PascalToken) => {
  if (!nextToken) {
    return false;
  }

  // Pascal is case-insensitive and the tokenizer preserves the original casing,
  // so keyword checks must normalize (like getLineType/isEndOfLine already do);
  // otherwise IF/THEN/PROGRAM in uppercase silently lose their spacing.
  if (nextToken.type === 'KEYWORD' && nextToken.value.toLowerCase() === 'then') {
    return true;
  }

  if (currentToken.type === 'KEYWORD') {
    if (currentToken.value.toLowerCase() === 'program') {
      return true;
    }
    if (currentToken.value.toLowerCase() === 'if') {
      return true;
    }
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

  if (isComment(nextToken)) {
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
  const has = (value: string) => tokens.some((token) => token.value.toLowerCase() === value);
  if (has('program')) {
    return 'PROGRAM_NAME_DECLARATION';
  }
  if (has(':=')) {
    return 'ASSIGNMENT';
  }
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
  _history: CounterweightStack<StructuralType>,
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
