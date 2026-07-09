import { escapeHtml } from './highlight';
import { fmt, type Frame, type Step, type TraceResult, type Value } from './tracer';
import type { Editor } from './editor';

export interface Debugger {
  /** Loads a new trace and resets to the first step. */
  setTrace(result: TraceResult): void;
  /** Stops playback and clears the editor's active line. */
  stop(): void;
}

const PLAY_MS = 450;

const isArrayValue = (v: Value): v is Extract<Value, { __array: true }> =>
  typeof v === 'object' && v !== null && (v as { __array?: boolean }).__array === true;

/**
 * The step-through debugger view. Given a trace, it lets you scrub the run and,
 * at every step, shows the current line (in the editor), the call stack, each
 * frame's variables, a visual diagram of arrays and recursion, and the output so
 * far. This is what turns "it printed 6" into "here is what happened each step".
 */
export function createDebugger(host: HTMLElement, editor: Editor): Debugger {
  host.innerHTML = `
    <div class="dbg">
      <div class="dbg__bar">
        <div class="dbg__buttons">
          <button class="dbg__btn" data-act="reset" title="First step" aria-label="First step">&#124;&#9664;</button>
          <button class="dbg__btn" data-act="back" title="Step back" aria-label="Step back">&#9664;</button>
          <button class="dbg__btn dbg__btn--play" data-act="play" title="Play / pause" aria-label="Play or pause">&#9654;</button>
          <button class="dbg__btn" data-act="step" title="Step forward" aria-label="Step forward">&#9654;&#124;</button>
          <button class="dbg__btn" data-act="end" title="Last step" aria-label="Last step">&#9654;&#9654;</button>
        </div>
        <input class="dbg__scrub" type="range" min="0" max="0" value="0" aria-label="Step" />
        <span class="dbg__count">0 / 0</span>
      </div>
      <div class="dbg__note" data-note></div>
      <div class="dbg__body" data-body></div>
    </div>`;

  const bar = host.querySelector<HTMLElement>('.dbg__bar')!;
  const scrub = host.querySelector<HTMLInputElement>('.dbg__scrub')!;
  const count = host.querySelector<HTMLElement>('.dbg__count')!;
  const playBtn = host.querySelector<HTMLButtonElement>('.dbg__btn--play')!;
  const noteEl = host.querySelector<HTMLElement>('[data-note]')!;
  const body = host.querySelector<HTMLElement>('[data-body]')!;

  let steps: Step[] = [];
  let error: string | undefined;
  let index = 0;
  let timer: number | undefined;

  const stopPlaying = (): void => {
    window.clearInterval(timer);
    timer = undefined;
    playBtn.innerHTML = '&#9654;';
    playBtn.classList.remove('is-playing');
  };

  const go = (next: number): void => {
    index = Math.max(0, Math.min(steps.length - 1, next));
    render();
  };

  const play = (): void => {
    if (timer !== undefined) return stopPlaying();
    if (index >= steps.length - 1) index = 0;
    playBtn.innerHTML = '&#10073;&#10073;'; // pause
    playBtn.classList.add('is-playing');
    timer = window.setInterval(() => {
      if (index >= steps.length - 1) return stopPlaying();
      go(index + 1);
    }, PLAY_MS);
  };

  bar.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.dbg__btn');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act !== 'play') stopPlaying();
    if (act === 'reset') go(0);
    else if (act === 'back') go(index - 1);
    else if (act === 'step') go(index + 1);
    else if (act === 'end') go(steps.length - 1);
    else if (act === 'play') play();
  });

  scrub.addEventListener('input', () => {
    stopPlaying();
    go(Number(scrub.value));
  });

  function render(): void {
    if (error && steps.length === 0) {
      editor.setActiveLine(null);
      noteEl.textContent = '';
      body.innerHTML = `<div class="stage-error" role="alert"><span class="stage-error__tag">error</span>${escapeHtml(error)}</div>`;
      count.textContent = '0 / 0';
      return;
    }
    if (steps.length === 0) {
      body.innerHTML = `<p class="dbg__empty">Type a program to trace its execution.</p>`;
      return;
    }

    const step = steps[index];
    const prev = index > 0 ? steps[index - 1] : undefined;
    scrub.max = String(steps.length - 1);
    scrub.value = String(index);
    count.textContent = `${index + 1} / ${steps.length}`;
    noteEl.innerHTML = `<span class="dbg__kind dbg__kind--${step.kind}">${step.kind}</span>${escapeHtml(step.note)}`;
    editor.setActiveLine(step.line);

    const current = step.stack[step.stack.length - 1];
    const prevCurrent = prev?.stack[prev.stack.length - 1];
    const errorBanner =
      error && index === steps.length - 1
        ? `<div class="stage-error" role="alert"><span class="stage-error__tag">halted</span>${escapeHtml(error)}</div>`
        : '';

    body.innerHTML = `
      ${errorBanner}
      <div class="dbg__grid">
        <section class="dbg__panel dbg__panel--wide">
          <h3 class="dbg__h">Diagram</h3>
          ${renderDiagram(step)}
        </section>
        <section class="dbg__panel">
          <h3 class="dbg__h">Variables <span class="dbg__scope">${escapeHtml(frameLabel(current))}</span></h3>
          ${renderVars(current, prevCurrent)}
        </section>
        <section class="dbg__panel">
          <h3 class="dbg__h">Call stack</h3>
          ${renderStack(step.stack)}
        </section>
        <section class="dbg__panel dbg__panel--wide">
          <h3 class="dbg__h">Output</h3>
          <pre class="dbg__output">${step.output.length ? escapeHtml(step.output.join('\n')) : '<span class="dbg__muted">(no output yet)</span>'}</pre>
        </section>
      </div>`;
  }

  return {
    setTrace(result: TraceResult): void {
      stopPlaying();
      steps = result.steps;
      error = result.error;
      index = 0;
      render();
    },
    stop(): void {
      stopPlaying();
      editor.setActiveLine(null);
    },
  };
}

