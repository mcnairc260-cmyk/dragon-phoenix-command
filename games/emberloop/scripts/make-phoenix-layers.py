"""
Cuts the founder-supplied phoenix (art/phoenix-source.png) into three layers so the
wings can flap: far (right) wing, near (left) wing, and body. Output goes to
src/assets/ and is imported by Vite (content-hashed, so caches never go stale).

Needs Pillow:  python3 scripts/make-phoenix-layers.py
Pivot and anchor coordinates printed at the end must match src/entities/PhoenixSprite.ts.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'phoenix-source.png'
OUT = ROOT / 'src' / 'assets'
OUT_WIDTH = 280  # 2x the ~140 px max on-screen wingspan; the renderer caps DPR at 2

# Regions in source-image pixels (1312 x 1199). Wing polygons reach in under the
# body, which is drawn on top, so a rotating wing never opens a gap at the shoulder.
LEFT_WING = [(0, 0), (560, 0), (560, 200), (545, 330), (630, 420), (695, 470), (712, 560),
             (680, 660), (560, 735), (330, 715), (0, 760)]
RIGHT_WING = [(960, 0), (1312, 0), (1312, 820), (1000, 780), (952, 680), (946, 560),
              (952, 450), (968, 300)]
# Body mask = everything outside the wings, minus a margin, feathered.
LEFT_PIVOT = (690, 500)   # shoulder joints
RIGHT_PIVOT = (950, 480)
ANCHOR = (790, 560)       # torso centre: the gameplay position of the player
FEATHER = 8


def mask_from(poly, size, grow=0):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    if grow > 0:
        m = m.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    return m


def apply(img, mask):
    out = img.copy()
    out.putalpha(ImageChops.multiply(img.getchannel('A'), mask))
    return out


def main():
    img = Image.open(SRC).convert('RGBA')
    size = img.size
    left = mask_from(LEFT_WING, size)
    right = mask_from(RIGHT_WING, size)
    wings = ImageChops.lighter(left, right)
    # Body: grow past the wing cut so its opaque edge hides the cut while a wing rotates.
    body = ImageChops.invert(wings).filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(FEATHER))
    # Wings: solid right up to (and past) the body edge so no seam shows at rest.
    left_l = apply(img, left)
    right_l = apply(img, right)
    body_l = apply(img, body)

    scale = OUT_WIDTH / size[0]
    out_size = (OUT_WIDTH, round(size[1] * scale))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, layer in (('phoenix-wing-left', left_l), ('phoenix-wing-right', right_l), ('phoenix-body', body_l)):
        layer.resize(out_size, Image.LANCZOS).save(OUT / f'{name}.png', optimize=True)

    def s(p):
        return (round(p[0] * scale, 1), round(p[1] * scale, 1))
    print('texture size', out_size)
    print('ANCHOR', s(ANCHOR), 'LEFT_PIVOT', s(LEFT_PIVOT), 'RIGHT_PIVOT', s(RIGHT_PIVOT))


if __name__ == '__main__':
    main()
