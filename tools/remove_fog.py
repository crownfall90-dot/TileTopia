import re, sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Update src/ui/styles.css
with open('src/ui/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add complete fog removal and harmonious board styling
fog_override_css = """

/* === CLEAN HARMONIOUS BOARD BACKGROUND (FOG COMPLETELY REMOVED) === */
.fog,
#fogOfWar,
.fog-svg,
.fog-particle,
.fog-antique-cartography {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
}

.board {
  background: radial-gradient(ellipse 85% 65% at 50% 45%, #162344 0%, #10182e 50%, #0a0f1e 100%) !important;
}

.board::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 42%, rgba(80, 135, 230, 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

.ground {
  background: radial-gradient(closest-side, rgba(65, 108, 62, 0.36) 0%, rgba(34, 58, 48, 0.15) 50%, transparent 80%) !important;
}
"""

css += fog_override_css

with open('src/ui/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated src/ui/styles.css: fog completely removed, background tuned for harmony.")

# 2. Update web/game.html so initFog cleanly does not add svg or particles
with open('web/game.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_init_fog = """function initFog() {
  const old = $('#fogOfWar');
  if (old) old.remove();
  document.querySelectorAll('.fog-particle').forEach(p => p.remove());"""

new_init_fog = """function initFog() {
  const old = $('#fogOfWar');
  if (old) old.remove();
  document.querySelectorAll('.fog-particle').forEach(p => p.remove());
  return; // Fog of war removed as requested: clean harmonious board background"""

assert old_init_fog in html, "old_init_fog not found in web/game.html"
html = html.replace(old_init_fog, new_init_fog)

with open('web/game.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated web/game.html: initFog made into clean no-op.")
