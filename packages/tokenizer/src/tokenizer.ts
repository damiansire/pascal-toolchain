// Define all possible token types
export type TokenType =
  // Comments
  | 'COMMENT_BLOCK_BRACE'
  | 'COMMENT_STAR'
  | 'COMMENT_LINE'
  // Operators
  | 'OPERATOR_ASSIGN'
  | 'OPERATOR_LESS_EQUAL'
  | 'OPERATOR_GREATER_EQUAL'
  | 'OPERATOR_NOT_EQUAL'
  | 'OPERATOR_RANGE'
  | 'OPERATOR_PLUS'
  | 'OPERATOR_MINUS'
  | 'OPERATOR_MULTIPLY'
  | 'OPERATOR_DIVIDE'
  | 'OPERATOR_EQUAL'
  | 'OPERATOR_LESS'
  | 'OPERATOR_GREATER'
  | 'OPERATOR_POINTER'
  | 'OPERATOR_ADDRESSOF'
  // Delimiters
  | 'DELIMITER_SEMICOLON'
  | 'DELIMITER_COMMA'
  | 'DELIMITER_DOT'
  | 'DELIMITER_LPAREN'
  | 'DELIMITER_RPAREN'
  | 'DELIMITER_LBRACKET'
  | 'DELIMITER_RBRACKET'
  | 'DELIMITER_COLON'
  // Literals
  | 'STRING_LITERAL'
  | 'BOOLEAN_LITERAL'
  | 'NUMBER_REAL'
  | 'NUMBER_INTEGER'
  // Others
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'EOF';

export interface PascalToken {
  type: TokenType;
  value: string;
  /** 1-based line where the token starts. Absent on synthetic tokens (e.g. the formatter's). */
  line?: number;
  /** 1-based column where the token starts. */
  column?: number;
  /** 0-based character offset of the token start in the source. */
  offset?: number;
}

/**
 * Error thrown when the source cannot be tokenized (unterminated string/comment,
 * unknown character). Typed so callers can distinguish a lexically invalid input
 * from a genuine bug — e.g. the parser's `isValid` treats it as "not valid Pascal"
 * rather than letting it escape as an anonymous Error.
 */
export class TokenizeError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(message);
    this.name = 'TokenizeError';
  }
}

