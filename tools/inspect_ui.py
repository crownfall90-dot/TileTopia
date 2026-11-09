import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('web/game.html', 'r', encoding='utf-8') as f:
    html = f.read()

cups_matches = set(re.findall(r'class=[\'"][^\'"]*(?:cup|troph|coin)[^\'"]*[\'"]', html))
print("HTML classes:")
for m in sorted(cups_matches):
    print(" ", m)

print("\nLines mentioning cup or trophy in game.html:")
for idx, line in enumerate(html.splitlines()):
    l = line.lower()
    if any(k in l for k in ['cupsbadge', 'rcup', 'cup-ic', 'lead-cups-badge', 'pod-cups', 'cup']):
        if len(line.strip()) < 160:
            print(f" {idx+1}: {line.strip()}")
