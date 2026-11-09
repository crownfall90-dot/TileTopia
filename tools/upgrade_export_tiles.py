import os, sys

sys.stdout.reconfigure(encoding='utf-8')

new_html = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>🧩 Галерея и спрайты плиток Tiletopia (3D Диорамы 4-стороны и 6-сторонные гексы 512×512)</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #080c18;
    color: #e6ecf8;
    margin: 0;
    padding: 24px;
    min-height: 100vh;
  }
  .container { max-width: 1440px; margin: 0 auto; }
  header {
    background: linear-gradient(135deg, #11172f 0%, #17244a 100%);
    border: 1px solid rgba(242,184,75,0.25);
    border-radius: 22px;
    padding: 28px 32px;
    margin-bottom: 24px;
    box-shadow: 0 12px 38px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }
  header::before {
    content: "";
    position: absolute;
    top: -50px;
    right: -50px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(242,184,75,0.15), transparent 70%);
    pointer-events: none;
  }
  h1 { margin: 0 0 10px; font-size: 30px; color: #f2b84b; display: flex; align-items: center; gap: 12px; }
  p { margin: 0 0 18px; color: #9aa8c7; font-size: 15px; line-height: 1.55; max-width: 1000px; }
  .actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 18px; }
  .btn-primary {
    background: linear-gradient(135deg, #f2b84b, #f2994a);
    color: #101729;
    text-decoration: none;
    border: 0;
    padding: 12px 22px;
    border-radius: 13px;
    font-weight: 800;
    cursor: pointer;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform .15s, box-shadow .15s;
    box-shadow: 0 4px 18px rgba(242,184,75,0.35);
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(242,184,75,0.5); }
  .btn-sec {
    background: rgba(255,255,255,0.07);
    color: #fff;
    text-decoration: none;
    padding: 11px 18px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 13.5px;
    border: 1px solid rgba(255,255,255,0.12);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background .15s, border-color .15s, transform .15s;
  }
  .btn-sec:hover { background: rgba(255,255,255,0.14); border-color: rgba(242,184,75,0.4); transform: translateY(-1px); }
  
  .mode-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    background: rgba(255,255,255,0.04);
    padding: 6px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    flex-wrap: wrap;
  }
  .mode-tab {
    flex: 1;
    min-width: 220px;
    padding: 14px 20px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 12px;
    color: #9aa8c7;
    font-size: 14.5px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all .2s;
  }
  .mode-tab:hover { color: #fff; background: rgba(255,255,255,0.06); }
  .mode-tab.active {
    background: linear-gradient(135deg, rgba(242,184,75,0.22), rgba(242,184,75,0.08));
    border-color: rgba(242,184,75,0.6);
    color: #f2b84b;
    box-shadow: 0 4px 16px rgba(242,184,75,0.2);
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; }
  .filter-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: #9aa8c7;
    padding: 8px 16px;
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
    padding: 10px 16px;
    color: #fff;
    font-size: 14px;
    min-width: 260px;
    outline: none;
    transition: border-color .15s;
  }
  .search-box:focus { border-color: #f2b84b; }

  .stats-bar {
    font-size: 13.5px;
    color: #7b8eb5;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 22px;
  }

  .tile-card {
    background: #111831;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 18px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    transition: transform .2s cubic-bezier(.2,.8,.2,1), border-color .2s, box-shadow .2s;
    position: relative;
    overflow: hidden;
  }
  .tile-card:hover {
    transform: translateY(-5px);
    border-color: rgba(242,184,75,0.5);
    box-shadow: 0 12px 32px rgba(0,0,0,0.6), 0 0 18px rgba(242,184,75,0.15);
  }

  .tile-img-wrap {
    width: 240px;
    height: 240px;
    background: radial-gradient(circle at 50% 50%, #151e3d, #0b1022);
    border-radius: 16px;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.7);
    position: relative;
  }
  .tile-card img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
    transition: transform .25s cubic-bezier(.3,1.4,.5,1);
  }
  .tile-card:hover img {
    transform: scale(1.06);
  }

  .tile-id { font-weight: 800; font-size: 16px; color: #fff; letter-spacing: 0.5px; }
  .tile-name { font-size: 14px; color: #f2b84b; font-weight: 600; min-height: 20px; }
  .tile-meta { display: flex; gap: 8px; font-size: 12px; color: #7f91ba; flex-wrap: wrap; justify-content: center; }
  .tile-tag {
    background: rgba(255,255,255,0.06);
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .tile-sides {
    background: rgba(242,184,75,0.12);
    color: #ffd875;
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid rgba(242,184,75,0.25);
    font-weight: 700;
    font-size: 11.5px;
  }
  .tile-desc {
    font-size: 12.5px;
    color: #9aa8c7;
    line-height: 1.4;
    min-height: 34px;
  }

  .dl-btn {
    background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
    border: 1px solid rgba(255,255,255,0.15);
    color: #fff;
    text-decoration: none;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    border-radius: 12px;
    width: 100%;
    text-align: center;
    transition: all .18s;
    margin-top: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .dl-btn:hover {
    background: #f2b84b;
    color: #101729;
    border-color: #f2b84b;
    box-shadow: 0 4px 14px rgba(242,184,75,0.3);
  }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>🧩 Спрайты и 3D-плитки Tiletopia</h1>
    <p>Высокодетализированные спрайты плиток в разрешении <b>512×512 px</b>: классические 4-сторонние квадратные диорамы, 6-сторонние гексагональные диорамы, а также векторные плоские тайлы для игры. Все файлы снабжены альфа-прозрачностью и готовы для добавления в игру и полировки в графических редакторах.</p>
    <div class="actions">
      <a class="btn-primary" href="./tiletopia-all-diorama-tiles.zip" download>💾 Скачать ВСЕ 3D диорамы (.zip 6.5 МБ)</a>
      <a class="btn-sec" href="./tiletopia-classic-4side-diorama.zip" download>📦 3D Классика 4-стороны (.zip 4.2 МБ)</a>
      <a class="btn-sec" href="./tiletopia-hex-6side-diorama.zip" download>⬢ 3D Гексы 6-сторон (.zip 2.3 МБ)</a>
      <a class="btn-sec" href="./tiletopia-all-tiles-512x512.zip" download>🧩 Плоские векторные (.zip 1.7 МБ)</a>
      <a class="btn-sec" href="../staging/">🎮 Открыть игру (Staging)</a>
    </div>
  </header>

  <div class="mode-tabs" id="modeTabs">
    <button class="mode-tab active" data-mode="classic_4side">
      <span>🏰 3D Диорамы: Классика (4 стороны)</span>
    </button>
    <button class="mode-tab" data-mode="hex_6side">
      <span>⬢ 3D Диорамы: Гексы (6 сторон)</span>
    </button>
    <button class="mode-tab" data-mode="flat_37">
      <span>🧩 Векторные плитки игры (37 шт)</span>
    </button>
  </div>

  <div class="toolbar">
    <div class="filters" id="filters"></div>
    <input type="text" id="search" class="search-box" placeholder="🔍 Поиск (река, мост, замок, cap, wBr…)">
  </div>

  <div class="stats-bar">
    <span id="counter">Показано: 0 плиток</span>
    <span id="resBadge">Разрешение спрайтов: 512×512 px PNG (RGBA)</span>
  </div>

  <div class="grid" id="grid"></div>
</div>

<script>
// 1. Classic 4-side 3D Diorama Tiles
const TILES_CLASSIC_4SIDE = [
  {id: 'tile_4s_river_straight', name: 'Река (прямое русло)', cat: 'river', sides: 'N-S Река · E,W Луга', desc: 'Лазурная река с кристальной водой и цветущими луговыми берегами', file: './classic_4side/tile_4s_river_straight.png'},
  {id: 'tile_4s_river_bridge', name: 'Мост через реку', cat: 'bridge river road', sides: 'N-S Река · E-W Тракт', desc: 'Арочный каменный мост через реку со стыками дорог по краям', file: './classic_4side/tile_4s_river_bridge.png'},
  {id: 'tile_4s_lake_grand_bridge', name: 'Большой мост через озеро', cat: 'bridge lake water', sides: 'N-S Мост · Все стороны Озеро', desc: 'Величественный каменный акведук-мост через глубокое озеро', file: './classic_4side/tile_4s_lake_grand_bridge.png'},
  {id: 'tile_4s_lake_basin', name: 'Озеро с причалом', cat: 'lake water', sides: 'Центр Озеро · Берега', desc: 'Глубокое горное озеро с деревянным причалом и кувшинками', file: './classic_4side/tile_4s_lake_basin.png'},
  {id: 'tile_4s_road_straight', name: 'Тракт (прямая дорога)', cat: 'road', sides: 'N-S Тракт · E,W Луга', desc: 'Мощеный булыжный тракт с придорожными цветами', file: './classic_4side/tile_4s_road_straight.png'},
  {id: 'tile_4s_road_crossroad', name: 'Перекрёсток четырёх дорог', cat: 'road', sides: 'N,E,S,W 4 дороги', desc: 'Пересечение четырех трактов с каменным путеводным столбом', file: './classic_4side/tile_4s_road_crossroad.png'},
  {id: 'tile_4s_village', name: 'Деревня (поселение)', cat: 'village city', sides: 'N,E,S,W Луга / Поля', desc: 'Уютная средневековая деревня с черепичными крышами и домиками', file: './classic_4side/tile_4s_village.png'},
  {id: 'tile_4s_fortress', name: 'Крепость (цитадель)', cat: 'fortress city', sides: 'N,E,S,W Стены / Замок', desc: 'Неприступная каменная цитадель с угловыми башнями и флагами', file: './classic_4side/tile_4s_fortress.png'},
  {id: 'tile_4s_monastery', name: 'Монастырь (капелла)', cat: 'monastery cap', sides: 'N,E,S,W Сад / Луга', desc: 'Уединенный каменный монастырь на холме с колокольней и кипарисами', file: './classic_4side/tile_4s_monastery.png'},
];

// 2. Hexagonal 6-side 3D Diorama Tiles
const TILES_HEX_6SIDE = [
  {id: 'tile_6s_river_straight', name: 'Гекс: Река', cat: 'river', sides: 'Грани 1 и 4 (противоположные)', desc: 'Лазурный речной поток, пересекающий шестигранный тайл', file: './hex_6side/tile_6s_river_straight.png'},
  {id: 'tile_6s_river_bridge', name: 'Гекс: Мост через реку', cat: 'bridge river road', sides: 'Грани 1-4 Река · Грани 2-5 Дорога', desc: 'Каменный мост, соединяющий берега реки на гексе', file: './hex_6side/tile_6s_river_bridge.png'},
  {id: 'tile_6s_lake_grand_bridge', name: 'Гекс: Большой мост через озеро', cat: 'bridge lake water', sides: 'Грани 1-4 Мост · 6 граней Озеро', desc: 'Монументальный многоарочный мост через широкое озеро', file: './hex_6side/tile_6s_lake_grand_bridge.png'},
  {id: 'tile_6s_lake_basin', name: 'Гекс: Озеро', cat: 'lake water', sides: 'Озеро в чаше гекса', desc: 'Зеркальная гладь озера с каменистыми отмелями', file: './hex_6side/tile_6s_lake_basin.png'},
  {id: 'tile_6s_road_straight', name: 'Гекс: Дорожный тракт', cat: 'road', sides: 'Грани 1 и 4 Дорога', desc: 'Прямой булыжный тракт через зеленый луг гекса', file: './hex_6side/tile_6s_road_straight.png'},
  {id: 'tile_6s_road_junction', name: 'Гекс: Развилка 3 дорог', cat: 'road', sides: 'Грани 1, 3, 5 Дороги', desc: 'Сход трех дорог к центральной развилке гекса', file: './hex_6side/tile_6s_road_junction.png'},
  {id: 'tile_6s_village', name: 'Гекс: Средневековая деревня', cat: 'village city', sides: 'Грани 1-6 Сельские угодья', desc: 'Селение с фахверковыми домиками, мельницей и садами', file: './hex_6side/tile_6s_village.png'},
  {id: 'tile_6s_fortress', name: 'Гекс: Замок-цитадель', cat: 'fortress city', sides: 'Грани 1-6 Бастионы', desc: 'Шестигранный каменный бастион с угловыми башнями и рвом', file: './hex_6side/tile_6s_fortress.png'},
  {id: 'tile_6s_monastery', name: 'Гекс: Монастырь', cat: 'monastery cap', sides: 'Грани 1-6 Святые земли', desc: 'Святая обитель на холме с часовой башней и садом роз', file: './hex_6side/tile_6s_monastery.png'},
];

// 3. Flat Vector Tiles (37 items)
const TILES_FLAT_37 = [
  {id: 'cap', name: 'Капелла (монастырь)', cat: 'monastery cap', sides: 'cfff', desc: '4 поля вокруг монастыря', file: './tile_cap.png'},
  {id: 'capRS', name: 'Капелла с трактом', cat: 'monastery cap road', sides: 'crfr', desc: '1 дорога, 3 поля', file: './tile_capRS.png'},
  {id: 'capRL', name: 'Капелла с заездом слева', cat: 'monastery cap road', sides: 'cfrr', desc: 'Поворот дороги у монастыря', file: './tile_capRL.png'},
  {id: 'capRR', name: 'Капелла с заездом справа', cat: 'monastery cap road', sides: 'crrf', desc: 'Поворот дороги у монастыря', file: './tile_capRR.png'},
  {id: 'rS', name: 'Прямая дорога', cat: 'road', sides: 'rfrf', desc: 'Тракт сквозь поля', file: './tile_rS.png'},
  {id: 'rC', name: 'Поворот дороги', cat: 'road', sides: 'ffrr', desc: 'Угол 90 градусов', file: './tile_rC.png'},
  {id: 'r3', name: 'Перекрёсток трёх дорог', cat: 'road', sides: 'frrr', desc: 'Т-образная развилка', file: './tile_r3.png'},
  {id: 'r4', name: 'Перекрёсток четырёх дорог', cat: 'road', sides: 'rrrr', desc: 'Крестовина дорог', file: './tile_r4.png'},
  {id: 'fort', name: 'Застава / Форт', cat: 'fortress', sides: 'ffff', desc: 'Деревянный форт в полях', file: './tile_fort.png'},
  {id: 'fortR', name: 'Форт с трактом', cat: 'fortress road', sides: 'ffrf', desc: 'Охраняемый въезд', file: './tile_fortR.png'},
  {id: 'brHalf', name: 'Мостовой переход (стык)', cat: 'bridge road', sides: 'fbfr', desc: 'Половина большого моста', file: './tile_brHalf.png'},
  {id: 'c4', name: 'Большой город', cat: 'city', sides: 'cccc', desc: '4 городские стены', file: './tile_c4.png'},
  {id: 'c3', name: 'Город с трёх сторон', cat: 'city', sides: 'cccf', desc: 'Большой квартал', file: './tile_c3.png'},
  {id: 'c3r', name: 'Город с трёх сторон и дорога', cat: 'city road', sides: 'cccr', desc: 'Городские ворота', file: './tile_c3r.png'},
  {id: 'c2', name: 'Угол города (2 стены)', cat: 'city', sides: 'ccff', desc: 'Угловой бастион', file: './tile_c2.png'},
  {id: 'c2r', name: 'Угол города и тракты', cat: 'city road', sides: 'ccrr', desc: 'Угловые ворота', file: './tile_c2r.png'},
  {id: 'band', name: 'Город-перемычка', cat: 'city', sides: 'fcfc', desc: 'Сквозной квартал', file: './tile_band.png'},
  {id: 'wS', name: 'Прямая река', cat: 'river', sides: 'wfwf', desc: 'Русло реки', file: './tile_wS.png'},
  {id: 'wC', name: 'Изгиб реки', cat: 'river', sides: 'wwff', desc: 'Речной поворот', file: './tile_wC.png'},
  {id: 'wBr', name: 'Мост через реку', cat: 'river bridge road', sides: 'wrwr', desc: 'Каменный мост над рекой', file: './tile_wBr.png'},
  {id: 'wLake', name: 'Озеро / исток реки', cat: 'river lake', sides: 'wwww', desc: 'Большое озеро', file: './tile_wLake.png'},
  {id: 'wCity', name: 'Речная набережная у города', cat: 'river city', sides: 'wcwf', desc: 'Город у реки', file: './tile_wCity.png'},
  {id: 'wTee', name: 'Слияние рек', cat: 'river', sides: 'wwwf', desc: 'Тройной речной приток', file: './tile_wTee.png'},
  {id: 'wEnd', name: 'Речной тупик / исток', cat: 'river', sides: 'wfff', desc: 'Заводь реки', file: './tile_wEnd.png'},
  {id: 'wRC', name: 'Река и поворот дороги', cat: 'river road', sides: 'wwrr', desc: 'Береговой тракт', file: './tile_wRC.png'},
  {id: 'rEnd', name: 'Обрыв / тупик дороги', cat: 'road', sides: 'rfxf', desc: 'Скалистый обрыв', file: './tile_rEnd.png'},
  {id: 'rMine', name: 'Шахта и рудник', cat: 'road', sides: 'rfff', desc: 'Дорога к руднику', file: './tile_rMine.png'},
  {id: 'rRock', name: 'Дорога у скалы', cat: 'road', sides: 'rfff', desc: 'Каменная гряда у тракта', file: './tile_rRock.png'},
  {id: 'rocks', name: 'Скалистый мыс', cat: 'nature', sides: 'ffff', desc: 'Горная цепь в поле', file: './tile_rocks.png'},
  {id: 'xcrcr', name: 'Город и две дороги', cat: 'city road', sides: 'crcr', desc: 'Северная стена', file: './tile_xcrcr.png'},
  {id: 'xccfr', name: 'Город и тупик дороги', cat: 'city road', sides: 'ccfr', desc: 'Базарная площадь', file: './tile_xccfr.png'},
  {id: 'xccrf', name: 'Город и дорога', cat: 'city road', sides: 'ccrf', desc: 'Восточный выезд', file: './tile_xccrf.png'},
  {id: 'xcrcf', name: 'Город и перекрёсток', cat: 'city road', sides: 'crcf', desc: 'Торговый узел', file: './tile_xcrcf.png'},
  {id: 'xcfrf', name: 'Город и поворот дороги', cat: 'city road', sides: 'cfrf', desc: 'Пригород', file: './tile_xcfrf.png'},
  {id: 'xcffr', name: 'Город и изгиб дороги', cat: 'city road', sides: 'cffr', desc: 'Пригородный поворот', file: './tile_xcffr.png'},
  {id: 'xcrff', name: 'Город и прямой тракт', cat: 'city road', sides: 'crff', desc: 'Главная дорога', file: './tile_xcrff.png'},
  {id: 'xcrrr', name: 'Город и тройник дорог', cat: 'city road', sides: 'crrr', desc: 'Перекрёсток у ворот', file: './tile_xcrrr.png'}
];

const FILTERS_CONFIG = {
  classic_4side: [
    {id: 'all', label: 'Все 3D (9)'},
    {id: 'river', label: 'Реки'},
    {id: 'lake', label: 'Озёра'},
    {id: 'bridge', label: 'Мосты'},
    {id: 'road', label: 'Дороги'},
    {id: 'village', label: 'Деревни'},
    {id: 'fortress', label: 'Крепости'},
    {id: 'monastery', label: 'Монастыри'},
  ],
  hex_6side: [
    {id: 'all', label: 'Все Гексы (9)'},
    {id: 'river', label: 'Реки'},
    {id: 'lake', label: 'Озёра'},
    {id: 'bridge', label: 'Мосты'},
    {id: 'road', label: 'Дороги'},
    {id: 'village', label: 'Деревни'},
    {id: 'fortress', label: 'Крепости'},
    {id: 'monastery', label: 'Монастыри'},
  ],
  flat_37: [
    {id: 'all', label: 'Все (37)'},
    {id: 'city', label: 'Города'},
    {id: 'road', label: 'Дороги'},
    {id: 'monastery', label: 'Монастыри'},
    {id: 'river', label: 'Реки и озёра'},
    {id: 'fortress', label: 'Крепости'},
  ]
};

let currentMode = 'classic_4side';
let activeFilter = 'all';

const grid = document.getElementById('grid');
const counter = document.getElementById('counter');
const searchInput = document.getElementById('search');
const filtersContainer = document.getElementById('filters');
const modeTabsContainer = document.getElementById('modeTabs');

function getActiveList() {
  if (currentMode === 'classic_4side') return TILES_CLASSIC_4SIDE;
  if (currentMode === 'hex_6side') return TILES_HEX_6SIDE;
  return TILES_FLAT_37;
}

function renderFilters() {
  const cfg = FILTERS_CONFIG[currentMode] || FILTERS_CONFIG.classic_4side;
  filtersContainer.innerHTML = cfg.map(f => `
    <button class="filter-btn ${f.id === activeFilter ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>
  `).join('');
}

function render() {
  const list = getActiveList();
  const q = searchInput.value.trim().toLowerCase();
  grid.innerHTML = '';
  let count = 0;

  list.forEach(t => {
    const matchesFilter = activeFilter === 'all' || t.cat.includes(activeFilter);
    const matchesQuery = !q || t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || (t.desc && t.desc.toLowerCase().includes(q));

    if (matchesFilter && matchesQuery) {
      count++;
      const card = document.createElement('div');
      card.className = 'tile-card';
      card.innerHTML = `
        <div class="tile-img-wrap">
          <img src="${t.file}" alt="${t.name}" loading="lazy">
        </div>
        <div class="tile-id">${t.name}</div>
        <div class="tile-meta">
          <span class="tile-sides">📐 ${t.sides}</span>
        </div>
        <div class="tile-desc">${t.desc}</div>
        <a class="dl-btn" href="${t.file}" download="${t.id}.png">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Скачать PNG (512×512)
        </a>
      `;
      grid.appendChild(card);
    }
  });

  counter.textContent = `Показано: ${count} из ${list.length}`;
}

modeTabsContainer.addEventListener('click', e => {
  const tab = e.target.closest('.mode-tab');
  if (tab) {
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    activeFilter = 'all';
    renderFilters();
    render();
  }
});

filtersContainer.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    render();
  }
});

searchInput.addEventListener('input', render);

renderFilters();
render();
</script>
</body>
</html>
"""

with open('tools/export-tiles.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Successfully upgraded tools/export-tiles.html")
