/* ---------------- setup ---------------- */
/* Profile: the nickname chosen after the tutorial. Shown in the profile, in every game, in the
   rating and the online list; changed only in Settings. Seat 1 at this phone always uses it. */
// The nickname the player chose; until then a numbered guest name (nickname1, nickname2…) handed
// out once per device by the shared counter /guestN, never the placeholder «Вы».
function profileName() {
  return (typeof PG !== 'undefined' && PG.ui && PG.ui.setup && PG.ui.setup.formatProfileName)
    ? PG.ui.setup.formatProfileName(setup.seats, wallet, clean)
    : (() => {
      const old = clean(setup.seats[0].name);
      return clean(wallet.name) || clean(wallet.guest) || (old && old !== 'Вы' && old !== 'Игрок' ? old : '') || 'nickname';
    })();
}
// Every player gets a hidden player number once (/playerNo/{uid}), in the order they first went
// online; a player without a nickname is shown as nickname<number>. Players from before numbers
// existed were numbered once, in the order they joined.
async function ensureGuestName() {
  if (!FB || wallet.no) return;
  try {
    const tok = await fbToken(), me = fbAuth && fbAuth.uid;
    const mine = await fetch(`${FB.dbUrl}/playerNo/${me}.json?auth=${tok}`).then(r => r.ok ? r.json() : null).catch(() => null);
    const take = n => {
      wallet.no = n;
      if (!clean(wallet.name)) {
        let preferred = '';
        if (typeof PG !== 'undefined' && PG.app && PG.app.telegram) {
          const tgU = PG.app.telegram.getTelegramUser();
          if (tgU) preferred = tgU.username || tgU.firstName || '';
        }
        const gen = preferred || ((typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.generateRandomNickname)
          ? PG.account.auth.generateRandomNickname()
          : 'Зодчий');
        wallet.guest = gen;
      }
      saveWallet(); renderSetup(); if (typeof presenceMark === 'function') presenceMark(true);
    };
    if (mine) return take(mine);
    const url = `${FB.dbUrl}/guestN.json?auth=${tok}`;
    for (let i = 0; i < 5 && !wallet.no; i++) {
      const r = await fetch(url, {headers: {'X-Firebase-ETag': 'true'}}); if (!r.ok) return;
      const n = ((await r.json()) | 0) + 1;
      const w = await fetch(url, {method: 'PUT', headers: {'if-match': r.headers.get('ETag')}, body: String(n)});
      if (w.ok) { await fetch(`${FB.dbUrl}/playerNo/${me}.json?auth=${tok}`, {method: 'PUT', body: String(n)}).catch(() => {}); take(n); }
      else if (w.status !== 412) return; // another device took this number: try the next one
    }
  } catch (_) {}
}
function setProfileName(n) {
  n = clean(n); if (!n) return false;
  wallet.name = n; wallet.nameAt = Date.now(); setup.seats[0].name = n; saveWallet(); saveSetup();
  if (typeof presenceMark === 'function') presenceMark(true);
  // the new nickname shows at once wherever it is on screen: the main menu header and the profile
  try { renderMenuProfile(); if (!$('#scr-profile').hidden) renderProfile(); } catch (_) {}
  return true;
}
function saveSetup() { try { localStorage.setItem('setup', JSON.stringify(setup)); } catch (_) {} }
// Online with friends: the search starts at once and the friends who are online now are listed to invite into it.
// «Найти быструю игру»: the first open game, whatever its mode and size (own settings only if nobody waits)
$('#setupQuick').onclick = () => quickMatch();
const SETUP_MODES = (typeof PG !== 'undefined' && PG.ui && PG.ui.setup && PG.ui.setup.SETUP_MODES)
  ? PG.ui.setup.SETUP_MODES
  : {
    bots: {title: 'Игра с ботами', go: 'Начать партию', hint: 'Одиночная игра против ботов.'},
    local: {title: 'На одном телефоне', go: 'Начать партию', hint: 'Передавайте устройство перед каждым ходом.'},
    online: {title: 'Игра онлайн', go: 'Начать игру', hint: '', seg: 'Игроков в матче'},
    friends: {title: 'Комната для друзей', go: 'Создать комнату', hint: '', seg: 'Вместимость комнаты'},
  };
let setupMode = 'bots';
const onlineMode = () => setupMode === 'online' || setupMode === 'friends';
let colorEdit = -1;
const swatches = (cur, taken) => (typeof PG !== 'undefined' && PG.ui && PG.ui.setup && PG.ui.setup.renderSwatchesHtml)
  ? PG.ui.setup.renderSwatchesHtml(cur, taken, PALETTE)
  : `<span class="swatches">${PALETTE.map(c => `<button class="sw${c.col === cur ? ' on' : ''}" style="--c:${c.col}" data-sw="${c.col}" ${taken.includes(c.col) ? 'disabled' : ''} aria-label="${c.name}"></button>`).join('')}</span>`;

