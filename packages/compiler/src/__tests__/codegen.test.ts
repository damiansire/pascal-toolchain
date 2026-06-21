import { compile, generate } from '../codegen';
import type { Program } from 'pascal-parser';

/** Builds an AST loosely for unit tests without restating every field type. */
const ast = (node: unknown) => node as Program;

describe('pascal-js-compiler — end-to-end (compile)', () => {
    it('compiles a Hello World program to JS containing the writeln output', () => {
        const js = compile("program Hello; begin writeln('Hello, world!'); end.");
        expect(js).toContain('console.log("Hello, world!");');
    });

    it('the generated JS actually runs and prints the expected output', () => {
        const js = compile("program Hello; begin writeln('Hello, world!'); end.");
        const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        new Function(js)();
        expect(spy).toHaveBeenCalledWith('Hello, world!');
        spy.mockRestore();
    });

    it('re-quotes and escapes string literals correctly', () => {
        const js = compile("program P; begin writeln('it''s ok'); end.");
        expect(js).toContain(`console.log("it's ok");`);
    });
});

describe('pascal-js-compiler — code generation (generate)', () => {
    it('emits variable declarations and := assignments as JS', () => {
        const program = ast({
            type: 'Program',
            name: 'P',
            declarations: [{ type: 'VariableDeclaration', name: 'x', varType: 'integer' }],
            statements: [
                {
                    type: 'AssignmentStatement',
                    left: { type: 'Identifier', name: 'x' },
                    right: { type: 'NumericLiteral', value: 5 },
                },
            ],
        });
        const js = generate(program);
        expect(js).toContain('let x; // integer');
        expect(js).toContain('x = 5;');
    });

    it('maps Pascal operators (= -> ===) and emits if/else', () => {
        const program = ast({
            type: 'Program',
            name: 'P',
            declarations: [],
            statements: [
                {
                    type: 'IfStatement',
                    condition: {
                        type: 'BinaryExpression',
                        operator: '=',
                        left: { type: 'Identifier', name: 'n' },
                        right: { type: 'NumericLiteral', value: 0 },
                    },
                    thenBranch: {
                        type: 'CallStatement',
                        name: 'writeln',
                        arguments: [{ type: 'StringLiteral', value: 'zero' }],
                    },
                    elseBranch: {
                        type: 'CallStatement',
                        name: 'writeln',
                        arguments: [{ type: 'StringLiteral', value: 'nonzero' }],
                    },
                },
            ],
        });
        const js = generate(program);
        expect(js).toContain('if ((n === 0)) {');
        expect(js).toContain('} else {');
    });

    it('generates for..to and for..downto loops', () => {
        const make = (direction: 'to' | 'downto') =>
            ast({
                type: 'Program',
                name: 'P',
                declarations: [],
                statements: [
                    {
                        type: 'ForStatement',
                        variable: { type: 'Identifier', name: 'i' },
                        start: { type: 'NumericLiteral', value: 1 },
                        end: { type: 'NumericLiteral', value: 10 },
                        direction,
                        body: {
                            type: 'CallStatement',
                            name: 'writeln',
                            arguments: [{ type: 'Identifier', name: 'i' }],
                        },
                    },
                ],
            });
        // The bound is hoisted to a temp (evaluated once) and the declared control
        // variable is reused (no `let` shadow), matching Pascal `for` semantics.
        const to = generate(make('to'));
        expect(to).toContain('const $end0 = 10;');
        expect(to).toContain('for (i = 1; i <= $end0; i++) {');
        const down = generate(make('downto'));
        expect(down).toContain('const $end0 = 10;');
        expect(down).toContain('for (i = 1; i >= $end0; i--) {');
    });

    it('maps div to Math.trunc and emits while loops', () => {
        const program = ast({
            type: 'Program',
            name: 'P',
            declarations: [],
            statements: [
                {
                    type: 'WhileStatement',
                    condition: { type: 'BooleanLiteral', value: true },
                    body: {
                        type: 'AssignmentStatement',
                        left: { type: 'Identifier', name: 'x' },
                        right: {
                            type: 'BinaryExpression',
                            operator: 'div',
                            left: { type: 'Identifier', name: 'x' },
                            right: { type: 'NumericLiteral', value: 2 },
                        },
                    },
                },
            ],
        });
        const js = generate(program);
        expect(js).toContain('while (true) {');
        expect(js).toContain('Math.trunc(x / 2)');
    });

    it('concatenates multiple writeln arguments with Pascal semantics', () => {
        const program = ast({
            type: 'Program',
            name: 'P',
            declarations: [],
            statements: [
                {
                    type: 'CallStatement',
                    name: 'writeln',
                    arguments: [
                        { type: 'StringLiteral', value: 'n=' },
                        { type: 'Identifier', name: 'n' },
                    ],
                },
            ],
        });
        const js = generate(program);
        expect(js).toContain(`["n=", n].join('')`);
    });
});

