import { ACHIEVEMENTS } from '../systems/Achievements';
import { PALETTES } from '../systems/Cosmetics';
import { CONTROL_MODE_LABEL, type SaveData, type Settings } from '../systems/Progression';
import { UPGRADES_BY_ID, type UpgradeLevels } from '../upgrades/UpgradeDefs';
import type { DraftedUpgrade } from '../upgrades/UpgradeDraft';
import type { UltimateDef } from '../upgrades/Ultimates';
import { activeSynergies, approachedBy, completedBy } from '../upgrades/Synergies';
import { esc, formatNumber, formatTime } from './Ui';

/** Level-up draft: three cards, one tap. */
export function upgradePanel(cards: DraftedUpgrade[], level: number, build: UpgradeLevels = {}): string {
  const cardHtml = cards
    .map(
      (card) => `
      <button class="card card--${card.def.rarity}${completedBy(build, card.def.id).length ? ' card--synergy' : ''}" data-action="pick" data-id="${esc(card.def.id)}">
        <img class="card__art${card.def.weapon ? ' card__art--weapon' : ''}" src="${esc(card.def.art)}" alt="" draggable="false" />
        <span>
          <span class="card__name">${esc(card.def.name)}</span>
          <span class="card__desc">${esc(card.def.describe(card.nextLevel))}</span>
          ${approachedBy(build, card.def.id)
            .map((syn) => `<span class="card__synergy card__synergy--near">✧ One step toward ${esc(syn.name)}</span>`)
            .join('')}
          ${completedBy(build, card.def.id)
            .map((syn) => `<span class="card__synergy">✦ Completes ${esc(syn.name)}: ${esc(syn.blurb)}</span>`)
            .join('')}
          <span class="card__meta">
            <span class="tag tag--${card.def.rarity}">${card.def.rarity}</span>
            ${card.def.weapon ? '<span class="tag tag--weapon">weapon</span>' : `<span class="tag tag--${card.def.family}">${card.def.family}</span>`}
            <span class="tag tag--level">${card.isNew ? 'NEW' : `LV ${card.nextLevel} / ${card.def.maxLevel}`}</span>
          </span>
        </span>
      </button>`,
    )
    .join('');

  return `
    <div class="scrim"></div>
    <div class="panel">
      <div class="eyebrow">Level ${level} — choose an upgrade</div>
      <div class="cards">${cardHtml || '<p>Every path is fully forged. Keep burning.</p>'}</div>
      ${cards.length === 0 ? '<button class="btn btn--primary" data-action="skip">Continue</button>' : ''}
    </div>`;
}

/**
 * Ascension, first level: trade the Phoenix Burst for one elemental ultimate.
 * Only ultimates of element shards the player owns are offered. One per run.
 */
export function ultimatePanel(options: UltimateDef[]): string {
  const cards = options
    .map((u) => {
      const shard = u.element ? UPGRADES_BY_ID.get(u.element) : undefined;
      return `
      <button class="card card--legendary" data-action="ultimate" data-id="${esc(u.id)}">
        ${shard ? `<img class="card__art" src="${esc(shard.art)}" alt="" draggable="false" />` : '<span></span>'}
        <span>
          <span class="card__name">${esc(u.name)}</span>
          <span class="card__desc">${esc(u.blurb)}</span>
          <span class="card__meta"><span class="tag tag--legendary">ultimate</span><span class="tag tag--level">replaces burst</span></span>
        </span>
      </button>`;
    })
    .join('');
  return `
    <div class="scrim"></div>
    <div class="panel">
      <div class="eyebrow">Awakened — choose your ultimate</div>
      <p class="panel__note">Release your finger to unleash it. One ultimate per run.</p>
      <div class="cards">${cards}</div>
    </div>`;
}

export interface RestData {
  board: number;
  loop: number;
  faction: string;
  boss: string;
  nextBoard: number;
  nextLoop: number;
  nextFaction: string;
  score: number;
  elapsed: number;
  level: number;
  kills: number;
  health: number;
  healed: number;
}

/** Faction names in board order, for the progress track. */
const BOARD_NAMES = ['Volcanic', 'Frostborn', 'Shadow', 'Nature', 'Aerial', 'Arcane'];

/**
 * The rest point between boards: where you are in the loop, how the run is
 * going, a heart back, and what comes next. Nothing moves until you continue.
 */
