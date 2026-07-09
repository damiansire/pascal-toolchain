import type { PascalToken } from 'pascal-tokenizer';
import type { Program } from 'pascal-parser';
import { escapeHtml, highlightPascal } from './highlight';
import type { StageResult } from './toolchain';

/** Wraps a stage error in the shared error card markup. */
export function errorCard(error: string): string {
  return `<div class="stage-error" role="alert"><span class="stage-error__tag">error</span>${escapeHtml(
    error,
  )}</div>`;
}

/** Renders the token stream as a compact table (type, value, line:col). */
export function renderTokens(result: StageResult<PascalToken[]>): string {
  if (!result.ok) return errorCard(result.error);
  const rows = result.value
    .filter((t) => t.type !== 'EOF')
    .map((t) => {
      const pos = t.line !== undefined && t.column !== undefined ? `${t.line}:${t.column}` : '';
      return `<tr>
        <td class="tok-cell tok-${groupOf(t.type)}">${escapeHtml(t.type)}</td>
        <td class="tok-value">${escapeHtml(t.value)}</td>
        <td class="tok-pos">${pos}</td>
      </tr>`;
    })
    .join('');
  return `<table class="tokens">
    <thead><tr><th>type</th><th>value</th><th>line:col</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Mirrors highlight grouping for token-type colour in the table. */
function groupOf(type: string): string {
  if (type.startsWith('COMMENT')) return 'comment';
  if (type.startsWith('OPERATOR')) return 'operator';
  if (type.startsWith('DELIMITER')) return 'punct';
  if (type === 'STRING_LITERAL') return 'string';
  if (type === 'BOOLEAN_LITERAL') return 'bool';
  if (type === 'NUMBER_INTEGER' || type === 'NUMBER_REAL') return 'number';
  if (type === 'KEYWORD') return 'keyword';
  if (type === 'IDENTIFIER') return 'ident';
  return 'plain';
}

/** Renders the AST as pretty-printed, escaped JSON. */
export function renderAst(result: StageResult<Program>): string {
  if (!result.ok) return errorCard(result.error);
  const json = JSON.stringify(result.value, null, 2);
  return `<pre class="code-out ast">${escapeHtml(json)}</pre>`;
}

/** Renders the formatted Pascal, highlighted with the same lexer. */
export function renderFormatted(result: StageResult<string>): string {
  if (!result.ok) return errorCard(result.error);
  return `<pre class="code-out pascal">${highlightPascal(result.value)}</pre>`;
}

/** Renders the compiled JavaScript. */
export function renderJs(result: StageResult<string>): string {
  if (!result.ok) return errorCard(result.error);
  return `<pre class="code-out js">${escapeHtml(result.value)}</pre>`;
}

export interface RunOutcome {
  readonly lines: string[];
  readonly error: string | null;
}

/**
 * Executes compiled JS in a throwaway function scope, capturing `console.log`
 * output. Pure enough to unit-test: it restores the console and returns the
 * captured lines plus any runtime error, and never throws.
 */
export function runCompiledJs(js: string): RunOutcome {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  };
  try {
    // Executing the compiled JS is the whole point of the playground; it runs in
    // a fresh function scope with console.log captured above.
    new Function(js)();
    return { lines, error: null };
  } catch (err) {
    return { lines, error: err instanceof Error ? err.message : String(err) };
  } finally {
    console.log = original;
  }
}
