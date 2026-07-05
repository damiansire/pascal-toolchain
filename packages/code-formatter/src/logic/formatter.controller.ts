import { PascalToken } from 'pascal-tokenizer';
import { FormatterToken, InternalFormattedPascalLine } from '../shared/types';
import { WhiteSpace } from '../shared/elements';
import { IndentationTracker } from './indentation-tracker';
import { isEndOfLine, needWhiteSpace } from '../shared/libs';

class FormatterController {
  private currentLineTokens: FormatterToken[];
  private formattedLines: InternalFormattedPascalLine[];
  private indentationTracker: IndentationTracker;

  constructor(tokens: PascalToken[]) {
    this.currentLineTokens = [];
    this.formattedLines = [];
    this.indentationTracker = new IndentationTracker();

    for (let index = 0; index < tokens.length; index++) {
      const currentToken = tokens[index];
      if (currentToken === undefined) continue; // unreachable given the bound; satisfies the checker
      const nextToken = tokens[index + 1]; // undefined at the last token (no lookahead)
      this.processToken(currentToken, nextToken);
    }
  }

  private processToken(currentToken: PascalToken, nextToken: PascalToken | undefined) {
    this.addTokenToCurrentLine(currentToken);

    const finishLine = isEndOfLine(currentToken, nextToken);
    // Only separate from the next token when it stays on this line; a token that ends
    // the line must not carry a trailing whitespace marker.
    if (!finishLine && needWhiteSpace(currentToken, nextToken)) {
      this.addWhiteSpace();
    }

    if (finishLine) {
      this.finalizeLine();
    }
  }

  private addTokenToCurrentLine(token: PascalToken): void {
    this.currentLineTokens.push(token);
  }

  private finalizeLine(): void {
    if (this.currentLineTokens.length > 0) {
      const deepLine = this.indentationTracker.indentationForLine(this.currentLineTokens);
      this.formattedLines.push({
        tokens: [...this.currentLineTokens],
        indentation: deepLine,
      });
      this.currentLineTokens = [];
    }
  }

  private addWhiteSpace() {
    this.currentLineTokens.push(WhiteSpace);
  }

  public getFormattedLines(): InternalFormattedPascalLine[] {
    return this.formattedLines;
  }
}

export { FormatterController };
