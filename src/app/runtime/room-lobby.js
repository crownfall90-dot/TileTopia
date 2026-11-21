// Friends invited to this room who are not in it yet: the creator sees them in the list, with a status, before starting.
const INVITE_LATE = 30000;
function pendingInvites(seats) {
  if (typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.computePendingInvites) {
    return PG.net.rooms.computePendingInvites(invited, seats, friends, net, INVITE_LATE);
  }
  if (!net || invited.code !== net.code) return [];
  return [...invited.uids].filter(uid => !seats.some(x => x.uid === uid)).map(uid => {
    const f = friends.find(q => q.uid === uid), at = (invited.at || {})[uid] || 0;
    return {uid, n: f ? f.n : 'Друг', st: f ? f.st : '', c: f && f.c, late: !!at && Date.now() - at > INVITE_LATE, declined: !!(invited.declined && invited.declined.has(uid))};
  });
}
let lobbyPendTimer = 0;
function renderLobby() {
  if (mm) matchRender();
  $('#lbJoin').hidden = !!net; $('#lbRoom').hidden = !net;
  if ($('#lobbyTitle')) $('#lobbyTitle').textContent = net ? ('Комната ' + net.code) : 'Сетевая игра';
  if (!net) return;
  updateLobbyOnlineBadge();
  $('#codeShow').innerHTML = [...net.code].map(c => `<span>${c}</span>`).join('');
  // "for cups" is seen by everyone in the room; the creator switches it here with one tap
  const cups = !!(net.lobby && net.lobby.rules ? net.lobby.rules.cups : setup.rules.cups), cb = $('#lbCups');
  if (typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.formatCupsBadge) {
    const badge = PG.net.rooms.formatCupsBadge(cups, net.host);
    cb.className = badge.className;
    cb.innerHTML = badge.innerHtml;
  } else {
    cb.className = 'cupsbadge' + (cups ? ' on' : '') + (net.host ? ' host' : '');
    const title = cups ? '🏆 Игра на кубки' : '🤝 Без кубков';
    const subtitle = net.host ? (cups ? 'Кубки начисляются · нажмите для смены' : 'Кубки не меняются · нажмите для смены') : (cups ? 'Рейтинговая игра' : 'Без рейтинга');
    cb.innerHTML = `<div class="cupsbadge-main"><b>${title}</b><small>${subtitle}</small></div><div class="cups-switch" aria-hidden="true"><span class="cups-switch-track"><span class="cups-switch-knob">${cups ? '🏆' : '🤝'}</span></span></div>`;
  }
  cb.disabled = !net.host || !!net.gameId;

  const seats = (net.lobby && net.lobby.seats ? net.lobby.seats.slice() : []); // declared before the badges below use it
  const maxSeats = roomMax();
  if ($('#lbTableNote')) $('#lbTableNote').textContent = `${maxSeats} ${maxSeats === 2 ? 'игрока' : maxSeats === 5 ? 'игроков' : 'игрока'}`;
  if ($('#lbTableSize') && typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.formatTableSizeHtml) {
    $('#lbTableSize').innerHTML = PG.net.rooms.formatTableSizeHtml(maxSeats, net.host && !net.gameId);
  }
  const openMatch = !!(net.openMatch || (net.lobby && net.lobby.openMatch));
  const mb = $('#lbOpenMatch');
  if (mb) {
    if (typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.formatOpenMatchBadge) {
      const badge = PG.net.rooms.formatOpenMatchBadge(openMatch, net.host, seats.length, maxSeats);
      mb.className = badge.className;
      mb.innerHTML = badge.innerHtml;
    }
    mb.disabled = !net.host || !!net.gameId;
  }
  const seekBox = $('#lbMatchSeeking');
  const elapsedSec = net.openMatchSince ? Math.floor((Date.now() - net.openMatchSince) / 1000) : 0;
  if (seekBox) {
    seekBox.hidden = !openMatch || !!net.gameId;
    if (openMatch && !net.gameId) {
      const seekStatus = (typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.formatSeekStatus)
        ? PG.net.rooms.formatSeekStatus({openMatch, seatsCount: seats.length, maxSeats, secWaiting: elapsedSec})
        : {text: `В комнате ${seats.length} из ${maxSeats}`, subText: '', isFull: seats.length >= maxSeats};
      if ($('#lbSeekTitle')) $('#lbSeekTitle').textContent = seekStatus.text;
      if ($('#lbSeekSub')) $('#lbSeekSub').textContent = seekStatus.subText;
      if ($('#btnFillBotsNow')) $('#btnFillBotsNow').hidden = !net.host || seekStatus.isFull;
    }
  }
  if ($('#btnFillBotsBar')) {
    $('#btnFillBotsBar').hidden = !net.host || seats.length >= maxSeats || !!net.gameId;
  }
  if (net && net.host && openMatch && !net.gameId) {
    if (!openMatchTimer) {
      openMatchTimer = setInterval(tickOpenMatch, 7000);
      tickOpenMatch();
    }
  } else if (openMatchTimer && (!net || !net.openMatch || net.gameId)) {
    clearInterval(openMatchTimer);
    openMatchTimer = 0;
  }

  renderMyColor();
  if (net && !net.host && !seats.some(x => x.owner === myId)) {
    seats.push({owner: myId, uid: myUid(), name: myName(), st: myStatus(), fig: wallet.fig, col: wallet.color, ready: false, pending: true});
  }
  if (invited.code === net.code) {
    seats.forEach(x => {
      if (x.uid && x.uid !== myUid() && invited.uids.has(x.uid) && !invited.joined.has(x.uid)) {
        invited.joined.add(x.uid);
        const f = friends.find(f => f.uid === x.uid);
        toastAny(`Друг ${f ? f.n : clean(x.name)} уже в комнате`);
      }
    });
  }
  const pend = net.host ? pendingInvites(seats) : [];
  $('#lbCount').textContent = `Игроки · ${seats.length} из ${roomMax()}${pend.length ? ` · приглашено: ${pend.length}` : ''}`;
  if (typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.renderRoomSeatsHtml) {
    const rendered = PG.net.rooms.renderRoomSeatsHtml({
      seats,
      pend,
      myId,
      myUid: myUid(),
      hostId: net.hostId,
      isHost: net.host,
      registered: registered(),
      isFriendFn: isFriend,
      isBlockedFn: isPlayerBlocked,
      contactUid: roomContactUid,
      validColFn: validCol,
      cleanFn: clean,
      stTagFn: stTag,
      palette: PL0
    });
    $('#plist').innerHTML = rendered.seatsHtml + (pend.length ? rendered.pendHtml : '');
  } else {
    $('#plist').innerHTML = seats.length ? seats.map((x, i) => `<li${x.uid && x.owner !== myId ? ` data-pl="${String(x.uid).replace(/[^\w-]/g, '').slice(0, 64)}" data-n="${clean(x.name)}" data-c="${validCol(x.col) ? x.col : ''}"` : ''}><span class="av" style="--c:${validCol(x.col) ? x.col : PL0[i % PL0.length].col}">${(clean(x.name) || '?')[0]}</span><span class="who"><b>${clean(x.name)}${x.owner === myId ? ' (вы)' : ''}</b>${stTag(x.st)}<small>${!x.owner ? 'Бот' : x.owner === net.hostId ? 'Создатель комнаты' : (x.ready ? '✓ Готов к игре' : 'Ждём готовности')}</small></span>${x.owner && x.owner !== myId && x.uid && x.uid !== myUid() && !isFriend(x.uid) && registered() ? `<button class="chip addf" data-addf="${String(x.uid).replace(/[^\w-]/g, '').slice(0, 64)}" data-n="${clean(x.name)}" aria-label="В друзья">＋</button>` : ''}${net.host && x.owner !== myId ? `<button class="chip" data-kick="${i}">Убрать</button>` : (!x.owner ? '<span class="pill">Бот</span>' : x.owner === net.hostId ? '<span class="pill host">Создатель</span>' : x.ready ? '<span class="pill ok">✓ Готов</span>' : '<span class="pill wait">Не готов</span>')}</li>`).join('') : '<li class="empty"><span class="who"><b>Подключаемся…</b></span></li>';
    if (pend.length) {
      $('#plist').insertAdjacentHTML('beforeend', pend.map(p => `<li class="inv${p.late || p.declined ? ' late' : ''}${p.declined ? ' no' : ''}"><span class="av" style="--c:${validCol(p.c) ? p.c : '#5b6684'}">${(clean(p.n) || '?')[0]}</span><span class="who"><b>${clean(p.n)}</b>${stTag(p.st)}<small>${p.declined ? 'Отказался' : p.late ? 'Не отвечает' : 'Приглашён · ждём ответа'}</small></span><button class="chip go" data-linv="${p.uid}">Ещё раз</button><button class="chip x" data-idrop="${p.uid}" aria-label="Убрать из приглашённых">✕</button></li>`).join(''));
    }
  }
  clearTimeout(lobbyPendTimer);
  if (pend.length) lobbyPendTimer = setTimeout(() => { if (net && !$('#scr-lobby').hidden) renderLobby(); }, 5000);
  $('#addBot').hidden = !net.host || seats.length >= roomMax();
  const others = seats.filter(x => x.owner && x.owner !== net.hostId);
  const allReady = others.length === 0 || others.every(x => x.ready);
  const inLobby = !(net.gameId && phase !== 'end');
  const mySeat = seats.find(x => x.owner === myId);

  if (typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.formatLobbyButtons) {
    const btnState = PG.net.rooms.formatLobbyButtons({
      isHost: net.host,
      seatsCount: seats.length,
      others,
      allReady,
      isReady: !!(mySeat && mySeat.ready),
      inLobby,
      isQuick: !!net.quick
    });
    $('#lobbyStart').hidden = btnState.hostBtn.hidden;
    if (!btnState.hostBtn.hidden) {
      $('#lobbyStart').disabled = !!btnState.hostBtn.disabled;
      $('#lobbyStart').textContent = btnState.hostBtn.text;
    }
    $('#lobbyReady').hidden = btnState.readyBtn.hidden;
    if (!btnState.readyBtn.hidden) {
      $('#lobbyReady').textContent = btnState.readyBtn.text;
      $('#lobbyReady').className = btnState.readyBtn.className;
      const hint = $('#lbWait .shint');
      if (hint && btnState.readyBtn.hintText) hint.textContent = btnState.readyBtn.hintText;
    }
  } else {
    if (net.host) {
      $('#lobbyReady').hidden = true;
      $('#lobbyStart').hidden = !inLobby;
      if (seats.length < 2) {
        $('#lobbyStart').disabled = true;
        $('#lobbyStart').textContent = 'Нужно хотя бы 2 игрока';
      } else if (!allReady && !net.quick) {
        $('#lobbyStart').disabled = true;
        const readyCount = others.filter(x => x.ready).length;
        $('#lobbyStart').textContent = others.length > 1 ? `Прожмите готовность (${readyCount}/${others.length})` : 'Прожмите готовность';
      } else {
        $('#lobbyStart').disabled = false;
        $('#lobbyStart').textContent = 'Начать игру';
      }
    } else {
      $('#lobbyStart').hidden = true;
      $('#lobbyReady').hidden = !inLobby || !!net.quick;
      if (inLobby && !net.quick) {
        const isReady = !!(mySeat && mySeat.ready);
        $('#lobbyReady').textContent = isReady ? '✓ Готов (отменить)' : 'Готов';
        $('#lobbyReady').className = isReady ? 'cta wide alt' : 'cta wide';
        const hint = $('#lbWait .shint');
        if (hint) hint.textContent = isReady ? 'Вы готовы · ожидание старта…' : 'Нажмите «Готов» для подтверждения';
      }
    }
  }
  $('#lbWait').hidden = net.host || !inLobby;
  $('#backToGame').hidden = !(net.gameId && phase !== 'end');
  $('#lbRules').style.pointerEvents = net.host ? '' : 'none';
  renderRules();
  renderLobbyFriends();
}
const BOT_NAMES = ['Бот Ёж', 'Бот Сова', 'Бот Лис', 'Бот Барсук'];
// Quick match: after FILL_SECS without an opponent a stand-in joins under a human-looking name (no rating for that game).
const FILL_SECS = 84;
const GHOST_NAMES = ['Артём', 'Лёха_77', 'Marina', 'dimon', 'Катя', 'Nikita_K', 'Сергей', 'Alex', 'Оля', 'Vlad', 'Кирилл', 'Tanya', 'Максим', 'ivan_s', 'Даша', 'Roman', 'Настя', 'Denis', 'Юля', 'Egor', 'Полина', 'Pasha', 'Ксюша', 'Stas', 'Аня', 'Gleb', 'Миша', 'Vika', 'Андрей', 'Lena', 'Игорь', 'Sofi', 'Тимур', 'Oleg', 'Лиза', 'Danil', 'Вика_', 'Misha_', 'Ярик', 'Nastya', 'Коля', 'Ruslan', 'Таня', 'Matvey', 'Ира', 'Artur', 'Саша', 'Kris', 'Влад_', 'Zhenya', 'Света', 'Boris', 'Лера', 'Fedor', 'Дима', 'Alina', 'Паша_', 'Yana', 'Слава', 'Anton'];
const ghostName = taken => { const free = GHOST_NAMES.filter(n => !taken.some(x => x.name === n)); return free.length ? free[(Math.random() * free.length) | 0] : 'Игрок ' + ((Math.random() * 90 + 10) | 0); };
// Everyone may want any colour; a colour wanted by several goes to one of them at random,
// the others (and anyone without a valid choice) get random colours nobody took.
function assignColors(seats) {
  if (PG.net && PG.net.rooms) return PG.net.rooms.assignColors(seats, PALETTE);
  const out = seats.map(x => ({...x, col: null})), order = seats.map((x, i) => i).sort(() => Math.random() - .5);
  for (const i of order) if (validCol(seats[i].col) && !out.some(x => x.col === seats[i].col)) out[i].col = seats[i].col;
  const free = PALETTE.map(c => c.col).filter(c => !out.some(x => x.col === c)).sort(() => Math.random() - .5);
  out.forEach(x => { if (!x.col) x.col = free.pop(); });
  return out;
}
function renderMyColor() {
  $('#myColor').innerHTML = swatches(wallet.color, []);
}
$('#myColor').addEventListener('click', e => {
  const sw = e.target.closest('[data-sw]'); if (!sw) return;
  wallet.color = sw.dataset.sw; saveWallet(); renderMyColor();
  if (net) netSend({t: 'hello', v2: 1, st: myStatus(), id: myId, uid: myUid(), reg: registered() ? 1 : 0, name: myName(), fig: wallet.fig, col: wallet.color});
});
$('#create').onclick = () => createRoom();
const newCode = () => (PG.net && PG.net.rooms) ? PG.net.rooms.newCode() : (() => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length: 5}, () => A[(Math.random() * A.length) | 0]).join(''); })();
async function createRoom() { if (!(await serverReachable())) return noServer(createRoom); connect(newCode(), true); net.max = setup.onN || 4; friendsBack = 'lobby'; show('lobby'); }
function tickOpenMatch() {
  if (!net || !net.host || !net.openMatch || net.gameId || (typeof phase !== 'undefined' && phase === 'play')) return;
  const seats = net.lobby && net.lobby.seats ? net.lobby.seats : [];
  if (seats.length < roomMax()) {
    if (typeof FIRE !== 'undefined' && FIRE && typeof FIRE.send === 'function') {
      FIRE.send(MATCH_ROOM, {
        t: 'seek',
        code: net.code,
        id: myId,
        want: roomMax(),
        mode: setup.rules.mode || 'classic',
        n: seats.length
      }).catch(() => {});
    }
  } else {
    if (typeof FIRE !== 'undefined' && FIRE && typeof FIRE.send === 'function') {
      FIRE.send(MATCH_ROOM, {t: 'close', code: net.code}).catch(() => {});
    }
  }
}
if ($('#lbTableSize')) {
  $('#lbTableSize').onclick = e => {
    const btn = e.target.closest('[data-size]');
    if (!btn || !net || !net.host || net.gameId) return;
    const target = parseInt(btn.dataset.size, 10);
    const seats = net.lobby && net.lobby.seats ? net.lobby.seats : [];
    if (target < seats.length) {
      return toastAny(`Сначала уберите лишних игроков (сейчас ${seats.length})`);
    }
    net.max = target;
    setup.onN = target;
    publishLobby(seats);
    renderLobby();
    toastAny(`Размер партии: ${target} ${target === 2 ? 'игрока' : target === 5 ? 'игроков' : 'игрока'}`);
  };
}
if ($('#lbOpenMatch')) {
  $('#lbOpenMatch').onclick = () => {
    if (!net || !net.host || net.gameId) return;
    net.openMatch = !net.openMatch;
    net.openMatchSince = net.openMatch ? Date.now() : 0;
    const seats = net.lobby && net.lobby.seats ? net.lobby.seats : [];
    if (net.openMatch) {
      toastAny('Комната открыта: случайные игроки из онлайна могут войти!');
      tickOpenMatch();
    } else {
      toastAny('Комната закрыта: вход только по коду и инвайтам');
      if (typeof FIRE !== 'undefined' && FIRE && typeof FIRE.send === 'function') {
        FIRE.send(MATCH_ROOM, {t: 'close', code: net.code}).catch(() => {});
      }
    }
    publishLobby(seats);
    renderLobby();
  };
}
const fillRemainingBots = () => {
  if (!net || !net.host || net.gameId) return;
  const curSeats = net.lobby && net.lobby.seats ? net.lobby.seats.slice() : [];
  const target = roomMax();
  if (curSeats.length >= target) return;
  const next = (typeof PG !== 'undefined' && PG.net && PG.net.rooms && PG.net.rooms.autoFillRoomBots)
    ? PG.net.rooms.autoFillRoomBots(curSeats, target, wallet.botlvl || 'normal', randomFig)
    : curSeats;
  publishLobby(next);
  renderLobby();
  toastAny(`Добавлено ботов: ${target - curSeats.length}`);
};
if ($('#btnFillBotsNow')) $('#btnFillBotsNow').onclick = fillRemainingBots;
if ($('#btnFillBotsBar')) $('#btnFillBotsBar').onclick = fillRemainingBots;
$('#join').onclick = () => {
  const code = $('#codeIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) return toastAny('Код комнаты — 5 символов');
  serverReachable().then(ok => ok ? connect(code, false) : noServer(() => $('#join').click()));
};
$('#lobbyBack').onclick = () => { if (net && phase === 'end' || net && !net.gameId) leaveRoom(); show('menu'); renderLobby(); };
$('#addBot').onclick = () => { const seats = net.lobby.seats.slice(); seats.push({owner: null, name: BOT_NAMES.find(n => !seats.some(x => x.name === n)) || 'Бот', fig: randomFig(), col: PALETTE[(Math.random() * PALETTE.length) | 0].col, botlvl: wallet.botlvl || 'normal', ready: true}); publishLobby(seats); };
$('#lobbyReady').onclick = () => { if (!net || net.host) return; const mySeat = net.lobby && net.lobby.seats ? net.lobby.seats.find(x => x.owner === myId) : null; const next = !(mySeat && mySeat.ready); netSend({t: 'ready', id: myId, ready: next}); };
$('#plist').addEventListener('click', e => { const a = e.target.closest('[data-addf]'); if (a) { a.remove(); addFriend(a.dataset.addf, a.dataset.n); } });
$('#plist').addEventListener('click', e => { const b = e.target.closest('[data-kick]'); if (!b) return; const seats = net.lobby.seats.slice(); seats.splice(+b.dataset.kick, 1); publishLobby(seats); });
$('#plist').addEventListener('click', e => {
  const bl = e.target.closest('[data-botlvl]');
  if (bl && net && net.host && net.lobby && net.lobby.seats) {
    const idx = +bl.dataset.botlvl;
    const s = net.lobby.seats[idx];
    if (s && !s.owner) {
      const LEVELS = ['easy', 'normal', 'hard'];
      const curIdx = LEVELS.indexOf(s.botlvl || 'normal');
      const nextLvl = LEVELS[(curIdx + 1) % LEVELS.length];
      s.botlvl = nextLvl;
      publishLobby(net.lobby.seats);
      renderLobby();
      const LVL_NAMES = {easy: 'Лёгкий', normal: 'Обычный', hard: 'Сложный'};
      toastAny(`Сложность бота: ${LVL_NAMES[nextLvl]}`);
    }
  }
});
$('#backToGame').onclick = () => show('game');
$('#lobbyStart').onclick = () => {
  const seats = net.lobby ? net.lobby.seats : [], pend = pendingInvites(seats).filter(p => !p.late && !p.declined);
  if (!pend.length) return startOnline(seats);
  confirmBox(`Ещё ждём: ${pend.map(p => clean(p.n)).join(', ')}.<br><small style="font-weight:500;color:var(--muted)">Если начать сейчас, они не попадут в эту партию</small>`, 'Начать без них', () => startOnline(net.lobby ? net.lobby.seats : seats));
};
$('#plist').addEventListener('click', e => { const b = e.target.closest('[data-idrop]'); if (!b) return; invited.uids.delete(b.dataset.idrop); renderLobby(); });
// Rated games (quick match) use the same rules for everybody: only the mode is chosen.
const ratedRules = mode => (PG.net && PG.net.rooms) ? PG.net.rooms.ratedRules(mode, MODES) : ({mode, ...MODES[mode].set, rivers: true, timer: 60, hints: true, tie: 'all'});
function startOnline(seats) {
  if (net && net.openMatch && typeof FIRE !== 'undefined' && FIRE && typeof FIRE.send === 'function') {
    FIRE.send(MATCH_ROOM, {t: 'close', code: net.code}).catch(() => {});
  }
  const rules = {...(net && net.quick ? ratedRules(mm ? mm.mode : setup.rules.mode) : setup.rules)};
  if (seats.length >= 3 && rules.deck && rules.deck < 50 && !net.quick) {
    rules.deck = 50;
  }
  // Rules v2 only when every guest announced it (an old client would count points differently).
  rules.rv = seats.every(x => !x.owner || x.owner === myId || (net.peerV2 && net.peerV2.get(x.owner))) ? 2 : 1;
  netSend({t: 'start', sec: FB ? 1 : 0, seats: assignColors(seats).map(x => ({name: x.name, owner: x.owner || null, uid: x.uid || null, fig: x.fig || 'classic', col: x.col, ghost: x.ghost ? 1 : 0, st: PG.state.status.shownStatus(x.st), botlvl: x.botlvl || 'normal'})), rules, deck: makeDeck(rules), seed: (Math.random() * 1e9) | 0, quick: !!(net && net.quick)});
}
function rematchClick() {
  if (!net) { newGame(); show('game'); return; }
  net.rematchVotes = net.rematchVotes || new Set();
  net.rematchVotes.add(myId);
  const meIdx = players.findIndex(isMe);
  netSend({t: 'rematch', id: myId, p: meIdx >= 0 ? meIdx : 0, name: profileName()});
  toastAny('Запрос на реванш отправлен');
  updateRematchUI();
  checkRematchVotes();
}
function checkRematchVotes() {
  if (!net || !net.rematchVotes) return;
  const humans = players.filter(p => p.human);
  if (humans.length > 0 && net.rematchVotes.size >= humans.length) {
    clearRematchTimer();
    executeRematch();
    return;
  }
  if (!net.rematchTimer && net.rematchVotes.size >= 1) {
    net.rematchCountdown = 10;
    net.rematchTimer = setInterval(() => {
      if (!net || phase !== 'end') return clearRematchTimer();
      net.rematchCountdown--;
      updateRematchUI();
      if (net.rematchCountdown <= 0) {
        clearRematchTimer();
        if (net.rematchVotes && net.rematchVotes.size >= 2) {
          executeRematch();
        } else {
          toastAny('Недостаточно игроков для следующей партии');
          if (net && net.rematchVotes) net.rematchVotes.clear();
          updateRematchUI();
        }
      }
    }, 1000);
  }
}
function updateRematchUI() {
  const b1 = $('#again'), b2 = $('#again2');
  if (!b1 && !b2) return;
  if (!net) {
    if (b1) { b1.textContent = 'Ещё партию'; b1.disabled = false; }
    if (b2) { b2.textContent = 'Ещё партию'; b2.disabled = false; }
    return;
  }
  const humans = players.filter(p => p.human);
  const voted = net.rematchVotes && net.rematchVotes.has(myId);
  const count = net.rematchVotes ? net.rematchVotes.size : 0;
  const timeStr = net.rematchTimer && net.rematchCountdown > 0 ? ` (${net.rematchCountdown}с)` : '';
  let text;
  if (voted) {
    text = `✓ Вы за (${count}/${humans.length})${timeStr}`;
  } else if (count > 0) {
    text = `Принять реванш (${count}/${humans.length})${timeStr}`;
  } else {
    text = net ? 'Реванш' : 'Ещё партию';
  }
  if (b1) { b1.textContent = text; b1.disabled = false; }
  if (b2) { b2.textContent = text; b2.disabled = false; }
}
function executeRematch() {
  if (!net) return;
  const agreedHumans = players.filter(p => p.human && net.rematchVotes && net.rematchVotes.has(p.owner || p.id));
  const starter = (agreedHumans.find(p => p.owner === net.hostId) || agreedHumans[0] || {}).owner;
  if (myId === starter || (net.host && agreedHumans.some(p => p.owner === myId))) {
    const seats = players
      .filter(p => !p.human || (net.rematchVotes && net.rematchVotes.has(p.owner || p.id)))
      .map(p => ({name: p.name, owner: p.owner || null, uid: p.uid || null, fig: p.fig || 'classic', col: p.col}));
    startOnline(seats);
  }
}
function startRematch() {
  executeRematch();
}
function clearRematchTimer() {
  if (net && net.rematchTimer) {
    clearInterval(net.rematchTimer);
    net.rematchTimer = null;
  }
}
renderLobby();
renderSetup();
