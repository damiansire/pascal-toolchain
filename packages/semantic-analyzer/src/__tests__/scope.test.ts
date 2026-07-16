import { Scope } from '../scope';
import { SymbolEntry } from '../types';

function sym(name: string, kind: SymbolEntry['kind'] = 'variable'): SymbolEntry {
  return { name, kind, type: 'integer' };
}

describe('Scope', () => {
  it('declares a fresh symbol and returns null', () => {
    const scope = new Scope('global', 'Program', null);
    expect(scope.declare(sym('x'))).toBeNull();
    expect(scope.resolveLocal('x')).toEqual(sym('x'));
  });

  it('reports a redeclaration by returning the existing entry', () => {
    const scope = new Scope('global', 'Program', null);
    scope.declare(sym('x'));
    const existing = scope.declare(sym('x'));
    expect(existing).toEqual(sym('x'));
  });

  it('is case-insensitive: X and x collide', () => {
    const scope = new Scope('global', 'Program', null);
    scope.declare(sym('Total'));
    expect(scope.declare(sym('TOTAL'))).not.toBeNull();
    expect(scope.resolveLocal('total')).toBeDefined();
  });

  it('resolveLocal does not see parent-scope symbols', () => {
    const parent = new Scope('global', 'Program', null);
    parent.declare(sym('outer'));
    const child = parent.createChild('Inner');
    expect(child.resolveLocal('outer')).toBeUndefined();
  });

  it('resolve walks up through parent scopes', () => {
    const parent = new Scope('global', 'Program', null);
    parent.declare(sym('outer'));
    const child = parent.createChild('Inner');
    child.declare(sym('inner'));
    expect(child.resolve('outer')).toBeDefined();
    expect(child.resolve('inner')).toBeDefined();
    expect(parent.resolve('inner')).toBeUndefined();
  });

  it('a child symbol shadows a same-named parent symbol without mutating the parent', () => {
    const parent = new Scope('global', 'Program', null);
    parent.declare({ name: 'x', kind: 'variable', type: 'integer' });
    const child = parent.createChild('Inner');
    child.declare({ name: 'x', kind: 'variable', type: 'string' });

    expect(child.resolve('x')?.type).toBe('string');
    expect(parent.resolve('x')?.type).toBe('integer');
  });

  it('resolve on an undeclared name at global scope returns undefined', () => {
    const scope = new Scope('global', 'Program', null);
    expect(scope.resolve('nope')).toBeUndefined();
  });

  it('createChild registers the child in .children and links .parent back', () => {
    const parent = new Scope('global', 'Program', null);
    const child = parent.createChild('Foo');
    expect(parent.children).toContain(child);
    expect(child.parent).toBe(parent);
    expect(child.kind).toBe('subprogram');
  });

  it('ownSymbols lists only symbols declared directly in that scope', () => {
    const parent = new Scope('global', 'Program', null);
    parent.declare(sym('a'));
    const child = parent.createChild('Inner');
    child.declare(sym('b'));
    expect(parent.ownSymbols().map((s) => s.name)).toEqual(['a']);
    expect(child.ownSymbols().map((s) => s.name)).toEqual(['b']);
  });
});
