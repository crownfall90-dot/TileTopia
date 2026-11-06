"""Tints the Poly Haven source textures (assets/tiles3d/textures/src) into the game palette (assets/tiles3d/textures).

Plain Python with Pillow, not Blender: the tinted JPEGs go straight into the GLB as base colour, so the
glTF exporter needs no colour-mixing nodes and the 2D render and the 3D model show the same colours.
    python tools/blender_generators/tint_textures.py
"""
import os
from PIL import Image, ImageOps, ImageStat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'tiles3d', 'textures', 'src')
OUT = os.path.join(ROOT, 'assets', 'tiles3d', 'textures')

# name: (source, target colour, contrast). Colours are the ones of the game sprites in src/render/art.js.
TINTS = {
    'plaster': ('white_plaster_rough_01', (238, 226, 196), 0.35),
    'stone': ('castle_wall_slates', (178, 172, 160), 0.7),
    'roof_red': ('clay_roof_tiles', (207, 77, 50), 0.55),
    'roof_brick': ('clay_roof_tiles', (180, 70, 45), 0.55),
    'roof_slate': ('clay_roof_tiles', (95, 116, 136), 0.55),
    'roof_gold': ('clay_roof_tiles', (214, 169, 74), 0.55),
    'wood': ('stony_dirt_path', (128, 86, 52), 0.45),
}
# Parts without a texture: one flat colour each (sRGB), as in the sprites.
FLATS = {
    'soil': (92, 62, 38), 'soil_dark': (64, 42, 26), 'lip': (98, 160, 66), 'beam': (107, 68, 38),
    'door': (74, 47, 27), 'window': (255, 216, 119), 'slit': (42, 34, 28), 'chimney': (138, 92, 68),
    'pine': (58, 128, 64), 'pine_dark': (36, 90, 43), 'oak': (79, 158, 76), 'oak_light': (100, 179, 92),
    'birch_leaf': (166, 214, 106), 'birch_bark': (239, 236, 228), 'trunk': (90, 58, 36), 'apple': (216, 66, 58),
    'hay': (224, 178, 78), 'rock': (169, 164, 154), 'rock_light': (201, 197, 187), 'flag': (217, 41, 31),
    'rail': (107, 107, 112), 'dark': (23, 18, 15), 'lantern': (255, 207, 90), 'moss': (90, 140, 60),
    'fall': (59, 136, 207), 'fall_light': (159, 216, 255), 'foam': (240, 250, 255),
}
ALIASES = {}
CELL, GRIDN, PAD = 256, 4, 4


def tint(src, colour, contrast, size=256):
    g = ImageOps.grayscale(Image.open(os.path.join(SRC, src + '.jpg')).convert('RGB')).resize((size, size), Image.LANCZOS)
    mean = ImageStat.Stat(g).mean[0]
    lut = [max(0.0, 1.0 + contrast * (v - mean) / 128.0) for v in range(256)]
    px = g.load()
    out = Image.new('RGB', (size, size))
    op = out.load()
    for y in range(size):
        for x in range(size):
            k = lut[px[x, y]]
            op[x, y] = tuple(min(255, int(c * k)) for c in colour)
    return out


def atlas():
    """One shared texture for every tile (assets/tiles3d/textures/atlas.jpg) and where each part lies in it.

    Phones load it once; every tile model points into it, so the whole board is one or two draw calls."""
    import json
    size = CELL * GRIDN
    img = Image.new('RGB', (size, size), (128, 128, 128))
    rects, colours = {}, {}
    def uv(x, y, w, h):   # Blender UV space: v grows upwards, the image row 0 is the top
        return [round((x + PAD) / size, 5), round(1 - (y + h - PAD) / size, 5), round((x + w - PAD) / size, 5), round(1 - (y + PAD) / size, 5)]
    for k, (name, (src, colour, contrast)) in enumerate(TINTS.items()):
        x, y = (k % GRIDN) * CELL, (k // GRIDN) * CELL
        tile = tint(src, colour, contrast, CELL)
        img.paste(tile, (x, y))
        rects[name] = uv(x, y, CELL, CELL)
        colours[name] = [round(c / 255, 4) for c in ImageStat.Stat(tile).mean]
    k0 = len(TINTS)
    half = CELL // 2
    for j, (name, colour) in enumerate(FLATS.items()):
        cell = k0 + j // 4
        x = (cell % GRIDN) * CELL + (j % 2) * half
        y = (cell // GRIDN) * CELL + ((j // 2) % 2) * half
        img.paste(Image.new('RGB', (half, half), colour), (x, y))
        rects[name] = uv(x, y, half, half)
        colours[name] = [round(c / 255, 4) for c in colour]
    for a, b in ALIASES.items():
        rects[a], colours[a] = rects[b], colours[b]
    img.save(os.path.join(OUT, 'atlas.jpg'), quality=86)
    with open(os.path.join(OUT, 'atlas.json'), 'w', encoding='utf-8') as f:
        json.dump({'size': size, 'rects': rects, 'colours': colours}, f, indent=1)
    print('atlas', size, 'px,', len(rects), 'parts')


if __name__ == '__main__':
    atlas()
