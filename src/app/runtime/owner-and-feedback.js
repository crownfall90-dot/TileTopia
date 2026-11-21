/* ---------------- owner panel: news push to all players ----------------
   Hidden: 7 taps on "Версия" in Settings. Sending starts .github/workflows/news.yml through the
   GitHub API with the owner's own token (fine-grained, this repository, Actions: read and write),
   kept only on this phone. Nobody without that token can send; the Firebase key stays in GitHub. */
const DEV_REPO = 'crownfall90-dot/TileTopia', DEV_WF = 'news.yml';
// The owner's token and panel switch are also kept natively in the Android app (private preferences,
// part of the phone's backup), so clearing the page's storage or signing out does not lose them.
const DEV_NATIVE = ['devToken', 'devPanel'];
const devGet = k => (PG.ui && PG.ui.owner) ? PG.ui.owner.devGet(k, localStorage, window.AndroidApp) : (localStorage.getItem(k) || '');
const devSet = (k, v) => (PG.ui && PG.ui.owner) ? PG.ui.owner.devSet(k, v, localStorage, window.AndroidApp) : (v ? localStorage.setItem(k, v) : localStorage.removeItem(k));
// The owner's panel in the game is for accounts listed in /admins only: the database answers /errors to them alone, so
// a successful read of one record is the proof. Anyone else tapping the version row gets nothing.
async function isAdminNow() {
  if (!FB) return false;
  try { const r = await fetch(`${FB.dbUrl}/errors.json?orderBy="$key"&limitToFirst=1&auth=${await fbToken()}`); return r.ok; } catch (_) { return false; }
}
function devVerify() { // a flag left in the browser's storage is not trusted: checked again at every start
  if (!devGet('devPanel')) return;
  isAdminNow().then(ok => { if (!ok) { devSet('devPanel', ''); $('#devBtn').hidden = true; } });
}
let devTaps = 0, devTapAt = 0;
$('#verFull').closest('.srow').addEventListener('click', () => {
  if (Date.now() - devTapAt > 1500) devTaps = 0;
  devTapAt = Date.now();
  if (++devTaps < 7) return;
  devTaps = 0;
  isAdminNow().then(ok => { if (ok) { devSet('devPanel', '1'); $('#devBtn').hidden = false; devPanel(); } });
});
async function gh(path, opt = {}) {
  return fetch('https://api.github.com/repos/' + DEV_REPO + path, {...opt, headers: {Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + devGet('devToken'), 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? {'Content-Type': 'application/json'} : {})}});
}
const RUN_TEXT = {queued: 'в очереди', in_progress: 'отправляется', completed: ''};
async function devStatus(el) {
  try {
    const r = await gh(`/actions/workflows/${DEV_WF}/runs?per_page=1`);
    if (!r.ok) { el.textContent = r.status === 401 ? 'Токен не подходит — замените его' : 'Нет доступа (' + r.status + ')'; return null; }
    const run = ((await r.json()).workflow_runs || [])[0];
    el.textContent = (PG.ui && PG.ui.owner) ? PG.ui.owner.formatDevStatus(run) : (run ? 'Последняя отправка...' : 'Ещё ничего не отправляли');
    return run;
  } catch (_) { el.textContent = 'Нет связи с GitHub'; return null; }
}
function devPanel() {
  if (fbAuth && fbAuth.idToken) { try { localStorage.setItem('pgAdminAuth', JSON.stringify({idToken: fbAuth.idToken, refreshToken: fbAuth.refreshToken || '', uid: fbAuth.uid, email: fbAuth.email || '', exp: Date.now() + 3500000})); } catch (_) {} }
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  const draw = () => {
    const tok = devGet('devToken');
    box.innerHTML = (PG.ui && PG.ui.owner)
      ? PG.ui.owner.renderDevPanelCardHtml({tok, devTitle: devGet('devTitle'), devBody: devGet('devBody'), devTestOn: !!devGet('devTestOn'), siteUrl: SITE_URL, repo: DEV_REPO})
      : `<div class="ocard dev"><h3>Сообщение всем игрокам</h3></div>`;
    if (tok) devStatus(box.querySelector('#devState'));
  };
  draw(); document.body.append(box);
  box.addEventListener('input', e => { if (e.target.id === 'devTitle') devSet('devTitle', e.target.value); if (e.target.id === 'devBody') devSet('devBody', e.target.value); });
  box.addEventListener('change', e => {
    if (e.target.id !== 'devTest') return;
    devSet('devTestOn', e.target.checked ? '1' : '');
    if (e.target.checked && window.AndroidApp && AndroidApp.newsTest) AndroidApp.newsTest(true);
  });
  box.addEventListener('click', async e => {
    const id = e.target.id, st = box.querySelector('#devState');
    if (id === 'devClose' || e.target === box) return box.remove();
    if (id === 'devStats') return statsDialog();
    if (id === 'devForget') { devSet('devToken', ''); return draw(); }
    if (id === 'devSave') {
      const t = box.querySelector('#devTok').value.trim(); if (!t) return;
      devSet('devToken', t); st.textContent = 'Проверяем…';
      // Checked on what the panel really uses (Actions). Only a rejected token (401) is dropped;
      // no connection or a missing permission keeps it, so it is never thrown away by accident.
      const r = await gh(`/actions/workflows/${DEV_WF}`).catch(() => null);
      if (r && r.status === 401) { devSet('devToken', ''); st.textContent = 'GitHub не принял токен — проверьте, что скопировали его целиком'; return; }
      if (!r) { st.textContent = 'Нет связи с GitHub — токен сохранён, проверим позже'; return; }
      if (!r.ok) { st.textContent = `Токен сохранён, но у GitHub ответ ${r.status}: проверьте права Actions (чтение и запись)`; return; }
      return draw();
    }
    if (id !== 'devSend') return;
    const title = box.querySelector('#devTitle').value.trim(), body = box.querySelector('#devBody').value.trim(), test = box.querySelector('#devTest').checked;
    if (!title || !body) return toastAny('Нужны заголовок и текст');
    const go = async () => {
      if (test && window.AndroidApp && AndroidApp.newsTest) AndroidApp.newsTest(true);
      e.target.disabled = true; st.textContent = 'Отправляем…';
      try {
        const r = await gh(`/actions/workflows/${DEV_WF}/dispatches`, {method: 'POST', body: JSON.stringify({ref: 'main', inputs: {title, body, test: String(test)}})});
        if (r.status !== 204) { st.textContent = r.status === 401 || r.status === 403 ? 'Нет прав — проверьте токен (Actions: Read and write)' : 'GitHub ответил ' + r.status; e.target.disabled = false; return; }
      } catch (_) { st.textContent = 'Нет связи с GitHub'; e.target.disabled = false; return; }
      toastAny(test ? 'Проверка отправлена вам — придёт через минуту' : 'Отправлено — дойдёт за минуту-две');
      if (!test) { devSet('devTitle', ''); devSet('devBody', ''); }
      // Follow the run until it finishes.
      for (let i = 0; i < 18 && box.isConnected; i++) {
        await new Promise(r => setTimeout(r, i ? 10000 : 4000));
        const run = await devStatus(st); if (run && run.status === 'completed') break;
      }
      e.target.disabled = false;
    };
    if (test) return go();
    confirmBox(`Отправить «${title.replace(/[<>&"]/g, "").slice(0, 40)}» всем игрокам?`, 'Отправить всем', go);
  });
}
$('#devBtn').onclick = () => isAdminNow().then(ok => { if (ok) devPanel(); else { devSet('devPanel', ''); $('#devBtn').hidden = true; } });
/* Owner panel → statistics: devices that opened the game (/presence, one record per install or
   browser), saved profiles among them, activity by last visit, rating and APK downloads. The
   full picture (retention, countries, events) is in Firebase → Analytics. */