function renderSetup() {
  $('#setupQuick').hidden = $('#setupOwn').hidden = setupMode !== 'online';
  const on = onlineMode(), m = SETUP_MODES[setupMode], n = on ? setup.onN || 2 : setup.n;
  document.querySelectorAll('#seg button').forEach(b => b.setAttribute('aria-pressed', +b.textContent === n));
  $('#seatsBox').hidden = on; $('#meBox').hidden = !on;
  $('#segHint').hidden = !on; $('#segHint').textContent = m.seg || '';
  const isBotGame = setupMode === 'bots';
  const blBox = $('#setupBotLvlBox');
  if (blBox) {
    blBox.hidden = !isBotGame;
    if (isBotGame) {
      const curLvl = wallet.botlvl || 'normal';
      document.querySelectorAll('#setupBotLvl button').forEach(b => b.setAttribute('aria-pressed', b.dataset.blvl === curLvl));
      const HINTS = {
        easy: 'Лёгкие — простые ходы для спокойной игры или разминки.',
        normal: 'Обычные — взвешенные ходы и захват подходящих объектов.',
        hard: 'Сложные — сильный расчёт очков и агрессивная борьба за города.'
      };
      const blHint = $('#setupBotLvlHint');
      if (blHint) blHint.textContent = HINTS[curLvl] || HINTS.normal;
    }
  }
  const curLoc = wallet.loc || 'village';
  document.querySelectorAll('#setupLoc button').forEach(b => b.setAttribute('aria-pressed', b.dataset.loc === curLoc));
  if (on) {
    if (typeof PG !== 'undefined' && PG.ui && PG.ui.setup && PG.ui.setup.renderSetupMeHtml) {
      const me = PG.ui.setup.renderSetupMeHtml(profileName(), wallet.color, PALETTE);
      $('#setupName').innerHTML = me.infoHtml;
      $('#setupColor').innerHTML = me.swHtml;
    } else {
      $('#setupName').innerHTML = `<span class="av" style="--c:${wallet.color}">${profileName()[0]}</span><b>${profileName()}</b><small>изменить — в настройках</small>`;
      $('#setupColor').innerHTML = swatches(wallet.color, []);
    }
    $('#start').disabled = false; $('#start').textContent = m.go;
    return;
  }
  $('#slist').innerHTML = (typeof PG !== 'undefined' && PG.ui && PG.ui.setup && PG.ui.setup.renderSetupSeatsHtml)
    ? PG.ui.setup.renderSetupSeatsHtml(setup.seats, setup.n, {profileName: profileName(), colorEdit, palette: PALETTE})
    : setup.seats.slice(0, setup.n).map((s, i) => `<li class="seat"><button class="av colbtn" style="--c:${s.col}" data-col="${i}" aria-label="Цвет игрока ${i + 1}">${i + 1}</button><span class="who"><input id="pn${i}" value="${(i ? s.name : profileName()).replace(/"/g, '&quot;')}" maxlength="12" aria-label="Имя игрока ${i + 1}"${i ? '' : ' readonly'}></span>${s.human ? '' : '<span class="botmark" title="Бот">🤖 бот</span>'}${colorEdit === i ? swatches(s.col, setup.seats.slice(0, setup.n).filter((x, j) => j !== i).map(x => x.col)) : ''}</li>`).join('');
  $('#start').disabled = false; $('#start').textContent = m.go;
}
$('#seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (onlineMode()) setup.onN = +b.textContent; else setup.n = +b.textContent; saveSetup(); renderSetup(); };
if ($('#setupBotLvl')) $('#setupBotLvl').onclick = e => {
  const b = e.target.closest('button'); if (!b || !b.dataset.blvl) return;
  wallet.botlvl = b.dataset.blvl; saveWallet();
  if (setup && setup.seats) {
    setup.seats.filter(s => !s.human).forEach(s => s.botlvl = wallet.botlvl);
    saveSetup();
  }
  renderSetup();
};
if ($('#setupLoc')) $('#setupLoc').onclick = e => {
  const b = e.target.closest('button'); if (!b || !b.dataset.loc) return;
  wallet.loc = b.dataset.loc; saveWallet();
  renderSetup();
};
$('#slist').addEventListener('input', e => { const i = +e.target.id.slice(2); setup.seats[i].name = e.target.value; saveSetup(); });
$('#slist').addEventListener('click', e => {
  const cb = e.target.closest('[data-col]'); if (cb) { colorEdit = colorEdit === +cb.dataset.col ? -1 : +cb.dataset.col; return renderSetup(); }
  const sw = e.target.closest('[data-sw]'); if (sw && colorEdit >= 0) { setup.seats[colorEdit].col = sw.dataset.sw; if (colorEdit === 0) { wallet.color = sw.dataset.sw; saveWallet(); } colorEdit = -1; saveSetup(); return renderSetup(); }
});
$('#start').onclick = () => {
  if (setupMode === 'online') return quickMatch(true); // «Создать игру»: a room with these settings, quick players join it
  if (setupMode === 'friends') return createRoom();
  newGame(); show('game');
};

$('#setupColor').addEventListener('click', e => {
  const sw = e.target.closest('[data-sw]'); if (!sw) return;
  wallet.color = setup.seats[0].col = sw.dataset.sw; saveWallet(); saveSetup(); renderSetup();
});

function openSetup(mode) {
  const m = SETUP_MODES[mode];
  setupMode = mode;
  if (typeof PG !== 'undefined' && PG.ui && PG.ui.setup && PG.ui.setup.adjustSeatsForMode) {
    PG.ui.setup.adjustSeatsForMode(setup.seats, mode, PL0);
  } else if (mode === 'bots' || mode === 'local') {
    setup.seats.forEach((x, i) => {
      x.human = mode === 'local' || i === 0;
      if (mode === 'local' && i && x.name === PL0[i].name) x.name = 'Игрок ' + (i + 1);
      if (mode === 'bots' && i && x.name === 'Игрок ' + (i + 1)) x.name = PL0[i].name;
    });
  }
  $('#setupTitle').textContent = m.title; $('#setupHint').textContent = m.hint; $('#setupHint').hidden = !m.hint;
  const hero = $('#setupHero');
  const hm = (typeof PG !== 'undefined' && PG.ui && PG.ui.setup && PG.ui.setup.getSetupHeroMeta)
    ? PG.ui.setup.getSetupHeroMeta(mode)
    : ({bots: ['#3fc27a', '🤖', 'Против компьютера', 'Тренировка: боты ходят сами'], local: ['#b06cf0', '📱', 'На одном телефоне', 'Передавайте телефон по очереди'], online: ['gold', '🌐', 'Рейтинг и кубки', 'Соперники со всего мира'], friends: ['#4c8dff', '👥', 'Игра с друзьями', 'Код комнаты — друзьям']}[mode] || ['#4c8dff', '🧩', '', '']);
  hero.dataset.jc = hm[0]; $('#shIcon').textContent = hm[1]; $('#shTitle').textContent = hm[2]; $('#shTag').textContent = hm[3]; hero.classList.toggle('gold', hm[0] === 'gold');
  colorEdit = -1; saveSetup(); renderSetup(); renderRules(); show('setup');
  $('#scr-setup').scrollTop = 0;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) openSetup(b.dataset.mode); });
