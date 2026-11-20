"""
Cuts the 12 Power Shard crystals out of the founder's poster
(art/power-shards.png, 1536 x 1024) into src/assets/shards/*.png.

Needs rembg (pip install rembg onnxruntime). isnet-general-use cut 8 cleanly;
u2net was better for the four in U2NET (isnet left them faded). Crop boxes
exclude the name/effect banners. Output is trimmed and scaled to fit 128 px.
Run:  python3 scripts/extract-shards.py
"""
from pathlib import Path
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'power-shards.png'
OUT = ROOT / 'src' / 'assets' / 'shards'

COLS = [(40, 285), (290, 535), (535, 780), (780, 1030), (1030, 1275), (1275, 1520)]
ROWS = [(185, 472), (558, 862)]
NAMES = [
    ['ember', 'frost', 'void', 'nature', 'storm', 'arcane'],
    ['ascension', 'titan', 'time', 'hunter', 'ward', 'cosmic'],
]
OVERRIDE = {'ember': (30, 185, 290, 472)}
U2NET = {'ember', 'void', 'storm', 'arcane'}


def main():
    img = Image.open(SRC).convert('RGB')
    sessions = {'isnet-general-use': new_session('isnet-general-use'), 'u2net': new_session('u2net')}
    OUT.mkdir(parents=True, exist_ok=True)
    for r, (y0, y1) in enumerate(ROWS):
        for c, (x0, x1) in enumerate(COLS):
            name = NAMES[r][c]
            box = OVERRIDE.get(name, (x0, y0, x1, y1))
            cut = remove(img.crop(box), session=sessions['u2net' if name in U2NET else 'isnet-general-use'])
            cut = cut.crop(cut.getbbox())
            cut.thumbnail((128, 128), Image.LANCZOS)
            cut.save(OUT / f'{name}.png', optimize=True)
            print(name, cut.size)


if __name__ == '__main__':
    main()
