import * as fs from 'fs';
import * as path from 'path';
import { compile } from '../codegen';

/** Compiles a fixture .pas program, runs the JS, and returns everything logged. */
function runFixture(file: string): unknown[] {
    const source = fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8');
    const js = compile(source);
    const logged: unknown[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logged.push(args.length === 1 ? args[0] : args);
    });
    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        new Function(js)();
    } finally {
        spy.mockRestore();
    }
    return logged;
}

describe('real Pascal programs (fixtures) — compile and run', () => {
    it('fizzbuzz.pas — for loop + nested if/else + mod', () => {
        expect(runFixture('fizzbuzz.pas')).toEqual([
            1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz',
        ]);
    });

    it('gcd.pas — function + while loop (Euclid, subtractive)', () => {
        expect(runFixture('gcd.pas')).toEqual([6]);
    });

    it('fibonacci.pas — recursive function', () => {
        expect(runFixture('fibonacci.pas')).toEqual([55]);
    });

    it('grades.pas — case..of with else', () => {
        expect(runFixture('grades.pas')).toEqual(['ok']);
    });
});
