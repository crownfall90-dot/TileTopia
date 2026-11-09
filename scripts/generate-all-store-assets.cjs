const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const gameUrl = 'file://' + path.join(root, 'app/src/main/assets/index.html');
const out = f => path.join(root, 'store', f);
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('Launching Chrome to generate store graphics...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  });

  const createPage = async (viewport, dpr) => {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: dpr });
    
    await page.evaluateOnNewDocument(() => {
      window.AndroidApp = {
        versionName: () => '1.0',
        startUpdate() {},
        checkUpdates() {},
        setUpdateNotifications() {}
      };
      localStorage.setItem('wallet', JSON.stringify({
        gold: 2450,
        name: 'Crownfall',
        color: '#3a7bd5',
        owned: ['classic', 'knight', 'king'],
        fig: 'knight',
        ring: 'gold',
        ownedRings: ['gold', 'obsidian'],
        prog: {
          lvl: 8,
          xp: 620,
          cups: 1420,
          st: { games: 52, wins: 38, towns: 94, roads: 145 },
          q: [
            { t: 'Выиграйте партию с ботом', d: 1, g: 1, r: 100, done: true },
            { t: 'Постройте 2 города', d: 1, g: 2, r: 150, done: false }
          ],
          ach: {}
        }
      }));
      localStorage.setItem('setup', JSON.stringify({
        n: 3,
        mode: 'bots',
        seats: [
          { name: 'Crownfall', human: true, col: '#3a7bd5' },
          { name: 'Рыцарь', human: false, col: '#e84545' },
          { name: 'Маг', human: false, col: '#3fc27a' }
        ],
        rules: { deck: 1, rivers: true, meeples: 7, timer: 0, hints: true }
      }));
    });

    await page.goto(gameUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const b = document.querySelector('#boot');
      if (b) b.remove();
    });
    await new Promise(r => setTimeout(r, 600));
    return page;
  };

  // Ensure store/screenshots directory exists
  fs.mkdirSync(out('screenshots'), { recursive: true });

  // 1. Phone Screenshot 1: Main Menu with new tilted trapezoid buttons
  console.log('Rendering 1-menu.png...');
  const p1 = await createPage({ width: 360, height: 640 }, 3);
  await p1.evaluate(() => {
    if (typeof show === 'function') show('menu');
  });
  await p1.addStyleTag({
    content: '.mini{animation:none!important;transform:rotateX(56deg) rotateZ(-8deg) scale3d(.82,.82,.82)!important}'
  });
  await new Promise(r => setTimeout(r, 500));
  await p1.screenshot({ path: out('screenshots/1-menu.png') });
  console.log('✓ 1-menu.png created (1080x1920)');

  // 2. Phone Screenshot 2: Modes Bottom Sheet
  console.log('Rendering 2-modes.png...');
  await p1.evaluate(() => {
    const btn = document.querySelector('#btnOpenModes');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await p1.screenshot({ path: out('screenshots/2-modes.png') });
  console.log('✓ 2-modes.png created (1080x1920)');
  await p1.close();

  // 3. Phone Screenshot 3: Active Gameplay
  console.log('Rendering 3-game.png...');
  const pGame = await createPage({ width: 360, height: 640 }, 3);
  await pGame.evaluate(() => {
    if (typeof openSetup === 'function') openSetup('bots');
  });
  await new Promise(r => setTimeout(r, 400));
  await pGame.evaluate(() => {
    const s = document.querySelector('#start');
    if (s) s.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Play several turns to populate the board with tiles
  for (let i = 0; i < 35; i++) {
    const tileCount = (await pGame.$$('#world .tile:not(.ghost)')).length;
    if (tileCount >= 16) break;

    const mrowVisible = await pGame.evaluate(() => {
      const mr = document.querySelector('#mrow');
      return mr && !mr.hidden;
    });

    if (mrowVisible) {
      await pGame.evaluate(() => {
        const skip = document.querySelector('#mrow .chip.skip');
        if (skip) skip.click();
      });
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const spot = await pGame.evaluate(() => {
      const br = document.querySelector('#board').getBoundingClientRect();
      const slots = [...document.querySelectorAll('.slot')].map(s => s.getBoundingClientRect())
        .map(r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))
        .filter(c => c.x > br.left + 35 && c.x < br.right - 60 && c.y > br.top + 45 && c.y < br.bottom - 40)
        .filter(c => document.elementFromPoint(c.x, c.y)?.closest('.slot'));
      return slots[0] || null;
    });

    if (!spot) {
      await pGame.evaluate(() => {
        const ctr = document.querySelector('#ctr');
        if (ctr) ctr.click();
        const zout = document.querySelector('#zout');
        if (zout) zout.click();
      });
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    await pGame.mouse.click(spot.x, spot.y);
    await new Promise(r => setTimeout(r, 200));

    const okDisabled = await pGame.evaluate(() => {
      const ok = document.querySelector('#ok');
      return ok ? ok.disabled : true;
    });

    if (!okDisabled) {
      await pGame.evaluate(() => {
        const ok = document.querySelector('#ok');
        if (ok && !ok.disabled) ok.click();
      });
      await new Promise(r => setTimeout(r, 400));

      const hasMrow = await pGame.evaluate(() => {
        const mr = document.querySelector('#mrow');
        return mr && !mr.hidden;
      });

      if (hasMrow) {
        await pGame.evaluate((idx) => {
          const chips = document.querySelectorAll('#mrow .chip:not(.skip)');
          if (idx % 2 === 0 && chips.length > 0) {
            chips[0].click();
          } else {
            const skip = document.querySelector('#mrow .chip.skip');
            if (skip) skip.click();
          }
        }, i);
        await new Promise(r => setTimeout(r, 250));
      }
    }
  }

  await pGame.evaluate(() => {
    const ctr = document.querySelector('#ctr');
    if (ctr) ctr.click();
    const hint = document.querySelector('#hint');
    if (hint) hint.classList.add('gone');
  });
  await new Promise(r => setTimeout(r, 500));
  await pGame.screenshot({ path: out('screenshots/3-game.png') });
  // Also save copy as 2-game.png
  fs.copyFileSync(out('screenshots/3-game.png'), out('screenshots/2-game.png'));
  console.log('✓ 3-game.png created (1080x1920)');
  await pGame.close();

  // 4. Phone Screenshot 4: Match Setup Lobby
  console.log('Rendering 4-setup.png...');
  const pSetup = await createPage({ width: 360, height: 640 }, 3);
  await pSetup.evaluate(() => {
    if (typeof openSetup === 'function') openSetup('bots');
  });
  await new Promise(r => setTimeout(r, 500));
  await pSetup.screenshot({ path: out('screenshots/4-setup.png') });
  console.log('✓ 4-setup.png created (1080x1920)');
  await pSetup.close();

  // 5. Phone Screenshot 5: Match Results / Victory Screen
  console.log('Rendering 5-results.png...');
  const pRes = await createPage({ width: 360, height: 640 }, 3);
  await pRes.evaluate(() => {
    if (typeof show === 'function') show('results');
  });
  await new Promise(r => setTimeout(r, 500));
  await pRes.screenshot({ path: out('screenshots/5-results.png') });
  console.log('✓ 5-results.png created (1080x1920)');
  await pRes.close();

  // 6. Phone Screenshot 6: Customization Shop
  console.log('Rendering 6-shop.png...');
  const pShop = await createPage({ width: 360, height: 640 }, 3);
  await pShop.evaluate(() => {
    if (typeof show === 'function') show('shop');
  });
  await new Promise(r => setTimeout(r, 500));
  await pShop.screenshot({ path: out('screenshots/6-shop.png') });
  console.log('✓ 6-shop.png created (1080x1920)');
  await pShop.close();

  // 7. Feature Graphic (1024x500)
  console.log('Rendering feature-1024x500.png...');
  const pFeature = await browser.newPage();
  await pFeature.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });

  const featureHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800;900&family=Onest:wght@500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px;
    height: 500px;
    overflow: hidden;
    background: radial-gradient(110% 130% at 75% 35%, #25396b 0%, #121a36 55%, #080d1e 100%);
    font-family: 'Onest', sans-serif;
    color: #fff;
    display: flex;
    position: relative;
  }
  /* Strategy Grid Overlay */
  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  /* Left Hero Content */
  .left-content {
    flex: 0 0 520px;
    padding: 60px 0 60px 64px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 10;
  }
  .tag-badge {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(245, 192, 78, 0.15);
    border: 1px solid rgba(245, 192, 78, 0.4);
    color: #ffd875;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 16px;
    transform: skewX(-10deg);
  }
  .tag-badge span {
    transform: skewX(10deg);
  }
  .brand-logo {
    font-family: 'Unbounded', sans-serif;
    font-size: 54px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -1.5px;
    color: #fff;
    text-shadow: 0 4px 18px rgba(0,0,0,0.5);
    margin-bottom: 14px;
  }
  .brand-logo span {
    background: linear-gradient(180deg, #ffe082 0%, #f5af19 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .description {
    font-size: 18px;
    line-height: 1.45;
    color: #b8c6e8;
    max-width: 440px;
    margin-bottom: 24px;
    font-weight: 500;
  }
  .pills-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .pill {
    transform: skewX(-12deg);
    padding: 8px 16px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    font-size: 13.5px;
    font-weight: 700;
    color: #e2e8f8;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
  }
  .pill span {
    transform: skewX(12deg);
  }
  .pill.highlight {
    background: linear-gradient(135deg, #3182ce, #1e4e8c);
    border-color: rgba(255,255,255,0.28);
    color: #fff;
  }

  /* Right 3D Visuals */
  .right-visual {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tile-cluster {
    position: relative;
    width: 440px;
    height: 440px;
    transform: rotateX(55deg) rotateZ(-22deg) scale(0.92);
    transform-style: preserve-3d;
  }
  .iso-tile {
    position: absolute;
    width: 140px;
    height: 140px;
    border-radius: 18px;
    box-shadow: 
      -10px 14px 0 #1b2612,
      -10px 14px 25px rgba(0,0,0,0.65);
    background: #5d9e36;
    border: 2px solid rgba(255,255,255,0.3);
    overflow: hidden;
  }
  .iso-tile.t1 { top: 40px; left: 140px; background: linear-gradient(135deg, #74be42, #4d8728); }
  .iso-tile.t2 { top: 155px; left: 25px; background: linear-gradient(135deg, #6bb83b, #437822); }
  .iso-tile.t3 { top: 155px; left: 255px; background: linear-gradient(135deg, #7ec449, #53912c); }
  .iso-tile.t4 { top: 270px; left: 140px; background: linear-gradient(135deg, #64ad34, #3d6f1f); }

  /* Castle element on top tile */
  .castle-shape {
    position: absolute;
    top: 0; left: 0; right: 0; height: 75px;
    background: #d6bc85;
    border-bottom: 4px solid #8c6934;
    border-radius: 14px 14px 40px 0;
  }
  .roof {
    position: absolute;
    width: 28px; height: 16px;
    background: #c54832;
    border-radius: 3px;
  }
  /* River path across tiles */
  .river-line {
    position: absolute;
    background: linear-gradient(90deg, #3bb3e6, #1c78b8);
    box-shadow: 0 0 10px rgba(59,179,230,0.5);
  }
  /* Floating Meeple Figure */
  .meeple {
    position: absolute;
    top: 135px;
    left: 200px;
    width: 58px;
    height: 64px;
    filter: drop-shadow(-8px 12px 14px rgba(0,0,0,0.6));
    z-index: 20;
    transform: translateZ(50px) rotateZ(10deg);
  }
</style>
</head>
<body>
  <div class="grid-overlay"></div>
  <div class="left-content">
    <div class="tag-badge"><span>⚔️ Плиточная настольная стратегия</span></div>
    <h1 class="brand-logo">Tile<span>topia</span></h1>
    <p class="description">Создавайте цветущие миры из плиток: соединяйте тракты, реки, замки и соревнуйтесь за господство на общей карте!</p>
    <div class="pills-row">
      <div class="pill highlight"><span>🏰 Сезонные локации</span></div>
      <div class="pill"><span>👥 Онлайн и офлайн</span></div>
      <div class="pill"><span>🛡️ Без рекламы</span></div>
    </div>
  </div>
  <div class="right-visual">
    <div class="tile-cluster">
      <div class="iso-tile t1">
        <div class="castle-shape">
          <div class="roof" style="top:10px;left:15px"></div>
          <div class="roof" style="top:10px;left:55px"></div>
          <div class="roof" style="top:10px;left:95px"></div>
        </div>
      </div>
      <div class="iso-tile t2">
        <div class="river-line" style="top:50px;left:0;right:0;height:36px;transform:rotate(25deg)"></div>
      </div>
      <div class="iso-tile t3">
        <div class="river-line" style="top:45px;left:0;right:0;height:36px;transform:rotate(-15deg)"></div>
      </div>
      <div class="iso-tile t4">
        <div style="position:absolute;top:0;left:50px;width:38px;bottom:0;background:#d8c191;border:2px solid #8e6d3a"></div>
      </div>
      <!-- Center Meeple -->
      <svg class="meeple" viewBox="0 0 100 110">
        <path d="M50 8 C58 8 64 15 64 24 C64 29 62 33 59 36 C69 40 78 48 84 58 C87 63 82 70 76 68 C71 66 68 62 65 57 L65 82 L77 100 C80 105 75 110 70 110 C66 110 63 107 61 103 L50 85 L39 103 C37 107 34 110 30 110 C25 110 20 105 23 100 L35 82 L35 57 C32 62 29 66 24 68 C18 70 13 63 16 58 C22 48 31 40 41 36 C38 33 36 29 36 24 C36 15 42 8 50 8 Z" fill="#f5af19" stroke="#945f06" stroke-width="3"/>
      </svg>
    </div>
  </div>
</body>
</html>
  `;

  await pFeature.setContent(featureHtml);
  await new Promise(r => setTimeout(r, 600));
  await pFeature.screenshot({ path: out('feature-1024x500.png') });
  console.log('✓ feature-1024x500.png created (1024x500)');
  await pFeature.close();

  await browser.close();
  console.log('\n🎉 ALL STORE ASSETS GENERATED SUCCESSFULLY!');
})();
