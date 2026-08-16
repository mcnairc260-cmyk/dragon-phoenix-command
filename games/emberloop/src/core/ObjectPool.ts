/**
 * Minimal object pool. Enemies, projectiles and pickups are recycled rather than
 * re-allocated, which keeps GC pauses out of the 60 FPS budget on phones.
 */
export class ObjectPool<T> {
  private readonly free: T[] = [];
  private readonly factory: () => T;
  private readonly reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void, prefill = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < prefill; i++) this.free.push(factory());
  }

  acquire(): T {
    const item = this.free.pop();
    return item ?? this.factory();
  }

  release(item: T): void {
    this.reset(item);
    this.free.push(item);
  }

  get size(): number {
    return this.free.length;
  }

  clear(): void {
    this.free.length = 0;
  }
}
