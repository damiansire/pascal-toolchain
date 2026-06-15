import { CounterweightStack, CounterweightRule } from "counterweight-stack";
import { deepEqual } from "objects-deep-compare";
import { PascalToken } from "pascal-tokenizer";

const beginToken: PascalToken = { type: "KEYWORD", value: "begin" };
const endToken: PascalToken = { type: "KEYWORD", value: "end" };
const varToken: PascalToken = { type: "KEYWORD", value: "var" };

const rules: CounterweightRule<PascalToken>[] = [
  {
    mainElement: beginToken,
    counterweights: [endToken],
  },
  {
    mainElement: varToken,
    counterweights: [beginToken],
  },
];

class IdentationManager {
  private indentationStack: CounterweightStack<PascalToken>;
  constructor() {
    this.indentationStack = new CounterweightStack<PascalToken>(rules);
  }
  evaluateLineIndentation(tokens: PascalToken[]) {
    let currentIndent = this.indentationStack.size();
    for (const token of tokens) {
      const result = this.indentationStack.pop(token);
      if (result?.type === "KEYWORD") {
        if (result?.value === "var") {
          currentIndent = 0;
        }
      }
    }
    for (const token of tokens) {
      if (deepEqual(token, varToken) || deepEqual(token, beginToken)) {
        this.indentationStack.push(token);
      }
    }
    if (tokens.some((token) => deepEqual(token, endToken))) {
      currentIndent = this.indentationStack.size();
    }
    return currentIndent;
  }
}

export { IdentationManager };
