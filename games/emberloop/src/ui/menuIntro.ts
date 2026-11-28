/**
 * The main-menu intro (founder HD art, 2026-11-26): the ember orb becomes the
 * phoenix once, then the full-colour final pose holds as the menu. Built by
 * scripts/make-menu-frames.py from art/main-menu.gif + art/main-menu-final.png.
 *
 * It plays on the first menu of each launch only; every later menu (back from
 * a screen or a run) shows the final pose at once, as does Reduced Motion.
 * Frames are swapped on one <img>, so the tap areas are live the whole time.
 */
import frame0 from '../assets/ui/menu/frame-0.webp';
import frame1 from '../assets/ui/menu/frame-1.webp';
import frame2 from '../assets/ui/menu/frame-2.webp';
import frame3 from '../assets/ui/menu/frame-3.webp';
import frame4 from '../assets/ui/menu/frame-4.webp';
import frame5 from '../assets/ui/menu/frame-5.webp';
import frame6 from '../assets/ui/menu/frame-6.webp';
import frame7 from '../assets/ui/menu/frame-7.webp';
import finalPose from '../assets/ui/menu/final.webp';

export const MENU_FINAL = finalPose;
const FRAMES = [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7];
/** The founder GIF's frame time. */
const FRAME_MS = 220;
/** On a slow connection, skip to the final pose rather than wait. */
const LOAD_LIMIT_MS = 4000;

let played = false;
let timer: number | undefined;
let held: HTMLImageElement[] = [];

/** The picture a new menu should open on: the first frame if the intro will play. */
export function menuOpeningFrame(reducedMotion: boolean): string {
  return played || reducedMotion ? MENU_FINAL : FRAMES[0];
}

/** Start the intro on the menu's <img>, or show the final pose if it has played. */
export function runMenuIntro(img: HTMLImageElement, reducedMotion: boolean): void {
  stopMenuIntro();
  if (played || reducedMotion) {
    played = true;
    img.src = MENU_FINAL;
    return;
  }
  played = true;
  img.src = FRAMES[0];

  // Decode every frame first so the swaps never flash an empty image.
  held = [...FRAMES.slice(1), MENU_FINAL].map((url) => {
    const pre = new Image();
    pre.src = url;
    return pre;
  });
  const ready = Promise.all(held.map((pre) => pre.decode().catch(() => undefined))).then(() => true);
  const limit = new Promise<false>((resolve) => window.setTimeout(() => resolve(false), LOAD_LIMIT_MS));

  void Promise.race([ready, limit]).then((inTime) => {
    if (!img.isConnected) return finish();
    if (!inTime) {
      img.src = MENU_FINAL;
      return finish();
    }
    let next = 1;
    timer = window.setInterval(() => {
      if (!img.isConnected) return finish();
      if (next < FRAMES.length) {
        img.src = FRAMES[next++];
      } else {
        img.src = MENU_FINAL;
        finish();
      }
    }, FRAME_MS);
  });
}

/** Stop a running intro (the menu closed); the next menu shows the final pose. */
export function stopMenuIntro(): void {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}

function finish(): void {
  stopMenuIntro();
  // Let the decoded frames go: only the final pose is needed from now on.
  held = [];
}
