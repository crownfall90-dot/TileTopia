// Plays whole games against bots in headless Chrome and reports what a player would feel: JavaScript errors,
// long tasks (> 50 ms, the stutters), frame rate and memory growth. The player's own moves are made by the game's
// own helper (helperPick, the move the hint shows), so the run goes through the real turn, placement and scoring code.
//   sh scripts/wrap-web.sh web && python -m http.server 8123 --directory build/web
//   node scripts/soak.mjs [games=1] [mode=fast]
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const GAMES = +(process.argv[2] || 1), MODE = process.argv[3] || 'fast', PROFILE = process.argv.includes('--profile');
const LIMIT_MS = +(process.env.SOAK_MS || 540000);
const SITE = process.env.SITE || 'http://localhost:8123/';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cdp(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const cb = new Map(), on = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } else if (d.method) on.forEach(f => f(d)); };
  return {send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, d => d.error ? rej(new Error(d.error.message)) : res(d.result)); ws.send(JSON.stringify({id: i, method, params})); }),
    on: f => on.push(f), close: () => ws.close()};
}

// Watchers installed before the page's own scripts: long tasks and frames.
const PROBE = `
  window.__soak = {long: [], frames: 0, t0: performance.now(), errors: []};
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { __soak.long.push(Math.round(e.duration)); (__soak.at = __soak.at || []).push(Math.round(e.startTime) + 'ms +' + Math.round(e.duration)); })).observe({type: 'longtask', buffered: true}); } catch (_) {}
  (function f() { __soak.frames++; requestAnimationFrame(f); })();
  addEventListener('error', e => __soak.errors.push(String(e.message)));
  addEventListener('unhandledrejection', e => __soak.errors.push('promise: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason)));
`;

// The game's own functions are not reachable from outside (the page keeps them in a closure), so the run plays
// like a person: real mouse events on the highlighted spot, on «Поставить» and on «Без фишки».
const START = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const byText = re => [...document.querySelectorAll('button')].find(b => b.offsetParent && re.test(b.textContent.trim()));
  const clear = () => document.querySelectorAll('.over:not(#over)').forEach(o => o.remove());
  for (let i = 0; i < 80 && document.getElementById('boot'); i++) await wait(250);
  for (const re of [/Пропустить обучение/, /^Готово$/, /^Позже$/]) { const b = byText(re); if (b) { b.click(); await wait(700); } }
  clear();
  document.getElementById('btnMainPlay').click(); await wait(800); clear();
  const mode = [...document.querySelectorAll('#scr-setup .mcard')].find(b => /${MODE === 'fast' ? 'Быстрая' : 'Классика'}/.test(b.textContent));
  if (mode) { mode.click(); await wait(300); }
  document.querySelector('#scr-setup .cta.wide').click();
  await wait(2500); clear();
  return 'started';
})()`;

// what to click next, as screen coordinates (or what the game is doing)
const STATE = `(() => {
  const vis = e => { if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return r.width ? {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)} : null; };
  const done = !document.getElementById('scr-results').hidden;
  const ok = document.getElementById('ok'), mrow = document.getElementById('mrow');
  const meeple = mrow && !mrow.hidden ? vis(mrow.querySelector('.skip') || mrow.querySelector('.chip')) : null;
  const slot = [...document.querySelectorAll('#world .slot:not(.sel)')].map(vis).find(Boolean);
  return {done, okEnabled: !!(ok && !ok.disabled && ok.offsetParent), ok: vis(ok), meeple, slot, sel: !!document.querySelector('#world .slot.sel'),
    cards: (document.getElementById('deckN') || {}).textContent};
})()`;

const METRICS = `(() => {
  const secs = (performance.now() - __soak.t0) / 1000;
  return {secs: Math.round(secs), fps: Math.round(__soak.frames / secs), long: __soak.long.length, longMax: Math.max(0, ...__soak.long),
    longOver200: __soak.long.filter(x => x > 200).length, longAt: (__soak.at || []).slice(0, 12), errors: __soak.errors.slice(0, 20),
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    dom: document.getElementsByTagName('*').length};
})()`;

async function click(page, p) {
  await page.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await page.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1});
}
async function playOne(page) {
  const val = async e => (await page.send('Runtime.evaluate', {expression: e, awaitPromise: true, returnByValue: true})).result.value;
  await val(START);
  const t0 = Date.now(); let steps = 0, last = '';
  while (Date.now() - t0 < LIMIT_MS) {
    await sleep(400);
    const st = await val(STATE);
    if (!st) continue;
    if (st.done) break;
    if (st.meeple) await click(page, st.meeple);
    else if (st.okEnabled && st.ok) { await click(page, st.ok); steps++; }
    else if (st.slot && !st.sel) await click(page, st.slot);
    last = st.cards;
  }
  const m = await val(METRICS);
  return {finished: !!(await val(`!document.getElementById('scr-results').hidden`)), turnsPlayed: steps, cardsLeft: last, ...m};
}

const port = 9500 + Math.floor(Math.random() * 300);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-soak-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--enable-precise-memory-info', 'about:blank']);
const out = [];
try {
  let ver;
  for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch (_) { await sleep(200); } }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = await cdp(list.find(p => p.type === 'page').webSocketDebuggerUrl);
  const logs = [];
  page.on(d => {
    if (d.method === 'Runtime.exceptionThrown') logs.push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n').slice(0, 3).join(' | '));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !/Failed to load resource/.test(d.params.entry.text)) logs.push('log: ' + d.params.entry.text.slice(0, 200));
  });
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Log.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 2, mobile: true});
  await page.send('Page.addScriptToEvaluateOnNewDocument', {source: PROBE});
  for (let g = 0; g < GAMES; g++) {
    await page.send('Page.navigate', {url: SITE});
    await sleep(1500);
    if (PROFILE) { await page.send('Profiler.enable'); await page.send('Profiler.setSamplingInterval', {interval: 1000}); await page.send('Profiler.start'); }
    out.push(await playOne(page));
    if (PROFILE) {
      const {profile} = await page.send('Profiler.stop');
      const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
      profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame, k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0)); });
      const total = [...self.values()].reduce((a, b) => a + b, 0);
      out.push({profileTop: [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${Math.round(v / 1000)} ms  ${(100 * v / total).toFixed(1)}%  ${k}`)});
    }
  }
  out.push({console: [...new Set(logs)].slice(0, 30)});
  page.close();
} finally {
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(prof, {recursive: true, force: true}); } catch (_) {}
}
console.log(JSON.stringify(out, null, 1));
