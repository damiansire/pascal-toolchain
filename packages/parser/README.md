# Pascal Parser

A TypeScript library for parsing Pascal language code into an Abstract Syntax Tree (AST). This library implements a recursive descent parser that converts Pascal source code into a structured representation following the language's formal grammar.

## Features

- **Lexical Analysis**: Tokenizes Pascal source code into a stream of tokens
- **Syntax Analysis**: Parses tokens into an Abstract Syntax Tree (AST)
- **Error Handling**: Detailed error reporting with source locations
- **TypeScript Support**: Full type definitions for all AST nodes
- **Comprehensive Testing**: Extensive test coverage for grammar rules
- **Well-documented API**: Detailed documentation with examples

## Installation

```bash
npm install pascal-parser
```

## Usage

```typescript
import { parse, ParseError } from 'pascal-parser';

// Parse a simple Pascal program
const pascalCode = `
program HelloWorld;
var
  x: integer;
begin
  x := 5 + 2;
  writeln(x);
end.
`;

try {
  const ast = parse(pascalCode);
  console.log(JSON.stringify(ast, null, 2));
} catch (error) {
  if (error instanceof ParseError) {
    console.error(`Parse error at line ${error.location?.start.line}: ${error.message}`);
  }
}
```

## AST Structure

The parser generates an Abstract Syntax Tree (AST) that represents the structural elements of Pascal code. Here's an example of how a simple assignment statement is represented:

```typescript
// For the code: x := 5 + 2;
{
  type: 'AssignmentStatement',
  location: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 12, offset: 11 }
  },
  left: {
    type: 'Identifier',
    name: 'x'
  },
  right: {
    type: 'BinaryExpression',
    operator: '+',
    left: {
      type: 'NumericLiteral',
      value: 5
    },
    right: {
      type: 'NumericLiteral',
      value: 2
    }
  }
}
```

### Supported AST Nodes

The parser supports the following Pascal language constructs:

- Program declarations
- Variable declarations
- Function and procedure declarations
- Assignment statements
- If statements
- While loops
- For loops
- Procedure calls
- Binary expressions
- Numeric and string literals
- Identifiers

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pascal-parser.git
cd pascal-parser
```

2. Install dependencies:
```bash
npm install
```

### Available Scripts

- `npm run build` - Build the library
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run docs` - Generate documentation

## Grammar Implementation

The parser implements Pascal's grammar using a recursive descent approach. The grammar is based on the following key constructs:

```
Program ::= 'program' Identifier ';' Block '.'
Block ::= [DeclarationSection] StatementSection
DeclarationSection ::= 'var' VariableDeclaration+
StatementSection ::= 'begin' Statement+ 'end'
Statement ::= AssignmentStatement | IfStatement | WhileStatement | ForStatement | CallStatement
```

For a complete grammar specification, see the [Grammar Documentation](docs/grammar.md).

## Error Handling

The parser provides detailed error reporting:

```typescript
try {
  parse('program Test; begin x := ; end.');
} catch (error) {
  if (error instanceof ParseError) {
    console.error(`Parse error at line ${error.location?.start.line}: ${error.message}`);
    // Output: Parse error at line 1: Expected expression after assignment operator
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 