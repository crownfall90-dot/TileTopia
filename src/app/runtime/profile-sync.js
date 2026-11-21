/* ---------------- profile sync: the same profile on several devices ----------------
   The app, the web version and other phones signed in to one profile share /profiles/{uid}.
   Every change is merged with the cloud copy against the copy this device last synced
   ("base"): what only one side changed is taken from it; counters both sides changed (gold,
   xp, stats) add both changes; lists (figures) are joined. Writes use the database ETag, so
   two devices saving at once cannot overwrite each other. Pulls happen on start, on return
   to the app and once a minute (only when the cloud copy is newer). */
const LOCAL_ONLY = ['notifAt', 'notifThanked', 'installHinted', 'gfx', 'tutAsked', 'linkAsked', 'fcodeKept', 'devPanel'];
const syncable = w => { const o = JSON.parse(JSON.stringify(w)); LOCAL_ONLY.forEach(k => delete o[k]); return o; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Signed in with an e-mail (the saved sign-in is read from storage if nothing used it yet).
function linkedNow() { if (typeof FBC !== 'undefined' && FBC) FBC.load(); return !!(typeof FB !== 'undefined' && FB && typeof fbAuth !== 'undefined' && fbAuth && fbAuth.email); }
const loadBase = () => { try { return JSON.parse(localStorage.getItem('walletBase')); } catch (_) { return null; } };
const saveBase = (w, t) => { try { localStorage.setItem('walletBase', JSON.stringify({w: syncable(w), t, uid: fbAuth && fbAuth.uid})); } catch (_) {} };
function mergeVal(k, l, c, b) {
  if (c === undefined || same(c, b)) return l;
  if (l === undefined || same(l, b)) return c;
  if (k === 'name') return c; // the nickname belongs to the account: if both sides changed it, the saved one wins
  if (k === 'streak') return (c.last || '') > (l.last || '') ? c : l; // a day claimed on both: one claim
  if (typeof l === 'number' && typeof c === 'number') return typeof b === 'number' ? c + (l - b) : Math.max(l, c);
  if (Array.isArray(l) && Array.isArray(c)) return l.concat(c).every(x => typeof x !== 'object') ? [...new Set([...c, ...l])] : l;
  if (l && c && typeof l === 'object' && typeof c === 'object') {
    const o = {};
    for (const key of new Set([...Object.keys(c), ...Object.keys(l)])) o[key] = mergeVal(key, l[key], c[key], b && typeof b === 'object' ? b[key] : undefined);
    return o;
  }
  return l; // a plain value both changed (a setting): this device wins
}
function applyCloudWallet(w) {
  const keep = {}; LOCAL_ONLY.forEach(k => { if (k in wallet) keep[k] = wallet[k]; });
  for (const k of Object.keys(wallet)) delete wallet[k];
  Object.assign(wallet, w, keep);
  COINS.migrate(wallet); PG.state.reactions.migrate(wallet); PG.state.reactions.sanitizeDeck(wallet);
  for (const k of Object.keys(PROG)) delete PROG[k];
  Object.assign(PROG, w.prog || {}); wallet.prog = PROG;
  if (wallet.name) setup.seats[0].name = wallet.name;
  if (wallet.color) setup.seats[0].col = wallet.color;
  try { localStorage.setItem('wallet', JSON.stringify(wallet)); } catch (_) {} saveSetup();
}
// Everything on screen that shows profile data.
function refreshProfileUI() {
  document.querySelectorAll('.goldN').forEach(e => e.textContent = wallet.gold);
  try { renderAccount(); dailyBonus(); progressDot(); renderMenuProfile(); } catch (_) {}
  if (!$('#scr-shop').hidden) renderShop();
  if (!$('#scr-progress').hidden) renderProgress();
  if (!$('#scr-settings').hidden) renderPrefs();
  if (!$('#scr-setup').hidden) renderSetup();
}
let syncing = null, syncAgain = false, cloudTimer = 0;
function cloudSync(push) {
  if (!linkedNow()) return Promise.resolve(false);
  if (syncing) { syncAgain = syncAgain || push || 'pull'; return syncing; }
  syncing = (async () => {
    try {
      const tok = await fbToken(), url = `${FB.dbUrl}/profiles/${fbAuth.uid}.json?auth=${tok}`;
      for (let attempt = 0; attempt < 4; attempt++) {
        const r = await fetch(url, {headers: {'X-Firebase-ETag': 'true'}}); if (!r.ok) return false;
        const etag = r.headers.get('ETag'), d = await r.json();
        let base = loadBase(); if (base && base.uid !== fbAuth.uid) base = null;
        const mine = syncable(wallet);
        let next = mine;
        if (d && d.w && (!base || base.t !== d.t)) { // the cloud changed since this device last synced
          const cw = syncable(JSON.parse(d.w));
          next = mergeVal('', mine, cw, base ? base.w : undefined);
          // The nickname belongs to the account: only a rename typed on a device later than the saved one
          // can change it; a stale copy of the profile on another phone cannot bring an old name back.
          if (cw.name) { const mineWins = (mine.nameAt || 0) > (cw.nameAt || 0); next.name = mineWins ? mine.name : cw.name; next.nameAt = Math.max(mine.nameAt || 0, cw.nameAt || 0) || undefined; }
          if (!same(next, mine)) { applyCloudWallet(next); refreshProfileUI(); }
        }
        if (d && d.h) {
          try {
            const cloudHist = JSON.parse(d.h);
            const localHist = jsonRead(GAME_HISTORY_KEY, []);
            const mergedHist = (typeof PG !== 'undefined' && PG.account && PG.account.sync && PG.account.sync.mergeHistory)
              ? PG.account.sync.mergeHistory(localHist, cloudHist)
              : (Array.isArray(cloudHist) && cloudHist.length && !localHist.length ? cloudHist : localHist);
            if (JSON.stringify(mergedHist) !== JSON.stringify(localHist)) {
              localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(mergedHist));
              if (!$('#scr-history').hidden) renderHistory($('#historyList'));
            }
          } catch (_) {}
        }
        const currentHist = jsonRead(GAME_HISTORY_KEY, []);
        if (d && d.w && same(next, syncable(JSON.parse(d.w))) && (!Array.isArray(currentHist) || !currentHist.length || (d.h && d.h === JSON.stringify(currentHist.slice(0, 30))))) { saveBase(wallet, d.t); return true; }
        if (!push && d && d.w && base && base.t === d.t && same(next, base.w)) return true; // nothing new anywhere
        const bodyPayload = {w: JSON.stringify(wallet), s: JSON.stringify(setup.seats[0]), t: {'.sv': 'timestamp'}, by: {c: myId, v: appCode(), p: installKind()}};
        if (Array.isArray(currentHist) && currentHist.length) bodyPayload.h = JSON.stringify(currentHist.slice(0, 30));
        const w = await fetch(url, {method: 'PUT', headers: etag ? {'if-match': etag} : {}, body: JSON.stringify(bodyPayload)});
        if (w.status === 412) continue; // another device saved in between: merge again
        if (w.ok) { const saved = await w.json().catch(() => null); saveBase(wallet, saved && saved.t); }
        return w.ok;
      }
    } catch (_) {} finally {
      syncing = null;
      if (syncAgain) { const p = syncAgain === true; syncAgain = false; cloudSync(p); }
    }
    return false;
  })();
  return syncing;
}
function cloudSaveSoon() { if (!linkedNow()) return; clearTimeout(cloudTimer); cloudTimer = setTimeout(() => cloudSync(true), 2500); }
const cloudSave = () => cloudSync(true);
// Once a minute: pull only when the cloud copy is newer than ours (its time stamp is tiny to read).
async function cloudPeek() {
  if (!linkedNow() || syncing) return;
  try {
    const tok = await fbToken(), r = await fetch(`${FB.dbUrl}/profiles/${fbAuth.uid}/t.json?auth=${tok}`);
    const t = r.ok ? await r.json() : null, base = loadBase();
    if (t && (!base || base.t !== t)) cloudSync(false);
  } catch (_) {}
}
// Live link: another device saving the profile reaches this one within seconds, not at the next minute.
let profEs = null, profEsUid = '';
async function profileListen() {
  if (!FB || !linkedNow()) return;
  if (profEs && profEsUid === fbAuth.uid) return;
  if (profEs) { profEs.close(); profEs = null; }
  try {
    await fbToken(); const uid = profEsUid = fbAuth.uid, es = profEs = new EventSource(await fbUrl('profiles/' + uid + '/t'));
    let first = true;
    const again = () => { es.close(); if (profEs === es) profEs = null; setTimeout(profileListen, 20000); };
    es.addEventListener('put', () => { if (first) { first = false; return; } cloudPeek(); }); // the first event is the current value
    es.addEventListener('auth_revoked', () => { fbAuth.exp = 0; again(); }); es.onerror = again;
  } catch (_) { profEs = null; setTimeout(profileListen, 30000); }
}
// Leaving the app: save at once instead of waiting for the delay; back online: catch up.
document.addEventListener('visibilitychange', () => { if (document.hidden && cloudTimer) { clearTimeout(cloudTimer); cloudTimer = 0; cloudSync(true); } });
addEventListener('online', () => { cloudSync(true); profileListen(); });
// Signing in on this device: the cloud profile replaces what is here.
async function cloudLoad() {
  const tok = await fbToken(), r = await fetch(`${FB.dbUrl}/profiles/${fbAuth.uid}.json?auth=${tok}`);
  const d = r.ok ? await r.json() : null; if (!d || !d.w) return false;
  const w = JSON.parse(d.w); for (const k of Object.keys(wallet)) delete wallet[k]; Object.assign(wallet, w); COINS.migrate(wallet);
  for (const k of Object.keys(PROG)) delete PROG[k];
  Object.assign(PROG, w.prog || {}); wallet.prog = PROG;
  if (d.s) { const s0 = JSON.parse(d.s); setup.seats[0].name = s0.name; setup.seats[0].col = s0.col; }
  try { localStorage.setItem('wallet', JSON.stringify(wallet)); } catch (_) {} saveSetup();
  saveBase(wallet, d.t);
  return true;
}
// First sync of this start; the daily streak waits for it (at most 4 s) so it is not claimed twice.
var syncStart = Promise.race([new Promise(r => setTimeout(r, 4000)), new Promise(r => setTimeout(() => cloudSync(false).then(r, r), 800))]);
document.addEventListener('visibilitychange', () => { if (!document.hidden) cloudSync(false); });
// mode: 'link' — protect this profile with an e-mail; 'login' — sign in to an existing one.
const EYE_OPEN = (typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.EYE_OPEN)
  ? PG.account.auth.EYE_OPEN
  : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_SHUT = (typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.EYE_SHUT)
  ? PG.account.auth.EYE_SHUT
  : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 005.4-1.6"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>';
