/**
 * Main entry point for the Pascal semantic analyzer: symbol table, scope
 * resolution and basic type checking over the AST produced by `pascal-parser`.
 * @module pascal-semantic-analyzer
 */
export * from './analyzer';
export * from './scope';
export * from './symbolTable';
export * from './typeChecker';
export * from './types';
