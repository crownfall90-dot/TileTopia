// Screenshots of the running web build through headless Chrome (CDP), for design reviews and the store listing.
//   node scripts/shoot.mjs <out-dir> [width height dpr] [scene,scene...]
// Needs the site served (sh scripts/wrap-web.sh web && python -m http.server 8123 --directory build/web).
// Every scene starts from a fresh profile that has skipped the tutorial and kept the suggested nickname.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [outDir = 'build/shots', W = '412', Hh = '915', DPR = '2.625', only = ''] = process.argv.slice(2);
const SITE = process.env.SITE || 'http://localhost:8123/';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Steps run in the page. They use only what a player can click (buttons by their text), so they survive refactors.
const PRELUDE = `
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const byText = (re, root = document) => [...root.querySelectorAll('button,a,[role=button]')].find(b => b.offsetParent && re.test(b.textContent.trim()));
  const clear = () => document.querySelectorAll('.over:not(#over)').forEach(o => o.remove());   // #over is the game's own
  async function boot() {
    for (let i = 0; i < 80 && document.getElementById('boot'); i++) await wait(250);   // the splash is gone
    for (let i = 0; i < 40 && !byText(/Пропустить обучение|ИГРАТЬ|Играть/i); i++) await wait(250);
    const skip = byText(/Пропустить обучение/); if (skip) { skip.click(); await wait(900); }
    const done = byText(/^Готово$/); if (done) { done.click(); await wait(900); }
    const later = byText(/^Позже$/); if (later) { later.click(); await wait(400); }
    clear(); await wait(300);
  }
`;
const SCENES = {
  menu: `await boot();`,
  shop: `await boot(); document.querySelector('[data-nav="shop"]').click(); await wait(900); clear();`,
  progress: `await boot(); document.querySelector('[data-nav="progress"]').click(); await wait(900); clear();`,
  inbox: `await boot(); document.getElementById('btnMenuNotif').click(); await wait(900); clear();`,
  rating: `await boot(); document.getElementById('btnMenuHub').click(); await wait(400); document.querySelector('[data-hub-action="rating"]').click(); await wait(1500); clear();`,
  popup: `await boot(); document.getElementById('btnMenuHub').click(); await wait(500);`,
  profile: `await boot(); document.getElementById('mprof').click(); await wait(900); clear();`,
  setup: `await boot(); document.getElementById('btnMainPlay').click(); await wait(900); clear();`,
  game: `await boot(); document.getElementById('btnMainPlay').click(); await wait(900); clear();
    byText(/Начать партию/).click(); await wait(4500); clear(); await wait(300);`,
  // Classic 2.0: six-sided tiles; a few turns on the first free slot so the board has more than one tile
  hex: `await boot(); document.getElementById('btnMainPlay').click(); await wait(900); clear();
    document.querySelector('[data-setmode="hex"]').click(); await wait(300);
    byText(/Начать партию/).click(); await wait(4500); clear();
    const board = document.getElementById('board'), ok = document.getElementById('ok');
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < 60 && !document.querySelector('.slot'); i++) await wait(500);
      const s = document.querySelector('.slot'); if (!s) break;
      const r = s.getBoundingClientRect(), at = {bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1};
      board.dispatchEvent(new PointerEvent('pointerdown', at)); board.dispatchEvent(new PointerEvent('pointerup', at)); await wait(400);
      if (!ok.disabled) ok.click(); await wait(1500);
      const skip = byText(/Без фишки/); if (skip) skip.click(); await wait(500);
    }
    await wait(6000); clear();`,
};

async function cdpConnect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const cb = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, d => d.error ? rej(new Error(d.error.message)) : res(d.result)); ws.send(JSON.stringify({id: i, method, params})); });
  return {send, close: () => ws.close()};
}

const port = 9300 + Math.floor(Math.random() * 400);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-shoot-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--hide-scrollbars', 'about:blank']);
try {
  let ver;
  for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch (_) { await sleep(200); } }
  const browser = await cdpConnect(ver.webSocketDebuggerUrl);
  fs.mkdirSync(outDir, {recursive: true});
  for (const name of (only ? only.split(',') : Object.keys(SCENES))) {
    const {targetId} = await browser.send('Target.createTarget', {url: 'about:blank'});
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = await cdpConnect(list.find(p => p.id === targetId).webSocketDebuggerUrl);
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {width: +W, height: +Hh, deviceScaleFactor: +DPR, mobile: +W < 900});
    await page.send('Emulation.setTouchEmulationEnabled', {enabled: +W < 900});
    await page.send('Page.navigate', {url: SITE});
    await sleep(1500);
    const r = await page.send('Runtime.evaluate', {expression: `(async () => { ${PRELUDE} ${SCENES[name]} return 'ok'; })()`, awaitPromise: true});
    if (r.exceptionDetails) console.warn(name, r.exceptionDetails.exception && r.exceptionDetails.exception.description);
    const shot = await page.send('Page.captureScreenshot', {format: 'png'});
    const file = path.join(outDir, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('saved', file);
    page.close();
    await browser.send('Target.closeTarget', {targetId});
  }
  browser.close();
} finally {
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(prof, {recursive: true, force: true}); } catch (_) {}
}