export function tokenizePascal(code: string, skipComments: boolean = true) {
  const tokens: Array<PascalToken> = [];
  let currentIndex = 0;

  // Reports a fatal lexing error with a 1-based line:column derived from `index`,
  // instead of writing to console and continuing with a corrupt token stream.
  const fail = (message: string, index: number): never => {
    const upTo = code.slice(0, index);
    const line = upTo.split('\n').length;
    const column = index - upTo.lastIndexOf('\n');
    throw new TokenizeError(`${message} at line ${line}, column ${column}`, line, column);
  };

  // Forward-only cursor that turns a start offset into a 1-based line/column.
  // Tokens are emitted in non-decreasing start-offset order, so this walks each
  // source character at most once across the whole pass (amortized O(n)); the
  // naive `code.slice(0, offset).split('\n')` per token would be O(n^2) on the
  // hottest loop of the toolchain (see the char-scan perf notes above `fail`).
  let posIndex = 0;
  let posLine = 1;
  let posColumn = 1;
  const positionAt = (offset: number): Pick<PascalToken, 'line' | 'column' | 'offset'> => {
    while (posIndex < offset) {
      if (code.charAt(posIndex) === '\n') {
        posLine++;
        posColumn = 1;
      } else {
        posColumn++;
      }
      posIndex++;
    }
    return { line: posLine, column: posColumn, offset };
  };

  // Start offset of the token currently being scanned; set at the top of the loop
  // and stamped onto every emitted token via `emit`, so position tracking lives in
  // one place instead of being threaded through 16 push sites.
  let tokenStart = 0;
  const emit = (type: TokenType, value: string): void => {
    tokens.push({ type, value, ...positionAt(tokenStart) });
  };

  // Common Pascal keywords (case-insensitive)
  const keywords = new Set([
    'program',
    'const',
    'var',
    'begin',
    'end',
    'if',
    'then',
    'else',
    'while',
    'do',
    'for',
    'to',
    'downto',
    'repeat',
    'until',
    'case',
    'of',
    'record',
    'array',
    'procedure',
    'function',
    'type',
    'integer',
    'real',
    'char',
    'string',
    'boolean', // Common types
    'uses',
    'label',
    'goto',
    'true',
    'false', // Boolean literals treated as keywords
  ]);

  // Simple map of single-character operators/delimiters
  // Added ^, @, [, ]
  const singleCharTokens: { [key: string]: TokenType } = {
    ';': 'DELIMITER_SEMICOLON',
    ',': 'DELIMITER_COMMA',
    '.': 'DELIMITER_DOT',
    '(': 'DELIMITER_LPAREN',
    ')': 'DELIMITER_RPAREN',
    '[': 'DELIMITER_LBRACKET',
    ']': 'DELIMITER_RBRACKET',
    '+': 'OPERATOR_PLUS',
    '-': 'OPERATOR_MINUS',
    '*': 'OPERATOR_MULTIPLY',
    '/': 'OPERATOR_DIVIDE',
    '=': 'OPERATOR_EQUAL',
    '<': 'OPERATOR_LESS', // Could be part of <= or <>
    '>': 'OPERATOR_GREATER', // Could be part of >=
    ':': 'DELIMITER_COLON', // Could be part of :=
    '^': 'OPERATOR_POINTER',
    '@': 'OPERATOR_ADDRESSOF',
  };

  // Useful regular expressions
  const whitespaceRegex = /\s/;
  const letterRegex = /[a-z]/i;
  const digitRegex = /[0-9]/;
  const identifierCharRegex = /[a-z0-9_]/i; // Allows _

  while (currentIndex < code.length) {
    // charAt returns '' past the end (never undefined), so callers stay string-typed
    // under noUncheckedIndexedAccess without an unchecked index assertion.
    const char = code.charAt(currentIndex);
    const nextChar = code.charAt(currentIndex + 1); // Simple lookahead
    tokenStart = currentIndex; // start offset of whatever token this iteration emits

    // 1. Ignore Whitespace
    if (whitespaceRegex.test(char)) {
      currentIndex++;
      continue;
    }

    // 2. Handle Comments (CHECK BEFORE SIMPLE OPERATORS)
    // Comment type { ... }
    if (char === '{') {
      currentIndex++;
      const commentEnd = code.indexOf('}', currentIndex);
      if (commentEnd === -1) {
        fail("Unclosed '{' comment", currentIndex - 1);
      } else {
        if (!skipComments) {
          const comment = code.substring(currentIndex - 1, commentEnd + 1);
          emit('COMMENT_BLOCK_BRACE', comment);
        }
        currentIndex = commentEnd + 1;
      }
      continue;
    }
    // Comment type (* ... *)
    if (char === '(' && nextChar === '*') {
      currentIndex += 2;
      const commentEnd = code.indexOf('*)', currentIndex);
      if (commentEnd === -1) {
        fail("Unclosed '(*' comment", currentIndex - 2);
      } else {
        if (!skipComments) {
          const comment = code.substring(currentIndex - 2, commentEnd + 2);
          emit('COMMENT_STAR', comment);
        }
        currentIndex = commentEnd + 2;
      }
      continue;
    }
    // Comment type // ... until end of line (Common in Delphi/FPC)
    if (char === '/' && nextChar === '/') {
      const initialIndex = currentIndex;
      currentIndex += 2;
      while (currentIndex < code.length && code[currentIndex] !== '\n') {
        currentIndex++;
      }
      // currentIndex is now at \n or end of code
      if (!skipComments) {
        const comment = code.substring(initialIndex, currentIndex);
        emit('COMMENT_LINE', comment);
      }
      continue;
    }

    // 3. Handle Compound Operators and Ranges (CHECK BEFORE SIMPLE ONES)
    if (char === ':' && nextChar === '=') {
      emit('OPERATOR_ASSIGN', ':=');
      currentIndex += 2;
      continue;
    }
    if (char === '<' && nextChar === '=') {
      emit('OPERATOR_LESS_EQUAL', '<=');
      currentIndex += 2;
      continue;
    }
    if (char === '>' && nextChar === '=') {
      emit('OPERATOR_GREATER_EQUAL', '>=');
      currentIndex += 2;
      continue;
    }
    if (char === '<' && nextChar === '>') {
      emit('OPERATOR_NOT_EQUAL', '<>');
      currentIndex += 2;
      continue;
    }
    if (char === '.' && nextChar === '.') {
      emit('OPERATOR_RANGE', '..');
      currentIndex += 2;
      continue;
    }

    // 4. Handle String Literals (CHECK BEFORE IDENTIFIERS)
    if (char === "'") {
      let stringValue = '';
      let lookaheadIndex = currentIndex + 1; // Skip initial quote
      let closed = false;
      while (lookaheadIndex < code.length) {
        const strChar = code[lookaheadIndex];
        if (strChar === "'") {
          // Check if it's an escaped quote ('')
          if (code[lookaheadIndex + 1] === "'") {
            stringValue += "'"; // Add a single quote
            lookaheadIndex += 2; // Skip both quotes
          } else {
            // End of string
            lookaheadIndex++; // Skip final quote
            closed = true;
            break;
          }
        } else {
          stringValue += strChar;
          lookaheadIndex++;
        }
      }
      if (!closed) {
        fail('Unclosed string literal', currentIndex);
      }
      emit('STRING_LITERAL', stringValue);
      currentIndex = lookaheadIndex;
      continue;
    }

    // 5. Handle Identifiers and Keywords
    if (letterRegex.test(char)) {
      let value = char;
      let lookaheadIndex = currentIndex + 1;
      while (
        lookaheadIndex < code.length &&
        identifierCharRegex.test(code.charAt(lookaheadIndex))
      ) {
        value += code.charAt(lookaheadIndex);
        lookaheadIndex++;
      }
      currentIndex = lookaheadIndex;

      const lowerCaseValue = value.toLowerCase();
      if (keywords.has(lowerCaseValue)) {
        // You could have specific types like 'BOOLEAN_LITERAL' if preferred
        if (lowerCaseValue === 'true' || lowerCaseValue === 'false') {
          emit('BOOLEAN_LITERAL', value);
        } else {
          emit('KEYWORD', value);
        }
      } else {
        emit('IDENTIFIER', value);
      }
      continue;
    }

    // 6. Handle Numbers (Integers and Reals)
    if (digitRegex.test(char) || (char === '.' && digitRegex.test(nextChar))) {
      // Allow starting with . for reals e.g. .5
      let value = '';
      let isReal = false;
      let lookaheadIndex = currentIndex;

      // Allow starting with dot if followed by digit
      if (code.charAt(lookaheadIndex) === '.') {
        value += '.';
        lookaheadIndex++;
        isReal = true;
      }

      while (lookaheadIndex < code.length && digitRegex.test(code.charAt(lookaheadIndex))) {
        value += code.charAt(lookaheadIndex);
        lookaheadIndex++;
      }

      // Decimal part if didn't start with dot
      if (!isReal && lookaheadIndex < code.length && code.charAt(lookaheadIndex) === '.') {
        // Only treat the dot as a decimal point when a digit follows it. ISO Pascal
        // forbids a trailing dot ('5.' is the integer 5 followed by '.'), and '5..10'
        // is the integer 5 followed by the range operator: in both cases the dot is a
        // delimiter, not part of the number.
        if (digitRegex.test(code.charAt(lookaheadIndex + 1))) {
          isReal = true;
          value += '.';
          lookaheadIndex++;
          // Read digits after dot
          while (lookaheadIndex < code.length && digitRegex.test(code.charAt(lookaheadIndex))) {
            value += code.charAt(lookaheadIndex);
            lookaheadIndex++;
          }
        }
        // Otherwise leave the dot for the next iteration (delimiter or '..').
      }

      // (Could add scientific notation 'E' or 'e' logic here)

      if (isReal) {
        // Make sure it's not just an isolated '.'
        if (value !== '.') {
          emit('NUMBER_REAL', value);
        } else {
          // It was a simple '.', handle as delimiter below
          lookaheadIndex = currentIndex; // Reset to be detected by singleCharTokens
        }
      } else {
        emit('NUMBER_INTEGER', value);
      }

      // Only advance if we actually consumed a number
      if (lookaheadIndex > currentIndex) {
        currentIndex = lookaheadIndex;
        continue;
      }
      // If not consumed (e.g., just '.'), let next block handle it
    }

    // 7. Handle Simple Operators/Delimiters (Last option)
    const singleType = singleCharTokens[char];
    if (singleType !== undefined) {
      emit(singleType, char);
      currentIndex++;
      continue;
    }

    // 8. Unknown Character
    fail(`Unknown character '${char}'`, currentIndex);
  }

  tokenStart = code.length; // the EOF sentinel sits at the end of the source
  emit('EOF', '');
  return tokens;
}
