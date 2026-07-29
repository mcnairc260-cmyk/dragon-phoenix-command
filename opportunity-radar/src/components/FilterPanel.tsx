import { useState } from 'react';
import {
  CATEGORIES,
  type Category,
  type CompetitionLevel,
  type Difficulty,
  type GrowthVelocity,
  type LocationMode,
  type OpportunityType,
  type TimeWindow,
} from '../types/opportunity';
import { countActiveFilters, EMPTY_FILTERS, type FilterState } from '../lib/filters';

const OPPORTUNITY_TYPES: OpportunityType[] = ['Product', 'Service', 'Content', 'Marketplace', 'Consulting'];
const COMPETITION_LEVELS: CompetitionLevel[] = ['Low', 'Moderate', 'High'];
const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
const GROWTH_VELOCITIES: GrowthVelocity[] = ['Steady', 'Rising', 'Accelerating', 'Explosive'];
const TIME_WINDOWS: TimeWindow[] = ['Open now', 'Opening', 'Narrowing'];
const LOCATION_MODES: LocationMode[] = ['Remote', 'Local', 'Hybrid'];

const COST_OPTIONS = [
  { label: 'Any budget', value: null },
  { label: 'Under $1k', value: 1000 },
  { label: 'Under $5k', value: 5000 },
  { label: 'Under $10k', value: 10000 },
] as const;

const SCORE_OPTIONS = [
  { label: 'Any score', value: null },
  { label: '60+', value: 60 },
  { label: '70+', value: 70 },
  { label: '80+', value: 80 },
  { label: '90+', value: 90 },
] as const;

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function ChipGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(opt)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                active
                  ? 'border-gold bg-gold/25 text-ink'
                  : 'border-line text-body hover:border-line-strong hover:text-ink'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RadioRow<V extends number | null>({
  legend,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  options: readonly { label: string; value: V }[];
  selected: V;
  onSelect: (value: V) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(opt.value)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                active
                  ? 'border-gold bg-gold/25 text-ink'
                  : 'border-line text-body hover:border-line-strong hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterPanel({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="rounded-xl border border-line bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-bold">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold-ink">
              {activeCount} active
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-xs text-soft">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <ChipGroup<Category>
            legend="Industry"
            options={CATEGORIES}
            selected={filters.categories}
            onToggle={(v) => onChange({ ...filters, categories: toggleValue(filters.categories, v) })}
          />
          <ChipGroup<OpportunityType>
            legend="Opportunity type"
            options={OPPORTUNITY_TYPES}
            selected={filters.opportunityTypes}
            onToggle={(v) =>
              onChange({ ...filters, opportunityTypes: toggleValue(filters.opportunityTypes, v) })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ChipGroup<CompetitionLevel>
              legend="Competition"
              options={COMPETITION_LEVELS}
              selected={filters.competitionLevels}
              onToggle={(v) =>
                onChange({ ...filters, competitionLevels: toggleValue(filters.competitionLevels, v) })
              }
            />
            <ChipGroup<Difficulty>
              legend="Difficulty"
              options={DIFFICULTIES}
              selected={filters.difficulties}
              onToggle={(v) =>
                onChange({ ...filters, difficulties: toggleValue(filters.difficulties, v) })
              }
            />
            <ChipGroup<GrowthVelocity>
              legend="Growth velocity"
              options={GROWTH_VELOCITIES}
              selected={filters.growthVelocities}
              onToggle={(v) =>
                onChange({ ...filters, growthVelocities: toggleValue(filters.growthVelocities, v) })
              }
            />
            <ChipGroup<TimeWindow>
              legend="Time window"
              options={TIME_WINDOWS}
              selected={filters.timeWindows}
              onToggle={(v) =>
                onChange({ ...filters, timeWindows: toggleValue(filters.timeWindows, v) })
              }
            />
            <ChipGroup<LocationMode>
              legend="Location"
              options={LOCATION_MODES}
              selected={filters.locationModes}
              onToggle={(v) =>
                onChange({ ...filters, locationModes: toggleValue(filters.locationModes, v) })
              }
            />
            <RadioRow
              legend="Startup cost"
              options={COST_OPTIONS}
              selected={filters.maxStartupCost}
              onSelect={(v) => onChange({ ...filters, maxStartupCost: v })}
            />
            <RadioRow
              legend="Minimum score"
              options={SCORE_OPTIONS}
              selected={filters.minScore}
              onSelect={(v) => onChange({ ...filters, minScore: v })}
            />
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...EMPTY_FILTERS, search: filters.search })}
              className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:text-gold-ink"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
