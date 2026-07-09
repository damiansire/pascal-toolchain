import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/** Resolve a path relative to this config file. */
const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

// The playground consumes the toolchain packages straight from their TypeScript
// source (not the built dist) so it always reflects the working tree and needs no
// prior build step. Inter-package imports are by package name, so aliasing the
// names covers the whole graph (compiler -> parser -> tokenizer, formatter -> ...).
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      'pascal-tokenizer': here('../packages/tokenizer/src/index.ts'),
      'pascal-parser': here('../packages/parser/src/index.ts'),
      'pascal-js-compiler': here('../packages/compiler/src/index.ts'),
      'pascal-code-formatter': here('../packages/code-formatter/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
