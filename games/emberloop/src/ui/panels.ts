import { ACHIEVEMENTS } from '../systems/Achievements';
import { PALETTES } from '../systems/Cosmetics';
import { CONTROL_MODE_LABEL, type SaveData, type Settings } from '../systems/Progression';
import { UPGRADES_BY_ID, type UpgradeLevels } from '../upgrades/UpgradeDefs';
import type { DraftedUpgrade } from '../upgrades/UpgradeDraft';
import { esc, formatNumber, formatTime } from './Ui';

/** Level-up draft: three cards, one tap. */
export function upgradePanel(cards: DraftedUpgrade[], level: number): string {
  const cardHtml = cards
    .map(
      (card) => `
      <button class="card card--${card.def.rarity}" data-action="pick" data-id="${esc(card.def.id)}">
        <span class="card__icon">${esc(card.def.icon)}</span>
        <span>
          <span class="card__name">${esc(card.def.name)}</span>
          <span class="card__desc">${esc(card.def.describe(card.nextLevel))}</span>
          <span class="card__meta">
            <span class="tag tag--${card.def.rarity}">${card.def.rarity}</span>
            <span class="tag tag--${card.def.family}">${card.def.family}</span>
            <span class="tag tag--level">${card.isNew ? 'NEW' : `LV ${card.nextLevel}`}</span>
          </span>
        </span>
      </button>`,
    )
    .join('');

  return `
    <div class="scrim"></div>
    <div class="panel">
      <div class="eyebrow">Level ${level} — choose your rising</div>
      <div class="cards">${cardHtml || '<p>Every path is fully forged. Keep burning.</p>'}</div>
      ${cards.length === 0 ? '<button class="btn btn--primary" data-action="skip">Continue</button>' : ''}
    </div>`;
}

/** Pause + settings, reachable mid-run. */
export function pausePanel(settings: Settings, build: UpgradeLevels): string {
  return `
    <div class="scrim"></div>
    <div class="panel">
      <h1>Paused</h1>
      ${buildChips(build)}
      <div class="toggle-list">
        <button class="toggle" data-action="control">
          <span>Controls<span class="toggle__hint">${esc(CONTROL_HINT[settings.controlMode])}</span></span>
          <span class="toggle__state toggle__state--on">${esc(CONTROL_MODE_LABEL[settings.controlMode])}</span>
        </button>
        ${toggle('sound', 'Sound effects', settings.sound)}
        ${toggle('music', 'Music', settings.music)}
        ${toggle('haptics', 'Haptics', settings.haptics)}
        ${toggle('reducedMotion', 'Reduced motion', settings.reducedMotion)}
      </div>
      <button class="btn btn--primary" data-action="resume">Resume</button>
      <div class="btn-row">
        <button class="btn btn--ghost" data-action="restart">Restart</button>
        <button class="btn btn--ghost" data-action="quit">Title</button>
      </div>
    </div>`;
}

export interface ResultsData {
  score: number;
  survivalTime: number;
  bestCombo: number;
  embers: number;
  level: number;
  kills: number;
  highScore: number;
  isHighScore: boolean;
  newAchievements: string[];
  newPalettes: string[];
  build: UpgradeLevels;
}

/** Post-run results: one tap back into the fire. */
export function gameOverPanel(data: ResultsData): string {
  const unlocks = [
    ...data.newAchievements.map((id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      return a ? `<span class="badge">${esc(a.icon)} ${esc(a.name)}</span>` : '';
    }),
    ...data.newPalettes.map((id) => {
      const p = PALETTES.find((x) => x.id === id);
      return p ? `<span class="badge">🎨 ${esc(p.name)}</span>` : '';
    }),
  ]
    .filter(Boolean)
    .join('');

  return `
    <div class="scrim"></div>
    <div class="panel">
      <div class="eyebrow">${data.isHighScore ? 'New personal best' : 'Run complete'}</div>
      <h1>${data.isHighScore ? 'Ascended' : 'Ashes'}</h1>
      <div class="stats">
        <div class="stat stat--wide stat--hero">
          <div class="stat__label">Score</div>
          <div class="stat__value">${formatNumber(data.score)}</div>
        </div>
        <div class="stat"><div class="stat__label">Survived</div><div class="stat__value">${formatTime(data.survivalTime)}</div></div>
        <div class="stat"><div class="stat__label">Best combo</div><div class="stat__value">${formatNumber(data.bestCombo)}</div></div>
        <div class="stat"><div class="stat__label">Embers</div><div class="stat__value">${formatNumber(data.embers)}</div></div>
        <div class="stat"><div class="stat__label">Level</div><div class="stat__value">${formatNumber(data.level)}</div></div>
        <div class="stat stat--wide"><div class="stat__label">Best score</div><div class="stat__value">${formatNumber(data.highScore)}</div></div>
      </div>
      ${unlocks ? `<div class="section-title">Unlocked</div><div class="badge-row">${unlocks}</div>` : ''}
      ${buildChips(data.build)}
      <button class="btn btn--primary" data-action="restart">Run again</button>
      <div class="btn-row">
        <button class="btn btn--ghost" data-action="progress">Progress</button>
        <button class="btn btn--ghost" data-action="quit">Title</button>
      </div>
    </div>`;
}

