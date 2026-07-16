// Area: fuzzing (property-based, fast-check). The parser's crash contract:
// for ANY input string, the public API either returns an AST or throws a
// typed diagnostic (ParseError / TokenizeError). Anything else escaping —
// TypeError, RangeError, infinite loop — is a bug, and these properties are
// the net that catches it. Three input distributions are used: arbitrary
// unicode noise, Pascal-flavored token soup (much more likely to reach deep
// parser states), and mutated valid programs (near-misses).
import fc from 'fast-check';
import { parse, parseWithRecovery, isValid } from '../parser';
import { TokenizeError } from 'pascal-tokenizer';
import { ParseError } from '../types';

// CI runs on three Node versions; keep the budget moderate per property.
const NUM_RUNS = 300;

/** Asserts the crash contract: parse(input) returns or throws a typed diagnostic. */
function parseNeverCrashes(input: string): void {
  try {
    parse(input);
  } catch (e) {
    if (!(e instanceof ParseError) && !(e instanceof TokenizeError)) {
      throw new Error(
        `parse() leaked a non-diagnostic exception for input ${JSON.stringify(input)}: ${String(e)}`,
      );
    }
  }
}

// --- Pascal-flavored generators ---------------------------------------------
// Random unicode rarely gets past the tokenizer; a token-soup generator drives
// the fuzzer into the parser itself (declarations, statements, expressions).

const pascalWord = fc.constantFrom(
  'program',
  'var',
  'const',
  'begin',
  'end',
  'if',
  'then',
  'else',
  'while',
  'do',
  'for',
  'to',
  'downto',
  'repeat',
  'until',
  'case',
  'of',
  'function',
  'procedure',
  'array',
  'integer',
  'real',
  'boolean',
  'string',
  'div',
  'mod',
  'and',
  'or',
  'not',
  'true',
  'false',
  'x',
  'y',
  'foo',
  'writeln',
);

const pascalSymbol = fc.constantFrom(
  ':=',
  ';',
  ':',
  ',',
  '.',
  '..',
  '(',
  ')',
  '[',
  ']',
  '+',
  '-',
  '*',
  '/',
  '=',
  '<>',
  '<',
  '>',
  '<=',
  '>=',
  "'",
  "'lit'",
  '{',
  '}',
  '0',
  '42',
  '3.14',
);

const tokenSoup = fc
  .array(fc.oneof(pascalWord, pascalSymbol), { maxLength: 60 })
  .map((parts) => parts.join(' '));

/** Generates a syntactically valid program, to be mutated into near-misses. */
const validProgram = fc
  .record({
    name: fc.constantFrom('P', 'Demo', 'Fuzzed'),
    varName: fc.constantFrom('x', 'total', 'i'),
    value: fc.integer({ min: -1000, max: 1000 }),
    loops: fc.boolean(),
  })
  .map(
    ({ name, varName, value, loops }) =>
      `program ${name};\nvar ${varName}: integer;\nbegin\n  ${varName} := ${value};\n` +
      (loops ? `  while ${varName} > 0 do ${varName} := ${varName} - 1;\n` : '') +
      `  writeln(${varName});\nend.`,
  );

/** Mutates a valid program: deletes, duplicates, or injects a character. */
const mutatedProgram = fc
  .tuple(
    validProgram,
    fc.nat(),
    fc.constantFrom('delete', 'duplicate', 'inject'),
    fc.string({ minLength: 1, maxLength: 1 }),
  )
  .map(([source, position, kind, injected]) => {
    const at = source.length === 0 ? 0 : position % source.length;
    if (kind === 'delete') return source.slice(0, at) + source.slice(at + 1);
    if (kind === 'duplicate') return source.slice(0, at + 1) + source.slice(at);
    return source.slice(0, at) + injected + source.slice(at);
  });

// --- properties --------------------------------------------------------------

describe('fuzz: parse() never crashes (only typed diagnostics escape)', () => {
  it('holds for arbitrary unicode strings', () => {
    fc.assert(fc.property(fc.string({ unit: 'binary', maxLength: 200 }), parseNeverCrashes), {
      numRuns: NUM_RUNS,
    });
  });

  it('holds for Pascal-flavored token soup', () => {
    fc.assert(fc.property(tokenSoup, parseNeverCrashes), { numRuns: NUM_RUNS });
  });

  it('holds for mutated valid programs (near-misses)', () => {
    fc.assert(fc.property(mutatedProgram, parseNeverCrashes), { numRuns: NUM_RUNS });
  });
});

describe('fuzz: parseWithRecovery() returns diagnostics as values', () => {
  it('never crashes, and every collected error is a ParseError', () => {
    fc.assert(
      fc.property(fc.oneof(tokenSoup, mutatedProgram), (input) => {
        let result;
        try {
          result = parseWithRecovery(input);
        } catch (e) {
          // Recovery only covers statement lists; header/declaration/lexical
          // errors still throw, but always as typed diagnostics.
          expect(e instanceof ParseError || e instanceof TokenizeError).toBe(true);
          return;
        }
        expect(result.program.type).toBe('Program');
        for (const error of result.errors) {
          expect(error).toBeInstanceOf(ParseError);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('fuzz: isValid() is total', () => {
  it('returns a boolean for any input, never throws', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ unit: 'binary', maxLength: 200 }), tokenSoup, mutatedProgram),
        (input) => {
          expect(typeof isValid(input)).toBe('boolean');
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('fuzz: generated-valid programs parse successfully', () => {
  it('every program from the valid generator is accepted', () => {
    fc.assert(
      fc.property(validProgram, (source) => {
        const ast = parse(source);
        expect(ast.type).toBe('Program');
        expect(isValid(source)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
