import { SORT_OPTIONS, type SortKey } from '../lib/filters';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search opportunities…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1">
      <span aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-soft">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search opportunities"
        className="w-full rounded-lg border border-line bg-card py-2.5 pr-3 pl-9 text-sm text-ink placeholder:text-faint focus:border-ink focus:outline-none"
      />
    </div>
  );
}

export function SortControl({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (key: SortKey) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-medium tracking-[0.14em] whitespace-nowrap text-soft uppercase">
        Sort by
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
