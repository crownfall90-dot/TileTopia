// The card faces exactly as the game draws them (src/render/art.js, drawTile), sharper (K = 3 → 576 px), for the
// 3D tiles: assets/tiles3d/faces/<id>.jpg (a cliff card is PNG, it has a hole). Runs the web build in headless Chrome.
//   sh scripts/wrap-web.sh web && python -m http.server 8123 --directory build/web
//   node scripts/export-faces.mjs
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SITE = process.env.SITE || 'http://localhost:8123/';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('assets/tiles3d/faces');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cdp(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const cb = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } };
  return {send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, d => d.error ? rej(new Error(d.error.message)) : res(d.result)); ws.send(JSON.stringify({id: i, method, params})); }), close: () => ws.close()};
}

const port = 9700 + Math.floor(Math.random() * 200);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-faces-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', 'about:blank']);
try {
  let ver;
  for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch (_) { await sleep(200); } }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = await cdp(list.find(p => p.type === 'page').webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Page.navigate', {url: SITE});
  await sleep(4000);
  const r = await page.send('Runtime.evaluate', {returnByValue: true, expression: `(() => {
    // S and V as in web/game.html (tile art size 192, directions N E S W); the faces need no figure colours
    const art = PG.render.createArt({S: 192, V: [[0, -1], [1, 0], [0, 1], [-1, 0]], PL0: [], MEEPLE_D: '', K: 3});
    return Object.keys(PG.engine.TYPES).map(id => [id, art.drawTile(id)]);
  })()`});
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception.description);
  fs.mkdirSync(OUT, {recursive: true});
  for (const [id, url] of r.result.value) {
    const [, kind, b64] = url.match(/^data:image\/(png|jpeg);base64,(.*)$/);
    fs.writeFileSync(path.join(OUT, `${id}.${kind === 'png' ? 'png' : 'jpg'}`), Buffer.from(b64, 'base64'));
  }
  console.log(`wrote ${r.result.value.length} faces to ${path.relative(process.cwd(), OUT)}`);
  page.close();
} finally {
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(prof, {recursive: true, force: true}); } catch (_) {}
}