// ---- panel renderers ------------------------------------------------------

function frameLabel(frame: Frame): string {
  return frame.name.length > 28 ? frame.name.slice(0, 26) + '…' : frame.name;
}

function renderVars(frame: Frame, prev: Frame | undefined): string {
  const names = Object.keys(frame.vars);
  if (names.length === 0) return `<p class="dbg__muted">no variables</p>`;
  const rows = names
    .map((name) => {
      const value = frame.vars[name];
      const changed = prev && prev.vars[name] !== undefined && !sameValue(prev.vars[name], value);
      return `<tr class="${changed ? 'is-changed' : ''}">
        <td class="dbg__var">${escapeHtml(name)}</td>
        <td class="dbg__val">${escapeHtml(fmt(value))}</td>
      </tr>`;
    })
    .join('');
  return `<table class="dbg__vars"><tbody>${rows}</tbody></table>`;
}

function renderStack(stack: Frame[]): string {
  return `<ol class="dbg__stack">${stack
    .map((frame, i) => {
      const top = i === stack.length - 1;
      return `<li class="dbg__frame ${top ? 'is-top' : ''}">${escapeHtml(frameLabel(frame))}</li>`;
    })
    .reverse()
    .join('')}</ol>`;
}

/** The visual heart: arrays as boxed cells (with the touched cells lit), and the
 *  call stack as frames when a routine has recursed. */
function renderDiagram(step: Step): string {
  const parts: string[] = [];

  // Arrays across every visible frame (globals + current), boxed with indices.
  for (const frame of dedupeFrames(step.stack)) {
    for (const [name, value] of Object.entries(frame.vars)) {
      if (!isArrayValue(value)) continue;
      const focused = step.focus && step.focus.name === name ? step.focus.indices : [];
      const cells = value.items
        .map((item, i) => {
          const idx = value.low + i;
          const lit = focused.includes(idx) ? 'is-focus' : '';
          return `<div class="cell ${lit}"><span class="cell__i">${idx}</span><span class="cell__v">${escapeHtml(fmt(item))}</span></div>`;
        })
        .join('');
      parts.push(`<div class="diagram__array"><span class="diagram__name">${escapeHtml(name)}</span><div class="cells">${cells}</div></div>`);
    }
  }

  // Recursion / call depth, drawn as stacked frames when we are inside a routine.
  if (step.stack.length > 1) {
    const frames = step.stack
      .slice(1)
      .map((f) => `<div class="framebox">${escapeHtml(frameLabel(f))}</div>`)
      .reverse()
      .join('');
    parts.push(`<div class="diagram__frames"><span class="diagram__name">call stack</span>${frames}</div>`);
  }

  // Scalars of the current frame as chips, so simple loops still visualize.
  const current = step.stack[step.stack.length - 1];
  const chips = Object.entries(current.vars)
    .filter(([, v]) => !isArrayValue(v))
    .map(([n, v]) => `<span class="chip"><span class="chip__n">${escapeHtml(n)}</span>${escapeHtml(fmt(v))}</span>`)
    .join('');
  if (chips) parts.push(`<div class="diagram__chips">${chips}</div>`);

  return parts.length ? parts.join('') : `<p class="dbg__muted">nothing to show yet</p>`;
}

/** Globals + current frame, without repeating globals when we are at top level. */
function dedupeFrames(stack: Frame[]): Frame[] {
  if (stack.length <= 1) return stack;
  return [stack[0], stack[stack.length - 1]];
}

function sameValue(a: Value, b: Value): boolean {
  return fmt(a) === fmt(b);
}
