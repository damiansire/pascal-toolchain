import { expectType, expectError, expectAssignable } from 'tsd';
import { compile, generate, CompileError } from 'pascal-js-compiler';
import type { CompileOptions } from 'pascal-js-compiler';
import type { Program } from 'pascal-parser';

// CompileError is exported, constructs from a message, and is an Error subtype.
expectType<CompileError>(new CompileError('unsupported'));
expectAssignable<Error>(new CompileError('unsupported'));

// compile(source, options?) -> string (full source-to-JS path).
expectType<string>(compile('program p; begin end.'));
expectType<string>(compile('program p; begin end.', { indent: '    ' }));

// generate(program, options?) -> string (AST-to-JS path).
declare const program: Program;
expectType<string>(generate(program));
expectType<string>(generate(program, { indent: '\t' }));

// CompileOptions.indent is an optional string.
const opts: CompileOptions = {};
expectType<string | undefined>(opts.indent);

// Negative cases: wrong/missing arguments must not type-check.
expectError(compile());
expectError(compile(123));
expectError(generate('not a program'));
expectError(compile('x', { indent: 4 }));
