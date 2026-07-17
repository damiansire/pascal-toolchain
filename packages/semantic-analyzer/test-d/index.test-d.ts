import { expectType, expectError, expectAssignable, expectNotAssignable } from 'tsd';
import { analyze, analyzeStrict, isAssignable, formatType } from 'pascal-semantic-analyzer';
import type {
  AnalysisResult,
  Diagnostic,
  DiagnosticSeverity,
  PascalType,
  PrimitiveType,
  ArrayType,
  SymbolEntry,
  SemanticError,
} from 'pascal-semantic-analyzer';
import { parse } from 'pascal-parser';

// analyze / analyzeStrict consume a parsed Program and return an AnalysisResult.
const program = parse('program p; begin end.');
expectType<AnalysisResult>(analyze(program));
expectType<AnalysisResult>(analyzeStrict(program));

expectError(analyze());
expectError(analyze('program p; begin end.'));
expectError(analyzeStrict(123));

// AnalysisResult exposes the diagnostics list with typed severity.
const result = analyze(program);
expectType<Diagnostic[]>(result.diagnostics);
declare const severity: DiagnosticSeverity;
expectAssignable<'error' | 'warning'>(severity);

// PascalType is a closed union: primitives, arrays, void and unknown.
declare const prim: PrimitiveType;
expectAssignable<PascalType>(prim);
declare const arr: ArrayType;
expectAssignable<PascalType>(arr);
expectAssignable<PascalType>('void');
expectAssignable<PascalType>('unknown');
expectNotAssignable<PascalType>('pointer');

// isAssignable / formatType operate on PascalType values.
expectType<boolean>(isAssignable('integer', 'integer'));
expectType<string>(formatType(arr));
expectError(isAssignable('integer'));
expectError(formatType(42));

// A SymbolEntry carries its kind and resolved type.
declare const entry: SymbolEntry;
expectAssignable<string>(entry.name);
expectType<PascalType>(entry.type);

// SemanticError is an Error subclass that carries the error diagnostics.
declare const err: SemanticError;
expectAssignable<Error>(err);
expectType<Diagnostic[]>(err.diagnostics);