let rulesOpen = false;
function renderRules() {
  const mode = MODES[setup.rules.mode] || MODES.classic;
  const cards = (locked) => (typeof PG !== 'undefined' && PG.ui && PG.ui.setup)
    ? PG.ui.setup.renderModeCardsHtml(MODES, setup.rules.mode, locked)
    : (() => {
      const ICON = {fast: '⚡', classic: '⚖️', epic: '🏰'};
      return `<div class="modecards">${Object.entries(MODES).map(([k, m]) => `<button class="mcard" data-setmode="${k}" aria-pressed="${setup.rules.mode === k}"${locked ? ' disabled' : ''}><i>${ICON[k]}</i><b>${m.label}</b><small>${m.desc.split(' · ').slice(0, 2).join(' · ')}</small></button>`).join('')}</div>`;
    })();
  const rows = (on, room) => (typeof PG !== 'undefined' && PG.ui && PG.ui.setup)
    ? PG.ui.setup.renderRuleRowsHtml(RULES, setup.rules, {isOnline: on, isRoom: room})
    : RULES.filter(r => r.k !== 'mode' && (!r.room || room)).map(r => `<div class="opt"><span>${r.label}</span><span class="mseg" data-k="${r.k}">${r.opts.map(([v, l], i) => on && r.k === 'timer' && !v ? '' : `<button data-i="${i}" aria-pressed="${setup.rules[r.k] === v || on && r.k === 'timer' && v === 60 && !setup.rules.timer}">${l}</button>`).join('')}</span></div>`).join('');
  document.querySelectorAll('[data-rules]').forEach(el => {
    const lobby = el.id === 'lbRules', rated = !lobby && setupMode === 'online', canEdit = lobby ? !!(net && net.host) : true;
    el.innerHTML = cards(!canEdit) + (rated || !canEdit ? '' : `<button class="morebtn" data-more aria-expanded="${rulesOpen}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>Свои правила <span>${rulesOpen ? '▴' : '▾'}</span></button><div class="opts"${rulesOpen ? '' : ' hidden'}>${rows(lobby || onlineMode(), lobby || setupMode === 'friends')}</div>`);
  });
}
document.addEventListener('click', e => {
  const m = e.target.closest('[data-setmode]'), more = e.target.closest('[data-more]');
  if (more) { rulesOpen = !rulesOpen; return renderRules(); }
  if (!m || m.disabled) return;
  setup.rules.mode = m.dataset.setmode; Object.assign(setup.rules, MODES[setup.rules.mode].set);
  saveSetup(); renderRules();
  if (net && net.host && net.lobby && !net.gameId) publishLobby(net.lobby.seats);
});
document.addEventListener('click', e => {
  const b = e.target.closest('.mseg button'); if (!b || !b.parentNode.dataset.k) return;
  const r = RULES.find(x => x.k === b.parentNode.dataset.k);
  setup.rules[r.k] = r.opts[+b.dataset.i][0];
  if (r.k === 'mode') Object.assign(setup.rules, MODES[setup.rules.mode].set);
  saveSetup(); renderRules();
  if (net && net.host && net.lobby && !net.gameId) publishLobby(net.lobby.seats);
});
renderRules();
// Results and warnings: one card in the middle of the screen (above the bottom bar and any dialog), in the game's own
// style, with a sign for success, a problem or plain news. Tap it to close; long texts stay longer.
const NOTE_BAD = /^(Не |Нет |Неверн|Ошибка|Сначала|Это ваш)|уже был|не удалось|не хватает|не найден|недоступ/i, NOTE_OK = /^🎉|^✅|активирован|добавлен|сохранён|отправлен|ваша|ваш!|Привет|С возвращением|скопирован/i;
function toastTop() {
  let y = 8;
  const scr = document.querySelector('.screen:not([hidden])');
  const tops = scr ? scr.querySelectorAll('.ltop, .mtop, .gtop, .top, .players, #players, .tbar, header') : [];
  for (const el of tops) { const r = el.getBoundingClientRect(); if (r.height && r.top < 160 && r.bottom < innerHeight / 3) y = Math.max(y, r.bottom + 8); }
  return Math.round(Math.max(y, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--it')) || 0) + 8));
}
function toastAny(t, kind, title) {
  const old = document.getElementById('note'); if (old) old.remove();
  const text = String(t || '').replace(/^(🎉|✅|❌|ℹ️)\s*/, '');
  const k = kind || (NOTE_BAD.test(text) ? 'bad' : NOTE_OK.test(text) ? 'ok' : 'info');
  const d = document.createElement('div');
  d.id = 'note';
  d.className = 'tile-toast ' + k;
  d.setAttribute('role', k === 'bad' ? 'alert' : 'status');

  const icon = k === 'bad' ? '!' : k === 'ok' ? '✓' : 'ℹ';
  const heading = title || (k === 'bad' ? 'Внимание' : k === 'ok' ? 'Успешно' : '');

  d.innerHTML = `
    <div class="tt-icon">${icon}</div>
    <div class="tt-body">
      ${heading ? `<div class="tt-title">${heading}</div>` : ''}
      <div class="tt-msg"></div>
    </div>
    <button class="tt-close" aria-label="Закрыть">✕</button>
  `;
  d.querySelector('.tt-msg').textContent = text;
  // Top right, just under whatever sits at the top of the open screen (its header, the players' row, the menu plate),
  // so it never covers a button and is always in sight; above any open dialog.
  d.style.top = toastTop() + 'px';
  d.style.bottom = 'auto';
  d.style.height = 'auto';
  document.body.append(d);

  const close = () => {
    d.classList.add('out');
    setTimeout(() => d.remove(), 280);
  };
  d.onclick = close;
  setTimeout(close, Math.min(4200, 2000 + text.length * 25));
}
const copyText = async (txt, done) => { try { await navigator.clipboard.writeText(txt); toastAny(done); } catch (_) { toastAny(txt); } };
// Invites: the phone's own share sheet (pick the messenger); copying is the fallback. On Android in the browser the
// text also carries the APK link, since the app is not in a store yet.
async function shareText(txt, done) {
  const full = /Android/i.test(navigator.userAgent) && !isAndroid ? `${txt}\nПриложение для Android: ${APK_URL}` : txt;
  if (window.AndroidApp && AndroidApp.share) { try { AndroidApp.share(full); return; } catch (_) {} }
  if (navigator.share) { try { await navigator.share({title: 'Tiletopia', text: full}); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  copyText(full, done);
}
function shareRoomLink() {
  if (net && net.code) {
    track('share', {content_type: 'room'});
    shareText(`Заходи играть в Tiletopia: ${SITE_URL}?room=${net.code}\nИли в игре «С друзьями» и код комнаты:\n${net.code}`, 'Приглашение скопировано — отправьте его друзьям');
  } else {
    track('share', {content_type: 'quick'});
    shareText(`Заходи играть в Tiletopia: ${SITE_URL}`, 'Ссылка скопирована');
  }
}
if ($('#copyLink')) $('#copyLink').onclick = shareRoomLink;
$('#codeShow').onclick = () => net && net.code && copyText(net.code, `Код ${net.code} скопирован`);
$('#lbCups').onclick = () => { if (!net || !net.host || net.gameId) return; setup.rules.cups = !setup.rules.cups; saveSetup(); if (net.lobby) publishLobby(net.lobby.seats); renderLobby(); renderRules(); };

function updateLobbyOnlineBadge() {
  const badge = $('#lbOnlineN');
  if (!badge) return;
  badge.hidden = true;
}

function renderInviteSheetRows(box) {
  const wrap = box.querySelector('#ivListWrap');
  if (!wrap) return;
  const online = !!(mm || (net && net.quick)), room = net && net.code;
  const ok = FB && registered(), seats = net && net.lobby ? net.lobby.seats : [], inRoom = new Set(seats.map(x => x.uid).filter(Boolean));
  const on = ok ? friends.filter(f => f.on && !inRoom.has(f.uid)) : [];
  const state = f => invited.code === room && invited.joined.has(f.uid) ? ['✓ С вами', ' joined'] : invited.code === room && invited.uids.has(f.uid) ? ['Ждём ответа', ' sent'] : ['Позвать', ''];
  const rows = on.map(f => { const [t, c] = state(f); return `<li class="ivrow${c}"><span class="av" style="--c:${f.c || '#3fc27a'}">${(clean(f.n) || '?')[0]}</span><span class="ivwho"><b>${clean(f.n)}</b><small><i></i>${STATE_TEXT[f.p && f.p.s] || 'в сети'}</small></span><button class="chip go" data-linv="${f.uid}"${c ? ' disabled' : ''}>${t}</button></li>`; }).join('');
  const empty = !ok ? 'Звать друзей могут сохранённые профили' : online ? 'Сейчас никого из друзей нет в сети. Как только кто-то зайдёт — он появится здесь' : 'Сейчас никого из друзей нет в сети — поделитесь ссылкой на комнату';
  wrap.innerHTML = rows ? `<ul class="ivlist">${rows}</ul>` : `<p class="ivempty">${empty}</p>`;
}

// Inviting friends: shows online friends with "Call" and the share button
function inviteSheet(fresh) {
  const old = document.getElementById('invBox'); if (old) old.remove();
  const online = !!(mm || (net && net.quick));
  const box = document.createElement('div'); box.className = 'over'; box.id = 'invBox'; box.style.position = 'fixed';
  const ok = FB && registered();
  box.innerHTML = `<div class="ocard invsheet"><div class="ivhead"><span>👥</span><h3>Пригласить друзей</h3><small>${online ? 'Друг получит приглашение и сядет за ваш стол' : 'Друг получит приглашение в комнату'}</small></div>
    <div id="ivListWrap"></div>
    <button class="cta wide" id="invShare">🔗 Поделиться ссылкой</button><button class="ghostbtn" id="invNo">Готово</button></div>`;
  document.body.append(box);
  renderInviteSheetRows(box);
  box.onclick = e => {
    if (e.target === box || e.target.id === 'invNo') return box.remove();
    const b = e.target.closest('[data-linv]'); if (b) setTimeout(() => { b.textContent = 'Ждём ответа'; b.disabled = true; b.closest('.ivrow').classList.add('sent'); }, 30);
  };
  const sh = box.querySelector('#invShare'); if (sh) sh.onclick = () => shareRoomLink();
  if (ok && fresh !== true) loadFriends().then(() => { if (box.isConnected) renderInviteSheetRows(box); updateLobbyOnlineBadge(); }).catch(() => {});
}
$('#lbInvite').onclick = () => inviteSheet();
$('#mInvite').onclick = () => inviteSheet();
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-linv]'); if (!b) return;
  b.disabled = true; await inviteFriend(b.dataset.linv); renderLobbyFriends();
});
