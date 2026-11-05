const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const iconsDir = path.join(root, 'store/icons_variants');
const featureDir = path.join(root, 'store/feature_variants');
const screensDir = path.join(root, 'store/screenshots_showcase');

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(featureDir, { recursive: true });
fs.mkdirSync(screensDir, { recursive: true });

// Common SVG & Styling definitions
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800;900&family=Onest:wght@500;600;700;800;900&display=swap');
`;

(async () => {
  console.log('Starting variant generation with Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Helper to render HTML to image
  const renderHtml = async (html, width, height, outPath, scale = 1) => {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: scale });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: outPath });
    await page.close();
    console.log(`✓ Created: ${path.basename(outPath)} (${width * scale}x${height * scale})`);
  };

  // -------------------------------------------------------------
  // 1. ICON VARIANTS (512x512)
  // -------------------------------------------------------------

  // Variant 1: "Tt" Royal Monogram (already rendered, copy to variants)
  fs.copyFileSync(path.join(root, 'store/icon-512.png'), path.join(iconsDir, 'icon-1-monogram-tt.png'));
  console.log('✓ Copied icon-1-monogram-tt.png');

  // Variant 2: Full Title "TILETOPIA" on Grand Strategy Tile
  const icon2Html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 512px; height: 512px; overflow: hidden;
    background: radial-gradient(circle at 50% 35%, #2d4277, #131b34 60%, #080c1a 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Onest', sans-serif;
  }
  .grid-pattern {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .tile-card {
    position: relative; width: 410px; height: 410px;
    border-radius: 64px;
    background: #64b335;
    box-shadow: 0 20px 0 #3a681c, 0 35px 50px rgba(0,0,0,0.65);
    border: 5px solid rgba(255,255,255,0.25);
    overflow: hidden;
  }
  /* River & Road */
  .river {
    position: absolute; top: -50px; left: 160px; width: 100px; height: 520px;
    background: linear-gradient(135deg, #4dc9f6, #1c78b8);
    transform: rotate(38deg);
    box-shadow: 0 0 20px rgba(28,120,184,0.6);
  }
  .river-wave {
    position: absolute; inset: 0;
    border-left: 3px dashed rgba(255,255,255,0.5);
    margin-left: 45px;
  }
  .road {
    position: absolute; top: 180px; left: -50px; width: 520px; height: 60px;
    background: linear-gradient(180deg, #edd6a6, #c2a265);
    border-top: 3px solid #8e6f33; border-bottom: 3px solid #8e6f33;
    transform: rotate(-25deg);
    box-shadow: 0 10px 20px rgba(0,0,0,0.25);
  }
  /* Castle */
  .castle {
    position: absolute; top: 15px; left: 15px; width: 140px; height: 140px;
    background: #d6bc85; border-radius: 40px 15px 70px 15px;
    border: 4px solid #735122;
    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
  }
  .roof { position: absolute; width: 34px; height: 18px; background: #c54832; border-radius: 4px; }
  /* Full Title Banner */
  .banner-wrap {
    position: absolute; bottom: 25px; left: 15px; right: 15px;
    display: flex; flex-direction: column; align-items: center;
  }
  .badge-full {
    transform: skewX(-12deg);
    background: linear-gradient(180deg, #172445 0%, #0c1326 100%);
    border: 2px solid #ffd770;
    border-radius: 20px;
    padding: 12px 28px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.4);
    display: flex; flex-direction: column; align-items: center;
  }
  .badge-full-inner {
    transform: skewX(12deg);
    display: flex; flex-direction: column; align-items: center;
  }
  .brand-text {
    font-family: 'Unbounded', sans-serif;
    font-size: 34px; font-weight: 900; letter-spacing: 0.5px;
    background: linear-gradient(180deg, #fff3b0 0%, #fdbb2d 60%, #b87814 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
  }
  .subtitle {
    font-size: 11px; font-weight: 800; letter-spacing: 3px; color: #b8c8ed;
    text-transform: uppercase; margin-top: 2px;
  }
</style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="tile-card">
    <div class="river"><div class="river-wave"></div></div>
    <div class="road"></div>
    <div class="castle">
      <div class="roof" style="top:18px;left:18px"></div>
      <div class="roof" style="top:18px;left:64px"></div>
      <div class="roof" style="top:54px;left:38px"></div>
    </div>
    <div class="banner-wrap">
      <div class="badge-full">
        <div class="badge-full-inner">
          <div class="brand-text">TILETOPIA</div>
          <div class="subtitle">Стратегия Миров</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  await renderHtml(icon2Html, 512, 512, path.join(iconsDir, 'icon-2-full-tiletopia.png'));

  // Variant 3: Sovereign Golden Meeple on Marble/Stone Tactical Tile
  const icon3Html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 512px; height: 512px; overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #1e2d52, #0d1428 65%, #050812 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Onest', sans-serif;
  }
  .sun-rays {
    position: absolute; width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(255, 215, 112, 0.12) 0%, transparent 65%);
  }
  .pedestal-tile {
    position: relative; width: 390px; height: 390px;
    border-radius: 68px;
    background: linear-gradient(145deg, #2b395e, #18223a);
    box-shadow: 0 24px 0 #0f1626, 0 38px 60px rgba(0,0,0,0.7);
    border: 4px solid rgba(255,255,255,0.18);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .tile-inner-border {
    position: absolute; inset: 16px;
    border-radius: 54px;
    border: 2px dashed rgba(255, 215, 112, 0.35);
  }
  .meeple-svg {
    width: 175px; height: 195px;
    filter: drop-shadow(0 15px 22px rgba(0,0,0,0.6));
    z-index: 5;
  }
  .crown-svg {
    position: absolute; top: 75px; width: 65px; height: 45px;
    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
    z-index: 6;
  }
  .label-card {
    margin-top: 15px; z-index: 10;
    transform: skewX(-12deg);
    background: linear-gradient(135deg, #ffd770, #e59c1b);
    padding: 8px 30px; border-radius: 14px;
    box-shadow: 0 8px 18px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.6);
  }
  .label-card span {
    transform: skewX(12deg); display: block;
    font-family: 'Unbounded', sans-serif; font-size: 21px; font-weight: 900;
    color: #241402; letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="sun-rays"></div>
  <div class="pedestal-tile">
    <div class="tile-inner-border"></div>
    
    <!-- Crown -->
    <svg class="crown-svg" viewBox="0 0 60 40">
      <path d="M 6 34 L 54 34 L 50 14 L 38 24 L 30 6 L 22 24 L 10 14 Z" fill="url(#goldCrown)" stroke="#7d4e06" stroke-width="2"/>
      <circle cx="30" cy="5" r="3.5" fill="#fff" />
      <circle cx="10" cy="13" r="2.8" fill="#fff" />
      <circle cx="50" cy="13" r="2.8" fill="#fff" />
      <defs>
        <linearGradient id="goldCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff5c0"/>
          <stop offset="100%" stop-color="#e59c1b"/>
        </linearGradient>
      </defs>
    </svg>

    <!-- Golden Meeple -->
    <svg class="meeple-svg" viewBox="0 0 100 110">
      <defs>
        <linearGradient id="meepleGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe894"/>
          <stop offset="45%" stop-color="#f5af19"/>
          <stop offset="100%" stop-color="#b86b04"/>
        </linearGradient>
      </defs>
      <path d="M50 8 C58 8 64 15 64 24 C64 29 62 33 59 36 C69 40 78 48 84 58 C87 63 82 70 76 68 C71 66 68 62 65 57 L65 82 L77 100 C80 105 75 110 70 110 C66 110 63 107 61 103 L50 85 L39 103 C37 107 34 110 30 110 C25 110 20 105 23 100 L35 82 L35 57 C32 62 29 66 24 68 C18 70 13 63 16 58 C22 48 31 40 41 36 C38 33 36 29 36 24 C36 15 42 8 50 8 Z" 
            fill="url(#meepleGold)" stroke="#663c04" stroke-width="2.5"/>
    </svg>

    <div class="label-card">
      <span>TILETOPIA</span>
    </div>
  </div>
</body>
</html>
  `;
  await renderHtml(icon3Html, 512, 512, path.join(iconsDir, 'icon-3-golden-meeple.png'));

  // Variant 4: Tactical Geometric Emblem (Modern Flat Style)
  const icon4Html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 512px; height: 512px; overflow: hidden;
    background: #0f1523;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Unbounded', sans-serif;
  }
  .app-icon {
    width: 410px; height: 410px;
    border-radius: 76px;
    background: linear-gradient(135deg, #1b2640 0%, #0d1322 100%);
    box-shadow: 0 25px 60px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.15);
    border: 3px solid rgba(255,255,255,0.12);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative;
  }
  .tiles-quad {
    display: grid; grid-template-columns: repeat(2, 110px); gap: 14px;
    transform: rotate(45deg);
    margin-bottom: 20px;
  }
  .q-tile {
    width: 110px; height: 110px; border-radius: 26px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
  }
  .q1 { background: linear-gradient(135deg, #e8b13c, #b37b12); }
  .q2 { background: linear-gradient(135deg, #3aa0ff, #1d6ed8); }
  .q3 { background: linear-gradient(135deg, #4ed36f, #2c9a48); }
  .q4 { background: linear-gradient(135deg, #ff6060, #c83232); }
  .icon-title {
    position: absolute; bottom: 36px;
    font-size: 30px; font-weight: 900;
    letter-spacing: 2px;
    color: #fff;
    text-shadow: 0 4px 14px rgba(0,0,0,0.6);
  }
  .icon-title span { color: #f5b722; }
</style>
</head>
<body>
  <div class="app-icon">
    <div class="tiles-quad">
      <div class="q-tile q1"></div>
      <div class="q-tile q2"></div>
      <div class="q-tile q3"></div>
      <div class="q-tile q4"></div>
    </div>
    <div class="icon-title">TILE<span>TOPIA</span></div>
  </div>
</body>
</html>
  `;
  await renderHtml(icon4Html, 512, 512, path.join(iconsDir, 'icon-4-tactical-modern.png'));

  // Variant 5: 3D Living Village Diorama (Cozy Landscape)
  const icon5Html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 512px; height: 512px; overflow: hidden;
    background: radial-gradient(circle at 50% 35%, #2a3d6a, #111728 75%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Onest', sans-serif;
  }
  .diorama-frame {
    width: 410px; height: 410px; border-radius: 70px;
    background: #508c2a;
    box-shadow: 0 20px 0 #2e5318, 0 35px 50px rgba(0,0,0,0.65);
    border: 5px solid rgba(255,255,255,0.22);
    position: relative; overflow: hidden;
  }
  .d-river {
    position: absolute; top: 120px; left: -60px; width: 550px; height: 90px;
    background: linear-gradient(180deg, #57d4fc, #1f8ac9);
    transform: rotate(18deg);
    box-shadow: 0 0 25px rgba(31,138,201,0.5);
  }
  .d-bridge {
    position: absolute; top: 175px; left: 190px; width: 54px; height: 60px;
    background: #9c8e7c; border: 3px solid #4a3e32; border-radius: 8px;
    z-index: 10;
  }
  .d-house {
    position: absolute; top: 50px; right: 55px; width: 85px; height: 75px;
    background: #eddab9; border: 3px solid #6b4d24; border-radius: 8px;
  }
  .d-house-roof {
    position: absolute; top: -25px; left: -8px; width: 101px; height: 35px;
    background: #c54832; border-radius: 6px; border: 2px solid #631c10;
  }
  .d-trees {
    position: absolute; bottom: 100px; left: 45px;
    display: flex; gap: 10px;
  }
  .d-tree {
    width: 55px; height: 55px; border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #88db4d, #2f7a1f);
    border: 3px solid #1c4d12;
    box-shadow: 0 8px 12px rgba(0,0,0,0.3);
  }
  .diorama-badge {
    position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%) skewX(-12deg);
    background: #141c33; border: 2px solid #f5b722;
    padding: 10px 32px; border-radius: 16px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.6);
  }
  .diorama-badge span {
    transform: skewX(12deg); display: block;
    font-family: 'Unbounded', sans-serif; font-size: 26px; font-weight: 900;
    color: #ffd770;
  }
</style>
</head>
<body>
  <div class="diorama-frame">
    <div class="d-river"></div>
    <div class="d-bridge"></div>
    <div class="d-house">
      <div class="d-house-roof"></div>
    </div>
    <div class="d-trees">
      <div class="d-tree"></div>
      <div class="d-tree" style="width:45px;height:45px;margin-top:10px"></div>
    </div>
    <div class="diorama-badge">
      <span>Tiletopia</span>
    </div>
  </div>
</body>
</html>
  `;
  await renderHtml(icon5Html, 512, 512, path.join(iconsDir, 'icon-5-diorama-village.png'));

  // -------------------------------------------------------------
  // 2. FEATURE GRAPHIC VARIANTS (1024x500)
  // -------------------------------------------------------------

  // Feature 1: Epic Tabletop Showcase (Current high-end, copy over)
  fs.copyFileSync(path.join(root, 'store/feature-1024x500.png'), path.join(featureDir, 'feature-1-epic-tabletop.png'));
  console.log('✓ Copied feature-1-epic-tabletop.png');

  // Feature 2: Seasonal Biomes & World-Building Showcase
  const feat2Html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px; height: 500px; overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #1f2c4c 0%, #0d1322 75%);
    font-family: 'Onest', sans-serif; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative;
  }
  .header-block {
    text-align: center; margin-bottom: 24px; z-index: 10;
  }
  .sub-tag {
    display: inline-block; transform: skewX(-10deg);
    background: rgba(245, 192, 78, 0.15); border: 1px solid rgba(245, 192, 78, 0.45);
    color: #ffd875; padding: 5px 14px; border-radius: 12px; font-weight: 800; font-size: 13px;
    letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;
  }
  .sub-tag span { transform: skewX(10deg); display: block; }
  .hero-title {
    font-family: 'Unbounded', sans-serif; font-size: 46px; font-weight: 900;
    letter-spacing: -0.5px;
  }
  .hero-title span { color: #f5af19; }
  .biomes-row {
    display: flex; gap: 20px; z-index: 10;
  }
  .biome-card {
    width: 215px; height: 240px; border-radius: 24px;
    background: #19233c; border: 2px solid rgba(255,255,255,0.15);
    box-shadow: 0 16px 30px rgba(0,0,0,0.5);
    overflow: hidden; display: flex; flex-direction: column;
    position: relative;
    transform: skewX(-6deg);
    transition: transform .2s ease;
  }
  .biome-inner {
    transform: skewX(6deg); height: 100%; display: flex; flex-direction: column;
  }
  .biome-art {
    height: 140px; position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .b-village { background: linear-gradient(135deg, #5da32b, #326312); }
  .b-city { background: linear-gradient(135deg, #3182ce, #1a4971); }
  .b-siberia { background: linear-gradient(135deg, #5ca0d3, #25547a); }
  .b-jungle { background: linear-gradient(135deg, #1fa372, #0d593d); }
  .biome-info {
    padding: 14px 16px; background: #121829; flex: 1;
    display: flex; flex-direction: column; justify-content: center;
  }
  .biome-name { font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 2px; }
  .biome-status { font-size: 12px; font-weight: 600; color: #9bb0dc; }
  .tag-active { color: #4ade80 !important; font-weight: 700; }
  .icon-art { font-size: 44px; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.4)); }
</style>
</head>
<body>
  <div class="header-block">
    <div class="sub-tag"><span>🌍 Сезонные миры и эпохи</span></div>
    <div class="hero-title">Tile<span>topia</span> — Открывайте Новые Земли</div>
  </div>
  <div class="biomes-row">
    <div class="biome-card">
      <div class="biome-inner">
        <div class="biome-art b-village"><span class="icon-art">🏰</span></div>
        <div class="biome-info">
          <div class="biome-name">«Деревня»</div>
          <div class="biome-status tag-active">● Доступна сейчас</div>
        </div>
      </div>
    </div>
    <div class="biome-card">
      <div class="biome-inner">
        <div class="biome-art b-city"><span class="icon-art">🏙️</span></div>
        <div class="biome-info">
          <div class="biome-name">«Мегаполис»</div>
          <div class="biome-status">В разработке</div>
        </div>
      </div>
    </div>
    <div class="biome-card">
      <div class="biome-inner">
        <div class="biome-art b-siberia"><span class="icon-art">❄️</span></div>
        <div class="biome-info">
          <div class="biome-name">«Сибирь»</div>
          <div class="biome-status">В разработке</div>
        </div>
      </div>
    </div>
    <div class="biome-card">
      <div class="biome-inner">
        <div class="biome-art b-jungle"><span class="icon-art">🌴</span></div>
        <div class="biome-info">
          <div class="biome-name">«Джунгли»</div>
          <div class="biome-status">В разработке</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  await renderHtml(feat2Html, 1024, 500, path.join(featureDir, 'feature-2-seasonal-worlds.png'));

  // Feature 3: Tactical Multiplayer & Honest Gameplay Showcase
  const feat3Html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px; height: 500px; overflow: hidden;
    background: radial-gradient(100% 120% at 70% 30%, #253b6d 0%, #10172e 60%, #080c1a 100%);
    font-family: 'Onest', sans-serif; color: #fff;
    display: flex; position: relative; padding: 50px 70px;
    align-items: center; justify-content: space-between;
  }
  .left-hero { max-width: 500px; }
  .badge-top {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(76, 175, 80, 0.18); border: 1px solid rgba(76, 175, 80, 0.4);
    color: #69f0ae; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 800;
    margin-bottom: 16px; transform: skewX(-10deg);
  }
  .badge-top span { transform: skewX(10deg); }
  .title-main {
    font-family: 'Unbounded', sans-serif; font-size: 48px; font-weight: 900; line-height: 1.1;
    margin-bottom: 16px;
  }
  .title-main span { color: #f5af19; }
  .desc-text {
    font-size: 17px; line-height: 1.5; color: #b8c8ed; margin-bottom: 26px;
  }
  .mode-pills { display: flex; gap: 12px; flex-wrap: wrap; }
  .m-pill {
    transform: skewX(-12deg);
    padding: 8px 16px; border-radius: 12px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
    font-size: 13.5px; font-weight: 700; color: #e2e8f8;
  }
  .m-pill span { transform: skewX(12deg); display: block; }
  .right-cards {
    display: flex; flex-direction: column; gap: 14px; width: 340px;
  }
  .duel-card {
    background: #17223d; border: 2px solid rgba(255,255,255,0.18);
    border-radius: 18px; padding: 16px 20px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.4);
    display: flex; align-items: center; gap: 16px;
    transform: skewX(-8deg);
  }
  .duel-inner { transform: skewX(8deg); }
  .duel-icon {
    width: 46px; height: 46px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; font-size: 24px;
  }
  .c-gold { background: linear-gradient(135deg, #ffd770, #c88a10); }
  .c-blue { background: linear-gradient(135deg, #5db2ff, #1d6ed8); }
  .c-green { background: linear-gradient(135deg, #53e07d, #209943); }
  .d-name { font-size: 16px; font-weight: 800; color: #fff; }
  .d-sub { font-size: 12px; color: #9bb0dc; margin-top: 2px; }
</style>
</head>
<body>
  <div class="left-hero">
    <div class="badge-top"><span>🛡️ Никакой навязчивой рекламы</span></div>
    <div class="title-main">Играйте вместе в <span>Tiletopia</span></div>
    <div class="desc-text">Уютные вечера в закрытых комнатах с друзьями, динамичные дуэли 1 на 1 или спокойное соло-строительство в Дзен-режиме.</div>
    <div class="mode-pills">
      <div class="m-pill"><span>👥 С друзьями по коду</span></div>
      <div class="m-pill"><span>📱 На одном устройстве</span></div>
      <div class="m-pill"><span>🤖 Умные боты</span></div>
    </div>
  </div>
  <div class="right-cards">
    <div class="duel-card">
      <div class="duel-icon c-gold">🏆</div>
      <div class="duel-inner">
        <div class="d-name">Рейтинговая лига</div>
        <div class="d-sub">Поднимайтесь в сезонном топе</div>
      </div>
    </div>
    <div class="duel-card">
      <div class="duel-icon c-blue">👥</div>
      <div class="duel-inner">
        <div class="d-name">Онлайн с друзьями</div>
        <div class="d-sub">Закрытые комнаты по коду</div>
      </div>
    </div>
    <div class="duel-card">
      <div class="duel-icon c-green">🌿</div>
      <div class="duel-inner">
        <div class="d-name">Дзен-режим</div>
        <div class="d-sub">Созидание без спешки и таймеров</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  await renderHtml(feat3Html, 1024, 500, path.join(featureDir, 'feature-3-tactical-multiplayer.png'));

  // -------------------------------------------------------------
  // 3. BRANDED STORE SCREENSHOTS WITH MARKETING HEADERS (1080x1920)
  // -------------------------------------------------------------
  // Each screenshot combines a top branded marketing banner with the high-res in-game UI screen
  const screenFiles = [
    {
      id: '1-world',
      raw: 'screenshots/1-menu.png',
      tag: 'ПЛИТОЧНАЯ СТРАТЕГИЯ',
      title: 'СОЗДАВАЙТЕ СВОЙ МИР',
      desc: 'Каждая выложенная плитка формирует живой ландшафт'
    },
    {
      id: '2-modes',
      raw: 'screenshots/2-modes.png',
      tag: 'ГИБКИЕ ФОРМАТЫ',
      title: 'РЕЖИМЫ ДЛЯ ВСЕХ',
      desc: 'Онлайн, с друзьями по коду, с ботами или на одном экране'
    },
    {
      id: '3-game',
      raw: 'screenshots/3-game.png',
      tag: 'ТАКТИКА И СОЗИДАНИЕ',
      title: 'ГЛУБОКИЙ ГЕЙМПЛЕЙ',
      desc: 'Соединяйте тракты, реки, крепости и выставляйте миплов'
    },
    {
      id: '4-setup',
      raw: 'screenshots/4-setup.png',
      tag: 'ПРАВИЛА ПОД ВАС',
      title: 'НАСТРОЙКА ПАРТИИ',
      desc: 'Выбирайте размер колоды, таймер ходов и ботов'
    },
    {
      id: '5-results',
      raw: 'screenshots/5-results.png',
      tag: 'СЕЗОННЫЕ ТРОФЕИ',
      title: 'ПОБЕЖДАЙТЕ В ЛИГЕ',
      desc: 'Зарабатывайте кубки и открывайте новые ранги'
    },
    {
      id: '6-shop',
      raw: 'screenshots/6-shop.png',
      tag: 'КОЛЛЕКЦИЯ И СТИЛЬ',
      title: 'МАГАЗИН ФИГУРОК',
      desc: 'Открывайте уникальных миплов, кольца и скины столов'
    }
  ];

  for (const s of screenFiles) {
    const rawData = fs.readFileSync(path.join(root, 'store', s.raw)).toString('base64');
    const rawUrl = 'data:image/png;base64,' + rawData;

    const showcaseHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1080px; height: 1920px; overflow: hidden;
    background: #0b1122;
    display: flex; flex-direction: column;
    font-family: 'Onest', sans-serif;
  }
  .header-card {
    height: 380px; padding: 60px 60px 20px;
    background: radial-gradient(120% 140% at 50% 0%, #293d6e 0%, #11182e 70%, #0b1122 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; z-index: 10;
  }
  .marketing-tag {
    transform: skewX(-10deg);
    background: rgba(245, 192, 78, 0.16); border: 1.5px solid rgba(245, 192, 78, 0.45);
    color: #ffd875; padding: 8px 22px; border-radius: 16px;
    font-size: 22px; font-weight: 800; letter-spacing: 2px;
    margin-bottom: 16px;
  }
  .marketing-tag span { transform: skewX(10deg); display: block; }
  .marketing-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 54px; font-weight: 900; color: #fff;
    letter-spacing: -1px; margin-bottom: 12px;
    text-shadow: 0 4px 18px rgba(0,0,0,0.6);
  }
  .marketing-desc {
    font-size: 28px; font-weight: 600; color: #b8c8ed;
    max-width: 900px; line-height: 1.35;
  }
  .screen-frame {
    flex: 1; padding: 0 40px;
    display: flex; align-items: flex-start; justify-content: center;
    position: relative;
  }
  .phone-mockup {
    width: 920px; height: 1500px;
    border-radius: 46px 46px 0 0;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.7), 0 0 0 10px #1e2a4a;
    overflow: hidden; background: #000;
  }
  .phone-mockup img {
    width: 100%; height: auto; display: block;
  }
</style>
</head>
<body>
  <div class="header-card">
    <div class="marketing-tag"><span>${s.tag}</span></div>
    <div class="marketing-title">${s.title}</div>
    <div class="marketing-desc">${s.desc}</div>
  </div>
  <div class="screen-frame">
    <div class="phone-mockup">
      <img src="${rawUrl}" />
    </div>
  </div>
</body>
</html>
    `;

    const outPath = path.join(screensDir, `${s.id}-showcase.png`);
    await renderHtml(showcaseHtml, 1080, 1920, outPath, 1);
  }

  await browser.close();
  console.log('\n🎉 ALL STORE VARIANTS SUCCESSFULLY GENERATED!');
})();
