import { expectType, expectError, expectAssignable } from 'tsd';
import { tokenizePascal, TokenType, PascalToken } from 'pascal-tokenizer';

// tokenizePascal returns an array of tokens.
const tokens = tokenizePascal('program p; begin end.');
expectType<PascalToken[]>(tokens);

// The second argument (skipComments) is optional and boolean.
expectType<PascalToken[]>(tokenizePascal('x', true));
expectError(tokenizePascal());
expectError(tokenizePascal(42));
expectError(tokenizePascal('x', 'nope'));

// A PascalToken has exactly a string `value` and a `TokenType` `type`.
const token = tokens[0]!;
expectType<TokenType>(token.type);
expectType<string>(token.value);

// TokenType is a finite union of string literals; valid members are assignable.
expectAssignable<TokenType>('KEYWORD');
expectAssignable<TokenType>('IDENTIFIER');
expectAssignable<TokenType>('EOF');
expectError<TokenType>('NOT_A_REAL_TOKEN_TYPE');
