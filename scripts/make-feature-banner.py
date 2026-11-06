"""Google Play feature graphic (1024x500) from the Blender render of the three tiles (store/src/icon-3tiles-1024.png):
the same indigo backdrop and warm light as the icon, the diorama on the right, the name and a line on the left.
    python scripts/make-feature-banner.py [font-dir]
font-dir holds Unbounded / Onest as .ttf (the game ships woff2; convert with fontTools). Writes store/feature-1024x500.png."""
import math
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, S = 1024, 500, 2          # supersampled 2x, then reduced
fonts = sys.argv[1] if len(sys.argv) > 1 else '.'
inner, outer = (62, 72, 182), (12, 16, 58)


def font(name, size, weight):
    f = ImageFont.truetype(os.path.join(fonts, name), size * S)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


# backdrop: the icon's indigo, brighter behind the art
bg = Image.new('RGB', (W * S, H * S))
px = bg.load()
cx, cy = .70 * W * S, .46 * H * S
for y in range(0, H * S):
    for x in range(0, W * S):
        d = min(1.0, math.hypot((x - cx) / (W * S * .62), (y - cy) / (H * S * .95)))
        t = d * d * (3 - 2 * d)
        px[x, y] = tuple(int(inner[i] + (outer[i] - inner[i]) * t) for i in range(3))
bg = bg.convert('RGBA')

# a faint hex grid, the way the board looks from above; fades out towards the text
grid = Image.new('RGBA', bg.size, (0, 0, 0, 0))
g = ImageDraw.Draw(grid)
r = 46 * S
for row in range(-1, int(H * S / (r * .87)) + 2):
    for col in range(-1, int(W * S / (r * 1.5)) + 2):
        x = col * r * 1.5
        y = row * r * math.sqrt(3) + (r * math.sqrt(3) / 2 if col % 2 else 0)
        pts = [(x + r * math.cos(math.radians(60 * k)), y + r * math.sin(math.radians(60 * k))) for k in range(6)]
        g.polygon(pts, outline=(150, 170, 255, 34))
fade = Image.linear_gradient('L').rotate(90).resize(bg.size)       # 0..255 left → right
grid.putalpha(Image.composite(grid.getchannel('A'), Image.new('L', bg.size, 0), fade.point(lambda v: min(255, int(v * 1.1)))))
bg.alpha_composite(grid)

# the diorama
art = Image.open('store/src/icon-3tiles-1024.png').convert('RGBA')
art = art.crop(art.getbbox())
h = int(H * S * .88)
art = art.resize((int(art.width * h / art.height), h), Image.LANCZOS)
ax, ay = int(W * S * .985 - art.width), int((H * S - h) / 2 + H * S * .015)
shadow = Image.new('L', bg.size, 0)
shadow.paste(art.getchannel('A').point(lambda v: int(v * .6)), (ax + 14 * S, ay + 22 * S))
shadow = shadow.filter(ImageFilter.GaussianBlur(14 * S))
bg = Image.composite(Image.new('RGBA', bg.size, (4, 6, 28, 255)), bg, shadow)
bg.alpha_composite(art, (ax, ay))

# text
d = ImageDraw.Draw(bg)
x0 = 64 * S
title = font('unbounded-800-latin.ttf', 76, 800)
d.text((x0 + 3 * S, 150 * S + 4 * S), 'Tiletopia', font=title, fill=(6, 8, 36, 150))
d.text((x0, 150 * S), 'Tiletopia', font=title, fill=(255, 255, 255, 255))
bar_y = 262 * S
d.rounded_rectangle((x0, bar_y, x0 + 92 * S, bar_y + 7 * S), radius=3 * S, fill=(242, 184, 75, 255))
tag = font('onest-600-cyrillic.ttf', 29, 600)
d.text((x0, 286 * S), 'Стройте города и дороги', font=tag, fill=(232, 238, 255, 255))
d.text((x0, 326 * S), 'из плиток вместе с друзьями', font=tag, fill=(232, 238, 255, 255))


def meeple(cx_, cy_, s, col):
    pts = [(0, 1.0), (.17, .96), (.26, .82), (.23, .66), (.5, .6), (.58, .5), (.5, .4), (.3, .38), (.4, .0), (.12, .0), (0, .2),
           (-.12, .0), (-.4, .0), (-.3, .38), (-.5, .4), (-.58, .5), (-.5, .6), (-.23, .66), (-.26, .82), (-.17, .96)]
    m = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    md = ImageDraw.Draw(m)
    md.polygon([(cx_ + x * s, cy_ - y * s) for x, y in pts], fill=col)
    m = m.filter(ImageFilter.GaussianBlur(S * .6))
    hl = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    ImageDraw.Draw(hl).polygon([(cx_ + x * s * .9 - s * .06, cy_ - y * s * .9 - s * .04) for x, y in pts], fill=(255, 255, 255, 46))
    hl.putalpha(Image.composite(hl.getchannel('A'), Image.new('L', bg.size, 0), m.getchannel('A')))
    bg.alpha_composite(m)
    bg.alpha_composite(hl)


for k, col in enumerate(((214, 40, 32, 255), (24, 84, 232, 255), (255, 170, 20, 255))):
    meeple(x0 + (24 + k * 62) * S, 440 * S, 40 * S, col)

out = bg.convert('RGB').resize((W, H), Image.LANCZOS)
out.save('store/feature-1024x500.png', optimize=True)
print('store/feature-1024x500.png', out.size)
