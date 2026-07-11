import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Generated coverage reports and build output are never linted.
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Jest config files are CommonJS modules executed by Node: expose `module`.
  {
    files: ['**/jest.config.js', '**/*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly', process: 'readonly' },
    },
  },
  // Standalone benchmark scripts: plain CommonJS run directly with `node`,
  // not part of the published package or the type-checked src/ tree.
  {
    files: ['**/bench/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly', console: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
