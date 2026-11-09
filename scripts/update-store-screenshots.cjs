const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const gameUrl = 'file://' + path.join(root, 'app/src/main/assets/index.html');
const out = f => path.join(root, 'store', f);
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('Launching Chrome to render store graphics...');
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
    await new Promise(r => setTimeout(r, 800));
    return page;
  };

  // 1. Phone screenshots (1080x1920: 360x640 @ 3x)
  console.log('Generating 1-menu.png...');
  const p = await createPage({ width: 360, height: 640 }, 3);
  await p.addStyleTag({
    content: '.mini{animation:none!important;transform:rotateX(56deg) rotateZ(-8deg) scale3d(.8,.8,.8)!important}'
  });
  await new Promise(r => setTimeout(r, 600));
  await p.screenshot({ path: out('screenshots/1-menu.png') });
  console.log('✓ 1-menu.png created');

  // 4-setup.png
  console.log('Generating 4-setup.png...');
  await p.evaluate(() => {
    const el = document.querySelector('[data-mode="bots"]');
    if (el) el.click();
    else if (typeof show === 'function') show('setup');
  });
  await new Promise(r => setTimeout(r, 600));
  await p.screenshot({ path: out('screenshots/4-setup.png') });
  console.log('✓ 4-setup.png created');

  // 6-shop.png
  console.log('Generating 6-shop.png...');
  await p.evaluate(() => {
    if (typeof show === 'function') show('shop');
    else {
      const el = document.querySelector('[data-nav="shop"]');
      if (el) el.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await p.screenshot({ path: out('screenshots/6-shop.png') });
  console.log('✓ 6-shop.png created');

  // 2-game.png and 5-results.png
  console.log('Generating 2-game.png...');
  await p.evaluate(() => {
    if (typeof show === 'function') show('setup');
  });
  await new Promise(r => setTimeout(r, 400));
  await p.evaluate(() => {
    const s = document.querySelector('#start');
    if (s) s.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Play several turns to populate the board with tiles
  for (let i = 0; i < 40; i++) {
    const tileCount = (await p.$$('#world .tile:not(.ghost)')).length;
    if (tileCount >= 18) break;

    const mrowVisible = await p.evaluate(() => {
      const mr = document.querySelector('#mrow');
      return mr && !mr.hidden;
    });

    if (mrowVisible) {
      await p.evaluate(() => {
        const skip = document.querySelector('#mrow .chip.skip');
        if (skip) skip.click();
      });
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const spot = await p.evaluate(() => {
      const br = document.querySelector('#board').getBoundingClientRect();
      const slots = [...document.querySelectorAll('.slot')].map(s => s.getBoundingClientRect())
        .map(r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))
        .filter(c => c.x > br.left + 30 && c.x < br.right - 60 && c.y > br.top + 40 && c.y < br.bottom - 30)
        .filter(c => document.elementFromPoint(c.x, c.y)?.closest('.slot'));
      return slots[0] || null;
    });

    if (!spot) {
      await p.evaluate(() => {
        const ctr = document.querySelector('#ctr');
        if (ctr) ctr.click();
        const zout = document.querySelector('#zout');
        if (zout) zout.click();
      });
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    await p.mouse.click(spot.x, spot.y);
    await new Promise(r => setTimeout(r, 200));

    const okDisabled = await p.evaluate(() => {
      const ok = document.querySelector('#ok');
      return ok ? ok.disabled : true;
    });

    if (!okDisabled) {
      await p.evaluate(() => {
        const ok = document.querySelector('#ok');
        if (ok && !ok.disabled) ok.click();
      });
      await new Promise(r => setTimeout(r, 400));

      const hasMrow = await p.evaluate(() => {
        const mr = document.querySelector('#mrow');
        return mr && !mr.hidden;
      });

      if (hasMrow) {
        await p.evaluate((idx) => {
          const chips = document.querySelectorAll('#mrow .chip:not(.skip)');
          if (idx % 2 === 0 && chips.length > 0) {
            chips[0].click();
          } else {
            const skip = document.querySelector('#mrow .chip.skip');
            if (skip) skip.click();
          }
        }, i);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  await p.evaluate(() => {
    const ctr = document.querySelector('#ctr');
    if (ctr) ctr.click();
    const hint = document.querySelector('#hint');
    if (hint) hint.classList.add('gone');
  });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: out('screenshots/2-game.png') });
  console.log('✓ 2-game.png created');

  // 5-results.png
  console.log('Generating 5-results.png...');
  await p.evaluate(() => {
    if (typeof show === 'function') {
      show('results');
    } else {
      const b = document.createElement('button');
      b.dataset.go = 'results';
      document.body.append(b);
      b.click();
      b.remove();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await p.screenshot({ path: out('screenshots/5-results.png') });
  console.log('✓ 5-results.png created');

  // Feature Graphic (1024x500)
  console.log('Generating feature-1024x500.png...');
  const fgPage = await createPage({ width: 1024, height: 500 }, 1);
  await fgPage.addStyleTag({
    content: `
      html.app .phone { position: fixed; inset: 0; }
      #scr-menu {
        background: radial-gradient(90% 120% at 75% 40%, #3a4f86, #141b33 70%) !important;
        flex-direction: row-reverse !important;
      }
      .hero { flex: 0 0 55% !important; }
      .mini {
        animation: none !important;
        transform: rotateX(55deg) rotateZ(-12deg) scale3d(1.25, 1.25, 1.25) !important;
        top: 58% !important;
      }
      .mbody {
        flex: 0 0 45% !important;
        justify-content: center;
        padding: 0 0 0 56px !important;
      }
      .mtop, .mquest-banner, .jig, nav.sbar, .resume { display: none !important; }
      .logo { font-size: 58px !important; margin: 0 0 12px 0 !important; }
      .tag { font-size: 20px !important; max-width: 420px; line-height: 1.4 !important; opacity: 0.9 !important; }
    `
  });
  await new Promise(r => setTimeout(r, 600));
  await fgPage.screenshot({ path: out('feature-1024x500.png') });
  console.log('✓ feature-1024x500.png created');

  // Icon 512x512
  console.log('Generating icon-512.png...');
  const icPage = await createPage({ width: 360, height: 640 }, 2);
  await icPage.addStyleTag({
    content: `
      .mini {
        animation: none !important;
        transform: rotateX(50deg) rotateZ(-10deg) scale3d(0.95, 0.95, 0.95) !important;
      }
      #scr-menu {
        background: radial-gradient(circle at 50% 45%, #3a4f86, #141b33 75%) !important;
      }
      .mbody, .sbar, .mtop, .mquest-banner, .jig { visibility: hidden !important; }
      .hero { flex: 0 0 100% !important; }
    `
  });
  await new Promise(r => setTimeout(r, 500));
  await icPage.screenshot({
    path: out('icon-512.png'),
    clip: { x: 52, y: 215, width: 256, height: 256 }
  });
  console.log('✓ icon-512.png created');

  await browser.close();
  console.log('All store graphics successfully updated!');
})();
