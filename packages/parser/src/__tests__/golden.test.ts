// Golden corpus runner. Walks tests/golden/ at the repo root:
//   valid/<name>.pas   -> parsed AST must equal <name>.ast.json
//   invalid/<name>.pas -> parse must throw a typed diagnostic whose
//                         "Name: message" equals <name>.error.txt
// Regenerate the golden files after an intentional AST/diagnostic change with:
//   UPDATE_GOLDEN=1 npm test -w pascal-parser -- golden
// (then review the diff like any other code change).
import * as fs from 'fs';
import * as path from 'path';
import { parse } from '../parser';
import { TokenizeError } from 'pascal-tokenizer';
import { ParseError } from '../types';

const GOLDEN_ROOT = path.resolve(__dirname, '..', '..', '..', '..', 'tests', 'golden');
const VALID_DIR = path.join(GOLDEN_ROOT, 'valid');
const INVALID_DIR = path.join(GOLDEN_ROOT, 'invalid');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

/** Line endings must not leak into golden ASTs: offsets/columns depend on them. */
function readSource(file: string): string {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function listPascalFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.pas'))
    .sort();
}

const validFiles = listPascalFiles(VALID_DIR);
const invalidFiles = listPascalFiles(INVALID_DIR);

describe('golden corpus layout', () => {
  it('has a non-empty corpus on both sides', () => {
    expect(validFiles.length).toBeGreaterThan(0);
    expect(invalidFiles.length).toBeGreaterThan(0);
  });

  it('has no orphan golden files (golden without its .pas source)', () => {
    const orphanAst = fs
      .readdirSync(VALID_DIR)
      .filter((f) => f.endsWith('.ast.json'))
      .filter((f) => !validFiles.includes(f.replace(/\.ast\.json$/, '.pas')));
    const orphanErr = fs
      .readdirSync(INVALID_DIR)
      .filter((f) => f.endsWith('.error.txt'))
      .filter((f) => !invalidFiles.includes(f.replace(/\.error\.txt$/, '.pas')));
    expect(orphanAst).toEqual([]);
    expect(orphanErr).toEqual([]);
  });
});

describe('golden corpus: valid programs parse to the recorded AST', () => {
  it.each(validFiles)('%s', (file) => {
    const source = readSource(path.join(VALID_DIR, file));
    const goldenPath = path.join(VALID_DIR, file.replace(/\.pas$/, '.ast.json'));

    const ast = parse(source);
    // JSON round-trip normalizes the AST exactly as it is stored on disk.
    const actual = JSON.parse(JSON.stringify(ast)) as unknown;

    if (UPDATE) {
      fs.writeFileSync(goldenPath, JSON.stringify(ast, null, 2) + '\n', 'utf8');
      return;
    }
    expect(fs.existsSync(goldenPath)).toBe(true);
    const expected = JSON.parse(readSource(goldenPath)) as unknown;
    expect(actual).toEqual(expected);
  });
});

describe('golden corpus: invalid programs fail with the recorded diagnostic', () => {
  it.each(invalidFiles)('%s', (file) => {
    const source = readSource(path.join(INVALID_DIR, file));
    const goldenPath = path.join(INVALID_DIR, file.replace(/\.pas$/, '.error.txt'));

    let caught: unknown;
    try {
      parse(source);
    } catch (e) {
      caught = e;
    }
    // Errors must be typed diagnostics, never generic exceptions.
    expect(caught).toBeDefined();
    expect(caught instanceof ParseError || caught instanceof TokenizeError).toBe(true);
    const error = caught as Error;
    const diagnostic = `${error.name}: ${error.message}`;

    if (UPDATE) {
      fs.writeFileSync(goldenPath, diagnostic + '\n', 'utf8');
      return;
    }
    expect(fs.existsSync(goldenPath)).toBe(true);
    expect(diagnostic).toBe(readSource(goldenPath).trimEnd());
  });
});