describe('pascal-js-compiler — rejects unsupported features (error contract)', () => {
    it("rejects 'var' (by-reference) parameters loudly", () => {
        expect(() =>
            compile('program P; procedure r(var x: integer); begin x := 0; end; begin end.'),
        ).toThrow(/by-reference/);
    });

    it('rejects bitwise and/or over clearly-integer operands', () => {
        expect(() => compile('program P; var x: integer; begin x := 12 and 10; end.')).toThrow(
            /Bitwise 'and'/,
        );
        expect(() => compile('program P; var x: integer; begin x := 12 or 10; end.')).toThrow(
            /Bitwise 'or'/,
        );
    });

    it("rejects bitwise 'not' over a clearly-integer operand", () => {
        expect(() => compile('program P; var x: integer; begin x := not 0; end.')).toThrow(
            /Bitwise 'not'/,
        );
    });

    it('rejects unsupported AST declaration/statement/expression nodes', () => {
        expect(() =>
            generate(
                ast({ type: 'Program', name: 'P', declarations: [{ type: 'Nope' }], statements: [] }),
            ),
        ).toThrow(/Unsupported declaration/);
        expect(() =>
            generate(
                ast({ type: 'Program', name: 'P', declarations: [], statements: [{ type: 'Nope' }] }),
            ),
        ).toThrow(/Unsupported statement/);
    });

    it('rejects unknown binary/unary operators', () => {
        expect(() =>
            generate(
                ast({
                    type: 'Program',
                    name: 'P',
                    declarations: [],
                    statements: [
                        {
                            type: 'AssignmentStatement',
                            left: { type: 'Identifier', name: 'x' },
                            right: {
                                type: 'BinaryExpression',
                                operator: '???',
                                left: { type: 'Identifier', name: 'a' },
                                right: { type: 'Identifier', name: 'b' },
                            },
                        },
                    ],
                }),
            ),
        ).toThrow(/Unknown binary operator/);
    });

    it('rejects builtins called with the wrong arity', () => {
        expect(() => compile('program P; var x: integer; begin x := abs(); end.')).toThrow(
            /expects exactly 1 argument/,
        );
        expect(() => compile('program P; var x: integer; begin x := abs(1, 2); end.')).toThrow(
            /expects exactly 1 argument/,
        );
    });
});

describe('pascal-js-compiler — builtins do not shadow user subprograms (Pascal case-insensitive)', () => {
    it('routes a user function named Abs to the user definition, not Math.abs', () => {
        const js = compile(
            'program P; function Abs(n: integer): integer; begin Abs := n + 100; end; begin writeln(abs(1)); end.',
        );
        expect(js).not.toContain('Math.abs');
        expect(js).toContain('abs(1)');
        const logged: unknown[] = [];
        const spy = jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
            logged.push(a[0]);
        });
        try {
            new Function(js)();
        } finally {
            spy.mockRestore();
        }
        expect(logged).toEqual([101]);
    });

    it('routes a user procedure named INC to the user definition, not x += 1', () => {
        const js = compile(
            "program P; procedure Inc(n: integer); begin writeln('called'); end; begin inc(5); end.",
        );
        expect(js).not.toMatch(/\+=/);
        expect(js).toContain('inc(5);');
    });
});

describe('pascal-js-compiler — case-insensitive identifiers resolve to one variable', () => {
    it('treats Total and total as the same symbol', () => {
        const js = compile('program P; var Total: integer; begin Total := 5; writeln(total); end.');
        const logged: unknown[] = [];
        const spy = jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
            logged.push(a[0]);
        });
        try {
            new Function(js)();
        } finally {
            spy.mockRestore();
        }
        expect(logged).toEqual([5]);
    });
});

describe('pascal-js-compiler — for-loop evaluates its bound exactly once', () => {
    it('does not re-evaluate a bound whose inputs the body mutates', () => {
        // n starts at 3; the body increments n. A Pascal `for` evaluates the upper
        // bound once, so the loop runs exactly 3 times (i = 1..3). Re-evaluating it
        // each iteration would never terminate / run a different count.
        const logged: unknown[] = [];
        const js = compile(`
program BoundOnce;
var i, n, count: integer;
begin
    n := 3;
    count := 0;
    for i := 1 to n do
    begin
        count := count + 1;
        n := n + 1;
    end;
    writeln(count);
end.`);
        const spy = jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
            logged.push(a[0]);
        });
        try {
            new Function(js)();
        } finally {
            spy.mockRestore();
        }
        expect(logged).toEqual([3]);
    });

    it('leaves the control variable accessible after the loop (no let shadow)', () => {
        const js = compile(`
program PostLoop;
var i, sum: integer;
begin
    sum := 0;
    for i := 1 to 3 do
        sum := sum + i;
    writeln(i);
end.`);
        // The control variable is reused, not re-declared with `let` inside the loop.
        expect(js).not.toMatch(/for \(let /);
    });
});
