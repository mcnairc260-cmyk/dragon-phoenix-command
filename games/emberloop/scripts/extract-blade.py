"""
Cuts one sword out of the founder's Ember Blades artwork (art/ember-blades.png,
1536 x 1024) into src/assets/weapons/ember-blade.png.

Needs rembg, numpy and scipy (pip install rembg onnxruntime numpy scipy).
BiRefNet (birefnet-general-lite) separates the top-right sword from the fiery
floor; the largest connected shape is kept and the flame hanging under the
blade is trimmed so the silhouette reads as a forged sword. The sword points
right with its edge tilted ~11 degrees down (ART_TILT in entities/EmberBlades.ts).
Run:  python3 scripts/extract-blade.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'ember-blades.png'
OUT = ROOT / 'src' / 'assets' / 'weapons' / 'ember-blade.png'
BOX = (860, 110, 1200, 215)


def main():
    img = Image.open(SRC).convert('RGB')
    cut = remove(img.crop(BOX), session=new_session('birefnet-general-lite'))
    cut = cut.crop(cut.getbbox())
    a = np.asarray(cut).copy()
    mask = a[..., 3] > 40
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    keep = ndimage.binary_dilation(labels == 1 + int(np.argmax(sizes)), iterations=3)
    a[..., 3] = np.where(keep, a[..., 3], 0)
    cut = Image.fromarray(a, 'RGBA')
    cut = cut.crop(cut.getbbox())
    # Trim the flame hanging under the blade (below the guard-to-tip edge line).
    a = np.asarray(cut).astype(float)
    h, w = a.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]
    edge = 30 + (xs - 35) * ((h - 14) - 30) / (w - 40)
    a[..., 3] = np.where((ys > edge + 12) & (xs > 70), 0, a[..., 3])
    cut = Image.fromarray(a.astype('uint8'), 'RGBA')
    cut = cut.crop(cut.getbbox())
    cut.thumbnail((180, 180), Image.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cut.save(OUT, optimize=True)
    print(OUT, cut.size)


if __name__ == '__main__':
    main()
