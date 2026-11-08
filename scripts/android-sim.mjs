// Android phone simulator for development: the game in Chromium dressed as real phones (size, pixel density, touch, an
// Android WebView user agent, a slow CPU) with a stand-in for the native bridge (window.AndroidApp), so the code that only
// runs inside the app runs here too. It is not the real WebView and not a real emulator (the container has no KVM, so a full
// Android emulator would crawl), but it finds what matters on a phone: layout, tap size, speed, errors, overflow.
//
//   sh scripts/wrap-web.sh web
//   node scripts/android-sim.mjs [out-dir] [devices]      devices: pixel7,galaxy,compact,tablet (default: all)
//   CPU=4 node scripts/android-sim.mjs                     CPU slow-down (4 = a weak phone, 1 = none)
//
// Writes <out-dir>/report.json and one screenshot per device and screen.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outDir = path.join(ROOT, 'build', 'android-sim'), only = ''] = process.argv.slice(2);
const CPU = +(process.env.CPU || 4);
const SITE = 'file://' + path.join(ROOT, 'build', 'web', 'index.html');

const DEVICES = {
  pixel7: {w: 412, h: 915, dpr: 2.625, ua: 'Pixel 7'},
  galaxy: {w: 360, h: 800, dpr: 3, ua: 'SM-A146B'},
  compact: {w: 320, h: 640, dpr: 2, ua: 'Moto E7'},
  tablet: {w: 800, h: 1280, dpr: 2, ua: 'SM-X200'},
};
const SCREENS = ['menu', 'shop', 'progress', 'achievements', 'friends', 'history', 'inbox', 'items', 'lobby', 'profile', 'rating', 'rules', 'settings'];

// What the Java side offers (app/src/main/java/.../MainActivity.java): the same names, harmless answers.
const BRIDGE = `
  (function () {
    var prefs = {};
    window.__nativeCalls = [];
    var rec = function (n) { return function () { window.__nativeCalls.push(n); }; };
    window.AndroidApp = {
      contentReady: rec('contentReady'), contentCode: function () { return 999999; }, openAppSettings: rec('openAppSettings'),
      versionName: function () { return '1.0.999'; }, uiScale: function () { return 1; }, store: function () { return 'github'; },
      share: rec('share'), deviceInfo: function () { return 'sim'; }, startUpdate: rec('startUpdate'), checkUpdates: rec('checkUpdates'),
      setUpdateNotifications: rec('setUpdateNotifications'), logError: function (m) { window.__nativeCalls.push('logError:' + m); },
      googleReady: function () { return false; }, googleSignIn: rec('googleSignIn'), logEvent: rec('logEvent'), setAnalytics: rec('setAnalytics'),
      resetAnalytics: rec('resetAnalytics'), notificationsAllowed: function () { return true; }, askNotifications: rec('askNotifications'),
      getPref: function (k) { return prefs[k] == null ? '' : prefs[k]; }, setPref: function (k, v) { prefs[k] = String(v); }, newsTest: rec('newsTest'),
    };
  })();
`;

// In the page: what a thumb cannot hit well, and what runs off the screen.
const MEASURE = `(() => {
  const vw = innerWidth, small = [], wide = [];
  const vis = el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05 && r.width > 1 && r.height > 1 && el.offsetParent !== null; };
  const name = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : ''));
  for (const el of document.querySelectorAll('button,a[href],[role=button],[data-go],input,select,textarea,.chip')) {
    if (!vis(el) || el.closest('#world,svg,canvas,.tile')) continue;
    const r = el.getBoundingClientRect();
    if (r.top > innerHeight + 4 || r.bottom < -4) continue;
    if (Math.min(r.width, r.height) < 36) small.push(name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (el.textContent.trim() ? ' «' + el.textContent.trim().slice(0, 18) + '»' : ''));
  }
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('#world,svg,canvas,.tile,[class*=scroll],.hscroll,.road-map')) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') wide.push(name(el) + ' right=' + Math.round(r.right));
  }
  return {smallTargets: [...new Set(small)].slice(0, 25), overflow: [...new Set(wide)].slice(0, 15), docOverflowX: document.documentElement.scrollWidth > vw + 1};
})()`;

const names = only ? only.split(',') : Object.keys(DEVICES);
fs.mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch({args: ['--no-sandbox']});
const report = {};
for (const dev of names) {
  const d = DEVICES[dev];
  if (!d) { console.log('unknown device', dev); continue; }
  const ctx = await browser.newContext({
    viewport: {width: d.w, height: d.h}, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true, locale: 'ru-RU',
    userAgent: `Mozilla/5.0 (Linux; Android 14; ${d.ua} Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36`,
  });
  await ctx.addInitScript(BRIDGE);
  // a returning player: the tutorial was done and a name chosen, so no first-run dialogs hide the screens
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('wallet')) localStorage.setItem('wallet', JSON.stringify({gold: 1250, stars: 3, owned: ['classic'], fig: 'classic', tut: 1, tutAsked: 1, name: 'Игрок', color: '#ef5350', sound: true})); } catch (_) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('exception: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 160)); });
  if (CPU > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', {rate: CPU}); }
  const t0 = Date.now();
  await page.goto(SITE);
  await page.waitForFunction(() => window.__ready, null, {timeout: 60000}).catch(() => errors.push('never became ready'));
  const bootMs = Date.now() - t0;
  await page.waitForTimeout(1200);
  // the first-run dialogs (welcome, profile, notifications): close them the way a player would, by tapping
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole('button', {name: /^(Пропустить обучение|Позже|Не сейчас|Готово|Закрыть|Понятно)$/}).first();
    const link = page.getByText(/^Пропустить обучение$/).first();
    if (await btn.count() && await btn.isVisible().catch(() => false)) { await btn.tap().catch(() => {}); }
    else if (await link.count() && await link.isVisible().catch(() => false)) { await link.tap().catch(() => {}); }
    else break;
    await page.waitForTimeout(500);
  }
  const res = {bootMs, errors: [], screens: {}};
  for (const sc of SCREENS) {
    try {
      await page.evaluate(async s => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        document.querySelectorAll('.over:not(#over)').forEach(o => o.remove());
        if (s !== 'menu' && typeof show === 'function') show(s);
        else if (s !== 'menu' && window.__pg) window.__pg.show(s);
        await wait(700);
      }, sc);
      const m = await page.evaluate(MEASURE);
      await page.screenshot({path: path.join(outDir, `${dev}-${sc}.png`)});
      res.screens[sc] = m;
    } catch (e) { res.screens[sc] = {error: String(e.message).split('\n')[0]}; }
  }
  res.errors = [...new Set(errors)];
  res.nativeCalls = await page.evaluate(() => [...new Set(window.__nativeCalls || [])]);
  report[dev] = res;
  await ctx.close();
  const bad = Object.entries(res.screens).filter(([, v]) => v.docOverflowX || (v.smallTargets || []).length || (v.overflow || []).length).length;
  console.log(`${dev.padEnd(8)} ${d.w}x${d.h}@${d.dpr}  boot ${bootMs} ms (cpu x${CPU})  errors ${res.errors.length}  screens with findings ${bad}/${SCREENS.length}`);
}
await browser.close();
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
console.log('report:', path.join(outDir, 'report.json'));