/** Lifetime progression: stats, cosmetics, achievements. */
export function progressionPanel(save: SaveData): string {
  const swatches = PALETTES.map((p) => {
    const unlocked = save.unlockedPalettes.includes(p.id);
    const selected = save.selectedPalette === p.id;
    const dot = `background: #${p.glow.toString(16).padStart(6, '0')}; color: #${p.glow.toString(16).padStart(6, '0')};`;
    return `
      <button class="swatch" data-action="palette" data-id="${esc(p.id)}"
        data-locked="${!unlocked}" data-selected="${selected}" ${unlocked ? '' : 'aria-disabled="true"'}>
        <span class="swatch__dot" style="${dot}"></span>
        ${esc(p.name)}
        <span class="swatch__req">${unlocked ? (selected ? 'Equipped' : 'Tap to equip') : esc(p.requirement)}</span>
      </button>`;
  }).join('');

  const achievements = ACHIEVEMENTS.map((a) => {
    const earned = save.achievements.includes(a.id);
    return `
      <div class="ach" data-earned="${earned}">
        <span class="ach__icon">${earned ? esc(a.icon) : '🔒'}</span>
        <span>
          <span class="ach__name">${esc(a.name)}</span>
          <span class="ach__desc">${esc(a.description)}</span>
        </span>
      </div>`;
  }).join('');

  return `
    <div class="scrim"></div>
    <div class="panel panel--top">
      <h1>Progress</h1>
      <div class="stats">
        <div class="stat"><div class="stat__label">Best score</div><div class="stat__value">${formatNumber(save.highScore)}</div></div>
        <div class="stat"><div class="stat__label">Longest run</div><div class="stat__value">${formatTime(save.longestSurvival)}</div></div>
        <div class="stat"><div class="stat__label">Embers</div><div class="stat__value">${formatNumber(save.totalEmbers)}</div></div>
        <div class="stat"><div class="stat__label">Runs</div><div class="stat__value">${formatNumber(save.runs)}</div></div>
        <div class="stat"><div class="stat__label">Best combo</div><div class="stat__value">${formatNumber(save.bestCombo)}</div></div>
        <div class="stat"><div class="stat__label">Ashborn slain</div><div class="stat__value">${formatNumber(save.bossesDefeated)}</div></div>
      </div>
      <div class="section-title">Phoenix colours</div>
      <div class="swatches">${swatches}</div>
      <div class="section-title">Achievements ${save.achievements.length}/${ACHIEVEMENTS.length}</div>
      <div class="ach-list">${achievements}</div>
      <button class="btn btn--primary" data-action="close">Back</button>
    </div>`;
}

/** The 20-second explainer, also reachable from the title screen. */
export function howToPanel(): string {
  return `
    <div class="scrim"></div>
    <div class="panel">
      <div class="eyebrow">How to fly</div>
      <h1>Emberloop</h1>
      <div class="ach-list">
        ${howRow('👆', 'Drag anywhere', 'The phoenix mirrors your finger from wherever it already is — rest your thumb low, away from the action, so you can always see it. Other control styles are in the pause menu.')}
        ${howRow('💎', 'Collect embers, fast', 'Shards are score, currency and experience. Gather them in quick succession to build an Ember Chain for bonus XP — levelling never makes the enemies harder.')}
        ${howRow('🔥', 'Graze danger', 'Near-misses build Heat. Heat multiplies everything — but it cools fast.')}
        ${howRow('☄', 'Release to burst', 'Holding charges the Phoenix Burst. Let go when it is full to clear the screen.')}
        ${howRow('❤', 'Three lives', 'Every hit costs one and breaks your combo. The Ashborn wakes at 80 seconds — felling it restores a life.')}
      </div>
      <button class="btn btn--primary" data-action="close">Got it</button>
    </div>`;
}

function howRow(icon: string, name: string, desc: string): string {
  return `
    <div class="ach" data-earned="true">
      <span class="ach__icon">${esc(icon)}</span>
      <span>
        <span class="ach__name">${esc(name)}</span>
        <span class="ach__desc">${esc(desc)}</span>
      </span>
    </div>`;
}

/** One-line explanation of what each control mode does, shown under the label. */
const CONTROL_HINT: Record<string, string> = {
  relative: 'Drag from anywhere — your thumb never covers the phoenix',
  joystick: 'Touch plants a stick; push to steer',
  absolute: 'The phoenix flies to your fingertip',
};

function toggle(key: 'sound' | 'music' | 'haptics' | 'reducedMotion', label: string, on: boolean): string {
  return `
    <button class="toggle" data-action="toggle" data-key="${esc(key)}" data-on="${on}">
      <span>${esc(label)}</span>
      <span class="toggle__state">${on ? 'ON' : 'OFF'}</span>
    </button>`;
}

/** Compact summary of the run's build, shown on pause and results. */
function buildChips(build: UpgradeLevels): string {
  const chips = Object.entries(build)
    .filter(([, level]) => level > 0)
    .map(([id, level]) => {
      const def = UPGRADES_BY_ID.get(id);
      if (!def) return '';
      return `<span class="build-chip">${esc(def.icon)} ${esc(def.name)}${level > 1 ? ` ×${level}` : ''}</span>`;
    })
    .filter(Boolean)
    .join('');
  if (!chips) return '';
  return `<div class="section-title">Your build</div><div class="build-list">${chips}</div>`;
}
