import './style.css';
import { createEditor } from './editor';
import { SAMPLES, DEFAULT_SAMPLE } from './samples';
import {
  runTokenize,
  runParse,
  runFormat,
  runCompile,
  sourceIsValid,
} from './toolchain';
import {
  renderTokens,
  renderAst,
  renderFormatted,
  renderJs,
  runCompiledJs,
  errorCard,
} from './render';
import { trace, type TraceResult } from './tracer';
import { createDebugger } from './debugger';

type TabId = 'tokens' | 'ast' | 'formatted' | 'js' | 'debug';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'debug', label: 'Debugger' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'ast', label: 'AST' },
  { id: 'formatted', label: 'Formatted' },
  { id: 'js', label: 'JavaScript' },
];

const PLAY_ICON =
  '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1.5 L10.5 6 L2 10.5 Z" fill="currentColor"/></svg>';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <span class="brand__name">pascal-toolchain</span>
      <span class="brand__sep">/</span>
      <span class="brand__sub">playground</span>
    </div>
    <div class="topbar__controls">
      <label class="control">
        <span class="control__label">Sample</span>
        <select id="sample" class="select"></select>
      </label>
      <a class="ghost-btn" href="https://github.com/damiansire/pascal-toolchain" target="_blank" rel="noreferrer noopener">Repo</a>
      <button id="theme" class="ghost-btn" type="button" aria-label="Toggle colour theme">Theme</button>
    </div>
  </header>

  <main class="workspace">
    <section class="pane pane--editor" aria-label="Pascal source">
      <div class="pane__head"><h2 class="pane__title">Pascal</h2></div>
      <div id="editor" class="pane__body"></div>
    </section>

    <section class="pane pane--output" aria-label="Toolchain output">
      <div class="pane__head">
        <div class="tabs" role="tablist"></div>
        <button id="run" class="run-btn" type="button" hidden>${PLAY_ICON}<span>Run</span></button>
      </div>
      <div id="output" class="pane__body pane__body--scroll" role="tabpanel"></div>
      <div id="debug" class="pane__body pane__body--scroll" role="tabpanel" hidden></div>
      <div id="console" class="console" hidden></div>
    </section>
  </main>

  <footer class="statusbar">
    <span id="status-valid" class="status status--muted">ready</span>
    <span id="status-tokens" class="status"></span>
    <span id="status-time" class="status status--muted"></span>
  </footer>`;

const selectEl = app.querySelector<HTMLSelectElement>('#sample')!;
const tabsEl = app.querySelector<HTMLElement>('.tabs')!;
const outputEl = app.querySelector<HTMLElement>('#output')!;
const debugEl = app.querySelector<HTMLElement>('#debug')!;
const consoleEl = app.querySelector<HTMLElement>('#console')!;
const runBtn = app.querySelector<HTMLButtonElement>('#run')!;
const themeBtn = app.querySelector<HTMLButtonElement>('#theme')!;
const statusValid = app.querySelector<HTMLElement>('#status-valid')!;
const statusTokens = app.querySelector<HTMLElement>('#status-tokens')!;
const statusTime = app.querySelector<HTMLElement>('#status-time')!;

// Populate the sample picker.
selectEl.innerHTML = SAMPLES.map((s) => `<option value="${s.id}">${s.label}</option>`).join('');

// Build the tab bar. The debugger is the headline view, so it opens first.
let activeTab: TabId = 'debug';
tabsEl.innerHTML = TABS.map(
  (t) =>
    `<button class="tab" role="tab" data-tab="${t.id}" aria-selected="${t.id === activeTab}">${t.label}</button>`,
).join('');

// Latest computed results, re-rendered instantly on tab switch.
interface Computed {
  tokens: ReturnType<typeof runTokenize>;
  ast: ReturnType<typeof runParse>;
  formatted: ReturnType<typeof runFormat>;
  js: ReturnType<typeof runCompile>;
  trace: TraceResult;
  valid: boolean;
  totalMs: number;
}
let latest: Computed | null = null;

function compute(source: string): Computed {
  const tokens = runTokenize(source);
  const ast = runParse(source);
  const formatted = runFormat(source);
  const js = runCompile(source);
  const traced = trace(source);
  const valid = sourceIsValid(source);
  const totalMs = tokens.ms + ast.ms + formatted.ms + js.ms;
  return { tokens, ast, formatted, js, trace: traced, valid, totalMs };
}

function renderActive(): void {
  if (!latest) return;
  const onDebug = activeTab === 'debug';
  outputEl.hidden = onDebug;
  debugEl.hidden = !onDebug;
  runBtn.hidden = activeTab !== 'js';
  consoleEl.hidden = true;
  if (onDebug) {
    // The debugger owns the editor's active-line band; it renders itself here.
    dbg.setTrace(latest.trace);
    return;
  }
  dbg.stop(); // clear the active-line band when leaving the debugger
  if (activeTab === 'tokens') outputEl.innerHTML = renderTokens(latest.tokens);
  else if (activeTab === 'ast') outputEl.innerHTML = renderAst(latest.ast);
  else if (activeTab === 'formatted') outputEl.innerHTML = renderFormatted(latest.formatted);
  else outputEl.innerHTML = renderJs(latest.js);
}

function renderStatus(): void {
  if (!latest) return;
  if (latest.valid) {
    statusValid.textContent = 'valid';
    statusValid.className = 'status status--ok';
  } else {
    statusValid.textContent = 'parse error';
    statusValid.className = 'status status--err';
  }
  statusTokens.textContent = latest.tokens.ok
    ? `${latest.tokens.value.filter((t) => t.type !== 'EOF').length} tokens`
    : '';
  statusTime.textContent = `${latest.totalMs.toFixed(1)} ms`;
}

function refresh(source: string): void {
  latest = compute(source);
  renderActive();
  renderStatus();
}

// Debounce the heavier pipeline; the editor's own highlight stays instant.
let timer: number | undefined;
function scheduleRefresh(source: string): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => refresh(source), 120);
}

const editor = createEditor(app.querySelector<HTMLElement>('#editor')!, {
  onInput: scheduleRefresh,
});

// The step-debugger renders into its own panel and drives the editor's active line.
const dbg = createDebugger(debugEl, editor);

// Tab clicks.
tabsEl.addEventListener('click', (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.tab');
  if (!btn) return;
  activeTab = btn.dataset.tab as TabId;
  tabsEl.querySelectorAll<HTMLElement>('.tab').forEach((t) => {
    t.setAttribute('aria-selected', String(t.dataset.tab === activeTab));
  });
  renderActive();
});

// Sample switching.
selectEl.addEventListener('change', () => {
  const sample = SAMPLES.find((s) => s.id === selectEl.value) ?? DEFAULT_SAMPLE;
  editor.setValue(sample.code);
});

// Run the compiled JS.
runBtn.addEventListener('click', () => {
  if (!latest) return;
  consoleEl.hidden = false;
  if (!latest.js.ok) {
    consoleEl.innerHTML = errorCard(latest.js.error);
    return;
  }
  const outcome = runCompiledJs(latest.js.value);
  const body = outcome.lines.length
    ? `<pre class="console__out">${outcome.lines.map(escapeText).join('\n')}</pre>`
    : `<p class="console__empty">(no output)</p>`;
  const err = outcome.error ? errorCard(outcome.error) : '';
  consoleEl.innerHTML = `<div class="console__head">output</div>${body}${err}`;
});

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Theme toggle (persisted).
const THEME_KEY = 'pascal-playground-theme';
function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage may be unavailable; theme just won't persist */
  }
}
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
});
const stored = (() => {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
})();
applyTheme(stored === 'light' ? 'light' : 'dark');

// First paint.
editor.setValue(DEFAULT_SAMPLE.code);
