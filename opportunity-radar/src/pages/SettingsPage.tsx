import { CATEGORIES, type Category } from '../types/opportunity';
import type { ExperienceLevel, RiskTolerance } from '../lib/preferences';
import { usePreferences, useToasts } from '../state/AppState';

const BUDGET_OPTIONS = [
  { label: 'Any budget', value: null },
  { label: 'Up to $1k', value: 1000 },
  { label: 'Up to $5k', value: 5000 },
  { label: 'Up to $10k', value: 10000 },
  { label: 'Up to $25k', value: 25000 },
] as const;

const EXPERIENCE_OPTIONS: { label: string; value: ExperienceLevel }[] = [
  { label: 'Beginner — first venture', value: 'beginner' },
  { label: 'Intermediate — built things before', value: 'intermediate' },
  { label: 'Advanced — serial operator', value: 'advanced' },
];

const RISK_OPTIONS: { label: string; value: RiskTolerance }[] = [
  { label: 'Low — steady and proven', value: 'low' },
  { label: 'Medium — balanced', value: 'medium' },
  { label: 'High — early and unproven is fine', value: 'high' },
];

/**
 * Stitch settings layout: a description column on the left, the controls
 * card on the right (stacks to one column below `lg`).
 */
function SettingsSection({
  title,
  description,
  children,
  danger = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-8">
      <div>
        <h2
          className={`text-base font-bold tracking-tight ${danger ? 'text-danger' : 'text-ash'}`}
        >
          {title}
        </h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-body">{description}</p>}
      </div>
      <div className="rounded-2xl bg-surface p-5 shadow-card">{children}</div>
    </section>
  );
}

/** Accessible switch styled as the Stitch toggle. */
function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ash">{label}</span>
        <span className="block text-xs leading-relaxed text-muted">{hint}</span>
      </span>
      <span className="relative flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="block h-6 w-11 rounded-full bg-line-strong transition-colors peer-checked:bg-gold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-surface transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const { preferences, updatePreferences } = usePreferences();
  const { showToast } = useToasts();

  const toggleCategory = (category: Category) => {
    const list = preferences.preferredCategories;
    updatePreferences({
      preferredCategories: list.includes(category)
        ? list.filter((c) => c !== category)
        : [...list, category],
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ash">Settings</h1>
        <p className="mt-1 text-sm text-body">
          Preferences are stored locally in this browser and shape your “Best fit” sorting and
          recommendations immediately.
        </p>
      </header>

      <div className="space-y-10">
        <SettingsSection title="Personal profile" description="Manage how the radar addresses you.">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">Display name</span>
            <input
              type="text"
              value={preferences.displayName}
              onChange={(e) => updatePreferences({ displayName: e.target.value })}
              placeholder="How should the radar greet you?"
              maxLength={40}
              className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ash placeholder:text-faint focus:border-gold focus:outline-none"
            />
          </label>
          <p className="mt-2 text-[10px] font-medium text-muted">
            Account email & password arrive with authentication (not yet enabled in this demo).
          </p>
        </SettingsSection>

        <SettingsSection
          title="Opportunity interests"
          description="Pick the industries you want weighted toward the top of your radar."
        >
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => {
              const active = preferences.preferredCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? 'border-gold bg-gold/25 text-ash'
                      : 'border-line text-body hover:border-line-strong hover:text-ash'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Budget, experience & risk"
          description="These drive the “Best fit for you” sort and the recommended section."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ash">Budget range</span>
              <select
                value={preferences.maxBudgetUsd ?? ''}
                onChange={(e) =>
                  updatePreferences({
                    maxBudgetUsd: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ash focus:border-gold focus:outline-none"
              >
                {BUDGET_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value ?? ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ash">Experience level</span>
              <select
                value={preferences.experienceLevel}
                onChange={(e) =>
                  updatePreferences({ experienceLevel: e.target.value as ExperienceLevel })
                }
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ash focus:border-gold focus:outline-none"
              >
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ash">Risk tolerance</span>
              <select
                value={preferences.riskTolerance}
                onChange={(e) =>
                  updatePreferences({ riskTolerance: e.target.value as RiskTolerance })
                }
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ash focus:border-gold focus:outline-none"
              >
                {RISK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Notification preferences"
          description="Stored now, delivered later — email alerts require accounts, which aren't live in this demo."
        >
          <div className="divide-y divide-line">
            <Toggle
              checked={preferences.emailAlerts}
              onChange={(emailAlerts) => updatePreferences({ emailAlerts })}
              label="New opportunity alerts"
              hint="Notify me when a high-fit opportunity appears on the radar."
            />
            <Toggle
              checked={preferences.weeklyDigest}
              onChange={(weeklyDigest) => updatePreferences({ weeklyDigest })}
              label="Weekly summary"
              hint="A consolidated report of everything that moved during the week."
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Subscription"
          description="You're on the Free demo tier. Billing isn't live yet — paid tiers currently open a waitlist."
        >
          <a
            href="/pricing"
            className="inline-block rounded-lg border border-line-strong px-4 py-2 text-sm font-bold text-ash hover:border-gold hover:text-gold"
          >
            View plans
          </a>
        </SettingsSection>

        <SettingsSection
          title="Appearance"
          description="Opportunity Radar follows the approved light design system. A dark theme is on the roadmap."
        >
          <Toggle
            checked={preferences.reducedMotion}
            onChange={(reducedMotion) => updatePreferences({ reducedMotion })}
            label="Reduce motion"
            hint="Minimize animations and transitions across the app."
          />
        </SettingsSection>

        <SettingsSection
          title="Danger zone"
          description="Everything you see here lives in your browser's local storage. Nothing is sent to a server, and there is no tracking or analytics in this MVP."
          danger
        >
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem('or:preferences:v1');
                localStorage.removeItem('or:saved:v1');
                localStorage.removeItem('or:recent:v1');
              } catch {
                // Storage unavailable — nothing to clear.
              }
              showToast('Local data cleared — reloading');
              setTimeout(() => window.location.reload(), 800);
            }}
            className="rounded-lg border border-danger/40 px-4 py-2 text-sm font-bold text-danger hover:bg-danger/10"
          >
            Clear all local data
          </button>
        </SettingsSection>
      </div>
    </div>
  );
}
