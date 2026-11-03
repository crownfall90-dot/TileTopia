"""Turns docs/privacy-policy.md into a standalone page: python3 scripts/privacy-page.py OUT.html"""
import html, re, sys

def inline(t):
    t = html.escape(t)
    t = re.sub(r'(https?://[^\s<)]+)', r'<a href="\1">\1</a>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'(?<![\w*])\*([^*]+)\*(?![\w*])', r'<i>\1</i>', t)
    return t

out, ul = [], False
for line in open('docs/privacy-policy.md', encoding='utf-8').read().splitlines():
    if line.startswith('- '):
        if not ul: out.append('<ul>'); ul = True
        out.append('<li>' + inline(line[2:]) + '</li>'); continue
    if ul: out.append('</ul>'); ul = False
    if line.startswith('# '): out.append('<h1>' + inline(line[2:]) + '</h1>')
    elif line.startswith('## '): out.append('<h2>' + inline(line[3:]) + '</h2>')
    elif line.strip(): out.append('<p>' + inline(line) + '</p>')
if ul: out.append('</ul>')
page = '''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Политика конфиденциальности — Tiletopia</title>
<style>
body{margin:0;background:#101729;color:#eef1f8;font:16px/1.55 system-ui,sans-serif}
main{max-width:680px;margin:0 auto;padding:24px 18px 48px}
h1{font-size:24px;margin:0 0 8px}h2{font-size:18px;margin:28px 0 6px;color:#f2b84b}
p,li{color:#c9d1e6}a{color:#8db4ff;word-break:break-all}ul{padding-left:20px}
</style></head><body><main>
''' + '\n'.join(out) + '\n</main></body></html>\n'
open(sys.argv[1], 'w', encoding='utf-8').write(page)