export function restPanel(d: RestData): string {
  const loopDone = d.nextLoop > d.loop;
  const track = BOARD_NAMES.map((name, i) => {
    const state = loopDone || i <= d.board ? 'done' : i === d.nextBoard ? 'next' : 'todo';
    return `<div class="board-pip board-pip--${state}"><span>${i + 1}</span><small>${esc(name)}</small></div>`;
  }).join('');
  return `
    <div class="scrim"></div>
    <div class="panel">
      <div class="eyebrow">Board ${d.board + 1} of 6 cleared${d.loop > 0 ? ` · Loop ${d.loop + 1}` : ''}</div>
      <h1>${esc(d.boss)} falls</h1>
      <p class="panel__note">${esc(d.faction)} defeated. Catch your breath.</p>
      <div class="board-track">${track}</div>
      <div class="stats">
        <div class="stat stat--wide stat--hero"><div class="stat__label">Score</div><div class="stat__value">${formatNumber(d.score)}</div></div>
        <div class="stat"><div class="stat__label">Time</div><div class="stat__value">${formatTime(d.elapsed)}</div></div>
        <div class="stat"><div class="stat__label">Level</div><div class="stat__value">${formatNumber(d.level)}</div></div>
        <div class="stat"><div class="stat__label">Kills this board</div><div class="stat__value">${formatNumber(d.kills)}</div></div>
        <div class="stat"><div class="stat__label">Hearts</div><div class="stat__value">${'♥'.repeat(Math.min(3, d.health + d.healed))}</div></div>
      </div>
      <p class="panel__note">${d.healed > 0 ? `Resting restores ${d.healed} heart.` : 'Hearts full.'} ${
        loopDone
          ? `<b>Loop ${d.loop + 1} complete!</b> The six boards begin again, a step harder.`
          : `Next: Board ${d.nextBoard + 1}, ${esc(d.nextFaction)} — a little harder.`
      }</p>
      <button class="btn btn--primary" data-action="continue">${loopDone ? `Begin loop ${d.nextLoop + 1}` : 'Continue'}</button>
    </div>`;
}

/** Pause + settings, reachable mid-run. */
export function pausePanel(settings: Settings, build: UpgradeLevels): string {
  return `
    <div class="scrim"></div>
    <div class="panel">
      <h1>Paused</h1>
      ${buildChips(build)}
      ${settingsList(settings)}
      <button class="btn btn--primary" data-action="resume">Resume</button>
      <div class="btn-row">
        <button class="btn btn--ghost" data-action="restart">Restart</button>
        <button class="btn btn--ghost" data-action="quit">Title</button>
      </div>
    </div>`;
}

/** The settings toggles, shared by the pause menu and the main menu's Settings. */
function settingsList(settings: Settings): string {
  return `
      <div class="toggle-list">
        <button class="toggle" data-action="control">
          <span>Controls<span class="toggle__hint">${esc(CONTROL_HINT[settings.controlMode])}</span></span>
          <span class="toggle__state toggle__state--on">${esc(CONTROL_MODE_LABEL[settings.controlMode])}</span>
        </button>
        ${toggle('sound', 'Sound effects', settings.sound)}
        ${toggle('music', 'Music', settings.music)}
        ${toggle('haptics', 'Haptics', settings.haptics)}
        ${toggle('reducedMotion', 'Reduced motion', settings.reducedMotion)}
      </div>`;
}

/** Settings from the main menu. */
export function settingsPanel(settings: Settings): string {
  return `
    <div class="scrim"></div>
    <div class="panel">
      <h1>Settings</h1>
      ${settingsList(settings)}
      <button class="btn btn--primary" data-action="close">Back</button>
    </div>`;
}

/**
 * Main menu (founder art). The five buttons are drawn in the art; these are
 * tap areas laid over them, placed in the art's own pixel coordinates so they
 * line up at any screen size.
 */
/**
 * Pixel size of the menu art: HD v3 2026-11-26 (art/main-menu.gif and
 * art/main-menu-final.png, 927 x 1659, exactly 3x v2 with the buttons in the
 * same places — so the v2 tap areas below are scaled by ART_SCALE).
 */
const ART_SCALE = 3;
export const MENU_ART = { width: 309 * ART_SCALE, height: 553 * ART_SCALE } as const;
const MENU_HOTSPOTS: { action: string; label: string; x: number; y: number; w: number; h: number }[] = [
  // Each drawn button (v2 pixels), grown into half the gap around it for an easier tap.
  { action: 'play', label: 'Play', x: 73, y: 288, w: 168, h: 49 },
  { action: 'how', label: 'How to play', x: 78, y: 337, w: 156, h: 36 },
  { action: 'progress', label: 'Progress', x: 78, y: 373, w: 156, h: 35 },
  { action: 'settings', label: 'Settings', x: 78, y: 408, w: 156, h: 34 },
  { action: 'save', label: 'Save', x: 78, y: 442, w: 156, h: 34 },
].map((h) => ({ ...h, x: h.x * ART_SCALE, y: h.y * ART_SCALE, w: h.w * ART_SCALE, h: h.h * ART_SCALE }));

