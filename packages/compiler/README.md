# pascal-js-compiler

Compiles **Pascal source code to JavaScript**. It is the code-generation stage of
[`pascal-toolchain`](https://github.com/damiansire/pascal-toolchain): it consumes the
AST produced by [`pascal-parser`](https://www.npmjs.com/package/pascal-parser) and emits
runnable JavaScript.

## Installation

```bash
npm install pascal-js-compiler
```

## Usage

```typescript
import { compile } from 'pascal-js-compiler';

const js = compile(`
program Hello;
begin
  writeln('Hello, world!');
end.
`);

console.log(js);
// // Generated from Pascal program: Hello
// console.log("Hello, world!");

// To run the generated code, write it to a file and execute it in a separate
// Node process. Avoid eval(js): the output is derived from Pascal source, so it
// should only be executed when that source is trusted.
import { writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

writeFileSync('out.js', js);
execFileSync('node', ['out.js'], { stdio: 'inherit' }); // => Hello, world!
```

> Security: the compiler escapes string literals and identifiers, but generated
> code still reflects the input program. Only execute the output when the Pascal
> source is trusted; do not pipe untrusted source straight into `eval`/`new Function`.

You can also generate from an AST you already have:

```typescript
import { generate } from 'pascal-js-compiler';
import { parse } from 'pascal-parser';

const js = generate(parse(source));
```

## What it supports

The generator targets the full parser AST contract:

- `program` blocks, `const`/`var` declarations, procedures/functions (with local
  declarations), and `array[lo..hi] of T` with 1-based indexing preserved
- statements: assignment (`:=` → `=`), `if/else`, `while`, `for..to` / `for..downto`,
  `repeat..until`, `case..of`, and procedure calls
- expressions: binary/unary operators, identifiers, numeric/string/boolean literals, calls
- operator mapping: `=` → `===`, `<>` → `!==`, `div` → `Math.trunc`, `mod` → `%`, `and/or/not` → `&&/||/!`
  (boolean operands only — Pascal's bitwise `and/or/not` over integers is **not** supported; the
  compiler raises an error on a clearly-integer operand rather than emit incorrect logic)
- I/O builtins: `writeln` → `console.log`, `write` → `process.stdout.write` (statement position)
- value builtins: `abs`, `sqrt`, `sqr`, `trunc`, `round`, `odd` (expression position); `inc`/`dec`
  (statement position). Using a builtin in the wrong position is a `CompileError` (see below).

> The accepted Pascal grammar is bounded by what `pascal-parser` currently parses.

## Errors

`generate`/`compile` throw a typed **`CompileError`** when a syntactically valid program
uses a feature this compiler does not support — `var` (by-reference) parameters, bitwise
`and`/`or`/`not` over integers, a builtin called with the wrong arity, or a builtin used in
the wrong position. A plain `Error` means an internal compiler bug, not bad input. `compile`
(which parses first) may also propagate `ParseError`/`TokenizeError` from `pascal-parser`.

```typescript
import { compile, CompileError } from 'pascal-js-compiler';

try {
  compile('program P; procedure r(var x: integer); begin x := 0; end; begin end.');
} catch (e) {
  if (e instanceof CompileError) {
    // Unsupported Pascal — surface it to the user.
    console.error(`Cannot compile: ${e.message}`);
  } else {
    throw e; // internal bug or a ParseError/TokenizeError from parsing
  }
}
```

## License

MIT © Damian Sire
