"""Puts the rendered icon scene (transparent PNG from tools/blender_generators/generate_app_icon.py) on the game's
deep blue backdrop: a radial glow, a soft contact shadow, full bleed (Google Play rounds the corners itself).
    python scripts/icon-compose.py [render.png] [out.png] [size]
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

src = sys.argv[1] if len(sys.argv) > 1 else 'store/src/icon-3tiles-1024.png'
out = sys.argv[2] if len(sys.argv) > 2 else 'store/src/icon-3tiles-composed-1024.png'
size = int(sys.argv[3]) if len(sys.argv) > 3 else 1024

S = 1024
bg = Image.new('RGB', (S, S))
px = bg.load()
inner, outer = (58, 66, 170), (14, 18, 64)   # the indigo of the reference icon, lighter in the middle
for y in range(S):
    for x in range(S):
        d = min(1.0, (((x - S * .5) / (S * .62)) ** 2 + ((y - S * .44) / (S * .62)) ** 2) ** .5)
        t = d * d * (3 - 2 * d)
        px[x, y] = tuple(int(inner[i] + (outer[i] - inner[i]) * t) for i in range(3))

art = Image.open(src).convert('RGBA')
bbox = art.getbbox()
art = art.crop(bbox)
scale = min(S * .9 / art.width, S * .88 / art.height)
art = art.resize((int(art.width * scale), int(art.height * scale)), Image.LANCZOS)
ox, oy = (S - art.width) // 2, (S - art.height) // 2 + 6

shadow = Image.new('L', (S, S), 0)
alpha = art.getchannel('A').point(lambda a: int(a * .55))
shadow.paste(alpha, (ox + 10, oy + 26))
shadow = shadow.filter(ImageFilter.GaussianBlur(28))
bg = Image.composite(Image.new('RGB', (S, S), (6, 8, 30)), bg, shadow)

canvas = bg.convert('RGBA')
canvas.alpha_composite(art, (ox, oy))
canvas = canvas.convert('RGB')
if size != S:
    canvas = canvas.resize((size, size), Image.LANCZOS)
canvas.save(out, optimize=True)
print('wrote', out, canvas.size)
