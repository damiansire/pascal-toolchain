import { describe, it, expect } from 'vitest';
import { runTokenize, runParse, runFormat, runCompile, sourceIsValid } from '../toolchain';
import { runCompiledJs } from '../render';
import { SAMPLES } from '../samples';

describe('toolchain stages over the golden samples', () => {
  it('every sample tokenizes, parses, formats and compiles without error', () => {
    for (const sample of SAMPLES) {
      expect(runTokenize(sample.code).ok, `${sample.id} tokenize`).toBe(true);
      expect(runParse(sample.code).ok, `${sample.id} parse`).toBe(true);
      expect(runFormat(sample.code).ok, `${sample.id} format`).toBe(true);
      expect(runCompile(sample.code).ok, `${sample.id} compile`).toBe(true);
      expect(sourceIsValid(sample.code), `${sample.id} valid`).toBe(true);
    }
  });

  it('reports errors as a failed result instead of throwing', () => {
    const bad = runCompile('program P; begin writeln(');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.length).toBeGreaterThan(0);
  });

  it('stamps a non-negative elapsed time on each result', () => {
    const r = runTokenize(SAMPLES[0].code);
    expect(r.ms).toBeGreaterThanOrEqual(0);
  });
});

describe('runCompiledJs', () => {
  it('captures console output of the compiled FizzBuzz and restores console.log', () => {
    const original = console.log;
    const fizz = runCompile(SAMPLES.find((s) => s.id === 'fizzbuzz')!.code);
    expect(fizz.ok).toBe(true);
    if (!fizz.ok) return;

    const outcome = runCompiledJs(fizz.value);
    expect(outcome.error).toBeNull();
    expect(outcome.lines).toContain('FizzBuzz'); // i = 15
    expect(outcome.lines).toContain('Fizz'); // i = 3
    expect(outcome.lines).toContain('Buzz'); // i = 5
    expect(outcome.lines[0]).toBe('1');
    expect(console.log).toBe(original); // console restored even on success
  });

  it('computes gcd(48, 18) = 6 end to end', () => {
    const gcd = runCompile(SAMPLES.find((s) => s.id === 'gcd')!.code);
    expect(gcd.ok).toBe(true);
    if (!gcd.ok) return;
    expect(runCompiledJs(gcd.value).lines).toEqual(['6']);
  });

  it('returns a runtime error without throwing', () => {
    const outcome = runCompiledJs('throw new Error("boom");');
    expect(outcome.error).toContain('boom');
  });
});
