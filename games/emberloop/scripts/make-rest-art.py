"""
Cuts the board-cleared (rest) screen art from the founder's mockup
(art/rest-screen.png, 1368 x 1149: "Board 1 of 6 cleared" left, "Board 6 of
6 cleared" right, 2026-11-26) into src/assets/ui/rest/:

  badge-<faction>.png  the six faction badges (icon, number and name are part
                       of the art; they never change). Badges 1-5 come from the
                       right half, where they are not highlighted; Arcane (6)
                       comes from the left half, which draws badges taller, so
                       it is resized to the same box (about 14% shorter).
                       Each is cut on its hexagon outline; bright icon parts
                       that reach past the frame (the feather, the ice star)
                       are kept.
  floor.webp           the lava-rock floor strip under the buttons of the menu
                       art (art/main-menu-final.png rows 1440-1659), reused as
                       the floor of the rest screen.
  logo.png             the EMBERLOOP logo from the menu art, keyed out of
                       its dark sky by brightness (its glow is kept).
  phoenix.png          the menu art's phoenix, keyed the same way inside an
                       oval, for the loop-complete screen.

Needs Pillow, numpy and scipy.  Run:  python3 scripts/make-rest-art.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
MOCKUP = ROOT / 'art' / 'rest-screen.png'
MENU = ROOT / 'art' / 'main-menu-final.png'
OUT = ROOT / 'src' / 'assets' / 'ui' / 'rest'

# (left, top, right, bottom) of each badge's outer gold edge in the mockup.
BADGES = {
    'volcanic': (733, 379, 828, 497),
    'frostborn': (835, 379, 931, 497),
    'shadow': (934, 379, 1030, 497),
    'nature': (1034, 379, 1130, 497),
    'aerial': (1135, 379, 1230, 497),
    'arcane': (551, 352, 648, 489),
}
SIZE = (96, 118)          # every badge is delivered at this size
SHOULDER = 0.19           # hexagon shoulders, as a share of the height
OVERHANG = 22             # px above the badge searched for icon parts
OVERHANG_OUT = 20         # transparent strip kept above every delivered badge


def hex_mask(w, h, scale=4):
    big = Image.new('L', (w * scale, h * scale), 0)
    s = SHOULDER * h * scale
    W, H = w * scale - 1, h * scale - 1
    ImageDraw.Draw(big).polygon(
        [(W / 2, 0), (W, s), (W, H - s), (W / 2, H), (0, H - s), (0, s)], fill=255)
    return big.resize((w, h), Image.LANCZOS)


def cut(img, box):
    l, t, r, b = box
    top = t - OVERHANG
    crop = img.crop((l, top, r, b)).convert('RGB')
    w, h = crop.size
    mask = Image.new('L', (w, h), 0)
    mask.paste(hex_mask(r - l, b - t), (0, OVERHANG))
    # Keep icon parts that reach past the frame: bright, not lava-coloured.
    a = np.asarray(crop).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    bright = (R + G + B) / 3
    lava = (R - B > 90) & (G < 170)
    extra = (bright > 150) & ~lava
    extra[OVERHANG + int(SHOULDER * (b - t)):, :] = False
    # Only shapes joined to the badge count (not the banner line above it).
    inside = ndimage.binary_dilation(np.asarray(mask) > 128, iterations=2)
    labels, _ = ndimage.label(extra)
    keep = np.setdiff1d(np.unique(labels[inside & extra]), [0])
    extra = (np.isin(labels, keep)).astype(np.uint8) * 255
    extra_img = Image.fromarray(extra, 'L').filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = Image.fromarray(np.maximum(np.asarray(mask), np.asarray(extra_img)), 'L')
    out = crop.convert('RGBA')
    out.putalpha(alpha)
    # Badge to SIZE; the overhang strip on top is scaled the same way, so every
    # file is SIZE + OVERHANG_OUT tall with the hexagon in the same place.
    badge_h = SIZE[1] + OVERHANG_OUT
    scaled = out.resize((SIZE[0], round(h * SIZE[1] / (b - t))), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE[0], badge_h), (0, 0, 0, 0))
    canvas.alpha_composite(scaled, (0, badge_h - scaled.height))
    return canvas


def keyed(img, box, lo, hi, oval=False, by_value=False):
    """Crop `box` and make dark pixels transparent: alpha ramps from lo to hi of
    luminance, or of the brightest channel (`by_value`, keeps deep reds)."""
    crop = img.crop(box).convert('RGB')
    a = np.asarray(crop).astype(float)
    if by_value:
        lum = a.max(axis=2)
    else:
        lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    alpha = np.clip((lum - lo) / (hi - lo), 0, 1)
    if oval:
        h, w = alpha.shape
        yy, xx = np.mgrid[0:h, 0:w]
        d = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2
        alpha *= np.clip((1 - d) / 0.25, 0, 1)
    out = crop.convert('RGBA')
    out.putalpha(Image.fromarray((alpha * 255).astype(np.uint8), 'L'))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    mock = Image.open(MOCKUP)
    for name, box in BADGES.items():
        cut(mock, box).save(OUT / f'badge-{name}.png', optimize=True)
    menu = Image.open(MENU).convert('RGB')
    menu.crop((0, 1440, menu.width, menu.height)).save(OUT / 'floor.webp', 'WEBP', quality=85, method=6)
    logo = keyed(menu, (100, 34, 870, 200), 60, 150)
    logo.resize((logo.width * 2 // 3, logo.height * 2 // 3), Image.LANCZOS).save(OUT / 'logo.png', optimize=True)
    phoenix = keyed(menu, (70, 270, 860, 840), 110, 200, oval=True, by_value=True)
    phoenix.resize((phoenix.width // 2, phoenix.height // 2), Image.LANCZOS).save(OUT / 'phoenix.png', optimize=True)
    for p in sorted(OUT.iterdir()):
        print(p.name, Image.open(p).size, p.stat().st_size)


if __name__ == '__main__':
    main()
