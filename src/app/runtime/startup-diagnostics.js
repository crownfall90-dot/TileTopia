// Errors must never leave a dead screen: report them and keep playing.
let errShown = false, lastErrorReported = 0;
function reportError(msg) {
  try { if (window.AndroidApp && AndroidApp.logError) AndroidApp.logError(String(msg).slice(0, 500)); } catch (_) {}
  plog('error', String(msg).slice(0, 200));
  if (!errShown) { errShown = true; toast('Что-то пошло не так, игра продолжает работу'); }
  try {
    if (typeof FB !== 'undefined' && FB?.dbUrl && FBC?.load()?.uid && Date.now() - lastErrorReported > 30000) {
      lastErrorReported = Date.now();
      const diag = typeof getDeviceDiagnostics === 'function' ? getDeviceDiagnostics() : null;
      const devStr = diag ? `${diag.os} · ${diag.screen} · ${diag.net}`.slice(0, 200) : undefined;
      const trailStr = (window._actionTrail && window._actionTrail.length) ? window._actionTrail.slice(-6).map(x => x.a).join(' -> ').slice(0, 200) : undefined;
      fbToken().then(t => {
        fetch(`${FB.dbUrl}/errors.json?auth=${t}`, {
          method: 'POST',
          body: JSON.stringify({
            m: String(msg).slice(0, 500),
            ua: (navigator.userAgent || '').slice(0, 200),
            ver: appVersion(),
            uid: (FBC && FBC.session() && FBC.session().uid) || undefined,
            dev: devStr,
            trail: trailStr,
            ts: {'.sv': 'timestamp'}
          })
        }).catch(() => {});
      }).catch(() => {});
    }
  } catch (_) {}
}
async function checkMaintenance() {
  if (typeof FB === 'undefined' || !FB || !FB.dbUrl) return;
  try {
    const r = await fetch(`${FB.dbUrl}/config/maintenance.json`);
    if (!r.ok) return;
    const cfg = await r.json();
    if (cfg && cfg.active) showMaintenanceScreen(cfg.message || 'Ведутся плановые технические работы. Игра скоро будет доступна.');
    else { const box = document.getElementById('maintBox'); if (box) box.remove(); } // switched off: the game is back
  } catch (_) {}
}
async function checkUpdatePolicy() {
  if (typeof FB === 'undefined' || !FB || !FB.dbUrl) return;
  try {
    const r = await fetch(`${FB.dbUrl}/config/update.json`);
    if (!r.ok) return;
    const cfg = await r.json();
    if (cfg && cfg.minRequiredCode) {
      window.MIN_REQUIRED_CODE = cfg.minRequiredCode;
      if (lastUpd) {
        if (typeof updateSettingsUpdateBtn === 'function') updateSettingsUpdateBtn(lastUpd);
        if (appCode() < cfg.minRequiredCode) window.onUpdateAvailable(lastUpd, false);
      }
    }
  } catch (_) {}
}
// Checked at start, on every return to the app, and every minute while the maintenance screen is up.
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkMaintenance(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdatePolicy(); });
setInterval(() => { if (document.getElementById('maintBox')) checkMaintenance(); }, 60000);
function showMaintenanceScreen(msg) {
  if (document.getElementById('maintBox')) return;
  const d = document.createElement('div');
  d.id = 'maintBox';
  d.style.cssText = 'position:fixed;inset:0;background:#0b0d13;z-index:9999999;display:flex;align-items:center;justify-content:center;padding:24px;color:#fff;font-family:sans-serif;text-align:center';
  // The message comes from the database: put it in as text, never as markup.
  d.innerHTML = '<div class="ocard" style="background:#141721;border:1.5px solid rgba(242,184,75,.35);border-top:1.5px solid rgba(255,230,150,.65);padding:32px 24px;border-radius:24px;max-width:380px;box-shadow:0 24px 64px rgba(0,0,0,0.85),0 0 32px rgba(242,184,75,.12);text-align:center"><div style="font-size:48px;margin-bottom:12px">🛠️</div><h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff">Технические работы</h2><p id="maintMsg" style="color:#8b94a7;font-size:14px;line-height:1.5;margin:0 0 16px"></p><button id="maintRetry" class="cta wide">Попробовать снова</button></div>';
  d.querySelector('#maintMsg').textContent = String(msg).slice(0, 500);
  const retryBtn = d.querySelector('#maintRetry');
  if (retryBtn) {
    retryBtn.onclick = () => {
      retryBtn.disabled = true;
      retryBtn.textContent = 'Перезапуск…';
      location.reload();
    };
  }
  document.body.appendChild(d);
}
window.addEventListener('error', e => reportError((e.message || 'error') + ' @' + (e.lineno || 0)));
window.addEventListener('unhandledrejection', e => reportError('promise: ' + (e.reason && e.reason.message || e.reason)));
/* Anti-cheat & Security: block F12, developer shortcuts and inspect context menu */
// Text fields keep their long-press menu: players paste friend codes, e-mails and passwords.
document.addEventListener('contextmenu', e => { if (!(e.target && e.target.closest && e.target.closest('input,textarea,[contenteditable]'))) e.preventDefault(); });
window.addEventListener('keydown', e => {
  const k = e.key || e.keyCode;
  if (k === 'F12' || k === 123) { e.preventDefault(); e.stopPropagation(); return false; }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || k === 73 || k === 74 || k === 67)) {
    e.preventDefault(); e.stopPropagation(); return false;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || k === 85)) {
    e.preventDefault(); e.stopPropagation(); return false;
  }
});

// The site and Android 300+ ship all the WebP faces. Older OTA hosts and the demo retain the generated faces.
try { injectArt({withFallback: !(isWeb || (isAndroid && appCode() >= 300))}); } catch (e) { plog('error', 'injectArt: ' + (e.message || e)); }
try { dailyBonus(); } catch (_) {}
try { renderPrefs(); } catch (_) {}
try { checkMaintenance(); } catch (_) {}
try { checkUpdatePolicy(); } catch (_) {}
try { applyStatsConsent(); } catch (_) {}
