/* ---------------- settings ---------------- */
// Phones with little memory start on the light graphics (no tile sides, shadows and trees).
const weakDevice = (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 2;
Object.assign(wallet, Object.assign({music: true, notify: true, coach: 'tip', view: '3d', botlvl: 'normal', speed: 'normal', gfx: weakDevice ? 'low' : 'high', zones: true, alert: true, vib: true}, wallet));
const applyGfx = () => document.documentElement.classList.toggle('lowgfx', wallet.gfx === 'low');
applyGfx();
function renderPrefs() {
  const list = $('#prefs');
  const expanded = new Set([...list.querySelectorAll('details[open]')].map(group => group.dataset.group));
  list.innerHTML = PG.ui.preferences.renderPreferences(wallet, !!window.AndroidApp, expanded);
  renderAccount();
  $('#verFull').textContent = appVersion();
  $('#checkUpd').hidden = !window.AndroidApp;
  try { renderInstall(); } catch (_) {} // the web shell may not be set up yet on the first call
  devGet('devToken'); $('#devBtn').hidden = !devGet('devPanel');
  if (typeof updateNameProposalBtnLabel === 'function') updateNameProposalBtnLabel();
  if (typeof updateTgChannelBtn === 'function') updateTgChannelBtn();
}
$('#prefs').addEventListener('click', e => {
  const change = PG.ui.preferences.preferenceChange(e.target, wallet);
  if (!change) return;
  e.stopPropagation();
  const {key, value} = change;
  wallet[key] = value;
  if (key === 'stats') wallet.statsAsked = true;
  saveWallet();
  renderPrefs();
  const row = $('#prefs').querySelector(`[data-pref="${key}"]`);
  (row?.querySelector('[aria-pressed="true"]') || row)?.focus({preventScroll: true});
  if (key === 'music') { try { audio(); musicUpdate(); } catch (_) {} }
  if (key === 'sound') beep('turn');
  if (key === 'notify' && window.AndroidApp && AndroidApp.setUpdateNotifications) AndroidApp.setUpdateNotifications(wallet.notify);
  if (key === 'stats') { applyStatsConsent(); if (!wallet.stats) { usageState = null; try { localStorage.removeItem('usage'); } catch (_) {} } }
  if (key === 'view') setView(wallet.view);
  if (key === 'zones') { markOwn(); updateOwnership(); }
  if (key === 'gfx') applyGfx();
});

// Only the label changes: replacing the button's text would wipe its icon and arrow.
const checkLabel = t => { const b = $('#checkUpd b'); if (b) b.textContent = t; };
function updateSettingsUpdateBtn(info) {
  const b = $('#checkUpd b');
  if (!b) return;
  if (info && info.code > appCode()) {
    b.textContent = (typeof PG !== 'undefined' && PG.app && PG.app.update && PG.app.update.formatUpdateSettingsBadge)
      ? PG.app.update.formatUpdateSettingsBadge(info)
      : (info.mandatory ? `Обновить до ${info.version} (важно!)` : `Обновить до ${info.version} (по желанию)`);
  } else {
    b.textContent = 'Проверить обновления';
  }
}
$('#checkUpd').onclick = () => { checkLabel('Проверяем…'); AndroidApp.checkUpdates(); setTimeout(() => { if (lastUpd && lastUpd.code > appCode()) updateSettingsUpdateBtn(lastUpd); else checkLabel('Проверить обновления'); }, 4000); };
// A version this session already heard about (and the player put off) is still an update, whatever a later check says.
window.onNoUpdate = () => { checkLabel('Проверить обновления'); if (lastUpd && lastUpd.code > appCode()) return window.onUpdateAvailable(lastUpd, true); toastAny('У вас последняя версия'); };
window.onCheckFailed = () => { checkLabel('Проверить обновления'); toastAny('Не удалось проверить обновления — попробуйте чуть позже'); };
function setView(v) { const top = v === 'top'; $('#boardAngle').textContent = top ? '2D' : '3D'; tweenCam({tilt: top ? 22 : 55}, 400); }
