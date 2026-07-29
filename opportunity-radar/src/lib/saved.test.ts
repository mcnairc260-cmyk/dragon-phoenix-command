import { describe, expect, it } from 'vitest';
import { LocalSavedStore, MemorySavedStore, toggleSaved } from './saved';

describe('toggleSaved', () => {
  it('adds an id that is not present', () => {
    expect(toggleSaved([], 'a')).toEqual(['a']);
    expect(toggleSaved(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes an id that is present', () => {
    expect(toggleSaved(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('does not mutate the input', () => {
    const input = ['a'];
    toggleSaved(input, 'b');
    expect(input).toEqual(['a']);
  });
});

describe('LocalSavedStore', () => {
  it('round-trips ids through localStorage', () => {
    const store = new LocalSavedStore();
    store.save(['op-1', 'op-2']);
    expect(store.load()).toEqual(['op-1', 'op-2']);
  });

  it('returns [] when nothing is stored', () => {
    expect(new LocalSavedStore().load()).toEqual([]);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('or:saved:v1', '{not json');
    expect(new LocalSavedStore().load()).toEqual([]);
    localStorage.setItem('or:saved:v1', '{"an":"object"}');
    expect(new LocalSavedStore().load()).toEqual([]);
    localStorage.setItem('or:saved:v1', '["ok", 42, "also-ok"]');
    expect(new LocalSavedStore().load()).toEqual(['ok', 'also-ok']);
  });
});

describe('MemorySavedStore', () => {
  it('round-trips without touching localStorage', () => {
    const store = new MemorySavedStore();
    store.save(['x']);
    expect(store.load()).toEqual(['x']);
    expect(localStorage.getItem('or:saved:v1')).toBeNull();
  });
});
