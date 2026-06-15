import { PascalToken } from "pascal-tokenizer";
import { FormattedPascalLine, LineType, StructuralType } from './types';
import { CounterweightStack } from "counterweight-stack";

const isComment = (token: PascalToken): boolean => {
  return ["COMMENT_STAR", "COMMENT_BLOCK_BRACE", "COMMENT_LINE"].includes(token?.type);
};

const isOperator = (token: PascalToken): boolean => {
  return ["OPERATOR_EQUAL", "OPERATOR_ASSIGN", "OPERATOR_GREATER", "OPERATOR_LESS", "OPERATOR_NOT_EQUAL", "OPERATOR_GREATER_EQUAL", "OPERATOR_LESS_EQUAL"].includes(token?.type);
};

const isStatement = (type: LineType): boolean => {
  return ["IF_STATEMENT", "WHILE_STATEMENT", "REPEAT_STATEMENT", "FOR_STATEMENT"].includes(type);
};

const isEndOfLine = (currentToken: PascalToken, nextToken: PascalToken): boolean => {
  if (isComment(nextToken)) {
    return false;
  }
  if (isComment(currentToken)) {
    return true;
  }

  if (currentToken.type === "DELIMITER_SEMICOLON") {
    return true;
  }
  if (currentToken.type === "KEYWORD") {
    if (["begin", "var", "else"].includes(currentToken.value)) {
      return true;
    }
    if (currentToken.value === "end") {
      if (nextToken.value !== "." && nextToken.value !== ";") {
        return true;
      }
    }
  }
  if (nextToken === undefined) {
    return true;
  }
  if (nextToken.type === "EOF") {
    return true;
  }

  return false;
}

const needWhiteSpace = (currentToken: PascalToken, nextToken: PascalToken) => {
  if (!nextToken) {
    return false;
  }

  if (nextToken.type === "KEYWORD" && nextToken.value === "then") {
    return true;
  }

  if (currentToken.type === "KEYWORD") {
    if (currentToken.value === "program") {
      return true;
    }
    if (currentToken.value === "if") {
      return true;
    }
  }
  if (currentToken.type === "IDENTIFIER" && isOperator(nextToken)) {
    return true;
  }

  if (currentToken.type === "OPERATOR_ASSIGN") {
    return true;
  }

  if (currentToken.type === "DELIMITER_COLON" && nextToken.type !== "OPERATOR_EQUAL") {
    return true;
  }

  if (isOperator(currentToken)) {
    return true;
  }

  if (isComment(nextToken)) {
    return true;
  }

  return false;
}

const LineToStructure: Partial<Record<LineType, StructuralType>> = {
  "PROGRAM_NAME_DECLARATION": "PROGRAM_NAME_DECLARATION",
  "VAR_DECLARATION": "VARS_DECLARATION",
  "PROCEDURE_DEFINITION": "PROCEDURES_DEFINITIONS",
  "FUNCTION_DEFINITION": "FUNCTIONS_DEFINITIONS",
  "CONST_DECLARATION": "CONSTS_DECLARATION",
  "TYPE_DECLARATION": "TYPES_DECLARATION",
  "EMPTY": "NONE",
}

const getStructuralType = (lineType: LineType, typeStack: CounterweightStack<StructuralType>): StructuralType => {
  if (lineType in LineToStructure) {
    return LineToStructure[lineType]!;
  }
  if (lineType === "BEGIN_DECLARATION") {
    return "CODE_EXECUTION"
  }
  if (lineType === "END_DECLARATION") {
    return "CODE_EXECUTION"
  }
  return typeStack.peek() || "CODE_EXECUTION";
}

const getLineType = (tokens: PascalToken[]): LineType => {
  if (tokens.some(token => token.value === "program")) {
    return "PROGRAM_NAME_DECLARATION";
  }
  if (tokens.some(token => token.value === ":=")) {
    return "ASSIGNMENT";
  }
  if (tokens.some(token => token.value === "if")) {
    return "IF_STATEMENT";
  }
  if (tokens.some(token => token.value === "while")) {
    return "WHILE_STATEMENT";
  }
  if (tokens.some(token => token.value === "repeat")) {
    return "REPEAT_STATEMENT";
  }
  if (tokens.some(token => token.value === "for")) {
    return "FOR_STATEMENT";
  }
  if (tokens.some(token => token.value === "var")) {
    return "VAR_DECLARATION";
  }
  if (tokens.some(token => token.value === "begin")) {
    return "BEGIN_DECLARATION";
  }
  if (tokens.some(token => token.value === "end")) {
    return "END_DECLARATION";
  }
  if (tokens.some(token => token.value === "procedure")) {
    return "PROCEDURE_DEFINITION";
  }
  if (tokens.some(token => token.value === "function")) {
    return "FUNCTION_DEFINITION";
  }
  if (tokens.some(token => token.value === "const")) {
    return "CONST_DECLARATION";
  }
  if (tokens.some(token => token.value === "type")) {
    return "TYPE_DECLARATION";
  }
  if (tokens.some(token => token.value === ":")) {
    return "DECLARATION";
  }
  if (tokens.length === 0) {
    return "EMPTY"
  }
  return "UNKNOWN";
}

const needAddEmptyLine = (history: CounterweightStack<StructuralType>, prevLine: FormattedPascalLine | undefined, currentLine: FormattedPascalLine) => {
  if (!prevLine) {
    return false;
  }
  if (prevLine.structuralType !== currentLine.structuralType) {
    return true;
  }

  if (isStatement(currentLine.type) && prevLine.type === "ASSIGNMENT") {
    return true;
  }

  return false;
}

const cleanToken = (token: PascalToken) => {
  if (token.type === "STRING_LITERAL") {
    const value = token.value.replace(/'/g, "''")
    return {
      ...token,
      value: `'${value}'`
    }
  }
  return token;
}

const cleanTokens = (tokens: PascalToken[]): PascalToken[] => {
  return tokens.map(cleanToken);
}

export { isComment, isOperator, isEndOfLine, needWhiteSpace, getLineType, getStructuralType, needAddEmptyLine, cleanTokens };
