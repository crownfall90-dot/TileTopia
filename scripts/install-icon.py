"""Installs the app icon everywhere from the Blender render (store/src/icon-3tiles-1024.png, transparent):
Google Play (store/icon-512.png), the web app and PWA (web/icons), the Android launcher (round, square and adaptive layers).
    python scripts/install-icon.py
Re-run after tools/blender_generators/generate_app_icon.py. Adaptive icons: a gradient background layer and the art as
the foreground, scaled into the 66 dp safe zone (a circle in the middle of the 108 dp layer) so no launcher mask cuts it."""
import os
from PIL import Image, ImageDraw, ImageFilter

SRC = 'store/src/icon-3tiles-1024.png'
res = 'app/src/main/res'
inner, outer = (58, 66, 170), (14, 18, 64)   # the indigo of the game: lighter in the middle


def gradient(n):
    S = 256   # computed small and enlarged: the gradient is smooth, no need to walk a million pixels
    g = Image.new('RGB', (S, S))
    px = g.load()
    for y in range(S):
        for x in range(S):
            d = min(1.0, (((x - S * .5) / (S * .62)) ** 2 + ((y - S * .44) / (S * .62)) ** 2) ** .5)
            t = d * d * (3 - 2 * d)
            px[x, y] = tuple(int(inner[i] + (outer[i] - inner[i]) * t) for i in range(3))
    return g.resize((n, n), Image.BICUBIC)


art = Image.open(SRC).convert('RGBA')
art = art.crop(art.getbbox())


def scaled(box):
    k = box / max(art.size)
    return art.resize((max(1, round(art.width * k)), max(1, round(art.height * k))), Image.LANCZOS)


def compose(n, box, shadow=True, dy=0.01):
    """The gradient with the art scaled so its longer side is box * n, centred (a little above the middle) with a soft shadow."""
    bg = gradient(n).convert('RGBA')
    a = scaled(box * n)
    ox, oy = (n - a.width) // 2, (n - a.height) // 2 + round(dy * n)
    if shadow:
        sh = Image.new('L', (n, n), 0)
        sh.paste(a.getchannel('A').point(lambda v: int(v * .55)), (ox + round(.01 * n), oy + round(.025 * n)))
        sh = sh.filter(ImageFilter.GaussianBlur(max(1, n * .027)))
        bg = Image.composite(Image.new('RGBA', (n, n), (6, 8, 30, 255)), bg, sh)
    bg.alpha_composite(a, (ox, oy))
    return bg


def foreground(n):
    """Art only, transparent, inside the adaptive safe zone (the 66 dp circle of the 108 dp layer = 61 % of the side)."""
    f = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    a = scaled(.64 * n)
    f.alpha_composite(a, ((n - a.width) // 2, (n - a.height) // 2 + round(.01 * n)))
    return f


def rounded(img, radius):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=round(radius * img.width), fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img.convert('RGBA'), (0, 0), m)
    return out


def circle(img):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, img.width - 1, img.height - 1), fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img.convert('RGBA'), (0, 0), m)
    return out


big = compose(1024, .90)                      # full bleed: the stores and launchers cut their own corners
big.convert('RGB').save('store/src/icon-3tiles-composed-1024.png', optimize=True)
big.convert('RGB').resize((512, 512), Image.LANCZOS).save('store/icon-512.png', optimize=True)   # Google Play: 512x512, no alpha

# web app and PWA
for name, n in (('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-32.png', 32)):
    big.resize((n, n), Image.LANCZOS).save(os.path.join('web/icons', name), optimize=True)
compose(512, .66).save('web/icons/maskable-512.png', optimize=True)    # maskable: the art stays inside the central 80 %

# Android launcher
for d, legacy, layer in (('mdpi', 48, 108), ('hdpi', 72, 162), ('xhdpi', 96, 216), ('xxhdpi', 144, 324), ('xxxhdpi', 192, 432)):
    base = compose(legacy * 4, .84).resize((legacy, legacy), Image.LANCZOS)
    folder = f'{res}/mipmap-{d}'
    rounded(base, .22).save(f'{folder}/ic_launcher.png', optimize=True)
    circle(base).save(f'{folder}/ic_launcher_round.png', optimize=True)
    gradient(layer).save(f'{folder}/ic_launcher_background.png', optimize=True)
    foreground(layer * 2).resize((layer, layer), Image.LANCZOS).save(f'{folder}/ic_launcher_foreground.png', optimize=True)
print('icon installed: store/icon-512.png, web/icons/*, app/src/main/res/mipmap-*')
