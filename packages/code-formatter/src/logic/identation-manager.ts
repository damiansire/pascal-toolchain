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

/**
 * Pascal is case-insensitive, but the tokenizer preserves the source casing, so a
 * `VAR`/`Begin`/`END` token would never deep-equal the lower-case rule constants.
 * Canonicalize keyword values to lower-case before any comparison or stack op.
 */
const canonicalize = (token: PascalToken): PascalToken =>
  token.type === "KEYWORD" ? { ...token, value: token.value.toLowerCase() } : token;

class IdentationManager {
  private indentationStack: CounterweightStack<PascalToken>;
  constructor() {
    this.indentationStack = new CounterweightStack<PascalToken>(rules);
  }
  evaluateLineIndentation(tokens: PascalToken[]) {
    const canonical = tokens.map(canonicalize);
    let currentIndent = this.indentationStack.size();
    for (const token of canonical) {
      const result = this.indentationStack.pop(token);
      if (result?.type === "KEYWORD") {
        if (result?.value === "var") {
          currentIndent = 0;
        }
      }
    }
    for (const token of canonical) {
      if (deepEqual(token, varToken) || deepEqual(token, beginToken)) {
        this.indentationStack.push(token);
      }
    }
    if (canonical.some((token) => deepEqual(token, endToken))) {
      currentIndent = this.indentationStack.size();
    }
    return currentIndent;
  }
}

export { IdentationManager };
