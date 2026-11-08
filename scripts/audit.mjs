// Walks through every screen of the web build in headless Chrome (CDP) at several phone sizes and reports:
// JS errors and failed requests, text that spills out of its box, elements wider than the screen. Screenshots too.
//   node scripts/audit.mjs [out-dir] [sizes like 360x740,412x915,768x1024]
// Needs the site served: sh scripts/wrap-web.sh web && python -m http.server 8126 --directory build/web
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [outDir = 'build/audit', sizes = '360x740,412x915,768x1024'] = process.argv.slice(2);
const SITE = process.env.SITE || 'http://localhost:8126/';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// In the page: open a screen or a dialog the way a player would, then measure.
const PRELUDE = `
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const byText = re => [...document.querySelectorAll('button,a,[role=button]')].find(b => b.offsetParent && re.test(b.textContent.trim()));
  const clear = () => document.querySelectorAll('.over:not(#over)').forEach(o => o.remove());
  async function boot() {
    for (let i = 0; i < 80 && !window.__ready; i++) await wait(250);
    for (let i = 0; i < 20 && document.getElementById('boot'); i++) await wait(250);
    const done = byText(/^Готово$/); if (done) { done.click(); await wait(700); }
    const later = byText(/^(Позже|Не сейчас)$/); if (later) { later.click(); await wait(400); }
    clear(); await wait(300);
  }
  // Text that does not fit: a box narrower than its text with visible overflow, or a text node outside its box.
  function measure() {
    const out = [], vw = innerWidth;
    const vis = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05 && el.getClientRects().length; };
    const name = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''));
    const path = el => { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(name(e)); return p.join(' > '); };
    for (const el of document.querySelectorAll('body *')) {
      if (!vis(el) || el.closest('#world,#mini,svg,canvas,.tile')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[class*=scroll],.hscroll,.road-map')) out.push({kind: 'wider than screen', el: path(el), w: Math.round(r.width), right: Math.round(r.right)});
      const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
      if (!own.length) continue;
      const s = getComputedStyle(el);
      const clip = s.overflow !== 'visible' || s.textOverflow === 'ellipsis';
      if (!clip && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) out.push({kind: 'text wider than its box', el: path(el), text: el.textContent.trim().slice(0, 40), box: el.clientWidth, need: el.scrollWidth});
      const p = el.parentElement;
      for (const n of own) {
        const rg = document.createRange(); rg.selectNodeContents(n); const t = rg.getBoundingClientRect();
        const box = (clip ? el : p || el).getBoundingClientRect();
        if (t.width && (t.left < box.left - 2 || t.right > box.right + 2 || t.top < box.top - 3 || t.bottom > box.bottom + 3) && !clip) out.push({kind: 'text outside its box', el: path(el), text: n.textContent.trim().slice(0, 40)});
        if (clip && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== 'ellipsis') out.push({kind: 'text cut off', el: path(el), text: n.textContent.trim().slice(0, 40)});
      }
    }
    const seen = new Set();
    return out.filter(x => { const k = x.kind + x.el + (x.text || ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
  }
`;
const go = s => `await boot(); show('${s}'); await wait(900); clear(); await wait(200);`;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SCENES = {
  menu: `await boot();`,
  shop: go('shop'), progress: go('progress'), achievements: go('achievements'), friends: go('friends'), history: go('history'),
  inbox: go('inbox'), items: go('items'), lobby: go('lobby'), profile: go('profile'), rating: go('rating'), rules: go('rules'),
  settings: go('settings'),
  shopStalls: go('shop') + ` document.getElementById('dailyShopWrap').scrollIntoView(); await wait(300);`,
  shopStalls2: go('shop') + ` const w = document.getElementById('dailyShopWrap'); w.scrollIntoView(); document.getElementById('scr-shop').scrollTop += 700; await wait(300);`,
  quests: go('progress') + ` clear(); const q = document.getElementById('btnRoadQuests'); if (!q) throw new Error('no quests button'); const r = q.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (!q.contains(top)) console.error('quests button covered by ' + (top && (top.id || top.className))); q.click(); await wait(900); clear();`,
  menuQuests: `await boot(); const b = document.querySelector('[data-nav="progress"], .tile-quest, #btnMenuQuests'); if (b) b.click(); await wait(900);`,
  setup: `await boot(); openSetup('bots'); await wait(900); clear();`,
  game: `await boot(); openSetup('bots'); await wait(900); clear(); byText(/Начать партию/).click(); await wait(5000); clear();`,
  hub: `await boot(); const h = document.getElementById('btnMenuHub'); if (h) h.click(); await wait(600);`,
};

const port = 9300 + Math.floor(Math.random() * 400);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-audit-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--hide-scrollbars', ...(process.env.NO_SANDBOX ? ['--no-sandbox'] : []), 'about:blank']);
async function cdpConnect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const cb = new Map(), listeners = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } else if (d.method) listeners.forEach(f => f(d)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, d => d.error ? rej(new Error(d.error.message)) : res(d.result)); ws.send(JSON.stringify({id: i, method, params})); });
  return {send, on: f => listeners.push(f), close: () => ws.close()};
}
const report = {};
try {
  let ver;
  for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch (_) { await sleep(200); } }
  const browser = await cdpConnect(ver.webSocketDebuggerUrl);
  fs.mkdirSync(outDir, {recursive: true});
  for (const size of sizes.split(',')) {
    const [W, H] = size.split('x').map(Number);
    for (const name of Object.keys(SCENES).filter(n => !ONLY || ONLY.includes(n))) {
      const {targetId} = await browser.send('Target.createTarget', {url: 'about:blank'});
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = await cdpConnect(list.find(p => p.id === targetId).webSocketDebuggerUrl);
      const errs = [];
      page.on(d => {
        if (d.method === 'Runtime.exceptionThrown') errs.push('exception: ' + ((d.params.exceptionDetails.exception || {}).description || d.params.exceptionDetails.text).split('\n').slice(0, 2).join(' | '));
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console.error: ' + d.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 200));
      });
      await page.send('Runtime.enable');
      await page.send('Page.enable');
      await page.send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: W < 900});
      await page.send('Page.navigate', {url: SITE});
      await sleep(1500);
      const r = await page.send('Runtime.evaluate', {expression: `(async () => { ${PRELUDE} ${SCENES[name]} return JSON.stringify(measure()); })()`, awaitPromise: true, returnByValue: true});
      if (r.exceptionDetails) errs.push('scene failed: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text).split('\n')[0]);
      const issues = r.result && r.result.value ? JSON.parse(r.result.value) : [];
      const shot = await page.send('Page.captureScreenshot', {format: 'jpeg', quality: 60});
      fs.writeFileSync(path.join(outDir, `${size}-${name}.jpg`), Buffer.from(shot.data, 'base64'));
      report[`${size} ${name}`] = {errors: [...new Set(errs)], layout: issues};
      page.close();
      await browser.send('Target.closeTarget', {targetId});
    }
  }
  browser.close();
} finally {
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(prof, {recursive: true, force: true}); } catch (_) {}
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) if (v.errors.length || v.layout.length) console.log(k, '| errors:', v.errors.length, '| layout:', v.layout.length);
