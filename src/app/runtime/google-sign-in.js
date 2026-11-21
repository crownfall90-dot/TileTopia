/* ---------------- Google sign-in ----------------
   A WebView cannot run Google's own sign-in, so on the phone the token comes from the native
   Credential Manager sheet (AndroidApp.googleSignIn → window.onGoogleToken). In the web build
   Google Identity Services draws its own button. Either way Firebase turns the Google ID token
   into a session: mode 'link' attaches Google to this profile, 'login' opens an existing one. */
const googleAvailable = () => !!(window.AndroidApp && AndroidApp.googleSignIn && (!AndroidApp.googleReady || AndroidApp.googleReady()));
const googleWebOk = () => !!(window.WEBAPP && FB && FB.googleClientId);
// The e-mail sits in the Google token payload; it only labels the saved profile.
// The token payload is UTF-8 (a Russian name in it): atob gives bytes, TextDecoder turns them into text.
function jwtPayload(t) {
  try {
    const b = atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0))));
  } catch (_) { return {}; }
}
function jwtEmail(t) { return jwtPayload(t).email || ''; }
// signInWithIdp turns some refusals into HTTP 200 without a session (needConfirmation, errorMessage): those are
// errors too, never a sign-in — saving them as one left the player "signed in" with no session at all.
async function googleIdp(idToken, session) {
  const body = {postBody: 'id_token=' + encodeURIComponent(idToken) + '&providerId=google.com', requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true};
  if (session) body.idToken = session;
  const j = await idt('signInWithIdp', body);
  if (!j.idToken) throw {error: {message: j.needConfirmation ? 'NEED_CONFIRMATION' : String(j.errorMessage || 'NO_SESSION')}};
  return j;
}
const gErr = (e, re) => !!(e && e.error && re.test(String(e.error.message || '')));
let googleBusy = false;
let lastGoogleToken = '';
let lastGoogleTokenTime = 0;
// A Google token for an e-mail that already has a password profile: it is attached after the password sign-in.
let pendingGoogle = null;
// One button for both cases. A Google account the game has not seen becomes a registration of THIS profile (gold,
// figures and progress stay; then a nickname finishes it). A Google account that already has a profile signs in to it.
async function finishGoogle(idToken, link, onFail) {
  if (googleBusy) { if (typeof onFail === 'function') onFail('busy'); return; }
  if (idToken && idToken === lastGoogleToken && Date.now() - lastGoogleTokenTime < 10000) {
    if (typeof onFail === 'function') onFail('duplicate');
    return;
  }
  googleBusy = true;
  try {
    const email = jwtEmail(idToken), wasRegistered = registered();
    let j = null, joined = false;
    if (link || !wasRegistered) {
      try { await fbToken(); j = await googleIdp(idToken, fbAuth.idToken); joined = true; }
      catch (e) {
        // Already the key of another profile: sign in to that one (a saved profile asking to link is told so instead).
        if (!gErr(e, /FEDERATED_USER_ID_ALREADY_LINKED|CREDENTIAL_ALREADY_IN_USE/) || (link && wasRegistered)) throw e;
      }
    }
    if (!j) j = await googleIdp(idToken, null);
    lastGoogleToken = idToken; lastGoogleTokenTime = Date.now();
    keepAuth(j, email || j.email || '');
    document.querySelectorAll('body > .over').forEach(e => e.remove()); // dialogs only: #over inside the game screen is the game's own results board
    const loaded = !joined && await cloudLoad();
    if (loaded) {
      track('login', {method: 'google'});
      wallet.tut = wallet.tutAsked = true; saveWallet();
      toastAny(`С возвращением, ${profileName()}!`);
      const toFriends = !$('#scr-friends').hidden;
      renderAccount(); renderSetup(); renderShop && renderShop(); progressDot();
      show(toFriends ? 'friends' : 'menu'); presenceMark(true); syncRating(); syncRating(false, 'hex'); socialReset();
      if (!wallet.name) finishSignup();
    } else {
      track('sign_up', {method: 'google'});
      await cloudSave(); renderAccount(); presenceMark(true); socialReset();
      finishSignup();
    }
  } catch (e) {
    if (gErr(e, /NEED_CONFIRMATION|EMAIL_EXISTS/)) {
      // This e-mail already has a profile with a password: sign in with it once, Google gets attached to it.
      pendingGoogle = {token: idToken, at: Date.now()};
      document.querySelectorAll('body > .over').forEach(x => x.remove());
      toastAny('Эта почта уже зарегистрирована с паролем. Войдите по почте один раз — и Google подключится к профилю');
      accountDialog('login', jwtEmail(idToken));
    } else {
      const [t] = authErr(e, link); toastAny(t);
      if (link && gErr(e, /FEDERATED_USER_ID_ALREADY_LINKED|CREDENTIAL_ALREADY_IN_USE/)) setTimeout(() => accountDialog('login'), 400);
    }
    if (onFail) onFail(e);
  } finally { googleBusy = false; }
}
// After a password sign-in: attach the Google account that was waiting for it (the token lives an hour).
async function attachPendingGoogle() {
  const g = pendingGoogle; pendingGoogle = null;
  if (!g || Date.now() - g.at > 50 * 60 * 1000) return;
  try { const j = await googleIdp(g.token, fbAuth.idToken); keepAuth(j, fbAuth.email); toastAny('Google подключён — теперь можно входить в один тап'); }
  catch (e) { authErr(e, true); }
}
// After a registration the status «Олд» waits in Notifications → Rewards: the red dot lights up and a toast says so.
function oldStatusNote() {
  updateNotifBadge();
  const claimed = (wallet.inbox && wallet.inbox.claimed) || [];
  if (!claimed.includes('notif_old_status') && !(wallet.statuses || []).includes('ex:old')) setTimeout(() => toastAny('🗿 В уведомлениях вас ждёт статус «Олд» — заберите его!'), 1500);
}
// The last step of a registration: a nickname rivals and the rating will see. One made up before is kept.
function finishSignup() {
  if (wallet.name) { toastAny(`Профиль сохранён, ${profileName()}!`); oldStatusNote(); return; }
  if (document.getElementById('signupBox')) return;
  const box = document.createElement('div'); box.className = 'over'; box.id = 'signupBox'; box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard prof"><div class="pav" id="suAv" style="--c:${wallet.color}">?</div><h3>Завершите регистрацию</h3><p>Придумайте никнейм — его увидят соперники и рейтинг</p>
    <input class="field" id="suName" maxlength="12" placeholder="Никнейм" autocomplete="off"><button class="cta wide" id="suOk" disabled>Готово</button></div>`;
  document.body.append(box);
  colorPick(box.querySelector('#suName'), box.querySelector('#suAv'));
  const inp = box.querySelector('#suName'), ok = box.querySelector('#suOk'), av = box.querySelector('#suAv');
  inp.oninput = () => { const n = clean(inp.value); ok.disabled = n.length < 2 || n === 'Вы'; av.textContent = (n[0] || '?').toUpperCase(); };
  inp.onkeydown = e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); };
  ok.onclick = async () => {
    if (!setProfileName(inp.value)) return;
    box.remove(); toastAny(`Профиль создан. Привет, ${profileName()}!`); oldStatusNote();
    renderAccount(); renderSetup(); presenceMark(true);
    try { await cloudSave(); syncRating(); } catch (_) {}
  };
  setTimeout(() => inp.focus(), 200);
}
// One entry point: the native sheet on the phone, Google's own button in the browser.
function startGoogle(link, onFail, btn) {
  if (btn && btn.innerHTML && !btn._origHtml) {
    btn._origHtml = btn.innerHTML;
    btn.innerHTML = '<span class="gicon">⏳</span> Входим...';
  }
  const resetBtn = () => { if (btn && btn._origHtml) { btn.innerHTML = btn._origHtml; btn._origHtml = null; } };
  if (googleAvailable()) {
    startGoogle.reqId = (startGoogle.reqId || 0) + 1;
    const reqId = startGoogle.reqId;
    window.onGoogleToken = t => {
      track('google_token', {stale: reqId !== startGoogle.reqId ? 1 : 0}); // shows in Analytics whether the phone got a token at all
      if (reqId !== startGoogle.reqId) { resetBtn(); return; }
      window.onGoogleToken = null;
      window.onGoogleError = null;
      finishGoogle(t, link, err => { resetBtn(); if (typeof onFail === 'function') onFail(err); });
    };
    window.onGoogleError = c => {
      track('google_error', {code: String(c)});
      if (reqId !== startGoogle.reqId) { resetBtn(); return; }
      window.onGoogleToken = null;
      window.onGoogleError = null;
      resetBtn();
      try {
        if (c !== 'canceled') toastAny(c === 'not_configured' ? 'Google-вход не настроен в этой сборке' : c === 'misconfigured' ? 'Вход через Google пока не подключён для этой версии игры. Войдите по почте — профиль тот же' : c === 'no_credentials' ? 'Google не предоставил учётные данные. Проверьте аккаунт Google на устройстве и попробуйте снова' : c === 'bad_credential' ? 'Не удалось прочитать ответ Google. Попробуйте снова' : 'Не получилось открыть вход Google. Попробуйте снова');
      } finally { if (typeof onFail === 'function') onFail(c); }
    };
    try { AndroidApp.googleSignIn(); } catch (_) { window.onGoogleError('failed'); }
    return;
  }
  resetBtn();
  if (googleWebOk() && btn) return googleWebButton(btn, link, onFail);
  toastAny('Вход через Google доступен в приложении');
  if (onFail) onFail('unavailable');
}
// Web build: load Google Identity Services and swap our button for its official one.
// Web build: Google's own button (Google Identity Services) goes in place of ours as soon as the dialog opens,
// so one tap signs in. Our button stays as a placeholder while the script loads, or if it cannot load.
let gisLoad = null;
// On iPhone and iPad Google's pop-up often never reports back to the page (above all when the game is on the home
// screen), so there the button goes to Google's own page and Google sends the player back here with the sign-in in the
// address (#id_token=…). The page's address must be among the client's authorised redirect URIs.
const iosWeb = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const googleBack = () => location.origin + location.pathname.replace(/index\.html$/, '');
function googleRedirect(link) {
  const rnd = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const go = {state: rnd(), nonce: rnd(), link: !!link, at: Date.now()};
  try { localStorage.setItem('gRedirect', JSON.stringify(go)); } catch (_) {}
  track('google_redirect');
  location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({client_id: FB.googleClientId, redirect_uri: googleBack(), response_type: 'id_token', scope: 'openid email profile', nonce: go.nonce, state: go.state, prompt: 'select_account'});
}
// Back from Google's page: take the sign-in out of the address, check it is the answer to our own request, sign in.
function googleReturn() {
  if (!/(^|[#&])(id_token|error)=/.test(location.hash)) return;
  const q = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  let go = null; try { go = JSON.parse(localStorage.getItem('gRedirect')); localStorage.removeItem('gRedirect'); } catch (_) {}
  if (!go || go.state !== q.get('state') || Date.now() - go.at > 15 * 60000) return;
  if (q.get('error')) { if (q.get('error') !== 'access_denied') toastAny('Не удалось войти через Google. Попробуйте ещё раз или войдите по почте'); return; }
  const tok = q.get('id_token');
  if (!tok || (jwtPayload(tok) || {}).nonce !== go.nonce) return toastAny('Не удалось войти через Google. Попробуйте ещё раз');
  finishGoogle(tok, go.link, null);
}
function googleWebButton(btn, link, onFail) {
  if (iosWeb()) { btn.onclick = () => { btn.disabled = true; googleRedirect(link); }; return; }
  gisLoad = gisLoad || new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = () => { gisLoad = null; rej(); }; document.head.append(s); });
  gisLoad.then(() => {
    if (!btn.isConnected) return;
    google.accounts.id.initialize({client_id: FB.googleClientId, callback: r => finishGoogle(r.credential, link, onFail), ux_mode: 'popup', itp_support: true});
    const slot = document.createElement('div'); slot.className = 'gisbtn';
    btn.replaceWith(slot);
    google.accounts.id.renderButton(slot, {type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'center', locale: 'ru', width: Math.min(400, Math.max(240, slot.clientWidth || 300))});
  }).catch(() => { btn.onclick = () => toastAny('Не удалось загрузить вход Google — проверьте интернет или войдите по почте'); });
}
