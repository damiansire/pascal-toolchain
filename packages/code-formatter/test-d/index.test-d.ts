import { expectType, expectError, expectAssignable } from 'tsd';
import {
  formatPascalCode,
  FormattedPascalLine,
  FormatterToken,
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
// tokens are FormatterToken[] (PascalToken plus the synthetic whitespace marker).
const line = lines[0]!;
expectType<FormatterToken[]>(line.tokens);
expectType<number>(line.indentation);
// A real tokenizer token is assignable to the formatter's token type.
expectAssignable<FormatterToken>({ type: 'KEYWORD' as TokenType, value: 'begin' });

// The tokenizer types are re-exported from the formatter (single source).
expectAssignable<TokenType>('KEYWORD');
const tok: PascalToken = { type: 'IDENTIFIER', value: 'x' };
expectType<TokenType>(tok.type);
