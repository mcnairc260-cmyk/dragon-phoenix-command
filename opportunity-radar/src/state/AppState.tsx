import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LocalSavedStore, toggleSaved, type SavedStore } from '../lib/saved';
import {
  LocalPreferencesStore,
  type PreferencesStore,
  type UserPreferences,
} from '../lib/preferences';

// ---------- Saved opportunities ----------

interface SavedContextValue {
  savedIds: string[];
  isSaved(id: string): boolean;
  toggle(id: string): void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

// ---------- Preferences ----------

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences(patch: Partial<UserPreferences>): void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// ---------- Recently viewed ----------

const RECENT_KEY = 'or:recent:v1';
const RECENT_LIMIT = 6;

interface RecentContextValue {
  recentIds: string[];
  recordView(id: string): void;
}

const RecentContext = createContext<RecentContextValue | null>(null);

// ---------- Toasts ----------

export interface ToastMessage {
  id: number;
  text: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast(text: string): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------- Provider ----------

interface AppStateProviderProps {
  children: ReactNode;
  savedStore?: SavedStore;
  preferencesStore?: PreferencesStore;
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function AppStateProvider({
  children,
  savedStore,
  preferencesStore,
}: AppStateProviderProps) {
  const saved = useRef<SavedStore>(savedStore ?? new LocalSavedStore());
  const prefsStore = useRef<PreferencesStore>(preferencesStore ?? new LocalPreferencesStore());

  const [savedIds, setSavedIds] = useState<string[]>(() => saved.current.load());
  const [preferences, setPreferences] = useState<UserPreferences>(() => prefsStore.current.load());
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const showToast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const toggle = useCallback((id: string) => {
    setSavedIds((ids) => {
      const next = toggleSaved(ids, id);
      saved.current.save(next);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      prefsStore.current.save(next);
      return next;
    });
  }, []);

  const recordView = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_LIMIT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable — recent list stays in memory.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = preferences.reducedMotion ? 'true' : 'false';
  }, [preferences.reducedMotion]);

  const savedValue = useMemo(() => ({ savedIds, isSaved, toggle }), [savedIds, isSaved, toggle]);
  const prefsValue = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences, updatePreferences],
  );
  const recentValue = useMemo(() => ({ recentIds, recordView }), [recentIds, recordView]);
  const toastValue = useMemo(() => ({ toasts, showToast }), [toasts, showToast]);

  return (
    <SavedContext.Provider value={savedValue}>
      <PreferencesContext.Provider value={prefsValue}>
        <RecentContext.Provider value={recentValue}>
          <ToastContext.Provider value={toastValue}>{children}</ToastContext.Provider>
        </RecentContext.Provider>
      </PreferencesContext.Provider>
    </SavedContext.Provider>
  );
}

function useRequired<T>(ctx: T | null, name: string): T {
  if (ctx === null) throw new Error(`${name} must be used inside <AppStateProvider>`);
  return ctx;
}

export function useSaved(): SavedContextValue {
  return useRequired(useContext(SavedContext), 'useSaved');
}

export function usePreferences(): PreferencesContextValue {
  return useRequired(useContext(PreferencesContext), 'usePreferences');
}

export function useRecent(): RecentContextValue {
  return useRequired(useContext(RecentContext), 'useRecent');
}

export function useToasts(): ToastContextValue {
  return useRequired(useContext(ToastContext), 'useToasts');
}
