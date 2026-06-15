# pascal-toolchain

A **Pascal compiler frontend** written in TypeScript, organized as a pnpm monorepo.
Each stage is published as its own npm package, but they evolve together here.

## The pipeline

```
source.pas
   │
   ▼
┌──────────────────┐   tokens    ┌──────────────┐   AST    ┌────────────────────┐
│ pascal-tokenizer │ ──────────▶ │ pascal-parser │ ──────▶ │ pascal-code-formatter │
└──────────────────┘             └──────────────┘          └────────────────────┘
```

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`pascal-tokenizer`](./packages/tokenizer) | [![npm](https://img.shields.io/npm/v/pascal-tokenizer)](https://www.npmjs.com/package/pascal-tokenizer) | Lexer: turns Pascal source into a token stream. |
| [`pascal-parser`](./packages/parser) | [![npm](https://img.shields.io/npm/v/pascal-parser)](https://www.npmjs.com/package/pascal-parser) | Builds an AST from the token stream. |
| [`pascal-code-formatter`](./packages/code-formatter) | [![npm](https://img.shields.io/npm/v/pascal-code-formatter)](https://www.npmjs.com/package/pascal-code-formatter) | Pretty-prints / formats Pascal source. |

> A code-generation / interpreter stage is planned as a future package.

## Development

```bash
pnpm install      # install all workspace deps
pnpm build        # build every package
pnpm test         # run every package's tests
```

## Releasing

Versioning and publishing are handled with [Changesets](https://github.com/changesets/changesets);
each package keeps its own version and is published under its own unique name.

```bash
pnpm changeset           # describe the change + bump
pnpm version-packages    # apply version bumps
pnpm release             # build + publish changed packages
```

## License

MIT © Damian Sire
