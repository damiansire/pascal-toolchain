import { highlightPascal } from './highlight';

export interface Editor {
  getValue(): string;
  setValue(code: string): void;
}

export interface EditorOptions {
  /** Fired on every keystroke with the current source (already highlighted). */
  onInput(value: string): void;
}

/**
 * A dependency-free code editor: a transparent `<textarea>` layered over a
 * `<pre>` that the toolchain's own lexer highlights. The textarea owns the
 * caret and selection; the overlay owns the colour. Scroll and content are kept
 * in lockstep so the two layers never drift.
 */
export function createEditor(host: HTMLElement, options: EditorOptions): Editor {
  host.classList.add('editor');
  host.innerHTML = `
    <div class="editor__gutter" aria-hidden="true"></div>
    <div class="editor__surface">
      <pre class="editor__highlight" aria-hidden="true"></pre>
      <textarea class="editor__input" spellcheck="false" autocapitalize="off"
        autocorrect="off" wrap="off" aria-label="Pascal source"></textarea>
    </div>`;

  const gutter = host.querySelector<HTMLElement>('.editor__gutter')!;
  const highlight = host.querySelector<HTMLElement>('.editor__highlight')!;
  const input = host.querySelector<HTMLTextAreaElement>('.editor__input')!;

  const paint = (value: string): void => {
    // A trailing newline needs a filler char or the last line is unstyled/clipped.
    highlight.innerHTML = highlightPascal(value) + (value.endsWith('\n') ? ' ' : '');
    const lineCount = Math.max(1, value.split('\n').length);
    gutter.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
  };

  const syncScroll = (): void => {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
    gutter.scrollTop = input.scrollTop;
  };

  input.addEventListener('input', () => {
    paint(input.value);
    options.onInput(input.value);
  });
  input.addEventListener('scroll', syncScroll);

  // Tab inserts two spaces instead of moving focus, so indenting code works.
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.slice(0, start) + '  ' + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start + 2;
    paint(input.value);
    options.onInput(input.value);
  });

  return {
    getValue: () => input.value,
    setValue: (code: string) => {
      input.value = code;
      paint(code);
      syncScroll();
      options.onInput(code);
    },
  };
}
