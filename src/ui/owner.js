// Owner panel constants, GitHub workflow status formatting, and admin panel UI helpers

export const DEV_REPO = 'crownfall90-dot/TileTopia';
export const DEV_WF = 'news.yml';
export const DEV_NATIVE = ['devToken', 'devPanel'];

export const RUN_TEXT = {
  queued: 'в очереди',
  in_progress: 'отправляется',
  completed: ''
};

export function devGet(k, storage = null, nativeApp = null) {
  let v = '';
  try {
    if (storage) v = storage.getItem(k) || '';
    else if (typeof localStorage !== 'undefined') v = localStorage.getItem(k) || '';
  } catch (_) {}

  if (v && DEV_NATIVE.includes(k) && nativeApp && nativeApp.getPref && nativeApp.setPref) {
    try {
      if (!nativeApp.getPref(k)) nativeApp.setPref(k, v);
    } catch (_) {}
  }
  if (!v && DEV_NATIVE.includes(k) && nativeApp && nativeApp.getPref) {
    try {
      v = nativeApp.getPref(k) || '';
      if (v && storage) storage.setItem(k, v);
      else if (v && typeof localStorage !== 'undefined') localStorage.setItem(k, v);
    } catch (_) {}
  }
  return v;
}

export function devSet(k, v, storage = null, nativeApp = null) {
  try {
    if (storage) {
      if (v) storage.setItem(k, v);
      else storage.removeItem(k);
    } else if (typeof localStorage !== 'undefined') {
      if (v) localStorage.setItem(k, v);
      else storage.removeItem(k);
    }
  } catch (_) {}

  if (DEV_NATIVE.includes(k) && nativeApp && nativeApp.setPref) {
    try {
      nativeApp.setPref(k, v || '');
    } catch (_) {}
  }
}

export function formatDevStatus(run) {
  if (!run) return 'Ещё ничего не отправляли';
  const when = new Date(run.created_at).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
  const outcome = run.status === 'completed'
    ? (run.conclusion === 'success' ? '✅ доставлена в Firebase' : '❌ ошибка — откройте Actions на GitHub')
    : '⏳ ' + (RUN_TEXT[run.status] || run.status);
  return `Последняя отправка ${when}: ${outcome}`;
}

export function renderDevPanelCardHtml({tok, devTitle, devBody, devTestOn, siteUrl, repo}) {
  const escTitle = (devTitle || '').replace(/"/g, '&quot;');
  const escBody = (devBody || '').replace(/</g, '&lt;');
  const curRepo = repo || DEV_REPO;

  const content = tok ? `
    <input class="field" id="devTitle" maxlength="60" placeholder="Заголовок" value="${escTitle}">
    <textarea class="field" id="devBody" maxlength="300" rows="4" placeholder="Текст уведомления">${escBody}</textarea>
    <label class="devtest"><input type="checkbox" id="devTest"${devTestOn ? ' checked' : ''}> Только мне — проверить, как выглядит</label>
    <button class="cta wide" id="devSend">Отправить</button>
    <p class="shint" id="devState">Проверяем…</p>
    <button class="linkbtn" id="devForget">Сменить токен GitHub</button>
  ` : `
    <p>Пуш уходит через GitHub. Нужен ваш токен: GitHub → Settings → Developer settings → Fine-grained tokens → репозиторий ${curRepo}, разрешение «Actions: Read and write». Токен хранится только на этом телефоне.</p>
    <input class="field" id="devTok" type="password" placeholder="github_pat_…" autocomplete="off">
    <button class="cta wide" id="devSave">Сохранить</button><p class="shint" id="devState"></p>
  `;

  return `<div class="ocard dev"><div style="font-size:38px">📣</div><h3>Сообщение всем игрокам</h3>
    ${content}
    <button class="ghostbtn" id="devStats">📊 Статистика игры</button>
    <a class="ghostbtn devlink" href="${siteUrl || '/'}admin/" target="_blank" rel="noopener">🛠 Админ-панель и отзывы на сайте</a>
    <button class="ghostbtn" id="devClose">Закрыть</button></div>`;
}

export function computePresenceStats({pres = {}, rels = [], now = Date.now()}) {
  const relOk = Array.isArray(rels);
  const P = Object.values(pres || {}).filter(v => v && typeof v.n === 'string' && v.n && v.s);
  const D = 864e5;
  const ago = v => now - (v.t || 0);
  const online = P.filter(v => v.s !== 'off' && ago(v) < 150000);
  const n = f => P.filter(f).length;
  const app = v => v.p === 'github' || v.p === 'play';
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

  return {
    totalPlayers: P.length,
    registered: n(v => v.r),
    onlineNow: online.length,
    playingNow: playing,
    activeDay: n(v => ago(v) < D),
    activeWeek: n(v => ago(v) < 7 * D),
    d1Str,
    d7Str,
    withApp: n(app),
    updatedDay: n(v => app(v) && now - (v.u || 0) < D),
    webVersion: n(v => v.p === 'web'),
    releasesCount: relOk ? rels.length : '—'
  };
}

export function renderStatsGridHtml(stats) {
  const tile = (num, label) => `<div class="stt"><b>${num}</b><small>${label}</small></div>`;
  return `<div class="stgrid">${tile(stats.totalPlayers, 'игроков заходили')}${tile(stats.registered, 'с сохранённым профилем')}${tile(stats.onlineNow, 'в сети сейчас')}${tile(stats.playingNow, 'играют сейчас')}
    ${tile(stats.activeDay, 'за сутки')}${tile(stats.activeWeek, 'за неделю')}${tile(stats.d1Str, 'удержание D1')}${tile(stats.d7Str, 'удержание D7')}
    ${tile(stats.withApp, 'с приложением')}${tile(stats.updatedDay, 'обновились за сутки')}${tile(stats.webVersion, 'в веб-версии')}${tile(stats.releasesCount, 'версий вышло')}</div>
    <p class="shint" style="margin-top:10px">Показатели активности и удержания игроков</p>`;
}
