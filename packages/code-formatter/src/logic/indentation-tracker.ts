import { CounterweightStack, CounterweightRule } from 'counterweight-stack';
import { deepEqual } from 'objects-deep-compare';
import { PascalToken } from 'pascal-tokenizer';
import { FormatterToken } from '../shared/types';

const beginToken: PascalToken = { type: 'KEYWORD', value: 'begin' };
const endToken: PascalToken = { type: 'KEYWORD', value: 'end' };
const varToken: PascalToken = { type: 'KEYWORD', value: 'var' };

const rules: CounterweightRule<PascalToken>[] = [
  {
    mainElement: beginToken,
    counterweights: [endToken],
  },
  {
    mainElement: varToken,
    counterweights: [beginToken],
  },
];

/**
 * Reduces a token to the structural identity the rules match on: `{ type, value }`,
 * with keyword values lower-cased. Two things make this necessary before any
 * `deepEqual`/stack op: (1) Pascal is case-insensitive but the tokenizer preserves
 * source casing, so `VAR`/`Begin`/`END` must be folded to match the lower-case rule
 * constants; (2) tokens now carry `line/column/offset`, which the position-less rule
 * constants (`beginToken`, …) do not — deep-equating the whole token would never
 * match. Stripping to `{ type, value }` compares by identity, not by incidental position.
 */
const canonicalize = (token: PascalToken): PascalToken => ({
  type: token.type,
  value: token.type === 'KEYWORD' ? token.value.toLowerCase() : token.value,
});

/**
 * Tracks Pascal nesting depth across the lines of a program. It is intentionally
 * stateful: `indentationForLine` advances an internal begin/end/var stack as it
 * consumes each line, so it must be called once per line in source order.
 */
class IndentationTracker {
  private indentationStack: CounterweightStack<PascalToken>;
  constructor() {
    this.indentationStack = new CounterweightStack<PascalToken>(rules);
  }
  /**
   * Returns the indentation level for `tokens` and advances the internal nesting
   * stack. Stateful by design (not a pure function): later lines depend on the
   * begin/end/var tokens consumed from earlier ones.
   */
  indentationForLine(tokens: FormatterToken[]) {
    // Indentation is driven only by real keywords; drop the synthetic whitespace markers.
    const real = tokens.filter((t): t is PascalToken => t.type !== 'WHITESPACE');
    const canonical = real.map(canonicalize);
    let currentIndent = this.indentationStack.size();
    for (const token of canonical) {
      const result = this.indentationStack.pop(token);
      if (result?.type === 'KEYWORD') {
        if (result?.value === 'var') {
          currentIndent = 0;
        }
      }
    }
    for (const token of canonical) {
      if (deepEqual(token, varToken) || deepEqual(token, beginToken)) {
        this.indentationStack.push(token);
      }
    }
    if (canonical.some((token) => deepEqual(token, endToken))) {
      currentIndent = this.indentationStack.size();
    }
    return currentIndent;
  }
}

export { IndentationTracker };
