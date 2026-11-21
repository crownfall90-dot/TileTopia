/* ---------------- tutorial ----------------
   A short scripted game against one bot. Every card and every bot move is fixed, so each lesson
   happens for sure: close a town, turn a card, claim and finish a road, see the final count.
   The coach card shows one short line and waits for the action: the spot to tap pulses, other
   spots are hidden, and there is no "next" until it is done. */
const TUT = (typeof PG !== 'undefined' && PG.game && PG.game.tutorial) ? PG.game.tutorial.TUT_STEPS : [];
// Cards come off the end of the deck: first piece, then you, bot, you, bot, you.
const TUT_DECK = (typeof PG !== 'undefined' && PG.game && PG.game.tutorial) ? PG.game.tutorial.TUT_DECK : ['rEnd', 'rRock', 'rC', 'rS', 'cap', 'cap'];
const TUT_BOT = (typeof PG !== 'undefined' && PG.game && PG.game.tutorial) ? PG.game.tutorial.TUT_BOT : [{x: 1, y: 0, r: 0}, {x: 1, y: -1, r: 2}];
let tut = null;
function startTutorial() {
  if (net) leaveRoom();
  track('tutorial_begin');
  const cfg = (typeof PG !== 'undefined' && PG.game && PG.game.tutorial && PG.game.tutorial.createTutorialConfig)
    ? PG.game.tutorial.createTutorialConfig(profileName(), wallet.color, wallet.fig, validCol, PL0, TUT_DECK)
    : {tut: 1, seats: [{name: profileName(), human: true, fig: wallet.fig, col: validCol(wallet.color) ? wallet.color : PL0[0].col}, {name: 'Бот Ёж', human: false, fig: 'classic', col: wallet.color === PL0[1].col ? PL0[2].col : PL0[1].col}], rules: {mode: 'fast', deck: 0, rivers: true, meeples: 7, timer: 0, hints: true, tie: 'all'}, deck: TUT_DECK.slice(), seed: 7, noIntro: true};
  startGame(cfg);
  tut = (typeof PG !== 'undefined' && PG.game && PG.game.tutorial && PG.game.tutorial.createTutorialState)
    ? PG.game.tutorial.createTutorialState()
    : {i: 0, bot: TUT_BOT.slice()};
  show('game'); hideHint(); tutShow();
}
const tutStep = () => tut && TUT[tut.i];
// Which empty spots the tutorial lets you use right now (null: no tutorial, all of them).
function tutAllows(x, y) {
  if (PG.game && PG.game.tutorial) return PG.game.tutorial.isTutorialAllowed(tut, x, y, TUT);
  const s = tutStep(); if (!s) return true; return !!s.only && s.only[0] === x && s.only[1] === y;
}
function tutShow() {
  document.documentElement.classList.toggle('tutoring', !!tut);
  document.querySelectorAll('.tutpulse').forEach(e => e.classList.remove('tutpulse'));
  const c = $('#coach');
  if (!tut) { c.hidden = true; return; }
  const s = TUT[tut.i];
  if (s.done) { c.hidden = true; return tutFinale(); }
  c.innerHTML = (PG.game && PG.game.tutorial)
    ? PG.game.tutorial.renderCoachCardHtml(s, tut.i, TUT.length)
    : `<span class="cic">${s.ic}</span><span class="ctx"><b>${s.t}</b><small>${s.p}</small></span>${s.btn ? `<button class="cta" id="tutNext">${s.btn}</button>` : ''}${s.hand ? '<i class="swipe"></i>' : ''}<span class="cbar"><i style="width:${(100 * tut.i / (TUT.length - 1)).toFixed(0)}%"></i></span>`;
  c.hidden = false; c.style.top = (playersEl.offsetTop + playersEl.offsetHeight + 8) + 'px';
  if (phase === 'place' && current) renderSlots();
  // the spot to tap is brought to the middle: after the pan and zoom lessons it may be off the screen
  // (after the zoom button's own animation, which would cancel this one)
  if (s.only) { const i = tut.i; setTimeout(() => { if (tut && tut.i === i) tweenCam({px: -s.only[0] * T, py: -s.only[1] * T}, 450); }, 350); }
  requestAnimationFrame(() => {
    if (s.hl) document.querySelectorAll(s.hl).forEach(h => h.classList.add('tutpulse'));
    if (s.only) document.querySelectorAll('.slot').forEach(h => h.classList.add('tutpulse'));
  });
}
// The last lesson: the results board is the only card on the screen; its two buttons give way to one that ends the lessons.
function tutFinale(n = 0) {
  const fin = $('#over .fin');
  if (!fin) return n < 25 ? setTimeout(() => tut && TUT[tut.i].done && tutFinale(n + 1), 200) : null; // the board appears a moment after the last card
  fin.querySelectorAll('.cta, .ghostbtn').forEach(b => b.remove());
  fin.insertAdjacentHTML('beforeend', '<button class="cta wide" id="tutNext">Играть · +30 тайлов</button>');
}
$('#over').addEventListener('click', e => { if (e.target.closest('#tutNext')) tutNext(); });
function tutNext() {
  if (!tut) return;
  if (typeof PG !== 'undefined' && PG.game && PG.game.tutorial && PG.game.tutorial.advanceTutorialStep) {
    const res = PG.game.tutorial.advanceTutorialStep(tut, wallet, TUT);
    if (res.done) {
      track(res.trackEvent);
      tut = null;
      saveWallet();
      beep(res.sound);
      tutShow();
      return setTimeout(askProfile, 400);
    }
    tutShow();
  } else {
    if (TUT[tut.i].done) { track('tutorial_complete'); tut = null; wallet.tut = true; wallet.gold += 30; saveWallet(); beep('coin'); tutShow(); return setTimeout(askProfile, 400); }
    tut.i++; tutShow();
  }
}
// Game code reports what the player did; the coach moves on only on the awaited action.
function tutEvent(ev) {
  const s = tutStep();
  const shouldAdvance = (PG.game && PG.game.tutorial) ? PG.game.tutorial.shouldAdvanceStep(s, ev) : (s && s.wait === ev);
  if (shouldAdvance) tutNext();
}
$('#coach').addEventListener('click', e => { if (e.target.closest('#tutNext')) tutNext(); });
$('#tutBtn').onclick = startTutorial;
// Profile: pick a nickname (and a colour) once, after the tutorial or on skipping it.
// The player's colour, picked together with the nickname (it stays the preferred colour; at a table where it is taken
// the game gives another one for that game only).
let colorSyncT = 0;
function colorPick(input, av) {
  const row = document.createElement('div'); row.className = 'cpick'; row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', 'Цвет');
  const draw = () => { row.innerHTML = PALETTE.map(p => `<button type="button" role="radio" aria-checked="${p.col === wallet.color}" aria-label="${p.name}" data-c="${p.col}" style="--c:${p.col}"></button>`).join(''); };
  draw();
  row.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; wallet.color = setup.seats[0].col = b.dataset.c; saveWallet(); saveSetup(); clearTimeout(colorSyncT); colorSyncT = setTimeout(() => { try { presenceMark(true); syncRating(true); } catch (_) {} }, 600); if (av) av.style.setProperty('--c', b.dataset.c); draw(); };
  input.after(row);
}
function addConsent(box, anchorSel, gated) {
  const C = PG.ui.consent;
  if (C.hasConsent(wallet)) return;
  const anchor = box.querySelector(anchorSel); if (!anchor) return;
  const holder = document.createElement('div'); holder.className = 'consent-wrap'; holder.innerHTML = C.consentHtml('consentBox');
  anchor.parentNode.insertBefore(holder, anchor);
  const legal = box.querySelector('.legal'); if (legal) legal.hidden = true;
  const input = holder.querySelector('#consentBox'), hint = holder.querySelector('.consent-hint');
  const sync = () => { const on = input.checked; gated.map(q => box.querySelector(q)).filter(Boolean).forEach(t => t.classList.toggle('consent-lock', !on)); hint.hidden = on; };
  input.onchange = () => { C.setConsent(wallet, input.checked); saveWallet(); sync(); };
  // a tap (or Enter, which clicks the button from code) on a locked button only shakes the tick-box
  box.addEventListener('click', e => { if (input.checked) return; const t = e.target.closest(gated.join(',')); if (!t) return; e.preventDefault(); e.stopImmediatePropagation(); holder.classList.remove('need'); void holder.offsetWidth; holder.classList.add('need'); }, true);
  sync();
}
function askProfile() {
  if (wallet.name || document.getElementById('profBox')) return;
  const box = document.createElement('div'); box.className = 'over'; box.id = 'profBox'; box.style.position = 'fixed';
  box.innerHTML = (typeof PG !== 'undefined' && PG.game && PG.game.tutorial && PG.game.tutorial.renderAskProfileDialogHtml)
    ? PG.game.tutorial.renderAskProfileDialogHtml(wallet.color)
    : `<div class="ocard prof"><div class="pav" id="pav" style="--c:${wallet.color}">?</div><h3>Создайте профиль</h3><p>Придумайте никнейм и выберите цвет — их увидят соперники и рейтинг</p><input class="field" id="profName" maxlength="12" placeholder="Никнейм" autocomplete="off"><small class="legal">Нажимая «Готово», вы принимаете <a href="https://crownfall90-dot.github.io/TileTopia/terms.html" target="_blank" rel="noopener">Соглашение</a> и <a href="https://crownfall90-dot.github.io/TileTopia/privacy.html" target="_blank" rel="noopener">Политику</a>. Профиль хранится в Google Firebase, то есть за границей</small><button class="cta wide" id="profOk" disabled>Готово</button><button class="ghostbtn" id="profLogin">У меня уже есть профиль — войти</button></div>`;
  document.body.append(box);
  addConsent(box, '#profOk', ['#profOk']);
  const inp = box.querySelector('#profName'), ok = box.querySelector('#profOk'), av = box.querySelector('#pav'), dice = box.querySelector('#profDice');
  colorPick(box.querySelector('#profColorLabel') || inp, av);
  inp.oninput = () => { const n = clean(inp.value); ok.disabled = n.length < 2 || n === 'Вы'; av.textContent = (n[0] || '?').toUpperCase(); };
  if (!inp.value) {
    const initName = (typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.generateRandomNickname)
      ? PG.account.auth.generateRandomNickname()
      : 'Nova';
    inp.value = initName;
    inp.dispatchEvent(new Event('input'));
  }
  if (dice) {
    dice.onclick = () => {
      const gen = (typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.generateRandomNickname)
        ? PG.account.auth.generateRandomNickname()
        : 'Зодчий';
      inp.value = gen;
      inp.dispatchEvent(new Event('input'));
      beep('coin');
    };
  }
  ok.onclick = () => { if (!setProfileName(inp.value)) return; box.remove(); toastAny(`Привет, ${profileName()}!`); renderSetup(); setTimeout(askStats, 1200); if (FB) setTimeout(() => accountDialog('link'), 600); if (typeof checkNameProposal === 'function') setTimeout(checkNameProposal, 1200); };
  box.querySelector('#profLogin').onclick = () => { box.remove(); accountDialog('login'); };
  setTimeout(() => inp.focus(), 200);
}
// First start: offer the tutorial once.
function offerTutorial() {
  if (wallet.tut || wallet.tutAsked || loadSave()) return askProfile();
  wallet.tutAsked = true; saveWallet();
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  box.innerHTML = (typeof PG !== 'undefined' && PG.game && PG.game.tutorial && PG.game.tutorial.renderTutorialOfferDialogHtml)
    ? PG.game.tutorial.renderTutorialOfferDialogHtml(!!FB)
    : `<div class="ocard"><div style="font-size:44px">🏰</div><h3>Добро пожаловать в Tiletopia!</h3><p>Новичок? Короткое обучение, затем вы придумаете никнейм — так создаётся профиль</p><button class="cta wide" data-t="go">Начать · обучение</button>${FB ? '<button class="ghostbtn" data-t="login">У меня есть профиль — войти</button>' : ''}<button class="linkbtn" data-t="no">Пропустить обучение</button></div>`;
  document.body.append(box);
  box.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; box.remove(); if (b.dataset.t === 'go') startTutorial(); else if (b.dataset.t === 'login') accountDialog('login'); else askProfile(); };
}

