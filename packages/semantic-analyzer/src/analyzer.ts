/**
 * Public entry point: builds the symbol table and runs the type checker over a
 * parsed Pascal `Program`, returning every diagnostic found.
 *
 * @module pascal-semantic-analyzer/analyzer
 */
import { Program } from 'pascal-parser';
import { Scope } from './scope';
import { buildSymbolTable } from './symbolTable';
import { checkProgram } from './typeChecker';
import { Diagnostic, SemanticError } from './types';

export interface AnalysisResult {
  /** The program's global scope; walk `.children` to reach nested subprogram scopes. */
  scope: Scope;
  diagnostics: Diagnostic[];
}

/**
 * Runs semantic analysis on an already-parsed program: scope/symbol resolution
 * plus the basic type checks described in `typeChecker.ts`. Never throws — all
 * findings come back as diagnostics, so a caller can decide how to present
 * multiple errors at once (matching `parseWithRecovery`'s error-recovery spirit).
 */
export function analyze(program: Program): AnalysisResult {
  const { global, scopeOf, diagnostics: declarationDiagnostics } = buildSymbolTable(program);
  const checkDiagnostics = checkProgram(program, global, scopeOf);
  return { scope: global, diagnostics: [...declarationDiagnostics, ...checkDiagnostics] };
}

/** Like `analyze`, but throws `SemanticError` if any diagnostic is an error. */
export function analyzeStrict(program: Program): AnalysisResult {
  const result = analyze(program);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new SemanticError(
      `El análisis semántico encontró ${errors.length} error(es)`,
      errors,
    );
  }
  return result;
}
