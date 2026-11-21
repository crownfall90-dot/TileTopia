/* ---------------- game menu: pause, settings, cancel / resign, draw ---------------- */
const mySeat = () => players.findIndex((p, i) => net && p.owner === myId && !p.resigned);
let settingsReturn = 'menu';
function closeGameMenu() { const b = document.getElementById('gmenu'); if (b) b.remove(); paused = false; }
function openGameMenu() {
  if (document.getElementById('gmenu')) return;
  const live = phase !== 'end' && players.length;
  if (!net && live) paused = true;
  const online = !!net, seat = mySeat();
  const allBots = online && live && seat >= 0 && !players.some(p => p.human && p.owner !== myId && !p.resigned);
  const box = document.createElement('div'); box.className = 'over'; box.id = 'gmenu'; box.style.position = 'fixed';
  box.innerHTML = (typeof PG !== 'undefined' && PG.ui && PG.ui.menu)
    ? PG.ui.menu.formatGameMenuHtml({online, live, seat, allBots})
    : `<div class="ocard"><h3>${online ? 'Онлайн-партия' : live ? 'Пауза' : 'Меню'}</h3>
    <p>${online ? 'Партия идёт, пока вы в меню' : live ? 'Боты ждут, время хода остановлено' : ''}</p>
    <button class="cta wide" data-a="resume">Продолжить</button>
    <button class="ghostbtn" data-a="settings">Настройки</button>
    ${online && live && seat >= 0 && !allBots ? `<button class="ghostbtn danger wide" data-a="resign">Сдаться</button>` : ''}
    ${(!online && live) || allBots ? '<button class="ghostbtn danger" data-a="cancel">Отменить партию</button>' : ''}
    <button class="ghostbtn" data-a="menu">Выйти в главное меню</button></div>`;
  document.body.append(box);
  const confirmOnce = (b, text) => { if (b.dataset.sure) return true; b.dataset.sure = 1; b.textContent = text; return false; };
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'resume') return closeGameMenu();
    if (a === 'settings') { box.remove(); settingsReturn = 'game'; return show('settings'); }
    if (a === 'menu') { box.remove(); resumeHold = true; return show('menu'); }
    if (a === 'cancel') {
      if (!confirmOnce(b, 'Точно отменить? Нажмите ещё раз')) return;
      if (online) { netSend({t: 'resign', g: net.gameId, p: seat}); leaveRoom(); }
      if (gameLog && gameLog.moves && gameLog.moves.length >= 1) {
        const me = players.find(isMe);
        if (me) me.resigned = true;
        markGameFinished(gameKey());
        historySave('cancel', true);
      }
      token++; turnTok++; stopTimer(); clearSave(); closeGameMenu(); phase = 'end';
      toastAny('Партия отменена'); return show('menu');
    }
    if (a === 'resign') {
      if (phase === 'meeple' && turn === seat) return toastAny('Сначала завершите ход');
      if (!confirmOnce(b, 'Точно сдаться? Нажмите ещё раз')) return;
      const key = 'g' + net.gameId; // a resigned player gets no gold for this game
      if (!wallet.paid.includes(key)) { wallet.paid = [key, ...wallet.paid].slice(0, 30); saveWallet(); }
      if (seat >= 0 && players[seat]) players[seat].resigned = true;
      markGameFinished(gameKey());
      historySave('resign', true);
      netSend({t: 'resign', g: net.gameId, p: seat}); return closeGameMenu();
    }
    if (a === 'draw') {
      netSend({t: 'draw', g: net.gameId, p: seat, id: Math.random().toString(36).slice(2, 8)});
      toast('Предложение ничьей отправлено'); return closeGameMenu();
    }
  });
}
$('#gameMenu').onclick = openGameMenu;
const ms = $('#menuSettings'); if (ms) ms.onclick = () => { settingsReturn = 'menu'; show('settings'); };
$('#settingsBack').onclick = () => { const back = settingsReturn; settingsReturn = 'menu'; show(back); if (back === 'game') openGameMenu(); };
const activeHumans = () => players.map((p, i) => i).filter(i => players[i].human && !players[i].resigned);
function onResign(p) {
  const pl = players[p];
  if (pl.resigned) return;
  pl.prevOwner = pl.owner;
  // The seat is played by a bot from now on (run by the room creator's phone).
  pl.resigned = true; pl.human = false; pl.owner = null;
  toast(`${pl.name} сдаётся`); renderPlayers();
  if (p === mySeat() || pl.prevOwner === myId) {
    markGameFinished(gameKey());
    historySave('resign', true);
  }
  if (activeHumans().length <= 1) return endGame('resign');
  if (turn === p && ['remote', 'place', 'handover', 'ai'].includes(phase)) { cancelTurn(); if (net.host) { phase = 'ai'; aiTurn(); } else waitRemote(); }
}
const drawOffers = {};
function onDrawOffer(m, uid) {
  drawOffers[m.id] = {from: m.p, yes: new Set([m.p])};
  // Players who dropped out (a bot plays for them) cannot answer: if everybody else is away the offer is accepted at once,
  // otherwise the one who stayed could only resign.
  if (activeHumans().every(i => i === m.p || players[i].missed >= 1)) { delete drawOffers[m.id]; return endGame('draw'); }
  const me = mySeat();
  if (me < 0 || me === m.p || isPlayerBlocked(uid)) return;
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  if (uid) box.dataset.contactFrom = uid;
  box.innerHTML = `<div class="ocard"><h3>${players[m.p].name} предлагает ничью</h3><p>Если согласятся все, партия закончится без победителя</p><div class="row2b"><button class="cta" data-ok="1">Принять</button><button class="ghostbtn" data-ok="0">Отказаться</button></div></div>`;
  document.body.append(box);
  box.onclick = e => { const b = e.target.closest('[data-ok]'); if (!b) return; box.remove(); netSend({t: 'drawReply', g: net.gameId, p: me, id: m.id, ok: b.dataset.ok === '1'}); };
}
function onDrawReply(m) {
  const d = drawOffers[m.id]; if (!d) return;
  if (!m.ok) { delete drawOffers[m.id]; if (mySeat() === d.from) toastAny(`${players[m.p].name} отказывается от ничьей`); return; }
  d.yes.add(m.p);
  if (activeHumans().every(i => d.yes.has(i) || players[i].missed >= 1)) { delete drawOffers[m.id]; endGame('draw'); }
}
