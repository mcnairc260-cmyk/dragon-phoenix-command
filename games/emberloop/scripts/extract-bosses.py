"""
Cuts the six faction bosses out of the founder's Boss Roster poster
(art/boss-roster.png, 1536 x 1024) into src/assets/bosses/*.png.

Needs rembg (pip install rembg onnxruntime numpy). The u2net / isnet models
failed on the fiery, effect-heavy panels; BiRefNet (birefnet-general-lite)
cut all six. Crops stop above the printed boss names, so the bottom 22% of each
cut is faded out to hide the straight crop edge. Output fits 280 px.
Run:  python3 scripts/extract-bosses.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'boss-roster.png'
OUT = ROOT / 'src' / 'assets' / 'bosses'

BOXES = {
    'magmathar': (22, 182, 510, 372),
    'criotharis': (522, 190, 1015, 372),
    'nethermorph': (1032, 182, 1525, 372),
    'blightbloom': (15, 588, 505, 782),
    'skyrend': (520, 585, 1015, 782),
    'aurelion': (1032, 590, 1525, 782),
}


def main():
    img = Image.open(SRC).convert('RGB')
    session = new_session('birefnet-general-lite')
    OUT.mkdir(parents=True, exist_ok=True)
    for name, box in BOXES.items():
        cut = remove(img.crop(box), session=session)
        cut = cut.crop(cut.getbbox())
        a = np.asarray(cut).astype(float)
        h = a.shape[0]
        fade = int(h * 0.22)
        ramp = np.ones(h)
        ramp[h - fade:] = np.linspace(1, 0, fade) ** 1.3
        a[..., 3] *= ramp[:, None]
        cut = Image.fromarray(a.astype('uint8'), 'RGBA')
        cut = cut.crop(cut.getbbox())
        cut.thumbnail((280, 280), Image.LANCZOS)
        cut.save(OUT / f'{name}.png', optimize=True)
        print(name, cut.size)


if __name__ == '__main__':
    main()
