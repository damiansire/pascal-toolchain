/**
 * A lexical scope: a set of declared symbols plus a link to its enclosing scope.
 * Pascal nests scopes one level per subprogram (function/procedure) — there is no
 * block scoping inside `if`/`while`/`begin..end`, only `program` (global) and each
 * subprogram body get their own `Scope`.
 *
 * @module pascal-semantic-analyzer/scope
 */
import { SymbolEntry } from './types';

export type ScopeKind = 'global' | 'subprogram';

export class Scope {
  readonly kind: ScopeKind;
  /** The subprogram name for a `'subprogram'` scope; the program name for `'global'`. */
  readonly name: string;
  readonly parent: Scope | null;
  readonly children: Scope[] = [];
  private readonly symbols = new Map<string, SymbolEntry>();

  constructor(kind: ScopeKind, name: string, parent: Scope | null) {
    this.kind = kind;
    this.name = name;
    this.parent = parent;
  }

  /**
   * Declares a symbol in THIS scope. Pascal identifiers are case-insensitive, so
   * `x` and `X` collide. Returns the symbol already bound to that name if this is
   * a redeclaration (so the caller can turn it into a diagnostic) instead of
   * silently overwriting it; returns `null` on a fresh declaration.
   */
  declare(entry: SymbolEntry): SymbolEntry | null {
    const key = entry.name.toLowerCase();
    const existing = this.symbols.get(key);
    if (existing) return existing;
    this.symbols.set(key, entry);
    return null;
  }

  /** Looks up a name in this scope only, with no walk up to enclosing scopes. */
  resolveLocal(name: string): SymbolEntry | undefined {
    return this.symbols.get(name.toLowerCase());
  }

  /** Looks up a name in this scope, then each enclosing scope up to global. */
  resolve(name: string): SymbolEntry | undefined {
    return this.resolveLocal(name) ?? this.parent?.resolve(name);
  }

  /** Creates and registers a child scope for a nested subprogram. */
  createChild(name: string): Scope {
    const child = new Scope('subprogram', name, this);
    this.children.push(child);
    return child;
  }

  /** Symbols declared directly in this scope, not in children. Insertion order. */
  ownSymbols(): SymbolEntry[] {
    return Array.from(this.symbols.values());
  }
}