/* "Who is online": tap the green "N в сети" badge for the list of players with the game open. */
function showOnline(e) {
  e.stopPropagation(); e.preventDefault();
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  if (typeof PG !== 'undefined' && PG.net && PG.net.presence && PG.net.presence.renderOnlinePlayersDialogHtml) {
    box.innerHTML = PG.net.presence.renderOnlinePlayersDialogHtml({
      presenceList,
      myUid: fbAuth && fbAuth.uid,
      registered: registered(),
      isFriendFn: isFriend,
      cleanFn: clean,
      stateTextMap: STATE_TEXT
    });
  } else {
    const me = fbAuth && fbAuth.uid;
    const rows = presenceList.map(x => `<li class="lead${x.uid === me ? ' me' : ''}"><i>●</i><span>${clean(x.n) || 'Игрок'}${x.uid === me ? ' (вы)' : ''}</span><small>${STATE_TEXT[x.s] || 'в игре'}</small>${x.uid !== me && x.r && registered() && !isFriend(x.uid) ? `<button class="chip addf" data-addf="${x.uid}" aria-label="В друзья">＋</button>` : ''}</li>`).join('');
    box.innerHTML = `<div class="ocard olist"><h3>Сейчас в игре: ${presenceList.length}</h3><ul>${rows || '<li class="qnote">Никого</li>'}</ul><p class="shint">Список обновляется раз в минуту. Считаются все, у кого открыта игра, включая вас</p><button class="cta wide">Закрыть</button></div>`;
  }
  document.body.append(box);
  box.onclick = ev => {
    const a = ev.target.closest('[data-addf]'); if (a) { const x = presenceList.find(y => y.uid === a.dataset.addf); a.remove(); return addFriend(a.dataset.addf, x && x.n); }
    if (ev.target === box || ev.target.closest('.cta')) box.remove();
  };
  presenceCount();
}
document.querySelectorAll('.onlineN').forEach(b => b.addEventListener('click', showOnline));
