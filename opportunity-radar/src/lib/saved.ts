const STORAGE_KEY = 'or:saved:v1';

/**
 * Persistence seam for saved opportunities.
 * The MVP ships LocalSavedStore; a database-backed store implements the same
 * interface once accounts exist (see docs/OPPORTUNITY_RADAR_MVP.md).
 */
export interface SavedStore {
  load(): string[];
  save(ids: string[]): void;
}

export class LocalSavedStore implements SavedStore {
  load(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  save(ids: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Storage unavailable — saved state stays in memory for the session.
    }
  }
}

export class MemorySavedStore implements SavedStore {
  private ids: string[] = [];
  load(): string[] {
    return [...this.ids];
  }
  save(ids: string[]): void {
    this.ids = [...ids];
  }
}

export function toggleSaved(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
