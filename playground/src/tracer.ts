import { parse } from 'pascal-parser';
import type {
  Program,
  Statement,
  Expression,
  Block,
  FunctionDeclaration,
  ProcedureDeclaration,
  Declaration,
} from 'pascal-parser';

/**
 * A tree-walking interpreter that *traces* execution: instead of just running a
 * Pascal program, it records a snapshot at every step so the playground debugger
 * can scrub forward and back through the run. It covers the same procedural
 * subset the compiler does; the tracer test cross-checks its output against the
 * compiler for every sample, so the two stay in agreement.
 */

/** A 1-based Pascal array value. `items[i - low]` holds index `i`. */
export interface PascalArray {
  readonly __array: true;
  readonly low: number;
  readonly high: number;
  items: Value[];
}

export type Value = number | boolean | string | PascalArray;

const isArray = (v: Value): v is PascalArray =>
  typeof v === 'object' && v !== null && (v as PascalArray).__array === true;

/** One call frame: a named scope with its variables. */
export interface Frame {
  readonly name: string;
  vars: Record<string, Value>;
}

export type StepKind = 'assign' | 'output' | 'cond' | 'loop' | 'call' | 'return' | 'case';

/** A single point in the run: everything the UI needs to render that moment. */
export interface Step {
  readonly line: number;
  readonly kind: StepKind;
  readonly note: string;
  readonly stack: Frame[]; // deep snapshot; [0] = globals, last = current frame
  readonly output: string[];
  /** Array cells touched this step, for the diagram to highlight. */
  readonly focus?: { name: string; indices: number[] };
}

export interface TraceResult {
  readonly steps: Step[];
  /** Set when the run stopped early (unsupported construct or step limit). */
  readonly error?: string;
}

const STEP_LIMIT = 20000;

/** Signals a normal Pascal runtime problem (division by zero, etc.). */
class RuntimeError extends Error {}
/** Thrown to unwind out of a function body once its result is known. */
class ReturnSignal extends Error {}

class Tracer {
  private readonly functions = new Map<string, FunctionDeclaration | ProcedureDeclaration>();
  private readonly stack: Frame[] = [];
  private readonly output: string[] = [];
  private readonly steps: Step[] = [];

  trace(program: Program): TraceResult {
    for (const decl of program.declarations) this.hoist(decl);
    const globals: Frame = { name: program.name || 'program', vars: {} };
    this.stack.push(globals);
    this.declareLocals(program.declarations, globals);
    try {
      this.execStatements(program.statements);
    } catch (err) {
      if (err instanceof RuntimeError) return { steps: this.steps, error: err.message };
      if (err instanceof StepLimit) return { steps: this.steps, error: 'step limit reached' };
      throw err;
    }
    return { steps: this.steps };
  }

  // ---- declarations -------------------------------------------------------

  private hoist(decl: Declaration): void {
    if (decl.type === 'FunctionDeclaration' || decl.type === 'ProcedureDeclaration') {
      this.functions.set(decl.name.toLowerCase(), decl);
    }
  }

  private declareLocals(decls: Declaration[], frame: Frame): void {
    for (const decl of decls) {
      if (decl.type === 'VariableDeclaration') {
        frame.vars[decl.name.toLowerCase()] = decl.arrayBounds
          ? {
              __array: true,
              low: decl.arrayBounds.low,
              high: decl.arrayBounds.high,
              items: Array.from(
                { length: decl.arrayBounds.high - decl.arrayBounds.low + 1 },
                () => 0,
              ),
            }
          : 0;
      } else if (decl.type === 'ConstantDeclaration') {
        frame.vars[decl.name.toLowerCase()] = this.eval(decl.value);
      }
    }
  }

  // ---- statements ---------------------------------------------------------

  private execStatements(statements: Statement[]): void {
    for (const stmt of statements) this.exec(stmt);
  }

