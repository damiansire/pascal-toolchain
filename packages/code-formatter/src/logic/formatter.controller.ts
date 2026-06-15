import { PascalToken } from "pascal-tokenizer";
import { InternalFormattedPascalLine } from "../shared/types";
import { EmptyLine, WhiteSpace } from "../shared/elements";
import { IdentationManager } from "./identation-manager";
import { isEndOfLine, needWhiteSpace } from "../shared/libs";

class FormatterController {
  private currentLineTokens: PascalToken[];
  private formattedLines: InternalFormattedPascalLine[];
  private indentationManager: IdentationManager;

  constructor(tokens: PascalToken[]) {
    this.currentLineTokens = [];
    this.formattedLines = [];
    this.indentationManager = new IdentationManager();

    for (let index = 0; index < tokens.length; index++) {
      const prevToken = tokens[index - 1];
      const currentToken = tokens[index];
      const nextToken = tokens[index + 1];
      this.processToken(prevToken, currentToken, nextToken);
    }
  }

  private processToken(prevToken: PascalToken, currentToken: PascalToken, nextToken: PascalToken) {
    this.addTokenToCurrentLine(currentToken);

    const addWhiteSpace = needWhiteSpace(currentToken, nextToken);
    if (addWhiteSpace) {
      this.addWhiteSpace();
    }

    const finishLine = isEndOfLine(currentToken, nextToken)
    if (finishLine) {
      this.finalizeLine();
    }
  }

  private addTokenToCurrentLine(token: PascalToken): void {
    this.currentLineTokens.push(token);
  }

  private finalizeLine(): void {
    if (this.currentLineTokens.length > 0) {
      const deepLine = this.indentationManager.evaluateLineIndentation(this.currentLineTokens);
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
