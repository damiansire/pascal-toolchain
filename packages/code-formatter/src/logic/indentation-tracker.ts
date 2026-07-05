import { PascalToken } from 'pascal-tokenizer';
import { FormatterToken } from '../shared/types';

// The formatter's indentation is a begin/end/var nesting counter. `var` opens a
// declaration level; `begin` closes any pending `var` level (dropping back to column 0)
// and opens a code level; `end` closes a `begin` level. Tracked here as an explicit
// stack of markers — no general-purpose counterweight structure or deep-equality needed,
// which also drops two external dependencies from a per-token hot path.
type NestingMarker = 'begin' | 'var';

// Keyword value of a token, lower-cased (Pascal is case-insensitive but the tokenizer
// preserves source casing), or null for non-keywords.
const keywordValue = (token: PascalToken): string | null =>
  token.type === 'KEYWORD' ? token.value.toLowerCase() : null;

/**
 * Tracks Pascal nesting depth across the lines of a program. It is intentionally
 * stateful: `indentationForLine` advances an internal begin/end/var stack as it
 * consumes each line, so it must be called once per line in source order.
 */
class IndentationTracker {
  private readonly stack: NestingMarker[] = [];

  private top(): NestingMarker | undefined {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Returns the indentation level for `tokens` and advances the internal nesting
   * stack. Stateful by design (not a pure function): later lines depend on the
   * begin/end/var tokens consumed from earlier ones.
   */
  indentationForLine(tokens: FormatterToken[]): number {
    // Indentation is driven only by real keywords; drop the synthetic whitespace markers.
    const keywords = tokens
      .filter((t): t is PascalToken => t.type !== 'WHITESPACE')
      .map(keywordValue)
      .filter((v): v is string => v !== null);

    let currentIndent = this.stack.length;

    // Closers first (mirrors the original pop-then-push order): `begin` cancels a pending
    // `var` and returns to column 0; `end` cancels the enclosing `begin`.
    for (const kw of keywords) {
      if (kw === 'begin' && this.top() === 'var') {
        this.stack.pop();
        currentIndent = 0;
      } else if (kw === 'end' && this.top() === 'begin') {
        this.stack.pop();
      }
    }
    // Then openers: `var` and `begin` each push a nesting level.
    for (const kw of keywords) {
      if (kw === 'var' || kw === 'begin') {
        this.stack.push(kw);
      }
    }
    if (keywords.includes('end')) {
      currentIndent = this.stack.length;
    }
    return currentIndent;
  }
}

export { IndentationTracker };
