import { describe, it, expect } from 'vitest';
import { highlightPascal, highlightGroup, escapeHtml } from '../highlight';
import { SAMPLES } from '../samples';

/** Strips all tags and unescapes entities, recovering the plain source. */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

describe('highlightPascal', () => {
  it('round-trips every sample: stripping the markup restores the source verbatim', () => {
    for (const sample of SAMPLES) {
      expect(stripTags(highlightPascal(sample.code))).toBe(sample.code);
    }
  });

  it('keeps quotes on string literals despite the lexer normalizing token.value', () => {
    // The tokenizer reports value "it's ok" (no quotes, un-doubled); the overlay
    // must still show the raw source, else everything after a string desyncs.
    const src = "x := 'it''s ok';";
    const html = highlightPascal(src);
    expect(stripTags(html)).toBe(src);
    expect(html).toContain('tok-string');
  });

  it('colours keywords, numbers and comments distinctly', () => {
    const html = highlightPascal('{ note }\nx := 42;');
    expect(html).toContain('tok-comment');
    expect(html).toContain('tok-number');
  });

  it('preserves leading indentation and blank lines', () => {
    const src = '\n    begin\n\n    end.';
    expect(stripTags(highlightPascal(src))).toBe(src);
  });

  it('falls back to escaped source on a tokenizer error, staying aligned', () => {
    const broken = "x := 'unterminated";
    const html = highlightPascal(broken);
    expect(stripTags(html)).toBe(broken);
  });

  it('escapes HTML metacharacters', () => {
    expect(escapeHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });
});

describe('highlightGroup', () => {
  it('maps token-type families to stable class suffixes', () => {
    expect(highlightGroup('KEYWORD')).toBe('keyword');
    expect(highlightGroup('OPERATOR_ASSIGN')).toBe('operator');
    expect(highlightGroup('DELIMITER_SEMICOLON')).toBe('punct');
    expect(highlightGroup('STRING_LITERAL')).toBe('string');
    expect(highlightGroup('NUMBER_INTEGER')).toBe('number');
    expect(highlightGroup('COMMENT_BLOCK_BRACE')).toBe('comment');
    expect(highlightGroup('IDENTIFIER')).toBe('ident');
  });
});
