"""Search visibility files for the web build: robots.txt, sitemap.xml, small screenshots for the About pages.
    python scripts/seo.py build/web [site-url]
Run by scripts/wrap-web.sh. The About pages (web/about.html, about-en.html) are the pages meant for search results;
the game itself (index.html) is an app and has little text for a crawler to read."""
import datetime
import os
import shutil
import sys

site = sys.argv[1]
base = (sys.argv[2] if len(sys.argv) > 2 else 'https://crownfall90-dot.github.io/TileTopia').rstrip('/')
today = datetime.date.today().isoformat()

for name in ('about.html', 'about-en.html'):
    shutil.copy(os.path.join('web', name), os.path.join(site, name))

# screenshots for the About pages: small WebP copies of the store screenshots (the originals are 1080x1920 PNGs)
try:
    from PIL import Image
    os.makedirs(os.path.join(site, 'about'), exist_ok=True)
    for i, src in enumerate(('1-menu.png', '3-game.png', '4-setup.png', '5-results.png'), 1):
        p = os.path.join('store', 'screenshots', src)
        if os.path.exists(p):
            Image.open(p).convert('RGB').resize((360, 640), Image.LANCZOS).save(os.path.join(site, 'about', f'shot-{i}.webp'), 'WEBP', quality=80)
except Exception as e:  # without Pillow the pages simply have no pictures
    print('seo.py: screenshots skipped:', e)

pages = ['about.html', 'about-en.html', '', 'privacy.html', 'privacy-en.html', 'terms.html', 'terms-en.html', 'licenses.html']
urls = ''.join(f'  <url><loc>{base}/{p}</loc><lastmod>{today}</lastmod></url>\n' for p in pages)
open(os.path.join(site, 'sitemap.xml'), 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')
open(os.path.join(site, 'robots.txt'), 'w', encoding='utf-8').write(
    f'User-agent: *\nAllow: /\nDisallow: {base[base.index("/", 8):]}/staging/\nDisallow: {base[base.index("/", 8):]}/admin/\nDisallow: {base[base.index("/", 8):]}/tiles/\nDisallow: {base[base.index("/", 8):]}/store/\n\nSitemap: {base}/sitemap.xml\n')
print('seo.py: sitemap.xml, robots.txt, about pages written')