  private exec(stmt: Statement): void {
    switch (stmt.type) {
      case 'AssignmentStatement':
        return this.execAssignment(stmt);
      case 'CallStatement':
        return this.execCall(stmt);
      case 'IfStatement':
        return this.execIf(stmt);
      case 'WhileStatement':
        return this.execWhile(stmt);
      case 'ForStatement':
        return this.execFor(stmt);
      case 'RepeatStatement':
        return this.execRepeat(stmt);
      case 'CaseStatement':
        return this.execCase(stmt);
      case 'CompoundStatement':
        return this.execStatements(stmt.statements);
      default: {
        const node = stmt as { type: string };
        throw new RuntimeError(`debugger does not support statement: ${node.type}`);
      }
    }
  }

  private execAssignment(stmt: import('pascal-parser').AssignmentStatement): void {
    const value = this.eval(stmt.right);
    const frame = this.current();
    if (stmt.left.type === 'Identifier') {
      const name = stmt.left.name.toLowerCase();
      frame.vars[name] = value;
      this.step(stmt, 'assign', `${stmt.left.name} := ${fmt(value)}`);
    } else {
      // IndexExpression target: a[i] := value
      const target = stmt.left;
      if (target.array.type !== 'Identifier') {
        throw new RuntimeError('debugger only supports assigning to a[i] on a named array');
      }
      const name = target.array.name.toLowerCase();
      const arr = this.readVar(name, target.array.name);
      if (!isArray(arr)) throw new RuntimeError(`${target.array.name} is not an array`);
      const index = this.asNumber(this.eval(target.index));
      this.checkBounds(arr, index, target.array.name);
      arr.items[index - arr.low] = value;
      this.step(stmt, 'assign', `${target.array.name}[${index}] := ${fmt(value)}`, {
        name,
        indices: [index],
      });
    }
  }

  private execCall(stmt: import('pascal-parser').CallStatement): void {
    const name = stmt.name.toLowerCase();
    if (name === 'writeln' || name === 'write') {
      const line = stmt.arguments.map((a) => fmt(this.eval(a))).join(' ');
      if (name === 'writeln') this.output.push(line);
      else if (this.output.length === 0) this.output.push(line);
      else this.output[this.output.length - 1] += line;
      this.step(stmt, 'output', `${stmt.name}(${line ? fmtShort(line) : ''})`);
      return;
    }
    if (name === 'inc' || name === 'dec') {
      const arg = stmt.arguments[0];
      if (!arg || arg.type !== 'Identifier') {
        throw new RuntimeError(`${stmt.name} expects a variable`);
      }
      const by = stmt.arguments[1] ? this.asNumber(this.eval(stmt.arguments[1])) : 1;
      const varName = arg.name.toLowerCase();
      const cur = this.asNumber(this.readVar(varName, arg.name));
      const next = name === 'inc' ? cur + by : cur - by;
      this.current().vars[varName] = next;
      this.step(stmt, 'assign', `${arg.name} := ${next}`);
      return;
    }
    // User-defined procedure.
    this.callSubprogram(stmt.name, stmt.arguments, stmt);
  }

  private execIf(stmt: import('pascal-parser').IfStatement): void {
    const cond = this.asBool(this.eval(stmt.condition));
    this.step(stmt, 'cond', `if ${exprText(stmt.condition)} -> ${cond}`);
    if (cond) this.exec(stmt.thenBranch);
    else if (stmt.elseBranch) this.exec(stmt.elseBranch);
  }

  private execWhile(stmt: import('pascal-parser').WhileStatement): void {
    for (;;) {
      const cond = this.asBool(this.eval(stmt.condition));
      this.step(stmt, 'loop', `while ${exprText(stmt.condition)} -> ${cond}`);
      if (!cond) break;
      this.exec(stmt.body);
    }
  }

  private execFor(stmt: import('pascal-parser').ForStatement): void {
    const name = stmt.variable.name.toLowerCase();
    let i = this.asNumber(this.eval(stmt.start));
    const end = this.asNumber(this.eval(stmt.end));
    const up = stmt.direction === 'to';
    for (; up ? i <= end : i >= end; up ? i++ : i--) {
      this.current().vars[name] = i;
      this.step(stmt, 'loop', `for ${stmt.variable.name} := ${i} (${up ? 'to' : 'downto'} ${end})`);
      this.exec(stmt.body);
    }
  }

