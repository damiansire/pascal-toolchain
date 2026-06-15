# Pascal Code Formatter

[![npm version](https://badge.fury.io/js/pascal-code-formatter.svg)](https://badge.fury.io/js/pascal-code-formatter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple formatter for tokenized Pascal code, designed to organize tokens into structured lines with indentation information (indentation functionality still needs to be fully implemented).

## Installation

You can install this package using npm:

```bash
npm install pascal-code-formatter
```

<!-- Or using yarn -->
<!-- yarn add pascal-code-formatter -->

## Usage

Pass your Pascal code as a string to the formatPascalCode function. The function handles the tokenization internally.

```typescript
import { formatPascalCode, FormattedPascalLine } from "pascal-code-formatter";

// Example Pascal code as a string
const pascalCode: string = `
program HelloWorld;
begin
  WriteLn('Hello, World!');
end.
`;

// Format the code string into lines
const formattedLines: FormattedPascalLine[] = formatPascalCode(pascalCode);

// The result will be an array of FormattedPascalLine objects
console.log(formattedLines);
/*
[
  {
    tokens: [
      { type: 'KEYWORD', value: 'program' },
      { type: 'IDENTIFIER', value: 'HelloWorld' },
      { type: 'SYMBOL', value: ';' }
    ],
    indentation: 0 // Indentation is not yet calculated
  },
  {
    tokens: [ { type: 'KEYWORD', value: 'begin' } ],
    indentation: 0 // Indentation is not yet calculated
  },
  {
    tokens: [
      { type: 'IDENTIFIER', value: 'WriteLn' },
      { type: 'SYMBOL', value: '(' },
      { type: 'STRING_LITERAL', value: "'Hello, World!'" },
      { type: 'SYMBOL', value: ')' },
      { type: 'SYMBOL', value: ';' }
    ],
    indentation: 0 // Indentation is not yet calculated
  },
  {
    tokens: [ { type: 'KEYWORD', value: 'end' }, { type: 'SYMBOL', value: '.' } ],
    indentation: 0 // Indentation is not yet calculated
  }
]
*/

// And now... You can do anything you want, for example:
// Iterate over the lines to reconstruct the formatted code
formattedLines.forEach((line) => {
  const indent = " ".repeat(line.indentation * 2); // Example indentation (adjust as needed)
  const lineContent = line.tokens.map((token) => token.value).join(" ");
  console.log(indent + lineContent);
});
```

## API

### `formatPascalCode(code: string): FormattedPascalLine[]`

- **`code`**: A string containing the Pascal code to format. The function will handle tokenization internally.
- **Returns**: An array of `FormattedPascalLine` objects. Each object contains:
  - `tokens`: An array of `PascalToken` belonging to that line.
  - `indentation`: A number representing the indentation level for that line (currently always `0`, needs implementation).

### `FormattedPascalLine`

Interface describing the structure of each formatted line.

```typescript
interface FormattedPascalLine {
  tokens: PascalToken[];
  indentation: number;
}
```

### `PascalToken` and `TokenType`

These types are still exported for potential advanced use cases or type checking. They represent the structure of tokens generated internally. Consult the pascal-tokenizer documentation (or the source code) for more details on their structure if needed.

## Contributing

Contributions are welcome! If you find a bug or have a suggestion, please open an issue in the GitHub repository.

## License

MIT
