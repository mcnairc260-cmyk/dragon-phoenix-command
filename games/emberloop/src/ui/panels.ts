import { ACHIEVEMENTS } from '../systems/Achievements';
import { PALETTES } from '../systems/Cosmetics';
import { CONTROL_MODE_LABEL, type SaveData, type Settings } from '../systems/Progression';
import { UPGRADES_BY_ID, type UpgradeLevels } from '../upgrades/UpgradeDefs';
import type { DraftedUpgrade } from '../upgrades/UpgradeDraft';
import type { UltimateDef } from '../upgrades/Ultimates';
import { activeSynergies, approachedBy, completedBy } from '../upgrades/Synergies';
import { esc, formatNumber, formatTime } from './Ui';
import badgeVolcanic from '../assets/ui/rest/badge-volcanic.png';
import badgeFrostborn from '../assets/ui/rest/badge-frostborn.png';
import badgeShadow from '../assets/ui/rest/badge-shadow.png';
import badgeNature from '../assets/ui/rest/badge-nature.png';
import badgeAerial from '../assets/ui/rest/badge-aerial.png';
import badgeArcane from '../assets/ui/rest/badge-arcane.png';
import restFloor from '../assets/ui/rest/floor.webp';
import restLogo from '../assets/ui/rest/logo.png';
import restPhoenix from '../assets/ui/rest/phoenix.png';

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
  /** Faction id of the board just cleared (picks the badge glow and the sky colour). */
  factionId: string;
  faction: string;
  boss: string;
  /** The defeated boss's art, shown faded behind the title. */
  bossArt: string;
  nextBoard: number;
  nextLoop: number;
  nextFaction: string;
  score: number;
  elapsed: number;
  level: number;
  kills: number;
  health: number;
  healed: number;
  maxHealth: number;
}

/**
 * The six faction badges in board order: the founder's art, cut from the
 * rest-screen mockup by scripts/make-rest-art.py (icon, number and name are
 * part of each picture).
 */
const BADGES: readonly { id: string; name: string; url: string }[] = [
  { id: 'volcanic', name: 'Volcanic', url: badgeVolcanic },
  { id: 'frostborn', name: 'Frostborn', url: badgeFrostborn },
  { id: 'shadow', name: 'Shadow', url: badgeShadow },
  { id: 'nature', name: 'Nature', url: badgeNature },
  { id: 'aerial', name: 'Aerial', url: badgeAerial },
  { id: 'arcane', name: 'Arcane', url: badgeArcane },
];

/** Small gold line icons for the stat tiles (currentColor, so CSS sets the colour). */
const ICON = {
  time: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2c0 5 4 6.5 4 10s-4 5-4 10M17 2c0 5-4 6.5-4 10s4 5 4 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 19.5c1-1.6 2-2.3 3-2.3s2 .7 3 2.3z" fill="currentColor"/></svg>',
  level: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21l8-6 8 6M4 15l8-6 8 6M4 9l8-6 8 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  kills: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l11.5 11.5M21 3L9.5 14.5M12.5 17.5l5-5M6.5 12.5l5 5M17 17l3.5 3.5M7 17l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.4-4.6-9.6-9C.9 8.8 2.9 4.5 6.7 4.5c2.3 0 3.9 1.4 5.3 3.3 1.4-1.9 3-3.3 5.3-3.3 3.8 0 5.8 4.3 4.3 7.5-2.2 4.4-9.6 9-9.6 9z" fill="currentColor"/></svg>',
};

/** A laurel branch (left side; CSS mirrors it for the right): paired leaves along an arc. */
function laurel(): string {
  const leaves: string[] = [];
  const pairs = 7;
  for (let i = 0; i < pairs; i++) {
    const theta = ((112 + (i * 128) / (pairs - 1)) * Math.PI) / 180;
    const x = 60 + Math.cos(theta) * 46;
    const y = 50 + Math.sin(theta) * 46;
    const tangent = (Math.atan2(Math.cos(theta), -Math.sin(theta)) * 180) / Math.PI;
    const scale = 1 - i * 0.07;
    for (const side of [1, -1]) {
      const ox = x + Math.cos(theta) * side * 5;
      const oy = y + Math.sin(theta) * side * 5;
      leaves.push(
        `<ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${(9 * scale).toFixed(1)}" ry="${(3.6 * scale).toFixed(1)}" transform="rotate(${(tangent - side * 42).toFixed(0)} ${ox.toFixed(1)} ${oy.toFixed(1)})"/>`,
      );
    }
  }
  return `<svg class="rest__laurel" viewBox="0 0 64 100" aria-hidden="true"><path d="M43 93 A46 46 0 0 1 32 8" fill="none" stroke="currentColor" stroke-width="2"/><g fill="currentColor">${leaves.join('')}</g></svg>`;
}