  private execRepeat(stmt: import('pascal-parser').RepeatStatement): void {
    for (;;) {
      this.execStatements(stmt.body);
      const done = this.asBool(this.eval(stmt.condition));
      this.step(stmt, 'loop', `until ${exprText(stmt.condition)} -> ${done}`);
      if (done) break;
    }
  }

  private execCase(stmt: import('pascal-parser').CaseStatement): void {
    const value = this.eval(stmt.expression);
    this.step(stmt, 'case', `case ${fmt(value)} of`);
    for (const clause of stmt.clauses) {
      if (clause.labels.some((label) => equalValues(this.eval(label), value))) {
        this.exec(clause.body);
        return;
      }
    }
    if (stmt.elseBranch) this.exec(stmt.elseBranch);
  }

  // ---- subprograms --------------------------------------------------------

  private callSubprogram(name: string, args: Expression[], site: Statement | Expression): Value {
    const def = this.functions.get(name.toLowerCase());
    if (!def) throw new RuntimeError(`unknown routine: ${name}`);
    const values = args.map((a) => this.eval(a));
    const frame: Frame = { name: `${def.name}(${values.map(fmt).join(', ')})`, vars: {} };
    def.parameters.forEach((param, i) => {
      frame.vars[param.name.toLowerCase()] = values[i];
    });
    const isFunction = def.type === 'FunctionDeclaration';
    if (isFunction) frame.vars[def.name.toLowerCase()] = 0; // result slot
    this.declareLocals((def.body as Block).declarations ?? [], frame);
    this.stack.push(frame);
    this.step(site, 'call', `enter ${frame.name}`);
    try {
      this.execStatements(def.body.statements);
    } catch (err) {
      if (!(err instanceof ReturnSignal)) throw err;
    }
    const result = isFunction ? frame.vars[def.name.toLowerCase()] : 0;
    this.stack.pop();
    if (isFunction) this.step(site, 'return', `${def.name} returns ${fmt(result)}`);
    return result;
  }

  // ---- expressions --------------------------------------------------------

  private eval(expr: Expression): Value {
    switch (expr.type) {
      case 'NumericLiteral':
        return expr.value;
      case 'StringLiteral':
        return expr.value;
      case 'BooleanLiteral':
        return expr.value;
      case 'Identifier':
        return this.readVar(expr.name.toLowerCase(), expr.name);
      case 'BinaryExpression':
        return this.evalBinary(expr);
      case 'UnaryExpression': {
        const v = this.eval(expr.argument);
        if (expr.operator === '-') return -this.asNumber(v);
        if (expr.operator.toLowerCase() === 'not') return !this.asBool(v);
        throw new RuntimeError(`unsupported unary operator: ${expr.operator}`);
      }
      case 'IndexExpression': {
        const arr = this.eval(expr.array);
        if (!isArray(arr)) throw new RuntimeError('indexing a non-array value');
        const index = this.asNumber(this.eval(expr.index));
        this.checkBounds(arr, index, 'array');
        return arr.items[index - arr.low];
      }
      case 'CallExpression':
        return this.evalCallExpression(expr);
      default: {
        const node = expr as { type: string };
        throw new RuntimeError(`debugger does not support expression: ${node.type}`);
      }
    }
  }

  private evalCallExpression(expr: import('pascal-parser').CallExpression): Value {
    const name = expr.callee.toLowerCase();
    const builtin = BUILTINS[name];
    if (builtin) return builtin(expr.arguments.map((a) => this.asNumber(this.eval(a))));
    return this.callSubprogram(expr.callee, expr.arguments, expr);
  }

