import { expectType, expectError, expectAssignable } from 'tsd';
import {
  formatPascalCode,
  FormattedPascalLine,
  PascalToken,
  TokenType,
} from 'pascal-code-formatter';

// formatPascalCode(code, options?) -> FormattedPascalLine[].
const lines = formatPascalCode('program p; begin end.');
expectType<FormattedPascalLine[]>(lines);
expectType<FormattedPascalLine[]>(
  formatPascalCode('x', { ignoreEOF: true, addEmptyFinalLine: false }),
);

expectError(formatPascalCode());
expectError(formatPascalCode(42));
expectError(formatPascalCode('x', { unknownOption: true }));

// A formatted line carries tokens, indentation and classification fields.
const line = lines[0]!;
expectType<PascalToken[]>(line.tokens);
expectType<number>(line.indentation);

// The tokenizer types are re-exported from the formatter (single source).
expectAssignable<TokenType>('KEYWORD');
const tok: PascalToken = { type: 'IDENTIFIER', value: 'x' };
expectType<TokenType>(tok.type);
