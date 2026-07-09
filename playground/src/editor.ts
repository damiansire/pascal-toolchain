import { highlightPascal } from './highlight';

export interface Editor {
  getValue(): string;
  setValue(code: string): void;
  /** Highlights a 1-based source line (and scrolls it into view), or clears it with null. */
  setActiveLine(line: number | null): void;
}

export interface EditorOptions {
  /** Fired on every keystroke with the current source (already highlighted). */
  onInput(value: string): void;
}

/**
 * A dependency-free code editor: a transparent `<textarea>` layered over a
 * `<pre>` that the toolchain's own lexer highlights. The textarea owns the
 * caret and selection; the overlay owns the colour. Scroll and content are kept
 * in lockstep so the two layers never drift. A separate band highlights the line
 * the debugger is currently on.
 */
export function createEditor(host: HTMLElement, options: EditorOptions): Editor {
  host.classList.add('editor');
  host.innerHTML = `
    <div class="editor__gutter" aria-hidden="true"></div>
    <div class="editor__surface">
      <div class="editor__activeline" aria-hidden="true" hidden></div>
      <pre class="editor__highlight" aria-hidden="true"></pre>
      <textarea class="editor__input" spellcheck="false" autocapitalize="off"
        autocorrect="off" wrap="off" aria-label="Pascal source"></textarea>
    </div>`;

  const gutter = host.querySelector<HTMLElement>('.editor__gutter')!;
  const activeline = host.querySelector<HTMLElement>('.editor__activeline')!;
  const highlight = host.querySelector<HTMLElement>('.editor__highlight')!;
  const input = host.querySelector<HTMLTextAreaElement>('.editor__input')!;

  let currentLine: number | null = null;

  const metrics = () => {
    const cs = getComputedStyle(input);
    return { lineH: parseFloat(cs.lineHeight) || 20.8, padTop: parseFloat(cs.paddingTop) || 12 };
  };

  const paint = (value: string): void => {
    // A trailing newline needs a filler char or the last line is unstyled/clipped.
    highlight.innerHTML = highlightPascal(value) + (value.endsWith('\n') ? ' ' : '');
    const lineCount = Math.max(1, value.split('\n').length);
    gutter.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
  };

  const positionActiveLine = (): void => {
    if (currentLine === null) return;
    const { lineH, padTop } = metrics();
    activeline.style.top = `${padTop + (currentLine - 1) * lineH - input.scrollTop}px`;
    activeline.style.height = `${lineH}px`;
  };

  const syncScroll = (): void => {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
    gutter.scrollTop = input.scrollTop;
    positionActiveLine();
  };

  const setActiveLine = (line: number | null): void => {
    currentLine = line && line > 0 ? line : null;
    if (currentLine === null) {
      activeline.hidden = true;
      return;
    }
    activeline.hidden = false;
    // Scroll the target line into view before positioning the band.
    const { lineH, padTop } = metrics();
    const y = padTop + (currentLine - 1) * lineH;
    if (y < input.scrollTop + padTop) input.scrollTop = Math.max(0, y - padTop);
    else if (y + lineH > input.scrollTop + input.clientHeight) {
      input.scrollTop = y + lineH - input.clientHeight + padTop;
    }
    syncScroll();
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
    setActiveLine,
  };
}
