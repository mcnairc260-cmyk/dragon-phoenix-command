"""
Builds the main-menu intro from the founder's HD menu art (2026-11-26):
  art/main-menu.gif        927 x 1659, 9 frames at 220 ms (ember orb -> phoenix)
  art/main-menu-final.png  927 x 1659, the final phoenix pose in full colour
into src/assets/ui/menu/:
  frame-0.webp .. frame-7.webp  the first 8 GIF frames (quality 80; each is on
                                screen for 0.22 s, so lighter files are fine)
  final.webp                    the PNG pose (quality 92), shown in place of
                                the GIF's 9th frame and held as the menu
The GIF is 8 MB and set to loop for ever; these files total about 2.4 MB and
the game plays them once (ui/menuIntro.ts). Needs Pillow with WebP.
Run:  python3 scripts/make-menu-frames.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GIF = ROOT / 'art' / 'main-menu.gif'
FINAL = ROOT / 'art' / 'main-menu-final.png'
OUT = ROOT / 'src' / 'assets' / 'ui' / 'menu'
SIZE = (927, 1659)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    gif = Image.open(GIF)
    assert gif.size == SIZE and gif.n_frames == 9, (gif.size, gif.n_frames)
    for i in range(gif.n_frames - 1):
        gif.seek(i)
        gif.convert('RGB').save(OUT / f'frame-{i}.webp', 'WEBP', quality=80, method=6)
    final = Image.open(FINAL).convert('RGB')
    assert final.size == SIZE, final.size
    final.save(OUT / 'final.webp', 'WEBP', quality=92, method=6)
    total = sum(p.stat().st_size for p in OUT.glob('*.webp'))
    print(f'wrote {len(list(OUT.glob("*.webp")))} files, {total / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
