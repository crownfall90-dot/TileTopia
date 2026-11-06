"""Turns docs/privacy-policy.md into a standalone page: python3 scripts/privacy-page.py OUT.html"""
import html, re, sys

def inline(t):
    t = html.escape(t)
    t = re.sub(r'(https?://[^\s<)]+)', r'<a href="\1">\1</a>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'(?<![\w*])\*([^*]+)\*(?![\w*])', r'<i>\1</i>', t)
    return t

def convert(md):
    out, ul, tbl = [], False, []
    def flush_table():
        nonlocal tbl
        if not tbl: return
        rows = [r for r in tbl if not re.match(r'^\|[-| :]+\|$', r)]
        cells = lambda r: [c.strip() for c in r.strip().strip('|').split('|')]
        out.append('<div class="t"><table>')
        for i, r in enumerate(rows):
            tag = 'th' if i == 0 else 'td'
            out.append('<tr>' + ''.join('<%s>%s</%s>' % (tag, inline(c), tag) for c in cells(r)) + '</tr>')
        out.append('</table></div>')
        tbl = []
    for line in md.splitlines():
        if line.startswith('|'):
            tbl.append(line); continue
        flush_table()
        if line.startswith('- '):
            if not ul: out.append('<ul>'); ul = True
            out.append('<li>' + inline(line[2:]) + '</li>'); continue
        if ul: out.append('</ul>'); ul = False
        if line.startswith('# '): out.append('<h1>' + inline(line[2:]) + '</h1>')
        elif line.startswith('## '): out.append('<h2>' + inline(line[3:]) + '</h2>')
        elif line.startswith('> '): out.append('<blockquote>' + inline(line[2:]) + '</blockquote>')
        elif line.strip(): out.append('<p>' + inline(line) + '</p>')
    flush_table()
    if ul: out.append('</ul>')
    return '\n'.join(out)

# python privacy-page.py OUT.html [SOURCE.md [TITLE [LANG]]]  (default: the Russian privacy policy)
out_path = sys.argv[1]
src = sys.argv[2] if len(sys.argv) > 2 else 'docs/privacy-policy.md'
title = sys.argv[3] if len(sys.argv) > 3 else 'Политика конфиденциальности — Tiletopia'
lang = sys.argv[4] if len(sys.argv) > 4 else 'ru'
page = '''<!doctype html>
<html lang="%s"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title>
<style>
body{margin:0;background:#101729;color:#eef1f8;font:16px/1.55 system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 18px 48px}
h1{font-size:24px;margin:0 0 8px}h2{font-size:18px;margin:28px 0 6px;color:#f2b84b}
p,li,td,th{color:#c9d1e6}a{color:#8db4ff;word-break:break-all}ul{padding-left:20px}
.t{overflow-x:auto}table{border-collapse:collapse;font-size:14px;min-width:480px}td,th{border:1px solid rgba(255,255,255,.14);padding:6px 9px;text-align:left;vertical-align:top}th{color:#eef1f8}
blockquote{margin:12px 0;padding:8px 14px;border-left:3px solid #f2b84b;background:rgba(255,255,255,.05)}
</style></head><body><main>
''' % (lang, html.escape(title)) + convert(open(src, encoding='utf-8').read()) + '\n</main></body></html>\n'
open(out_path, 'w', encoding='utf-8').write(page)
