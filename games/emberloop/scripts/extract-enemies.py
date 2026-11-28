"""
Cuts the 18 enemies out of the founder's Enemy Collection poster
(art/enemy-collection.png, 1536 x 1024) into src/assets/enemies/*.png.

Needs rembg (pip install rembg onnxruntime); it downloads its models on first
run. isnet-general-use cut 15 cleanly; u2net was better for the three listed
in U2NET. Crop boxes exclude the name banners. Output is trimmed and scaled to
fit 128 px. Run:  python3 scripts/extract-enemies.py
"""
from pathlib import Path
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'enemy-collection.png'
OUT = ROOT / 'src' / 'assets' / 'enemies'

COLS = [(20, 305), (305, 575), (572, 815), (815, 1025), (1020, 1250), (1238, 1530)]
ROWS = [(160, 390), (428, 620), (655, 868)]
NAMES = [
    ['lava-brute', 'crystal-crawler', 'void-wraith', 'ember-orb', 'spore-stalker', 'ashwing'],
    ['frostfang', 'thornwood', 'vipercoil', 'eye-sentinel', 'runebound', 'storm-revenant'],
    ['magma-scorpion', 'shadow-prowler', 'shard-golem', 'ember-slime', 'night-herald', 'venom-bloom'],
]
# Hand-tuned boxes where the grid cut through a neighbour.
OVERRIDE = {'night-herald': (1005, 655, 1290, 868), 'venom-bloom': (1288, 655, 1530, 868)}
U2NET = {'thornwood', 'night-herald', 'venom-bloom'}


def main():
    img = Image.open(SRC).convert('RGB')
    sessions = {'isnet-general-use': new_session('isnet-general-use'), 'u2net': new_session('u2net')}
    OUT.mkdir(parents=True, exist_ok=True)
    for r, (y0, y1) in enumerate(ROWS):
        for c, (x0, x1) in enumerate(COLS):
            name = NAMES[r][c]
            box = OVERRIDE.get(name, (x0, y0, x1, y1))
            model = 'u2net' if name in U2NET else 'isnet-general-use'
            cut = remove(img.crop(box), session=sessions[model])
            cut = cut.crop(cut.getbbox())
            cut.thumbnail((128, 128), Image.LANCZOS)
            cut.save(OUT / f'{name}.png', optimize=True)
            print(name, cut.size)


if __name__ == '__main__':
    main()
