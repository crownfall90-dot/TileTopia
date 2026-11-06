import os, sys, json

sys.stdout.reconfigure(encoding='utf-8')

classic_defs = json.load(open("assets/tiles/classic_4side_defs.json", encoding="utf-8"))
hex_defs = json.load(open("assets/tiles/hex_6side_defs.json", encoding="utf-8"))

gallery_html = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>🧩 Галерея и Интерактивный симулятор плиток Tiletopia (3D 4-сторонние и 6-сторонние гексы)</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #070b16;
    color: #e6ecf8;
    margin: 0;
    padding: 20px;
    min-height: 100vh;
  }
  .container { max-width: 1480px; margin: 0 auto; }
  header {
    background: linear-gradient(135deg, #10162e 0%, #172347 100%);
    border: 1px solid rgba(242,184,75,0.3);
    border-radius: 22px;
    padding: 26px 30px;
    margin-bottom: 22px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }
  header::before {
    content: "";
    position: absolute;
    top: -60px;
    right: -60px;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(242,184,75,0.18), transparent 70%);
    pointer-events: none;
  }
  h1 { margin: 0 0 10px; font-size: 28px; color: #f2b84b; display: flex; align-items: center; gap: 12px; }
  p { margin: 0 0 16px; color: #9aa8c7; font-size: 14.5px; line-height: 1.5; max-width: 1100px; }
  .actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .btn-primary {
    background: linear-gradient(135deg, #f2b84b, #f2994a);
    color: #101729;
    text-decoration: none;
    border: 0;
    padding: 11px 20px;
    border-radius: 12px;
    font-weight: 800;
    cursor: pointer;
    font-size: 13.5px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform .15s, box-shadow .15s;
    box-shadow: 0 4px 16px rgba(242,184,75,0.35);
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(242,184,75,0.5); }
  .btn-sec {
    background: rgba(255,255,255,0.06);
    color: #fff;
    text-decoration: none;
    padding: 10px 16px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 13px;
    border: 1px solid rgba(255,255,255,0.12);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all .15s;
  }
  .btn-sec:hover { background: rgba(255,255,255,0.12); border-color: rgba(242,184,75,0.4); transform: translateY(-1px); }

  /* Mode Navigation Tabs */
  .view-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    background: rgba(255,255,255,0.04);
    padding: 6px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .view-tab {
    flex: 1;
    padding: 14px 18px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 12px;
    color: #9aa8c7;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all .2s;
  }
  .view-tab:hover { color: #fff; background: rgba(255,255,255,0.06); }
  .view-tab.active {
    background: linear-gradient(135deg, rgba(242,184,75,0.22), rgba(242,184,75,0.08));
    border-color: rgba(242,184,75,0.6);
    color: #f2b84b;
    box-shadow: 0 4px 16px rgba(242,184,75,0.2);
  }

  /* Catalog Screen */
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; }
  .filter-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: #9aa8c7;
    padding: 7px 15px;
    border-radius: 20px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    transition: all .15s;
  }
  .filter-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
  .filter-btn.active {
    background: #f2b84b;
    color: #101729;
    border-color: #f2b84b;
    font-weight: 700;
  }
  .search-box {
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    padding: 9px 16px;
    color: #fff;
    font-size: 13.5px;
    min-width: 260px;
    outline: none;
  }
  .search-box:focus { border-color: #f2b84b; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
  .tile-card {
    background: #11172e;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    padding: 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    transition: transform .2s cubic-bezier(.2,.8,.2,1), border-color .2s, box-shadow .2s;
  }
  .tile-card:hover {
    transform: translateY(-4px);
    border-color: rgba(242,184,75,0.5);
    box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 16px rgba(242,184,75,0.15);
  }
  .tile-img-wrap {
    width: 220px;
    height: 220px;
    background: radial-gradient(circle at 50% 50%, #151e3d, #0b1022);
    border-radius: 16px;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.7);
  }
  .tile-card img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
    transition: transform .25s cubic-bezier(.3,1.4,.5,1);
  }
  .tile-card:hover img { transform: scale(1.06); }
  .tile-id { font-weight: 800; font-size: 15px; color: #fff; }
  .tile-sides {
    background: rgba(242,184,75,0.12);
    color: #ffd875;
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid rgba(242,184,75,0.25);
    font-weight: 700;
    font-size: 11.5px;
  }
  .tile-desc { font-size: 12px; color: #9aa8c7; line-height: 1.4; min-height: 32px; }
  .card-btns { display: flex; gap: 8px; width: 100%; margin-top: 4px; }
  .card-btn {
    flex: 1;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: all .15s;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #fff;
  }
  .card-btn.pri { background: #f2b84b; color: #101729; border-color: #f2b84b; }
  .card-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }

  /* Interactive Board Simulator (Playground) */
  .simulator-panel {
    background: #10162e;
    border: 1px solid rgba(242,184,75,0.3);
    border-radius: 20px;
    padding: 24px;
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 24px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.5);
  }
  .tray-box {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
    max-height: 700px;
    overflow-y: auto;
  }
  .tray-title { font: 700 14px var(--f-display); color: #f2b84b; margin-bottom: 4px; }
  .tray-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .tray-item {
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all .15s;
  }
  .tray-item:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); border-color: rgba(242,184,75,0.5); }
  .tray-item.selected {
    background: rgba(242,184,75,0.2);
    border-color: #f2b84b;
    box-shadow: 0 0 12px rgba(242,184,75,0.4);
  }
  .tray-item img { width: 70px; height: 70px; object-fit: contain; }
  .tray-item span { font-size: 11px; font-weight: 700; color: #e6ecf8; text-align: center; line-height: 1.2; }

  .board-wrap {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
  }
  .board-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 8px 16px;
    width: 100%;
    justify-content: space-between;
  }
  .board-status {
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
  }
  .board-status.success { background: rgba(46, 204, 113, 0.2); color: #2ecc71; border: 1px solid #2ecc71; }
  .board-status.error { background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; }
  .board-status.info { background: rgba(242, 184, 75, 0.15); color: #ffd875; border: 1px solid rgba(242,184,75,0.4); }

  /* Interactive Board Grid */
  .board-grid-4s {
    display: grid;
    grid-template-columns: repeat(3, 150px);
    grid-template-rows: repeat(3, 150px);
    gap: 8px;
    background: #090e1e;
    padding: 16px;
    border-radius: 18px;
    border: 2px dashed rgba(255,255,255,0.15);
  }
  .grid-cell {
    background: rgba(255,255,255,0.03);
    border: 1.5px dashed rgba(255,255,255,0.12);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition: all .15s;
    user-select: none;
  }
  .grid-cell:hover { background: rgba(242,184,75,0.08); border-color: rgba(242,184,75,0.4); }
  .grid-cell img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
    transition: transform .2s cubic-bezier(.3,1.4,.5,1);
  }
  .grid-cell .rot-badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(0,0,0,0.7);
    color: #f2b84b;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 6px;
  }
  .grid-cell .match-check {
    position: absolute;
    top: 4px;
    right: 4px;
    background: #2ecc71;
    color: #070b16;
    font-weight: 900;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
  }
  .empty-plus { font-size: 26px; color: rgba(255,255,255,0.2); font-weight: 300; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>🧩 Спрайты и 3D-плитки Tiletopia</h1>
    <p>Каждая плитка снабжена выверенными сторонами стыковки: <b>луга к лугам, реки к рекам, дороги к дорогам, крепости и деревни к своим стенам</b>. Доступны классический режим (квадратные плитки, 4 стороны) и гексагональный режим (6 сторон). Ниже можно изучить спрайты, скачать их и протестировать стыковку на интерактивном симуляторе.</p>
    <div class="actions">
      <a class="btn-primary" href="./tiletopia-all-diorama-tiles.zip" download>💾 Скачать ВСЕ 3D диорамы (.zip 6.5 МБ)</a>
      <a class="btn-sec" href="./tiletopia-classic-4side-diorama.zip" download>📦 3D Классика 4-стороны (.zip 4.2 МБ)</a>
      <a class="btn-sec" href="./tiletopia-hex-6side-diorama.zip" download>⬢ 3D Гексы 6-сторон (.zip 2.3 МБ)</a>
      <a class="btn-sec" href="./tiletopia-all-tiles-512x512.zip" download>🧩 Векторные плоские (.zip 1.7 МБ)</a>
      <a class="btn-sec" href="../staging/">🎮 Открыть игру (Staging)</a>
    </div>
  </header>

  <div class="view-tabs" id="viewTabs">
    <button class="view-tab active" data-view="catalog">
      <span>📚 Каталог спрайтов (512×512)</span>
    </button>
    <button class="view-tab" data-view="simulator">
      <span>🎮 Интерактивный симулятор стыковки</span>
    </button>
  </div>

  <!-- CATALOG VIEW -->
  <div id="catalogView">
    <div class="toolbar">
      <div class="filters" id="filters"></div>
      <input type="text" id="search" class="search-box" placeholder="🔍 Поиск по названию или стороне (река, мост, rfrf, замок…)">
    </div>
    <div class="grid" id="grid"></div>
  </div>

  <!-- SIMULATOR VIEW -->
  <div id="simulatorView" style="display:none">
    <div class="simulator-panel">
      <!-- Tray with selectable tiles -->
      <div class="tray-box">
        <div class="tray-title">📦 Стопка тайлов (выберите для хода)</div>
        <div class="tray-list" id="simTray"></div>
      </div>

      <!-- Interactive Board -->
      <div class="board-wrap">
        <div class="board-controls">
          <div>
            <b>Выбранный тайл:</b> <span id="curTileName" style="color:#f2b84b">Не выбран</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-sec" id="btnRotate">🔄 Повернуть (90°)</button>
            <button class="btn-sec" id="btnClearBoard">🧹 Очистить поле</button>
          </div>
        </div>

        <div class="board-status info" id="boardStatus">
          Выберите тайл слева и нажмите на любую ячейку поля для проверки стыковки сторон!
        </div>

        <div class="board-grid-4s" id="simBoard"></div>
      </div>
    </div>
  </div>
</div>

<script>
const CLASSIC_TILES = """ + json.dumps(classic_defs, ensure_ascii=False) + """;
const HEX_TILES = """ + json.dumps(hex_defs, ensure_ascii=False) + """;

// Combined catalog
const ALL_CATALOG = [
  ...CLASSIC_TILES.map(t => ({...t, mode: '4s', file: `./classic_4side/${t.id}.png`})),
  ...HEX_TILES.map(t => ({...t, mode: '6s', file: `./hex_6side/${t.id}.png`}))
];

const FILTERS = [
  {id: 'all', label: 'Все спрайты (20)'},
  {id: 'river', label: 'Реки'},
  {id: 'lake', label: 'Озёра'},
  {id: 'bridge', label: 'Мосты'},
  {id: 'road', label: 'Дороги'},
  {id: 'village', label: 'Деревни'},
  {id: 'fortress', label: 'Крепости'},
  {id: 'monastery', label: 'Монастыри'},
  {id: '4s', label: 'Классика (4-стор)'},
  {id: '6s', label: 'Гексы (6-стор)'},
];

let activeFilter = 'all';

function renderCatalog() {
  const grid = document.getElementById('grid');
  const q = document.getElementById('search').value.trim().toLowerCase();
  grid.innerHTML = '';

  ALL_CATALOG.forEach(t => {
    const matchesFilter = activeFilter === 'all' || t.category.includes(activeFilter) || t.mode === activeFilter;
    const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.edges.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);

    if (matchesFilter && matchesQuery) {
      const card = document.createElement('div');
      card.className = 'tile-card';
      card.innerHTML = `
        <div class="tile-img-wrap">
          <img src="${t.file}" alt="${t.name}" loading="lazy">
        </div>
        <div class="tile-id">${t.name}</div>
        <div class="tile-sides">📐 Стороны: [${t.edges.toUpperCase()}] · ${t.sides_desc}</div>
        <div class="tile-desc">${t.desc}</div>
        <div class="card-btns">
          <a class="card-btn pri" href="${t.file}" download="${t.id}.png">Скачать 512×512</a>
          <button class="card-btn" onclick="selectForSim('${t.id}')">В симулятор</button>
        </div>
      `;
      grid.appendChild(card);
    }
  });
}

function renderFilters() {
  const c = document.getElementById('filters');
  c.innerHTML = FILTERS.map(f => `
    <button class="filter-btn ${f.id === activeFilter ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>
  `).join('');
}

// SIMULATOR LOGIC
let selectedTileId = CLASSIC_TILES[0].id;
let selectedRot = 0; // 0, 1, 2, 3
const boardState = Array(9).fill(null); // 3x3 grid

function selectForSim(id) {
  selectedTileId = id;
  selectedRot = 0;
  document.querySelectorAll('.view-tab').forEach(b => b.classList.toggle('active', b.dataset.view === 'simulator'));
  document.getElementById('catalogView').style.display = 'none';
  document.getElementById('simulatorView').style.display = 'block';
  updateSimUI();
}

function updateSimUI() {
  const tile = CLASSIC_TILES.find(t => t.id === selectedTileId) || CLASSIC_TILES[0];
  document.getElementById('curTileName').textContent = `${tile.name} (Поворот: ${selectedRot * 90}°)`;

  // Update tray items
  const tray = document.getElementById('simTray');
  tray.innerHTML = CLASSIC_TILES.map(t => `
    <div class="tray-item ${t.id === selectedTileId ? 'selected' : ''}" onclick="selectedTileId='${t.id}';selectedRot=0;updateSimUI()">
      <img src="./classic_4side/${t.id}.png" alt="${t.name}">
      <span>${t.name}</span>
    </div>
  `).join('');

  // Render 3x3 board
  const b = document.getElementById('simBoard');
  b.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    const cellData = boardState[i];
    if (cellData) {
      cell.innerHTML = `
        <img src="./classic_4side/${cellData.id}.png" style="transform:rotate(${cellData.rot * 90}deg)">
        <span class="rot-badge">${cellData.rot * 90}°</span>
        <span class="match-check">✓</span>
      `;
    } else {
      cell.innerHTML = '<span class="empty-plus">+</span>';
    }
    cell.onclick = () => onCellClick(i);
    b.appendChild(cell);
  }
}

// Edge matching rules: 0: North, 1: East, 2: South, 3: West
function edgeAt(cellData, dir) {
  const t = CLASSIC_TILES.find(x => x.id === cellData.id);
  // turned clockwise by rot: facing dir comes from (dir - rot + 4) % 4
  return t.edges[(dir - cellData.rot + 4) % 4];
}

function checkFit(index, tileId, rot) {
  const r = Math.floor(index / 3), c = index % 3;
  const testData = {id: tileId, rot};
  const statusEl = document.getElementById('boardStatus');

  // Check 4 neighbours: North (r-1, c), East (r, c+1), South (r+1, c), West (r, c-1)
  const nbCoords = [
    {d: 0, opp: 2, idx: (r - 1) * 3 + c, valid: r > 0, name: 'Север'},
    {d: 1, opp: 3, idx: r * 3 + (c + 1), valid: c < 2, name: 'Восток'},
    {d: 2, opp: 0, idx: (r + 1) * 3 + c, valid: r < 2, name: 'Юг'},
    {d: 3, opp: 1, idx: r * 3 + (c - 1), valid: c > 0, name: 'Запад'}
  ];

  let matchesCount = 0;
  for (const nb of nbCoords) {
    if (!nb.valid) continue;
    const nbData = boardState[nb.idx];
    if (!nbData) continue;

    const myEdge = edgeAt(testData, nb.d);
    const theirEdge = edgeAt(nbData, nb.opp);

    if (myEdge !== theirEdge) {
      const edgeNames = {w: 'Река', r: 'Дорога', f: 'Луг', c: 'Город/Крепость', b: 'Мост'};
      statusEl.className = 'board-status error';
      statusEl.textContent = `❌ Ошибка стыковки на стороне ${nb.name}: у вашего тайла [${edgeNames[myEdge] || myEdge}], а у соседа [${edgeNames[theirEdge] || theirEdge}]! Поверните тайл или выберите подходящий.`;
      return false;
    }
    matchesCount++;
  }

  statusEl.className = 'board-status success';
  statusEl.textContent = matchesCount > 0 
    ? `✅ Идеальная стыковка! Совпало сторон: ${matchesCount}. Все дороги, реки и луга непрерывно продолжают друг друга!`
    : `✅ Тайл успешно установлен на поле!`;
  return true;
}

function onCellClick(index) {
  if (boardState[index]) {
    // click on placed tile rotates it
    boardState[index].rot = (boardState[index].rot + 1) % 4;
    checkFit(index, boardState[index].id, boardState[index].rot);
    updateSimUI();
    return;
  }
  if (!selectedTileId) return;
  if (checkFit(index, selectedTileId, selectedRot)) {
    boardState[index] = {id: selectedTileId, rot: selectedRot};
    updateSimUI();
  }
}

document.getElementById('btnRotate').onclick = () => {
  selectedRot = (selectedRot + 1) % 4;
  updateSimUI();
};

document.getElementById('btnClearBoard').onclick = () => {
  boardState.fill(null);
  // Put starting tile in center
  boardState[4] = {id: 'tile_4s_river_straight', rot: 0};
  document.getElementById('boardStatus').className = 'board-status info';
  document.getElementById('boardStatus').textContent = 'Поле сброшено! В центре установлен стартовый тайл реки.';
  updateSimUI();
};

document.getElementById('viewTabs').addEventListener('click', e => {
  const tab = e.target.closest('.view-tab');
  if (tab) {
    document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
    tab.classList.add('active');
    const view = tab.dataset.view;
    document.getElementById('catalogView').style.display = view === 'catalog' ? 'block' : 'none';
    document.getElementById('simulatorView').style.display = view === 'simulator' ? 'block' : 'none';
  }
});

document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderCatalog();
  }
});

document.getElementById('search').addEventListener('input', renderCatalog);

// Initialize with start tile in center
boardState[4] = {id: 'tile_4s_river_straight', rot: 0};
renderFilters();
renderCatalog();
updateSimUI();
</script>
</body>
</html>
"""

with open("tools/export-tiles.html", "w", encoding="utf-8") as f:
    f.write(gallery_html)

print("Updated tools/export-tiles.html with interactive playground!")
