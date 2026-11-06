# Плитки Tiletopia

- **Грани плиток, как их рисует игра** (`src/render/art.js`), 576×576: `assets/tiles3d/faces/<id>.jpg`
  (обрыв `rEnd` — PNG с прозрачностью). Обновить: `node scripts/export-faces.mjs` (нужна запущенная веб-сборка).
- **3D-плитки** (GLB), рендеры и детали: `assets/tiles3d/`, описание — `docs/design/TILES3D.md`.
- Здесь остались только диорамы `classic_4side/` и `hex_6side/` с описаниями `*_defs.json`:
  их показывает галерея `tools/export-tiles.html` (на сайте — `/tiles/`).
