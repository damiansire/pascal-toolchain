import { tokenizePascal, type PascalToken } from 'pascal-tokenizer';
import { parse, isValid, type Program } from 'pascal-parser';
import { compile } from 'pascal-js-compiler';
import { formatPascalSource } from 'pascal-code-formatter';

/** A stage either produced a value or failed with a human-readable message. */
export type StageResult<T> =
  | { readonly ok: true; readonly value: T; readonly ms: number }
  | { readonly ok: false; readonly error: string; readonly ms: number };

/** Turns any thrown value into a readable message (Error, string, or unknown). */
function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

/** Runs `fn`, capturing either its value or a readable error, plus elapsed ms. */
function guard<T>(fn: () => T): StageResult<T> {
  const started = performance.now();
  try {
    const value = fn();
    return { ok: true, value, ms: performance.now() - started };
  } catch (err) {
    return { ok: false, error: messageOf(err), ms: performance.now() - started };
  }
}

/** Tokens, comments included so the token view mirrors the source exactly. */
export const runTokenize = (source: string): StageResult<PascalToken[]> =>
  guard(() => tokenizePascal(source, false));

export const runParse = (source: string): StageResult<Program> =>
  guard(() => parse(source));

export const runFormat = (source: string): StageResult<string> =>
  guard(() => formatPascalSource(source));

export const runCompile = (source: string): StageResult<string> =>
  guard(() => compile(source));

/** Cheap validity check for the status bar (does not throw). */
export const sourceIsValid = (source: string): boolean => {
  try {
    return isValid(source);
  } catch {
    return false;
  }
};