function accountDialog(mode, prefill) {
  if (!FB) return toastAny('Профили доступны в приложении');
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  const link = mode === 'link';
  // One form for both: a known e-mail signs in, a new one becomes a profile (gold and progress stay).
  box.innerHTML = (typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.renderAccountDialogHtml)
    ? PG.account.auth.renderAccountDialogHtml({link, prefill})
    : `<div class="ocard acc"><div style="font-size:40px">🔑</div><h3>Вход в профиль</h3><p>Сохранение прогресса, фигурок и тайлов между устройствами</p>
    <div class="gslot" id="accGSlot"><button class="ghostbtn gbtn" id="accGoogle" type="button"><span class="gicon">G</span> Продолжить с Google</button></div>
    <p class="phint acc-or" id="accOr">или по почте</p>
    <input class="field" id="accMail" type="email" inputmode="email" placeholder="Почта" autocomplete="email" autocapitalize="off" spellcheck="false" value="${(prefill || '').replace(/"/g, '')}">
    <div class="pwrap"><input class="field" id="accPass" type="password" placeholder="Пароль" autocomplete="current-password" autocapitalize="off" spellcheck="false"><button type="button" class="peye" id="accEye" aria-label="Показать пароль" aria-pressed="false"></button></div>
    <p class="phint" id="accHint">Пароль от 6 символов</p>
    <p class="accErr" id="accErr" role="alert"></p><small class="legal">Продолжая, вы принимаете <a href="https://crownfall90-dot.github.io/TileTopia/terms.html" target="_blank" rel="noopener">Соглашение</a> и <a href="https://crownfall90-dot.github.io/TileTopia/privacy.html" target="_blank" rel="noopener">Политику</a>. Профиль хранится в Google Firebase, то есть за границей</small><button class="cta wide" id="accGo">Продолжить</button><button class="linkbtn" id="accReset">Забыли пароль?</button><button class="ghostbtn" id="accNo">${link ? 'Позже' : 'Отмена'}</button></div>`;
  document.body.append(box);
  addConsent(box, '#accGo', ['#accGo', '#accGoogle', '#accGSlot']);
  const mailEl = box.querySelector('#accMail'), passEl = box.querySelector('#accPass'), eye = box.querySelector('#accEye'), hint = box.querySelector('#accHint');
  const mail = () => mailEl.value.trim(), pass = () => passEl.value;
  const gbtn = box.querySelector('#accGoogle');
  if (gbtn) {
    if (!googleAvailable() && !googleWebOk()) { gbtn.hidden = true; const or = box.querySelector('#accOr'); if (or) or.hidden = true; }
    else if (!googleAvailable()) googleWebButton(gbtn, link, null);
    else gbtn.onclick = () => { gbtn.disabled = true; startGoogle(link, () => { gbtn.disabled = false; }, gbtn); };
  }
  // Error text plus a red frame on the field it is about ('both' marks both).
  const err = (t, field) => {
    box.querySelector('#accErr').textContent = t || '';
    mailEl.classList.toggle('bad', field === 'mail' || field === 'both');
    passEl.classList.toggle('bad', field === 'pass' || field === 'both');
    if (field === 'mail') mailEl.focus(); else if (field === 'pass') passEl.focus();
  };
  const showErr = j => { const [t, f] = authErr(j, link); err(t, f); if (link && j && j.error && /^EMAIL_EXISTS/.test(j.error.message)) offerLogin(); };
  // "This mail already has a profile": one tap switches to signing in with it.
  const offerLogin = () => {
    const b = document.createElement('button'); b.className = 'linkbtn'; b.textContent = 'Войти с этой почтой';
    b.onclick = () => { const m = mail(); box.remove(); accountDialog('login', m); };
    box.querySelector('#accErr').append(document.createElement('br'), b);
  };
  eye.innerHTML = EYE_OPEN;
  eye.onclick = () => {
    const show = passEl.type === 'password';
    passEl.type = show ? 'text' : 'password'; eye.innerHTML = show ? EYE_SHUT : EYE_OPEN;
    eye.setAttribute('aria-pressed', show); eye.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    passEl.focus();
  };
  let typoWarned = '';
  mailEl.oninput = () => { mailEl.classList.remove('bad'); typoWarned = ''; if (box.querySelector('#accErr').textContent) err(''); };
  passEl.oninput = () => {
    passEl.classList.remove('bad'); if (box.querySelector('#accErr').textContent) err('');
  };
  passEl.onkeydown = e => { if (e.getModifierState && e.getModifierState('CapsLock')) hint.textContent = '⚠ Включён Caps Lock'; };
  if (prefill) setTimeout(() => passEl.focus(), 200);
  box.querySelector('#accNo').onclick = () => {
    startGoogle.reqId = (startGoogle.reqId || 0) + 1;
    window.onGoogleToken = null;
    window.onGoogleError = null;
    box.remove();
    if (!link && !wallet.name) askProfile();
  };
  const rs = box.querySelector('#accReset');
  if (rs) rs.onclick = async () => {
    const bad = checkAuthInput(mail(), 'x', false); if (bad && bad[1] === 'mail' && !bad[2]) return err(bad[0] === 'Введите почту' ? 'Введите почту, на неё придёт письмо для смены пароля' : bad[0], 'mail');
    try { await idt('sendOobCode', {requestType: 'PASSWORD_RESET', email: mail()}); err(''); box.querySelector('#accErr').textContent = `Письмо для смены пароля отправлено на ${mail()}. Проверьте и папку «Спам»`; }
    catch (j) { showErr(j); }
  };
  box.querySelector('#accGo').onclick = async () => {
    const go = box.querySelector('#accGo');
    const bad = checkAuthInput(mail(), pass(), false);
    if (bad && !(bad[2] === 'typo' && typoWarned === mail())) {
      err(bad[0], bad[1]);
      if (bad[2] === 'typo') {
        typoWarned = mail();
        const fix = document.createElement('button'); fix.className = 'linkbtn'; fix.textContent = 'Исправить';
        fix.onclick = () => { mailEl.value = bad[3]; err(''); go.click(); };
        const keep = document.createElement('button'); keep.className = 'linkbtn'; keep.textContent = 'Всё верно';
        keep.onclick = () => go.click();
        box.querySelector('#accErr').append(document.createElement('br'), fix, ' · ', keep);
      }
      return;
    }
    go.disabled = true; err('');
    try {
      // Sign in first. An unknown e-mail (Firebase may also answer INVALID_LOGIN_CREDENTIALS for it) becomes a new
      // profile: a guest's own session gets the e-mail, so the gold and progress on this phone stay.
      let j = null, created = false;
      try { j = await idt('signInWithPassword', {email: mail(), password: pass(), returnSecureToken: true}); }
      catch (e) {
        const msg = String((e && e.error && e.error.message) || (e && e.message) || '');
        if (!/^(EMAIL_NOT_FOUND|INVALID_LOGIN_CREDENTIALS)/.test(msg)) throw e;
        if (pass().length < 6) throw {error: {message: 'SHORT_OR_WRONG'}};
        try {
          if (fbAuth && fbAuth.email) j = await idt('signUp', {email: mail(), password: pass(), returnSecureToken: true});
          else {
            let tok = null;
            try { tok = await fbToken(); } catch (_) {}
            if (tok) {
              try {
                j = await idt('update', {idToken: tok, email: mail(), password: pass(), returnSecureToken: true});
              } catch (updErr) {
                const uMsg = String((updErr && updErr.error && updErr.error.message) || (updErr && updErr.message) || '');
                if (/^EMAIL_EXISTS/.test(uMsg)) throw {error: {message: 'INVALID_PASSWORD'}};
                j = await idt('signUp', {email: mail(), password: pass(), returnSecureToken: true});
              }
            } else {
              j = await idt('signUp', {email: mail(), password: pass(), returnSecureToken: true});
            }
          }
          created = true;
        } catch (e2) {
          const e2Msg = String((e2 && e2.error && e2.error.message) || (e2 && e2.message) || '');
          if (/^EMAIL_EXISTS/.test(e2Msg)) throw {error: {message: 'INVALID_PASSWORD'}};
          throw e2;
        }
      }
      keepAuth(j, mail());
      if (created) {
        track('sign_up', {method: 'email'});
        await cloudSave(); box.remove(); renderAccount(); presenceMark(true); socialReset();
        finishSignup();
      } else {
        track('login', {method: 'email'});
        const ok = await cloudLoad(); box.remove();
        attachPendingGoogle();
        wallet.tut = wallet.tutAsked = true; saveWallet();
        toastAny(ok ? `С возвращением, ${profileName()}!` : 'Вход выполнен');
        const toFriends = !$('#scr-friends').hidden;
        renderAccount(); renderSetup(); renderShop && renderShop(); progressDot(); show(toFriends ? 'friends' : 'menu'); presenceMark(true); syncRating(); syncRating(false, 'hex'); socialReset();
        if (!wallet.name) finishSignup();
      }
    } catch (j) { showErr(j); go.disabled = false; }
  };
}
function renameDialog() {
  if (!COINS.canPay(wallet, RENAME_PRICE)) return toastAny(`Смена имени стоит ${RENAME_PRICE} тайлов — не хватает ${RENAME_PRICE - wallet.gold}`);
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard acc"><h3>Смена имени</h3><p>Стоимость: <b><i class="coin" style="display:inline-block;vertical-align:-3px"></i> ${RENAME_PRICE}</b> · останется ${wallet.gold - RENAME_PRICE}</p><div style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input class="field" id="newName" maxlength="12" placeholder="${profileName()}" style="flex:1"><button type="button" class="iconbtn" id="rnDice" title="Случайное имя" style="width:44px;height:44px;border-radius:10px;background:var(--surface-hover);font-size:20px;border:1px solid var(--line);cursor:pointer;flex:0 0 auto">🎲</button></div><button class="cta wide" id="rnGo" disabled>Сменить имя</button><button class="ghostbtn" id="rnNo">Отмена</button></div>`;
  document.body.append(box);
  const inp = box.querySelector('#newName'), go = box.querySelector('#rnGo'), dice = box.querySelector('#rnDice');
  inp.oninput = () => { const n = clean(inp.value); go.disabled = n.length < 2 || n === profileName(); };
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
  box.querySelector('#rnNo').onclick = () => box.remove();
  go.onclick = () => { if (!COINS.canPay(wallet, RENAME_PRICE)) return; COINS.pay(wallet, RENAME_PRICE); setProfileName(inp.value); beep('coin'); box.remove(); toastAny(`Теперь вы — ${profileName()}`); renderAccount(); syncRating(true); };
  setTimeout(() => inp.focus(), 200);
}
function renderAccount() {
  const el = $('#acct'); if (!el) return;
  const linked = fbAuth && fbAuth.email, lvl = typeof PROG !== 'undefined' && PROG.lvl ? `<small class="plvl">Уровень ${PROG.lvl}</small>` : '';
  const mail = linked ? String(fbAuth.email).replace(/[<>&"]/g, '') : 'Гостевой профиль (почта не привязана)';
  el.innerHTML = `
    <div class="saccount-card">
      <div class="prow">
        <span class="av big" style="--c:${wallet.color}">${profileName()[0]}</span>
        <div class="pwho">
          <b class="sacct-name">${profileName()}</b>
          <div class="sacct-mail-row ${linked ? 'signed' : 'guest'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span class="sacct-email-txt">${mail}</span>
          </div>
          ${lvl}
        </div>
        <button class="chip" id="rnBtn">Сменить <i class="coin" style="display:inline-block;width:11px;height:11px"></i> ${RENAME_PRICE}</button>
      </div>
      ${FB ? `<div class="pact">${linked ? '<button class="chip" id="acLogout">Выйти из аккаунта</button>' : '<button class="chip pri" id="acLogin">Войти или создать профиль</button>'}</div>` : ''}
    </div>
  `;
  $('#rnBtn').onclick = renameDialog;
  if ($('#acLogin')) $('#acLogin').onclick = () => accountDialog('login');
  if ($('#acLogout')) $('#acLogout').onclick = () => confirmBox('Выйти из аккаунта?<br><small style="font-weight:500;color:var(--muted)">Прогресс сохранится в аккаунте. На этом устройстве начнётся новая игра, а войти можно будет в любой аккаунт</small>', 'Выйти', signOut);
}
// Leave the account: push what is not saved yet, forget this profile on the device and start over as a guest.