/**
 * The rest point between boards, styled from the founder's mockup
 * (art/rest-screen.png, 2026-11-26): faction badges are the founder's art;
 * the rest (title, plates, tiles, button) is live text in the same style,
 * because the boss, score and stats change every run.
 */
export function restPanel(d: RestData): string {
  const loopDone = d.nextLoop > d.loop;
  const badges = BADGES.map((b, i) => {
    const state = i === d.board ? 'current' : loopDone || i < d.board ? 'done' : i === d.nextBoard ? 'next' : 'todo';
    return `<img class="rest__badge rest__badge--${state}" src="${esc(b.url)}" alt="${i + 1} ${esc(b.name)}${state === 'current' ? ' (cleared now)' : ''}" draggable="false" />`;
  }).join('');
  const hearts = Math.min(d.maxHealth, d.health + d.healed);
  const heartRow = Array.from({ length: d.maxHealth }, (_, i) => `<span class="rest__pip${i < hearts ? '' : ' rest__pip--empty'}">${ICON.heart}</span>`).join('');
  const tile = (icon: string, label: string, value: string) => `
        <div class="rest__frame rest__tile">
          <span class="rest__icon">${icon}</span>
          <span class="rest__tile-text"><span class="rest__label">${esc(label)}</span><span class="rest__value">${value}</span></span>
        </div>`;
  const [bossWord] = d.boss.split(' ');
  return `
    <div class="rest rest--${esc(d.factionId)}${loopDone ? ' rest--loop' : ''}">
      <div class="rest__sky"></div>
      <img class="rest__boss" src="${esc(d.bossArt)}" alt="" draggable="false" />
      <img class="rest__floor" src="${esc(restFloor)}" alt="" draggable="false" />
      ${loopDone ? `<img class="rest__phoenix" src="${esc(restPhoenix)}" alt="" draggable="false" />` : ''}
      <div class="rest__body">
        <img class="rest__logo" src="${esc(restLogo)}" alt="EmberLoop" draggable="false" />
        <div class="rest__frame rest__eyebrow"><span class="rest__gem">◆</span> Board ${d.board + 1} of 6 cleared${d.loop > 0 ? ` · Loop ${d.loop + 1}` : ''} <span class="rest__gem">◆</span></div>
        <h1 class="rest__title"><span>${esc(bossWord)}</span><span>Falls</span></h1>
        <p class="rest__frame rest__tale">You broke the ${esc(d.faction)}. Catch your breath.</p>
        <div class="rest__badges">${badges}</div>
        <div class="rest__score-row">
          ${loopDone ? laurel() : ''}
          <div class="rest__frame rest__score"><span class="rest__label">Score</span><span class="rest__score-value">${formatNumber(d.score)}</span></div>
          ${loopDone ? laurel().replace('rest__laurel', 'rest__laurel rest__laurel--right') : ''}
        </div>
        <div class="rest__tiles">
          ${tile(ICON.time, 'Time', formatTime(d.elapsed))}
          ${tile(ICON.level, 'Level', formatNumber(d.level))}
          ${tile(ICON.kills, 'Kills this board', formatNumber(d.kills))}
          ${tile(ICON.heart, 'Hearts', `<span class="rest__hearts">${heartRow}</span>`)}
        </div>
        <p class="rest__frame rest__msg">${d.healed > 0 ? `Resting restores ${d.healed} heart${d.healed > 1 ? 's' : ''}.` : 'Hearts full.'} ${
          loopDone
            ? `<b>Loop ${d.loop + 1} complete!</b> The six boards begin again, a step harder.`
            : `Next: Board ${d.nextBoard + 1}, ${esc(d.nextFaction)} — a little harder.`
        }</p>
        <div class="rest__cta-glow"><button class="rest__frame rest__cta" data-action="continue"><span>${loopDone ? `Begin loop ${d.nextLoop + 1}` : 'Continue'}</span></button></div>
      </div>
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
        ${howRow('🪶', 'Phoenix Fire', 'Your phoenix shoots fire bolts on its own at the nearest enemy. You aim by where you fly.')}
        ${howRow('🔥', 'Graze danger', 'Near-misses build Heat. Heat multiplies your score and makes your fire faster — but it cools fast.')}
        ${howRow('☄', 'Release to unleash', 'Kills charge your ultimate. When the bar is full, let go to unleash it. You start with the Phoenix Burst; an Ascension Shard turns it into an elemental ultimate.')}
        ${howRow('❤', 'Three lives', 'Every hit costs one and breaks your combo. Each board ends with a faction boss; the rest after it restores a life.')}
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
