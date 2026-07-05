import { FormatPascalCodeOptions, FormattedPascalLine } from './shared/types';
import { PascalFormatter } from './logic/pascal-formatter';

/**
 * Token-stream formatter: returns the program as structured `FormattedPascalLine[]`
 * (per-line tokens + indentation + line/structural classification), for callers that
 * want to inspect or drive UI off the line structure. It derives structure from the
 * token stream heuristically.
 *
 * If you just want clean, re-parseable Pascal **text**, prefer `formatPascalSource`,
 * which pretty-prints the parser's AST (exact classification, precedence-aware). The two
 * coexist on purpose: different output shapes for different needs.
 */
const formatPascalCode = (
  code: string,
  options: FormatPascalCodeOptions = { ignoreEOF: true },
): FormattedPascalLine[] => {
  const pascalFormatter = new PascalFormatter(code, options);
  return pascalFormatter.format();
};

export { formatPascalCode };
