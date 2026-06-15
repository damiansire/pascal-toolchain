# pascal-toolchain

A **Pascal compiler frontend** written in TypeScript, organized as an npm-workspaces monorepo.
Each stage is published as its own npm package, but they evolve together here.

## The pipeline

```
source.pas
   │
   ▼
┌──────────────────┐  tokens  ┌───────────────┐   AST   ┌────────────────────┐  JS
│ pascal-tokenizer │ ───────▶ │ pascal-parser │ ──────▶ │ pascal-js-compiler │ ────▶ output.js
└──────────────────┘          └───────────────┘         └────────────────────┘
                                      │ AST
                                      ▼
                            ┌────────────────────────┐
                            │ pascal-code-formatter   │ ──▶ pretty Pascal
                            └────────────────────────┘
```

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`pascal-tokenizer`](./packages/tokenizer) | [![npm](https://img.shields.io/npm/v/pascal-tokenizer)](https://www.npmjs.com/package/pascal-tokenizer) | Lexer: turns Pascal source into a token stream. |
| [`pascal-parser`](./packages/parser) | [![npm](https://img.shields.io/npm/v/pascal-parser)](https://www.npmjs.com/package/pascal-parser) | Builds an AST from the token stream. |
| [`pascal-js-compiler`](./packages/compiler) | [![npm](https://img.shields.io/npm/v/pascal-js-compiler)](https://www.npmjs.com/package/pascal-js-compiler) | Code generation: emits JavaScript from the AST. |
| [`pascal-code-formatter`](./packages/code-formatter) | [![npm](https://img.shields.io/npm/v/pascal-code-formatter)](https://www.npmjs.com/package/pascal-code-formatter) | Pretty-prints / formats Pascal source. |

The pipeline is now complete end to end: `pascal-js-compiler` closes it by turning
the parser's AST into runnable JavaScript.

## Development

```bash
npm install         # install all workspace deps (links packages together)
npm run build       # build every package
npm test            # run every package's tests
```

## Releasing

Versioning and publishing are handled with [Changesets](https://github.com/changesets/changesets);
each package keeps its own version and is published under its own unique name.

```bash
npm run changeset          # describe the change + bump
npm run version-packages   # apply version bumps
npm run release            # build + publish changed packages
```

## License

MIT © Damian Sire
