/**
 * Render Perfect Store Assets:
 * - 6 Raw Phone Screenshots (1080x1920):
 *   1-menu: Clean Main Page (normal scale, 3D diorama, compact action row, single top menu button)
 *   2-modes: Opened Game Modes Bottom Sheet over main screen
 *   3-game: Harmonious active gameplay (16+ tiles, fog with wind rose, relics, scout HUD)
 *   4-setup: Match Setup (bot levels, seats, rules, NO table location button)
 *   5-results: Season League Leaderboard (Top 3 podium + 20 places, frames, statuses, cups)
 *   6-shop: «Витрина» (Daily 6-item showcase in tile banners, 09:00 countdown timer, gift banner)
 * - 6 Marketing Showcase Cards (1080x1920) with seamless header transitions and floating tiles
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const gameUrl = 'file://' + path.join(root, 'app/src/main/assets/index.html');
const outScreens = f => path.join(root, 'store/screenshots', f);
const outShowcase = f => path.join(root, 'store/screenshots_showcase', f);
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const FONTS = `
  @font-face {
    font-family: 'Unbounded';
    src: url('file://${path.join(root, 'app/src/main/assets/fonts/unbounded-900.woff2').replace(/\\/g, '/')}') format('woff2');
    font-weight: 900;
    font-style: normal;
  }
  @font-face {
    font-family: 'Onest';
    src: url('file://${path.join(root, 'app/src/main/assets/fonts/onest-700.woff2').replace(/\\/g, '/')}') format('woff2');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'Onest';
    src: url('file://${path.join(root, 'app/src/main/assets/fonts/onest-500.woff2').replace(/\\/g, '/')}') format('woff2');
    font-weight: 500;
    font-style: normal;
  }
`;

(async () => {
  console.log('🚀 Launching Chrome to render store graphics in standard scale...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  });

  async function createCleanGamePage() {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3 });

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
        frame: 'gold',
        frames: ['gold', 'royal', 'emerald', 'forest', 'puzzle'],
        status: 'Плиточный барон',
        statusKey: 'sh:baron',
        statuses: ['sh:baron', 'sh:chaos', 'sh:tilemaster', 'sh:king'],
        loc: 'village',
        firstSeen: '2026-11-01'
      }));
      localStorage.setItem('prog', JSON.stringify({
        lvl: 8,
        xp: 620,
        cups: 1420,
        day: '2026-11-05',
        st: { games: 52, wins: 38, towns: 94, roads: 145 },
        q: [
          { id: 'win_bot', t: 'Выиграйте партию с ботом', n: 1, k: 'wins', r: 100, got: false },
          { id: 'build_towns', t: 'Постройте 2 замка', n: 2, k: 'towns', r: 150, got: false }
        ],
        ach: {}
      }));
      localStorage.setItem('setup', JSON.stringify({
        n: 3,
        mode: 'bots',
        seats: [
          { name: 'Crownfall', human: true, col: '#3a7bd5', fig: 'knight' },
          { name: 'Рыцарь', human: false, col: '#e84545', fig: 'classic' },
          { name: 'Маг', human: false, col: '#3fc27a', fig: 'monk' }
        ],
        rules: { deck: 1, rivers: true, meeples: 7, timer: 0, hints: true, mode: 'classic' }
      }));
    });

    await page.goto(gameUrl, { waitUntil: 'networkidle0' });

    // Instantly remove splash screen, debug watermarks and any toasts
    await page.evaluate(() => {
      const boot = document.querySelector('#boot');
      if (boot) boot.remove();
      const note = document.querySelector('#note');
      if (note) note.remove();
      const staging = document.querySelector('#stagingWatermark');
      if (staging) staging.remove();
    });

    await new Promise(r => setTimeout(r, 600));
    return page;
  }

  // -------------------------------------------------------------------------
  // 1. RAW PHONE SCREENSHOTS (1080x1920)
  // -------------------------------------------------------------------------

  // 1-menu.png: Clean Main Screen
  console.log('Rendering 1-menu.png (Главная страница)...');
  const pMenu = await createCleanGamePage();
  await pMenu.evaluate(() => {
    if (typeof show === 'function') show('menu');
    const boot = document.querySelector('#boot'); if (boot) boot.remove();
    const note = document.querySelector('#note'); if (note) note.remove();
  });
  await new Promise(r => setTimeout(r, 800));
  await pMenu.screenshot({ path: outScreens('1-menu.png') });
  console.log('✓ 1-menu.png rendered');
  await pMenu.close();

  // 2-modes.png: Opened Game Modes Bottom Sheet
  console.log('Rendering 2-modes.png (Открытая вкладка режимов игры)...');
  const pModes = await createCleanGamePage();
  await pModes.evaluate(() => {
    if (typeof show === 'function') show('menu');
    const modeBtn = document.querySelector('#btnOpenModes');
    if (modeBtn) modeBtn.click();
    const boot = document.querySelector('#boot'); if (boot) boot.remove();
    const note = document.querySelector('#note'); if (note) note.remove();
  });
  await new Promise(r => setTimeout(r, 800));
  await pModes.screenshot({ path: outScreens('2-modes.png') });
  console.log('✓ 2-modes.png rendered');
  await pModes.close();

  // 4-setup.png: Match Setup (Without location button)
  console.log('Rendering 4-setup.png (Настройка партии)...');
  const pSetup = await createCleanGamePage();
  await pSetup.evaluate(() => {
    if (typeof openSetup === 'function') openSetup('bots');
    const locBox = document.querySelector('#setupLocBox');
    if (locBox) { locBox.hidden = true; locBox.style.display = 'none'; }
    const boot = document.querySelector('#boot'); if (boot) boot.remove();
    const note = document.querySelector('#note'); if (note) note.remove();
  });
  await new Promise(r => setTimeout(r, 700));
  await pSetup.screenshot({ path: outScreens('4-setup.png') });
  console.log('✓ 4-setup.png rendered');
  await pSetup.close();

  // 5-results.png: Season League Leaderboard (Top 3 Podium + Top 20)
  console.log('Rendering 5-results.png (Вкладка рейтинга лиги Топ-20)...');
  const pLead = await createCleanGamePage();
  await pLead.evaluate(() => {
    ptab = 'top';
    if (typeof show === 'function') show('progress');
    const topTabBtn = document.querySelector('#ptabs button[data-pt="top"]');
    if (topTabBtn) topTabBtn.click();
    if (typeof renderTop === 'function') renderTop();
    const boot = document.querySelector('#boot'); if (boot) boot.remove();
    const note = document.querySelector('#note'); if (note) note.remove();
  });
  await new Promise(r => setTimeout(r, 900));
  await pLead.screenshot({ path: outScreens('5-results.png') });
  console.log('✓ 5-results.png (Leaderboard) rendered');
  await pLead.close();

  // 6-shop.png: «Витрина» with tile banners
  console.log('Rendering 6-shop.png (Витрина мастера)...');
  const pShop = await createCleanGamePage();
  await pShop.evaluate(() => {
    if (typeof show === 'function') show('shop');
    if (typeof renderShop === 'function') renderShop();
    const boot = document.querySelector('#boot'); if (boot) boot.remove();
    const note = document.querySelector('#note'); if (note) note.remove();
  });
  await new Promise(r => setTimeout(r, 1000));
  await pShop.screenshot({ path: outScreens('6-shop.png') });
  console.log('✓ 6-shop.png rendered');
  await pShop.close();

  // 3-game.png: Active Gameplay with tiles, fog, meeples
  console.log('Rendering 3-game.png (Геймплей и стол)...');
  const pGame = await createCleanGamePage();
  await pGame.evaluate(() => {
    if (typeof openSetup === 'function') openSetup('bots');
  });
  await new Promise(r => setTimeout(r, 600));
  await pGame.evaluate(() => {
    const s = document.querySelector('#start');
    if (s) s.click();
  });
  await new Promise(r => setTimeout(r, 1600));

  // Play several turns to populate board with 16+ tiles
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
      const board = document.querySelector('#board');
      if (!board) return null;
      const br = board.getBoundingClientRect();
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
      });
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    await pGame.mouse.click(spot.x, spot.y);
    await new Promise(r => setTimeout(r, 300));

    const okBtn = await pGame.$('#ok:not([disabled])');
    if (okBtn) {
      await okBtn.click();
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
    const note = document.querySelector('#note');
    if (note) note.remove();
  });
  await new Promise(r => setTimeout(r, 600));
  await pGame.screenshot({ path: outScreens('3-game.png') });
  // Duplicate for 2-game.png alias
  fs.copyFileSync(outScreens('3-game.png'), outScreens('2-game.png'));
  console.log('✓ 3-game.png rendered');
  await pGame.close();

  // -------------------------------------------------------------------------
  // 2. MARKETING SHOWCASE CARDS (1080x1920)
  // -------------------------------------------------------------------------
  console.log('\n🎨 Rendering Marketing Showcase Cards...');

  const showcases = [
    {
      id: '1-world-showcase',
      raw: 'screenshots/1-menu.png',
      tag: 'ПЛИТОЧНАЯ СТРАТЕГИЯ',
      title: 'СОЗДАВАЙТЕ СВОЙ МИР',
      desc: 'Каждая выложенная плитка формирует живой и неповторимый ландшафт'
    },
    {
      id: '2-modes-showcase',
      raw: 'screenshots/2-modes.png',
      tag: 'ГИБКИЕ ФОРМАТЫ',
      title: 'РЕЖИМЫ ДЛЯ ВСЕХ',
      desc: 'Онлайн, с друзьями по коду, с ботами или на одном экране'
    },
    {
      id: '3-game-showcase',
      raw: 'screenshots/3-game.png',
      tag: 'ТАКТИКА И СОЗИДАНИЕ',
      title: 'ГЛУБОКИЙ ГЕЙМПЛЕЙ',
      desc: 'Соединяйте тракты, реки, крепости и выставляйте дозорных миплов'
    },
    {
      id: '4-setup-showcase',
      raw: 'screenshots/4-setup.png',
      tag: 'ПРАВИЛА ПОД ВАС',
      title: 'НАСТРОЙКА ПАРТИИ',
      desc: 'Выбирайте размер колоды, таймер ходов и уровень сложности ботов'
    },
    {
      id: '5-results-showcase',
      raw: 'screenshots/5-results.png',
      tag: 'СЕЗОННЫЕ ТРОФЕИ',
      title: 'ПОБЕЖДАЙТЕ В ЛИГЕ',
      desc: 'Соревнуйтесь в сезонном рейтинге и открывайте эксклюзивные ранги'
    },
    {
      id: '6-shop-showcase',
      raw: 'screenshots/6-shop.png',
      tag: 'ВИТРИНА ДНЯ · БЕЗ ДОНАТА',
      title: 'ВИТРИНА СТИЛЯ',
      desc: 'Каждый день 6 уникальных фигурок, рамок и юморных статусов за золото'
    }
  ];

  for (const s of showcases) {
    const rawPath = path.join(root, 'store', s.raw);
    const rawData = fs.readFileSync(rawPath).toString('base64');
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
    background: radial-gradient(130% 120% at 50% 0%, #1c2a4a 0%, #0d1424 50%, #060912 100%);
    font-family: 'Onest', sans-serif;
    display: flex; flex-direction: column;
    position: relative;
  }

  .ambient-glow {
    position: absolute;
    top: 140px; left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 450px;
    background: radial-gradient(circle, rgba(94, 180, 255, 0.16) 0%, rgba(94, 180, 255, 0) 70%);
    pointer-events: none;
    z-index: 1;
  }

  .header-card {
    height: 380px;
    padding: 64px 60px 20px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; z-index: 10; position: relative;
  }
  .marketing-tag {
    transform: skewX(-10deg);
    background: rgba(245, 192, 78, 0.18);
    border: 1.5px solid rgba(245, 192, 78, 0.5);
    box-shadow: 0 4px 16px rgba(245, 192, 78, 0.2);
    color: #ffd875; padding: 8px 24px; border-radius: 16px;
    font-size: 21px; font-weight: 800; letter-spacing: 2px;
    margin-bottom: 16px;
  }
  .marketing-tag span { transform: skewX(10deg); display: block; }
  .marketing-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 54px; font-weight: 900; color: #fff;
    letter-spacing: -1px; margin-bottom: 14px;
    text-shadow: 0 4px 24px rgba(0,0,0,0.7);
  }
  .marketing-desc {
    font-size: 26px; font-weight: 600; color: #b8c8ed;
    max-width: 940px; line-height: 1.35;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
  }

  .floating-tile-left {
    position: absolute;
    top: 330px; left: 16px;
    width: 94px; height: 94px;
    border-radius: 20px;
    background: linear-gradient(135deg, #7cb85a 0%, #4f9a3b 100%);
    border: 3px solid rgba(255,255,255,0.25);
    box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(124, 184, 90, 0.3);
    transform: rotate(-14deg) skewX(-6deg);
    z-index: 5;
    display: flex; align-items: center; justify-content: center;
  }
  .floating-tile-right {
    position: absolute;
    top: 340px; right: 16px;
    width: 88px; height: 88px;
    border-radius: 18px;
    background: linear-gradient(135deg, #3a7bd5 0%, #204f94 100%);
    border: 3px solid rgba(255,255,255,0.25);
    box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(58, 123, 213, 0.3);
    transform: rotate(16deg) skewX(6deg);
    z-index: 5;
    display: flex; align-items: center; justify-content: center;
  }
  .ft-icon { font-size: 40px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); }

  .screen-frame {
    flex: 1; padding: 0 45px;
    display: flex; align-items: flex-start; justify-content: center;
    position: relative; z-index: 8;
  }
  .phone-mockup {
    width: 910px; height: 1530px;
    border-radius: 52px 52px 0 0;
    box-shadow: 0 -16px 50px rgba(0,0,0,0.85), 0 0 0 12px #18223a, 0 0 0 14px rgba(255,255,255,0.14);
    overflow: hidden; background: #0b1122;
    position: relative;
  }
  .notch-pill {
    position: absolute;
    top: 14px; left: 50%;
    transform: translateX(-50%);
    width: 140px; height: 26px;
    background: #000;
    border-radius: 20px;
    z-index: 20;
    box-shadow: 0 2px 6px rgba(0,0,0,0.6);
  }
  .phone-mockup img {
    width: 100%; height: auto; display: block;
  }
</style>
</head>
<body>
  <div class="ambient-glow"></div>
  <div class="floating-tile-left"><span class="ft-icon">🏰</span></div>
  <div class="floating-tile-right"><span class="ft-icon">🏆</span></div>

  <div class="header-card">
    <div class="marketing-tag"><span>${s.tag}</span></div>
    <div class="marketing-title">${s.title}</div>
    <div class="marketing-desc">${s.desc}</div>
  </div>

  <div class="screen-frame">
    <div class="phone-mockup">
      <div class="notch-pill"></div>
      <img src="${rawUrl}" />
    </div>
  </div>
</body>
</html>
    `;

    const outPath = outShowcase(`${s.id}.png`);
    const pSc = await browser.newPage();
    await pSc.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await pSc.setContent(showcaseHtml, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 400));
    await pSc.screenshot({ path: outPath });
    await pSc.close();
    console.log(`✓ Showcase created: ${s.id}.png`);
  }

  await browser.close();
  console.log('\n🎉 ALL STORE SCREENSHOTS & SHOWCASE CARDS PERFECTLY RENDERED!');
})();
