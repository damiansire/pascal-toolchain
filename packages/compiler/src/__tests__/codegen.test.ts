import { compile, generate } from '../codegen';

/** Builds an AST loosely for unit tests without restating every field type. */
const ast = (node: unknown) => node as any;

describe('pascal-js-compiler — end-to-end (compile)', () => {
    it('compiles a Hello World program to JS containing the writeln output', () => {
        const js = compile("program Hello; begin writeln('Hello, world!'); end.");
        expect(js).toContain('console.log("Hello, world!");');
    });

    it('the generated JS actually runs and prints the expected output', () => {
        const js = compile("program Hello; begin writeln('Hello, world!'); end.");
        const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
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
        expect(generate(make('to'))).toContain('for (let i = 1; i <= 10; i++) {');
        expect(generate(make('downto'))).toContain('for (let i = 1; i >= 10; i--) {');
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