export function mainMenuPanel(artUrl: string, bestLine: string): string {
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
  const hot = MENU_HOTSPOTS.map(
    (h) =>
      `<button class="menu__hot${h.action === 'play' ? ' menu__hot--play' : ''}" data-action="${h.action}" aria-label="${esc(h.label)}"
        style="left:${pct(h.x, MENU_ART.width)};top:${pct(h.y, MENU_ART.height)};width:${pct(h.w, MENU_ART.width)};height:${pct(h.h, MENU_ART.height)}"></button>`,
  ).join('');
  return `
    <div class="menu">
      <div class="menu__art" id="menu-art">
        <img class="menu__img" id="menu-img" src="${esc(artUrl)}" alt="EmberLoop — Survive · Evolve · Ascend" draggable="false" />
        ${hot}
      </div>
      ${bestLine ? `<div class="menu__best">${esc(bestLine)}</div>` : ''}
    </div>`;
}

/**
 * Save (founder art v2 replaced Quit with Save). The game already saves after
 * every run and every settings change; this saves again at once and shows
 * what is kept. It is honest about the two limits: a failed write (private
 * browsing, full storage) and a run in progress, which is never saved.
 */
export function savePanel(save: SaveData, ok: boolean): string {
  const stat = (label: string, value: string) =>
    `<div class="stat"><div class="stat__label">${esc(label)}</div><div class="stat__value">${esc(value)}</div></div>`;
  const body = ok
    ? `<div class="stats">
        ${stat('Best score', formatNumber(save.highScore))}
        ${stat('Longest run', formatTime(save.longestSurvival))}
        ${stat('Runs', formatNumber(save.runs))}
        ${stat('Bosses slain', formatNumber(save.bossesDefeated))}
        ${stat('Achievements', `${save.achievements.length}/${ACHIEVEMENTS.length}`)}
        ${stat('Phoenix colours', `${save.unlockedPalettes.length}/${PALETTES.length}`)}
      </div>
      <p class="panel__note">Your scores, unlocks and settings are saved on this device. EmberLoop also saves by itself after every run. A run that is still going is not saved.</p>`
    : `<p class="panel__note">This device did not let EmberLoop save. Private browsing or full storage can cause this. Your progress stays until you close the game.</p>`;
  return `
    <div class="scrim"></div>
    <div class="panel">
      <div class="eyebrow">Save</div>
      <h1>${ok ? 'Progress saved' : 'Could not save'}</h1>
      ${body}
      <button class="btn btn--primary" data-action="close">Back to the menu</button>
    </div>`;
}

export interface ResultsData {
  score: number;
  survivalTime: number;
  bestCombo: number;
  embers: number;
  level: number;
  kills: number;
  /** Boards fully cleared this run. */
  boardsCleared: number;
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
        <div class="stat"><div class="stat__label">Boards cleared</div><div class="stat__value">${formatNumber(data.boardsCleared)}</div></div>
        <div class="stat"><div class="stat__label">Kills</div><div class="stat__value">${formatNumber(data.kills)}</div></div>
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
        <div class="stat"><div class="stat__label">Bosses slain</div><div class="stat__value">${formatNumber(save.bossesDefeated)}</div></div>
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
        ${howRow('☄', 'Release to unleash', 'Kills charge your ultimate. When the bar is full, let go to unleash it. You start with the Phoenix Burst; an Ascension Shard turns it into an elemental ultimate.')}
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
function synergyList(build: UpgradeLevels): string {
  const active = activeSynergies(build);
  if (active.length === 0) return '';
  return `<div class="section-title">Synergies</div><div class="synergy-list">${active
    .map((syn) => `<div class="synergy"><b>${esc(syn.name)}</b><span>${esc(syn.blurb)}</span></div>`)
    .join('')}</div>`;
}

function buildChips(build: UpgradeLevels): string {
  const chips = Object.entries(build)
    .filter(([, level]) => level > 0)
    .map(([id, level]) => {
      const def = UPGRADES_BY_ID.get(id);
      if (!def) return '';
      return `<span class="build-chip"><img class="build-chip__art" src="${esc(def.art)}" alt="" />${esc(def.name)}${level > 1 ? ` ×${level}` : ''}</span>`;
    })
    .filter(Boolean)
    .join('');
  if (!chips) return '';
  return `<div class="section-title">Your build</div><div class="build-list">${chips}</div>${synergyList(build)}`;
}
