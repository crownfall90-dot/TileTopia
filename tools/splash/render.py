"""Render the launch illustration from the square deck without redrawing its edges."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
TILE = 256
SIZE = (860, 660)
LAYOUT = json.loads(Path(__file__).with_name('tiles.json').read_text())
SOURCE = ROOT / 'app/src/main/assets/tiles'


def project(x, y, depth=0):
    return 20 + .83 * x + .23 * y, 192 - .21 * x + .56 * y + depth


def main():
    board = Image.new('RGBA', (3 * TILE, 3 * TILE))
    for y, row in enumerate(LAYOUT):
        for x, (tile, rotation) in enumerate(row):
            with Image.open(SOURCE / f'{tile}.webp') as img:
                square = img.convert('RGBA').resize((TILE, TILE), Image.Resampling.LANCZOS)
                board.paste(square.rotate(-90 * rotation), (x * TILE, y * TILE))

    canvas = Image.new('RGBA', SIZE)
    top_left, top_right, bottom_right, bottom_left = (
        project(x * TILE, y * TILE) for x, y in [(0, 0), (3, 0), (3, 3), (0, 3)]
    )
    shadow = Image.new('RGBA', SIZE)
    ImageDraw.Draw(shadow).polygon([(x + 1, y + 26) for x, y in (top_left, top_right, bottom_right, bottom_left)], fill=(3, 8, 17, 153))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(15)))
    pen = ImageDraw.Draw(canvas)
    for side, light, dark in [((bottom_left, bottom_right), (137, 103, 67), (74, 50, 39)),
                              ((top_right, bottom_right), (105, 76, 56), (50, 37, 34))]:
        for level in range(24):
            color = tuple(round(a + (b - a) * level / 23) for a, b in zip(light, dark))
            a, b = side
            pen.polygon([ (a[0], a[1] + level), (b[0], b[1] + level),
                          (b[0], b[1] + level + 1), (a[0], a[1] + level + 1)], fill=color)

    determinant = .83 * .56 + .23 * .21
    a, b, d, e = .56 / determinant, -.23 / determinant, .21 / determinant, .83 / determinant
    face = board.transform(SIZE, Image.Transform.AFFINE, (a, b, -a * 20 - b * 192, d, e, -d * 20 - e * 192),
                           Image.Resampling.BICUBIC)
    canvas.alpha_composite(face)
    canvas = canvas.crop((0, 12, 847, 663)).resize((576, 443), Image.Resampling.LANCZOS)
    canvas.save(ROOT / 'web/splash-landscape.webp', 'WEBP', quality=86, method=6)


if __name__ == '__main__':
    main()
