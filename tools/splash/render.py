"""Render the launch illustration from the square deck without redrawing its edges."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
TILE = 256
SIZE = (860, 660)
CROP = (0, 12, 847, 663)
OUTPUT = (576, 443)
LAYOUT = json.loads(Path(__file__).with_name('tiles.json').read_text())
SOURCE = ROOT / 'app/src/main/assets/tiles'
DELAYS = ((140, 85, 185), (55, 0, 115), (235, 165, 260))


def project(x, y, depth=0):
    return 20 + .83 * x + .23 * y, 192 - .21 * x + .56 * y + depth


def draw_depth(canvas, corners):
    pen = ImageDraw.Draw(canvas)
    top_left, top_right, bottom_right, bottom_left = corners
    for (a, b), light, dark in [((bottom_left, bottom_right), (137, 103, 67), (74, 50, 39)),
                                ((top_right, bottom_right), (105, 76, 56), (50, 37, 34))]:
        for level in range(24):
            color = tuple(round(a + (b - a) * level / 23) for a, b in zip(light, dark))
            pen.polygon([(a[0], a[1] + level), (b[0], b[1] + level),
                         (b[0], b[1] + level + 1), (a[0], a[1] + level + 1)], fill=color)


def warp(board, x=0, y=0):
    det = .83 * .56 + .23 * .21
    a, b, d, e = .56 / det, -.23 / det, .21 / det, .83 / det
    return board.transform(SIZE, Image.Transform.AFFINE,
                           (a, b, -a * 20 - b * 192 - x, d, e, -d * 20 - e * 192 - y),
                           Image.Resampling.BICUBIC)


def resize_scene(canvas):
    return canvas.crop(CROP).resize(OUTPUT, Image.Resampling.LANCZOS)


def render_pieces(pieces):
    frames = []
    for y, x, square in pieces:
        scene = Image.new('RGBA', SIZE)
        corners = [project((x + dx) * TILE, (y + dy) * TILE) for dx, dy in ((0, 0), (1, 0), (1, 1), (0, 1))]
        draw_depth(scene, corners)
        scene.alpha_composite(warp(square, x * TILE, y * TILE))
        sprite = resize_scene(scene)
        bounds = sprite.getbbox()
        frames.append((sprite.crop(bounds), bounds[:2], ((x - 1) * 47 + (y - 1) * 19,
                      (y - 1) * 26 - (x - 1) * 12 - 40), DELAYS[y][x]))

    # A single texture serves all nine sprites. The transparent gutter keeps filtering off adjacent sprites.
    cell_width = max(sprite.width for sprite, *_ in frames) + 4
    cell_height = max(sprite.height for sprite, *_ in frames) + 4
    atlas = Image.new('RGBA', (3 * cell_width, 3 * cell_height))
    tiles = []
    for index, (sprite, anchor, travel, delay) in enumerate(frames):
        sx, sy = index % 3 * cell_width + 2, index // 3 * cell_height + 2
        atlas.paste(sprite, (sx, sy))
        tiles.append(dict(frame=[sx, sy, sprite.width, sprite.height], anchor=anchor, travel=travel, delay=delay))
    web = ROOT / 'web'
    atlas.save(web / 'splash-tiles.webp', 'WEBP', quality=86, method=6)
    (web / 'splash-tiles.json').write_text(json.dumps(dict(size=OUTPUT, atlas=atlas.size,
        duration=500, tiles=tiles), separators=(',', ':')) + '\n', encoding='utf-8')


def main():
    board = Image.new('RGBA', (3 * TILE, 3 * TILE))
    pieces = []
    for y, row in enumerate(LAYOUT):
        for x, (tile, rotation) in enumerate(row):
            with Image.open(SOURCE / f'{tile}.webp') as img:
                square = img.convert('RGBA').resize((TILE, TILE), Image.Resampling.LANCZOS)
                square = square.rotate(-90 * rotation)
                board.paste(square, (x * TILE, y * TILE))
                pieces.append((y, x, square))

    canvas = Image.new('RGBA', SIZE)
    top_left, top_right, bottom_right, bottom_left = (
        project(x * TILE, y * TILE) for x, y in [(0, 0), (3, 0), (3, 3), (0, 3)]
    )
    shadow = Image.new('RGBA', SIZE)
    ImageDraw.Draw(shadow).polygon([(x + 1, y + 26) for x, y in (top_left, top_right, bottom_right, bottom_left)], fill=(3, 8, 17, 153))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(15)))
    draw_depth(canvas, (top_left, top_right, bottom_right, bottom_left))
    canvas.alpha_composite(warp(board))
    resize_scene(canvas).save(ROOT / 'web/splash-landscape.webp', 'WEBP', quality=86, method=6)
    render_pieces(pieces)


if __name__ == '__main__':
    main()
