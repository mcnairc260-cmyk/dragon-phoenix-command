/**
 * DOM overlay layer.
 *
 * Menus, cards and toasts live in HTML/CSS rather than the canvas: crisp text at
 * any DPI, real accessibility semantics, and touch targets the browser sizes
 * correctly. The canvas keeps the game; the DOM keeps the interface.
 */

export type PanelAction = (dataset: DOMStringMap, element: HTMLElement) => void;

export class Ui {
  private readonly panels: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly fps: HTMLElement;
  private readonly rotate: HTMLElement;
  private actions: Record<string, PanelAction> = {};
  private hintTimer = 0;

  constructor() {
    this.panels = mustFind('ui-panels');
    this.toasts = mustFind('ui-toasts');
    this.hint = mustFind('ui-hint');
    this.fps = mustFind('ui-fps');
    this.rotate = mustFind('rotate-overlay');

    // One delegated listener serves every panel that will ever be opened.
    this.panels.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
      if (!target) return;
      const action = this.actions[target.dataset.action ?? ''];
      if (action) {
        event.preventDefault();
        action(target.dataset, target);
      }
    });
  }

  get panelOpen(): boolean {
    return this.panels.classList.contains('open');
  }

  openPanel(html: string, actions: Record<string, PanelAction> = {}): void {
    this.actions = actions;
    this.panels.innerHTML = html;
    this.panels.classList.add('open');
  }

  closePanel(): void {
    this.panels.classList.remove('open');
    this.panels.innerHTML = '';
    this.actions = {};
  }

  toast(text: string, duration = 2200): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    this.toasts.appendChild(el);
    window.setTimeout(() => {
      el.style.transition = 'opacity 240ms ease-out';
      el.style.opacity = '0';
      window.setTimeout(() => el.remove(), 260);
    }, duration);
  }

  /** Tutorial / contextual hint. `duration` of 0 keeps it until dismissed. */
  showHint(html: string, duration = 0): void {
    window.clearTimeout(this.hintTimer);
    this.hint.innerHTML = html;
    this.hint.hidden = false;
    if (duration > 0) {
      this.hintTimer = window.setTimeout(() => this.hideHint(), duration);
    }
  }

  hideHint(): void {
    window.clearTimeout(this.hintTimer);
    this.hint.hidden = true;
    this.hint.innerHTML = '';
  }

  setFpsVisible(visible: boolean): void {
    this.fps.hidden = !visible;
  }

  setFps(value: number): void {
    if (!this.fps.hidden) this.fps.textContent = String(Math.round(value));
  }

  setRotateVisible(visible: boolean): void {
    this.rotate.hidden = !visible;
  }

  setReducedMotion(on: boolean): void {
    document.body.classList.toggle('reduced-motion', on);
  }
}

function mustFind(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`EMBERLOOP: missing #${id} in index.html`);
  return el;
}

/** Escape any string before it goes near innerHTML. */
export function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}