async function statsDialog() {
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard stats"><h3>📊 Статистика</h3><div id="stBody"><p class="shint">Считаем…</p></div>
    <a class="ghostbtn manual" href="https://console.firebase.google.com/project/puzzlegrad/analytics" target="_blank" rel="noopener">Подробно — Firebase Analytics</a>
    <button class="cta wide" id="stClose">Закрыть</button></div>`;
  document.body.append(box);
  box.onclick = e => { if (e.target === box || e.target.id === 'stClose') box.remove(); };
  const out = box.querySelector('#stBody');
  if (!FB) { out.innerHTML = '<p class="shint">Нужен интернет</p>'; return; }
  try {
    const [pres, lead, rel] = await Promise.all([
      fbGet('presence').catch(() => null), fbGet('leaders').catch(() => null),
      // Public list, no token: the owner's token only has access to Actions, so with it GitHub refuses the list.
      fetch(`https://api.github.com/repos/${DEV_REPO}/releases?per_page=100`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const relOk = Array.isArray(rel), rels = relOk ? rel : []; // GitHub may answer with a limit message instead of the list
    if (typeof PG !== 'undefined' && PG.ui && PG.ui.owner && PG.ui.owner.computePresenceStats && PG.ui.owner.renderStatsGridHtml) {
      const stats = PG.ui.owner.computePresenceStats({pres, rels, now: Date.now()});
      out.innerHTML = PG.ui.owner.renderStatsGridHtml(stats);
      return;
    }
    // Only real game records: a name and a state. Leftovers from early builds and test runs
    // (just a time, no name) are skipped.
    const now = Date.now(), P = Object.values(pres || {}).filter(v => v && typeof v.n === 'string' && v.n && v.s), D = 864e5;
    const ago = v => now - (v.t || 0);
    const online = P.filter(v => v.s !== 'off' && ago(v) < 150000);
    const n = f => P.filter(f).length;
    const app = v => v.p === 'github' || v.p === 'play';
    const tile = (num, label) => `<div class="stt"><b>${num}</b><small>${label}</small></div>`;
    const playing = online.filter(v => v.s === 'online' || v.s === 'bots' || v.s === 'search').length;
    let eligD1 = 0, retD1 = 0, eligD7 = 0, retD7 = 0, hasFb1 = false, hasFb7 = false;
    P.forEach(v => {
      const fs = v.fs; if (!fs || !/^\d{4}-\d{2}-\d{2}$/.test(fs)) return;
      const fsMs = Date.parse(fs + 'T00:00:00Z'), age = Math.floor((now - fsMs) / D);
      if (age >= 1) {
        eligD1++;
        if (v.d1 != null) { if (v.d1 === 1) retD1++; }
        else if (v.t - fsMs >= D) { retD1++; hasFb1 = true; }
      }
      if (age >= 7) {
        eligD7++;
        if (v.d7 != null) { if (v.d7 === 1) retD7++; }
        else if (v.t - fsMs >= 7 * D) { retD7++; hasFb7 = true; }
      }
    });
    const d1Str = eligD1 ? Math.round(retD1 / eligD1 * 100) + '%' + (hasFb1 ? ' (оценка)' : '') : '—';
    const d7Str = eligD7 ? Math.round(retD7 / eligD7 * 100) + '%' + (hasFb7 ? ' (оценка)' : '') : '—';
    out.innerHTML = `<div class="stgrid">${tile(P.length, 'игроков заходили')}${tile(n(v => v.r), 'с сохранённым профилем')}${tile(online.length, 'в сети сейчас')}${tile(playing, 'играют сейчас')}
      ${tile(n(v => ago(v) < D), 'за сутки')}${tile(n(v => ago(v) < 7 * D), 'за неделю')}${tile(d1Str, 'удержание D1')}${tile(d7Str, 'удержание D7')}
      ${tile(n(app), 'с приложением')}${tile(n(v => app(v) && now - (v.u || 0) < D), 'обновились за сутки')}${tile(n(v => v.p === 'web'), 'в веб-версии')}${tile(relOk ? rels.length : '—', 'версий вышло')}</div>
      <p class="shint" style="margin-top:10px">Показатели активности и удержания игроков</p>`;
  } catch (_) { out.innerHTML = '<p class="shint">Не получилось загрузить — проверьте интернет</p>'; }
}

