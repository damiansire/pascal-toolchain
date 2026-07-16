import { parse } from 'pascal-parser';
import { analyze, analyzeStrict } from '../analyzer';
import { SemanticError } from '../types';

describe('analyze', () => {
  it('returns no diagnostics for a clean program', () => {
    const program = parse(`
      program Demo;
      var X: integer;
      begin
        X := 1 + 2;
      end.
    `);
    expect(analyze(program).diagnostics).toEqual([]);
  });

  it('merges declaration diagnostics (redeclaration) with type diagnostics', () => {
    const program = parse(`
      program Demo;
      var X: integer;
      var X: string;
      begin
        Y := 1;
      end.
    `);
    const { diagnostics } = analyze(program);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]!.message).toMatch(/ya fue declarado/);
    expect(diagnostics[1]!.message).toMatch(/'Y' no está declarado/);
  });

  it('exposes the global scope so a caller can inspect declared symbols', () => {
    const program = parse(`
      program Demo;
      var X: integer;
      begin
      end.
    `);
    const { scope } = analyze(program);
    expect(scope.resolveLocal('X')).toMatchObject({ kind: 'variable', type: 'integer' });
  });
});

describe('analyzeStrict', () => {
  it('returns the result for a clean program instead of throwing', () => {
    const program = parse(`
      program Demo;
      begin
      end.
    `);
    expect(() => analyzeStrict(program)).not.toThrow();
  });

  it('throws SemanticError carrying the error diagnostics', () => {
    const program = parse(`
      program Demo;
      begin
        X := 1;
      end.
    `);
    expect(() => analyzeStrict(program)).toThrow(SemanticError);
    try {
      analyzeStrict(program);
      fail('expected analyzeStrict to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SemanticError);
      const err = e as SemanticError;
      expect(err.diagnostics).toHaveLength(1);
      expect(err.diagnostics[0]!.message).toMatch(/'X' no está declarado/);
    }
  });
});
