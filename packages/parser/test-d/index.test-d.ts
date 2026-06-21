import { expectType, expectError, expectAssignable } from "tsd";
import { parse, isValid } from "pascal-parser";
import type {
  Program,
  Statement,
  Expression,
  BinaryExpression,
  Identifier,
  ParseError,
} from "pascal-parser";

// parse(source) -> Program; isValid(source) -> boolean.
expectType<Program>(parse("program p; begin end."));
expectType<boolean>(isValid("program p; begin end."));

expectError(parse());
expectError(parse(123));
expectError(isValid(123));

// A Program exposes a typed AST root with a literal `type` discriminant.
const program = parse("program p; begin end.");
expectType<"Program">(program.type);

// AST node hierarchy: a BinaryExpression is assignable to Expression.
declare const bin: BinaryExpression;
expectAssignable<Expression>(bin);
declare const id: Identifier;
expectAssignable<Expression>(id);

// Statement and Expression both extend ASTNode and carry a `type` discriminant
// (a union of string literals, so each member is assignable to string).
declare const stmt: Statement;
expectAssignable<string>(stmt.type);

// ParseError is an Error subclass.
declare const err: ParseError;
expectAssignable<Error>(err);
