import { tokenizePascal } from 'pascal-tokenizer';
import {
  FormatPascalCodeOptions,
  FormattedPascalLine,
  InternalFormattedPascalLine,
  StructuralType,
} from '../shared/types';
import { FormatterController } from './formatter.controller';
import { cleanTokens, getLineType, getStructuralType, needAddEmptyLine } from '../shared/libs';
import { CounterweightStack } from 'counterweight-stack';
import { EmptyLine, StructuralElementsWeightRules } from '../shared/elements';
class PascalFormatter {
  private options: FormatPascalCodeOptions;
  private formatterController: FormatterController;
  private cleanFormattedLines: FormattedPascalLine[] = [];
  private stackHistory: CounterweightStack<StructuralType>;

  constructor(
    private code: string,
    options: FormatPascalCodeOptions,
  ) {
    this.options = options;
    let tokens = tokenizePascal(this.code, false);
    if (this.options.ignoreEOF) {
      tokens = tokens.filter((x) => x.type !== 'EOF');
    }
    const cleanedTokens = cleanTokens(tokens);
    this.formatterController = new FormatterController(cleanedTokens);
    this.stackHistory = new CounterweightStack(StructuralElementsWeightRules);
  }

  format(): FormattedPascalLine[] {
    const formattedLines = this.formatterController.getFormattedLines();
    if (formattedLines.length === 0) {
      return [];
    }

    const firstLine = formattedLines[0];
    if (firstLine === undefined) {
      return [];
    }
    const newLine = this.convertToFormattedLine(firstLine);
    this.addToFormattedLine(newLine);

    for (let index = 1; index < formattedLines.length; index++) {
      const internalLine = formattedLines[index];
      if (internalLine === undefined) continue; // unreachable given the bound; satisfies the checker
      const prevLine = this.cleanFormattedLines.at(-1);
      const currentLine = this.convertToFormattedLine(internalLine);

      const addEmptyLine = needAddEmptyLine(prevLine, currentLine);
      if (addEmptyLine) {
        this.addToFormattedLine(EmptyLine);
      }

      this.addToFormattedLine(currentLine);
    }

    return this.cleanFormattedLines;
  }

  convertToFormattedLine(internalFormattedLine: InternalFormattedPascalLine): FormattedPascalLine {
    const lineType = getLineType(internalFormattedLine.tokens);
    const structuralType = getStructuralType(lineType, this.stackHistory);
    return {
      tokens: internalFormattedLine.tokens,
      indentation: internalFormattedLine.indentation,
      type: lineType,
      structuralType: structuralType,
    };
  }

  addToFormattedLine(formattedLine: FormattedPascalLine) {
    this.cleanFormattedLines.push(formattedLine);
    this.stackHistory.push(formattedLine.structuralType);
  }
}

export { PascalFormatter };
