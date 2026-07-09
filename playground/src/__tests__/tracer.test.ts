import { describe, it, expect } from 'vitest';
import { trace, fmt, type Value } from '../tracer';
import { runCompile } from '../toolchain';
import { runCompiledJs } from '../render';
import { SAMPLES } from '../samples';

/** The output accumulated by the final step (output only ever grows). */
function finalOutput(source: string): string[] {
  const { steps, error } = trace(source);
  expect(error, `trace error: ${error}`).toBeUndefined();
  expect(steps.length).toBeGreaterThan(0);
  return steps[steps.length - 1].output;
}

describe('tracer agrees with the compiler', () => {
  // The strongest correctness check: the interpreted output must match what the
  // compiled JS actually prints, for every golden sample.
  for (const sample of SAMPLES) {
    it(`${sample.id}: traced output === compiled-and-run output`, () => {
      const compiled = runCompile(sample.code);
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) return;
      const expected = runCompiledJs(compiled.value).lines;
      expect(finalOutput(sample.code)).toEqual(expected);
    });
  }
});

describe('tracer produces debugger-quality traces', () => {
  it('stamps every step with a real source line (parser location propagation)', () => {
    const { steps } = trace(SAMPLES[0].code);
    expect(steps.every((s) => s.line > 0)).toBe(true);
  });

  it('bubble sort ends with the array sorted, and focuses swapped cells', () => {
    const { steps } = trace(SAMPLES.find((s) => s.id === 'bubblesort')!.code);
    const last = steps[steps.length - 1];
    const a = last.stack[0].vars['a'] as Extract<Value, { __array: true }>;
    expect(a.items).toEqual([1, 2, 5, 8, 9]);
    expect(steps.some((s) => s.focus && s.focus.name === 'a' && s.focus.indices.length > 0)).toBe(
      true,
    );
  });

  it('recursive fib grows the call stack and returns 55', () => {
    const source = SAMPLES.find((s) => s.id === 'fibonacci')!.code;
    const { steps } = trace(source);
    const maxDepth = Math.max(...steps.map((s) => s.stack.length));
    expect(maxDepth).toBeGreaterThan(2); // globals + nested fib frames
    expect(finalOutput(source)).toEqual(['55']);
  });

  it('captures intermediate variable state, not just the final value', () => {
    // gcd(48,18): a should take the value 30 at some step on the way to 6.
    const { steps } = trace(SAMPLES.find((s) => s.id === 'gcd')!.code);
    const sawThirty = steps.some((s) => s.stack.some((f) => f.vars['a'] === 30));
    expect(sawThirty).toBe(true);
  });

  it('surfaces runtime errors instead of throwing', () => {
    const result = trace('program P;\nvar a: array[1..2] of integer;\nbegin\n  a[9] := 1;\nend.');
    expect(result.error).toMatch(/out of bounds/);
  });
});

describe('fmt', () => {
  it('renders values the Pascal way', () => {
    expect(fmt(42)).toBe('42');
    expect(fmt('hi')).toBe('hi');
    expect(fmt(true)).toBe('TRUE');
    expect(fmt({ __array: true, low: 1, high: 3, items: [1, 2, 3] })).toBe('[1, 2, 3]');
  });
});
