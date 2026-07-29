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

function SettingsSection({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-ember uppercase">// {label}</p>
      <h2 className="mb-1 font-display text-base font-bold">{title}</h2>
      {description && <p className="mb-4 text-sm text-muted">{description}</p>}
      <div className={description ? '' : 'mt-4'}>{children}</div>
    </section>
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
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="font-mono text-[10px] tracking-[0.24em] text-ember uppercase">// Control room</p>
        <h1 className="font-display text-2xl font-extrabold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Preferences are stored locally in this browser and shape your “Best fit” sorting and
          recommendations immediately.
        </p>
      </header>

      <div className="space-y-5">
        <SettingsSection label="Profile" title="Profile information">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">Display name</span>
            <input
              type="text"
              value={preferences.displayName}
              onChange={(e) => updatePreferences({ displayName: e.target.value })}
              placeholder="How should the radar greet you?"
              maxLength={40}
              className="w-full max-w-sm rounded-lg border border-line bg-void px-3 py-2.5 text-sm text-ash placeholder:text-smoke focus:border-gold focus:outline-none"
            />
          </label>
          <p className="mt-2 font-mono text-[10px] text-smoke">
            Account email & password arrive with authentication (not yet enabled in this demo).
          </p>
        </SettingsSection>

        <SettingsSection
          label="Interests"
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
                      ? 'border-gold bg-gold/15 text-gold'
                      : 'border-line text-muted hover:border-line-strong hover:text-ash'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          label="Fit"
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
                className="w-full rounded-lg border border-line bg-void px-3 py-2.5 text-sm text-ash focus:border-gold focus:outline-none"
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
                className="w-full rounded-lg border border-line bg-void px-3 py-2.5 text-sm text-ash focus:border-gold focus:outline-none"
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
                className="w-full rounded-lg border border-line bg-void px-3 py-2.5 text-sm text-ash focus:border-gold focus:outline-none"
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
          label="Signals"
          title="Notification preferences"
          description="Stored now, delivered later — email alerts require accounts, which aren't live in this demo."
        >
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 text-sm text-ash">
              <input
                type="checkbox"
                checked={preferences.emailAlerts}
                onChange={(e) => updatePreferences({ emailAlerts: e.target.checked })}
                className="h-4 w-4 accent-[#FFB347]"
              />
              Alert me when a high-fit opportunity appears
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ash">
              <input
                type="checkbox"
                checked={preferences.weeklyDigest}
                onChange={(e) => updatePreferences({ weeklyDigest: e.target.checked })}
                className="h-4 w-4 accent-[#FFB347]"
              />
              Send me a weekly radar digest
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          label="Plan"
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

        <SettingsSection label="Appearance" title="Appearance">
          <div className="space-y-2.5">
            <p className="text-sm text-muted">
              Dark mode is the primary experience by design. A light theme is on the roadmap.
            </p>
            <label className="flex items-center gap-2.5 text-sm text-ash">
              <input
                type="checkbox"
                checked={preferences.reducedMotion}
                onChange={(e) => updatePreferences({ reducedMotion: e.target.checked })}
                className="h-4 w-4 accent-[#FFB347]"
              />
              Reduce motion and animations
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          label="Privacy"
          title="Account & privacy"
          description="Everything you see here lives in your browser's local storage. Nothing is sent to a server, and there is no tracking or analytics in this MVP."
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