/* Notifications are off (in Android or in the game's settings): offer to turn them on the first
   time the main menu shows, then every 2 days. */
const NOTIF_EVERY = 2 * 864e5;
const notifOff = () => !!window.AndroidApp && AndroidApp.notificationsAllowed && (!wallet.notify || !AndroidApp.notificationsAllowed());
function notifNudge() {
  if (!notifOff() || tut || !boot.gone || document.querySelector('body > .over')) return;
  const now = Date.now();
  if (now - (wallet.notifAt || 0) < NOTIF_EVERY) return;
  wallet.notifAt = now; saveWallet();
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard"><div style="font-size:44px">🔔</div><h3>Включите уведомления</h3><p>Вы узнаете о приглашениях в игру, новых версиях, турнирах и подарках. Без спама — только важное</p><button class="cta wide" data-n="on">Включить</button><button class="ghostbtn" data-n="no">Не сейчас</button></div>`;
  document.body.append(box);
  box.onclick = e => {
    const b = e.target.closest('[data-n]'); if (!b) return; box.remove();
    if (b.dataset.n !== 'on') return;
    if (!wallet.notify) { wallet.notify = true; saveWallet(); AndroidApp.setUpdateNotifications(true); if (!$('#scr-settings').hidden) renderPrefs(); }
    if (!AndroidApp.notificationsAllowed()) AndroidApp.askNotifications(); else toastAny('Уведомления включены');
  };
}
// Back from the system settings: say thanks once they are on.
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !window.AndroidApp || !AndroidApp.notificationsAllowed) return;
  if (wallet.notifAt && Date.now() - wallet.notifAt < 10 * 60000 && wallet.notify && AndroidApp.notificationsAllowed() && !wallet.notifThanked) { wallet.notifThanked = true; saveWallet(); toastAny('Уведомления включены 👍'); }
});
$('#fAdd').onclick = () => addByCode($('#fCodeIn').value);
$('#fGate').addEventListener('click', e => {
  const id = e.target.id;
  if (id === 'fgName') askProfile(); else if (id === 'fgLink') accountDialog('link'); else if (id === 'fgLogin') accountDialog('login');
});
$('#fcode').onclick = () => wallet.fcode && copyText(wallet.fcode, `Код ${wallet.fcode} скопирован`);
$('#fRetry').onclick = () => { fcodeErr = ''; openFriends(); };
$('#fCopy').onclick = () => wallet.fcode && shareText(`Играй со мной в Tiletopia! Нажми, чтобы принять приглашение в друзья: ${SITE_URL}?friend=${wallet.fcode}\nМой код друга:\n${wallet.fcode}`, 'Ссылка-приглашение скопирована — отправьте её другу');
function confirmTextParts(text) {
  const value = text == null ? '' : String(text);
  const match = /^([^<>]*)<br\s*\/?><small(?:\s+style="[^"]*")?>([^<>]*)<\/small>$/i.exec(value);
  return match ? {title: match[1], description: match[2]} : {title: value, description: ''};
}
function confirmBox(text, yes, ok, no, onNo) {
  const old = document.getElementById('confirmBox'); if (old && old.dismiss) old.dismiss(false);
  const box = document.createElement('div'); box.id = 'confirmBox'; box.className = 'over'; box.style.position = 'fixed';
  box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'confirmText');
  box.innerHTML = '<div class="ocard"><h3 id="confirmText"></h3><button class="cta wide" data-a="y"></button><button class="ghostbtn" data-a="n"></button></div>';
  const parts = confirmTextParts(text);
  box.querySelector('h3').textContent = parts.title;
  if (parts.description) {
    const description = document.createElement('p');
    description.id = 'confirmDescription';
    description.textContent = parts.description;
    description.style.cssText = 'font-size:14px;font-weight:500;line-height:1.45;color:var(--muted);margin:8px 0 16px';
    box.querySelector('h3').after(description);
    box.setAttribute('aria-describedby', 'confirmDescription');
  }
  box.querySelector('[data-a=y]').textContent = String(yes || 'Да');
  box.querySelector('[data-a=n]').textContent = String(no || 'Отмена');
  const previous = document.activeElement;
  document.body.append(box); let done = false;
  const close = run => { if (done) return; done = true; document.removeEventListener('keydown', keys); box.remove(); if (previous && previous.isConnected) previous.focus(); if (run && typeof ok === 'function') ok(); };
  const keys = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    else if (e.key === 'Tab') {
      const buttons = [...box.querySelectorAll('button')], i = buttons.indexOf(document.activeElement);
      e.preventDefault(); buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length].focus();
    }
  };
  box.dismiss = close;
  document.addEventListener('keydown', keys);
  box.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; close(b.dataset.a === 'y'); if (b.dataset.a === 'n' && typeof onNo === 'function') onNo(); });
  box.querySelector('[data-a=n]').focus();
}
