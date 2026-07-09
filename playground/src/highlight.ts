import { tokenizePascal, type PascalToken, type TokenType } from 'pascal-tokenizer';

/** Maps a token type to a short highlight class suffix (`tok-<group>`). */
export function highlightGroup(type: TokenType): string {
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

/** Minimal HTML escaping for text rendered into the overlay via innerHTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Syntax-highlights Pascal by dogfooding the toolchain's own tokenizer, so the
 * playground editor is coloured by the exact lexer it demonstrates.
 *
 * Positions come only from token offsets and *raw source slices* — never from
 * `token.value`, which the lexer normalizes (e.g. a string literal drops its
 * quotes and un-doubles `''`). Slicing the source keeps the output aligned 1:1
 * with the input, which the round-trip test enforces (stripping the tags must
 * reproduce the source verbatim).
 *
 * On a tokenizer error the escaped source is returned unstyled, so a
 * half-typed program never blanks or desyncs the editor.
 */
export function highlightPascal(source: string): string {
  let tokens: PascalToken[];
  try {
    tokens = tokenizePascal(source, false);
  } catch {
    return escapeHtml(source);
  }

  const real = tokens.filter((t) => t.type !== 'EOF' && t.offset !== undefined);
  let html = '';
  let cursor = 0;

  for (let i = 0; i < real.length; i++) {
    const token = real[i];
    const start = token.offset as number;
    // Gap before this token: leading indentation, blank lines, whitespace
    // trailing the previous token — emitted unstyled.
    if (start > cursor) html += escapeHtml(source.slice(cursor, start));

    // Raw text spans from this token's start up to the next token's start,
    // minus any trailing whitespace (which belongs to the following gap).
    const nextStart = i + 1 < real.length ? (real[i + 1].offset as number) : source.length;
    const chunk = source.slice(start, nextStart);
    const trailingWs = chunk.match(/\s+$/);
    const rawLen = trailingWs ? chunk.length - trailingWs[0].length : chunk.length;
    const raw = chunk.slice(0, rawLen);

    html += `<span class="tok-${highlightGroup(token.type)}">${escapeHtml(raw)}</span>`;
    cursor = start + rawLen;
  }

  if (cursor < source.length) html += escapeHtml(source.slice(cursor));
  return html;
}
