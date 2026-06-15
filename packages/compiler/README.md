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

eval(js); // => Hello, world!
```

You can also generate from an AST you already have:

```typescript
import { generate } from 'pascal-js-compiler';
import { parse } from 'pascal-parser';

const js = generate(parse(source));
```

## What it supports

The generator targets the full parser AST contract:

- `program` blocks, variable declarations, procedures/functions
- statements: assignment (`:=` → `=`), `if/else`, `while`, `for..to` / `for..downto`, calls
- expressions: binary/unary operators, identifiers, numeric/string/boolean literals
- operator mapping: `=` → `===`, `<>` → `!==`, `div` → `Math.trunc`, `mod` → `%`, `and/or/not` → `&&/||/!`
- I/O builtins: `writeln` → `console.log`, `write` → `process.stdout.write`

> The accepted Pascal grammar is bounded by what `pascal-parser` currently parses.

## License

MIT © Damian Sire