  private evalBinary(expr: import('pascal-parser').BinaryExpression): Value {
    const op = expr.operator.toLowerCase();
    if (op === 'and') return this.asBool(this.eval(expr.left)) && this.asBool(this.eval(expr.right));
    if (op === 'or') return this.asBool(this.eval(expr.left)) || this.asBool(this.eval(expr.right));
    const l = this.eval(expr.left);
    const r = this.eval(expr.right);
    switch (op) {
      case '+':
        return typeof l === 'string' || typeof r === 'string'
          ? fmt(l) + fmt(r)
          : this.asNumber(l) + this.asNumber(r);
      case '-':
        return this.asNumber(l) - this.asNumber(r);
      case '*':
        return this.asNumber(l) * this.asNumber(r);
      case '/':
        return this.asNumber(l) / this.asNumber(r);
      case 'div':
        return Math.trunc(this.asNumber(l) / this.asNumber(r));
      case 'mod':
        return this.asNumber(l) % this.asNumber(r);
      case '=':
        return equalValues(l, r);
      case '<>':
        return !equalValues(l, r);
      case '<':
        return this.asNumber(l) < this.asNumber(r);
      case '>':
        return this.asNumber(l) > this.asNumber(r);
      case '<=':
        return this.asNumber(l) <= this.asNumber(r);
      case '>=':
        return this.asNumber(l) >= this.asNumber(r);
      default:
        throw new RuntimeError(`unsupported operator: ${expr.operator}`);
    }
  }

  // ---- environment + snapshots -------------------------------------------

  private current(): Frame {
    return this.stack[this.stack.length - 1];
  }

  /** Resolves a name in the current frame, then globals (Pascal scoping). */
  private readVar(key: string, display: string): Value {
    const local = this.current().vars;
    if (key in local) return local[key];
    const globals = this.stack[0].vars;
    if (key in globals) return globals[key];
    throw new RuntimeError(`undefined variable: ${display}`);
  }

  private step(node: Statement | Expression, kind: StepKind, note: string, focus?: Step['focus']): void {
    if (this.steps.length >= STEP_LIMIT) throw new StepLimit();
    this.steps.push({
      line: node.location?.start.line ?? 0,
      kind,
      note,
      stack: this.stack.map((f) => ({ name: f.name, vars: structuredClone(f.vars) })),
      output: [...this.output],
      focus,
    });
  }

  private checkBounds(arr: PascalArray, index: number, name: string): void {
    if (index < arr.low || index > arr.high) {
      throw new RuntimeError(`index ${index} out of bounds for ${name}[${arr.low}..${arr.high}]`);
    }
  }

  private asNumber(v: Value): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    throw new RuntimeError(`expected a number, got ${fmt(v)}`);
  }

  private asBool(v: Value): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    throw new RuntimeError(`expected a boolean, got ${fmt(v)}`);
  }
}

class StepLimit extends Error {}

const BUILTINS: Record<string, (args: number[]) => Value> = {
  abs: ([x]) => Math.abs(x),
  sqrt: ([x]) => Math.sqrt(x),
  sqr: ([x]) => x * x,
  trunc: ([x]) => Math.trunc(x),
  round: ([x]) => Math.round(x),
  odd: ([x]) => x % 2 !== 0,
};

function equalValues(a: Value, b: Value): boolean {
  if (isArray(a) || isArray(b)) return false;
  return a === b;
}

/** Formats a value the way Pascal's writeln (via the compiler's console.log) would. */
export function fmt(v: Value): string {
  if (isArray(v)) return `[${v.items.map(fmt).join(', ')}]`;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

const fmtShort = (s: string): string => (s.length > 24 ? `'${s.slice(0, 22)}…'` : `'${s}'`);

/** A terse, readable rendering of an expression for step notes. */
function exprText(expr: Expression): string {
  switch (expr.type) {
    case 'NumericLiteral':
      return String(expr.value);
    case 'StringLiteral':
      return `'${expr.value}'`;
    case 'BooleanLiteral':
      return expr.value ? 'true' : 'false';
    case 'Identifier':
      return expr.name;
    case 'BinaryExpression':
      return `${exprText(expr.left)} ${expr.operator} ${exprText(expr.right)}`;
    case 'UnaryExpression':
      return `${expr.operator}${exprText(expr.argument)}`;
    case 'IndexExpression':
      return `${exprText(expr.array)}[${exprText(expr.index)}]`;
    case 'CallExpression':
      return `${expr.callee}(${expr.arguments.map(exprText).join(', ')})`;
    default:
      return '?';
  }
}

/** Parses and traces Pascal source. Never throws: parse/runtime errors surface in `error`. */
export function trace(source: string): TraceResult {
  let program: Program;
  try {
    program = parse(source);
  } catch (err) {
    return { steps: [], error: err instanceof Error ? err.message : String(err) };
  }
  return new Tracer().trace(program);
}
