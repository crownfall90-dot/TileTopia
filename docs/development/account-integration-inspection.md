# Account integration inspection
Source: 39585a95105aec5eea6a1bfeaf8c403bb95c1870
Tests exit code: 1
Offline Java compile exit code: 1
## id=[\"\']scr-settings[\"\']
Line 668
```html
class="coin"></i><b class="goldN">0</b></span></div>
          <div class="gift" id="gift"></div>
          <div class="h3">Фигурки</div>
          <div class="figgrid" id="figgrid"></div>
          <div class="h3">Локации</div>
          <div class="locgrid" id="locgrid"></div>
        </div>
      </section>

      <section class="screen scroll" id="scr-settings" hidden>
        <div class="lb">
          <div class="ltop"><button class="iconbtn" id="settingsBack" aria-label="Назад"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><b>Настройки</b></div>
          <button class="instcard" id="installBtn" hidden><span class="iic"><img src="icons/icon-192.png" alt=""></span><span class="itx"><b>Установите игру</b><small>Иконка на экране, весь экран, работает без интернета</small></span><span class="igo">Как?</span></button>
          <div class="sgroup prof" id="acct"></div>
          <div id="prefs"></div>
          <div class="h3">Поддержка</div>
          <div class="sgroup">
            <button class="srow btn" id="feedbackBtn"><span class="sic">💬</span><span class="stx"><b>Написать разработчику</b><small>Пожелания, идеи, баги — всё пойдёт в дело</small></span><span class="sgo">›
```
## class=[\"\']sgroup prof[\"\']
Line 672
```html
ath d="M15 5l-7 7 7 7"/></svg></button><b>Настройки</b></div>
          <button class="instcard" id="installBtn" hidden><span class="iic"><img src="icons/icon-192.png" alt=""></span><span class="itx"><b>Установите игру</b><small>Иконка на экране, весь экран, работает без интернета</small></span><span class="igo">Как?</span></button>
          <div class="sgroup prof" id="acct"></div>
          <div id="prefs"></div>
          <div class="h3">Поддержка</div>
          <div class="sgroup">
            <button class="srow btn" id="feedbackBtn"><span class="sic">💬</span><span class="stx"><b>Написать разработчику</b><small>Пожелания, идеи, баги — всё пойдёт в дело</small></span><span class="sgo">›</span></button>
          </div>
          <div class="h3">О приложении</div>
          <div class="sgroup">
            <div class="srow"><span class="sic">ℹ️</span><span class="stx"><b>Версия</b></span><b class="sval" id="verFull">—</b></div>
            <button class="srow btn" id="checkUpd"><span class="sic">🔄</span><span class="stx"><b>Проверить обновления</b></span><span class="sgo">›</span></button>
            <a class="srow btn" href="https://crownfall90-dot.github.io/TileTopia/privacy.html" target="_blank" rel="noopener"><span class="sic">🔒</span><span class="stx"><b>Политика конфиденциальности</b></span>
```
## onGoogleToken
Line 4426
```html
Id, exp: Date.now() + (+j.expiresIn || 3600) * 1000, email};
  try { localStorage.setItem('fbAuth', JSON.stringify(fbAuth)); } catch (_) {}
}
/* ---------------- Google sign-in ----------------
   A WebView cannot run Google's own sign-in, so on the phone the token comes from the native
   Credential Manager sheet (AndroidApp.googleSignIn → window.onGoogleToken). In the web build
   Google Identity Services draws its own button. Either way Firebase turns the Google ID token
   into a session: mode 'link' attaches Google to this profile, 'login' opens an existing one. */
const googleAvailable = () => !!(window.AndroidApp && AndroidApp.googleSignIn && (!AndroidApp.googleReady || AndroidApp.googleReady()));
const googleWebOk = () => !!(window.WEBAPP && FB && FB.googleClientId);
// The e-mail sits in the Google token payload; it only labels the saved profile.
function jwtEmail(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''; } catch (_) { return ''; } }
async function googleTokenAuth(idToken, link) {
  const body = {postBody: 'id_token=' + encodeURIComponent(idToken) + '&providerId=google.com', requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true};
  if (link) { await fbToken(); body.idToken = fbAuth.idToken; } //
```
Line 4468
```html
& e.error && /FEDERATED_USER_ID_ALREADY_LINKED/.test(e.error.message)) setTimeout(() => accountDialog('login'), 400);
    if (onFail) onFail(e);
  } finally { googleBusy = false; }
}
// One entry point: the native sheet on the phone, Google's own button in the browser.
function startGoogle(link, onFail, btn) {
  if (googleAvailable()) {
    window.onGoogleToken = t => finishGoogle(t, link, onFail);
    window.onGoogleError = c => { if (c !== 'canceled') toastAny(c === 'not_configured' ? 'Вход через Google ещё настраивается' : 'Не получилось войти через Google'); };
    AndroidApp.googleSignIn(); return;
  }
  if (googleWebOk() && btn) return googleWebButton(btn, link, onFail);
  toastAny('Вход через Google доступен в приложении');
  if (onFail) onFail('unavailable');
}
// Web build: load Google Identity Services and swap our button for its official one.
function googleWebButton(btn, link, onFail) {
  btn.disabled = true;
  const load = () => new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = rej; document.head.append(s); });
  load().then(() => {
    const slot = document.createElement('div'); slot.style.cssText = 'display:flex;justify-content:center';
    google.accounts.id.initialize({client_i
```
## onGoogleError
Line 4469
```html
ssage)) setTimeout(() => accountDialog('login'), 400);
    if (onFail) onFail(e);
  } finally { googleBusy = false; }
}
// One entry point: the native sheet on the phone, Google's own button in the browser.
function startGoogle(link, onFail, btn) {
  if (googleAvailable()) {
    window.onGoogleToken = t => finishGoogle(t, link, onFail);
    window.onGoogleError = c => { if (c !== 'canceled') toastAny(c === 'not_configured' ? 'Вход через Google ещё настраивается' : 'Не получилось войти через Google'); };
    AndroidApp.googleSignIn(); return;
  }
  if (googleWebOk() && btn) return googleWebButton(btn, link, onFail);
  toastAny('Вход через Google доступен в приложении');
  if (onFail) onFail('unavailable');
}
// Web build: load Google Identity Services and swap our button for its official one.
function googleWebButton(btn, link, onFail) {
  btn.disabled = true;
  const load = () => new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = rej; document.head.append(s); });
  load().then(() => {
    const slot = document.createElement('div'); slot.style.cssText = 'display:flex;justify-content:center';
    google.accounts.id.initialize({client_id: FB.googleClientId, callback: r => finishGoogle(r.credential,
```
## googleSignIn
Line 4426
```html
eshToken, uid: j.localId, exp: Date.now() + (+j.expiresIn || 3600) * 1000, email};
  try { localStorage.setItem('fbAuth', JSON.stringify(fbAuth)); } catch (_) {}
}
/* ---------------- Google sign-in ----------------
   A WebView cannot run Google's own sign-in, so on the phone the token comes from the native
   Credential Manager sheet (AndroidApp.googleSignIn → window.onGoogleToken). In the web build
   Google Identity Services draws its own button. Either way Firebase turns the Google ID token
   into a session: mode 'link' attaches Google to this profile, 'login' opens an existing one. */
const googleAvailable = () => !!(window.AndroidApp && AndroidApp.googleSignIn && (!AndroidApp.googleReady || AndroidApp.googleReady()));
const googleWebOk = () => !!(window.WEBAPP && FB && FB.googleClientId);
// The e-mail sits in the Google token payload; it only labels the saved profile.
function jwtEmail(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''; } catch (_) { return ''; } }
async function googleTokenAuth(idToken, link) {
  const body = {postBody: 'id_token=' + encodeURIComponent(idToken) + '&providerId=google.com', requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true};
  if (link) { await fbToken(); body.idToken
```
Line 4429
```html
redential Manager sheet (AndroidApp.googleSignIn → window.onGoogleToken). In the web build
   Google Identity Services draws its own button. Either way Firebase turns the Google ID token
   into a session: mode 'link' attaches Google to this profile, 'login' opens an existing one. */
const googleAvailable = () => !!(window.AndroidApp && AndroidApp.googleSignIn && (!AndroidApp.googleReady || AndroidApp.googleReady()));
const googleWebOk = () => !!(window.WEBAPP && FB && FB.googleClientId);
// The e-mail sits in the Google token payload; it only labels the saved profile.
function jwtEmail(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''; } catch (_) { return ''; } }
async function googleTokenAuth(idToken, link) {
  const body = {postBody: 'id_token=' + encodeURIComponent(idToken) + '&providerId=google.com', requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true};
  if (link) { await fbToken(); body.idToken = fbAuth.idToken; } // attach Google to the current profile
  const j = await idt('signInWithIdp', body);
  return {j, email: jwtEmail(idToken) || j.email || ''};
}
let googleBusy = false;
// After the token is in hand: finish linking or sign in (same steps as the e-mail flow).
async function finishGoogle(idToke
```
Line 4470
```html
gle's own button in the browser.
function startGoogle(link, onFail, btn) {
  if (googleAvailable()) {
    window.onGoogleToken = t => finishGoogle(t, link, onFail);
    window.onGoogleError = c => { if (c !== 'canceled') toastAny(c === 'not_configured' ? 'Вход через Google ещё настраивается' : 'Не получилось войти через Google'); };
    AndroidApp.googleSignIn(); return;
  }
  if (googleWebOk() && btn) return googleWebButton(btn, link, onFail);
  toastAny('Вход через Google доступен в приложении');
  if (onFail) onFail('unavailable');
}
// Web build: load Google Identity Services and swap our button for its official one.
function googleWebButton(btn, link, onFail) {
  btn.disabled = true;
  const load = () => new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = rej; document.head.append(s); });
  load().then(() => {
    const slot = document.createElement('div'); slot.style.cssText = 'display:flex;justify-content:center';
    google.accounts.id.initialize({client_id: FB.googleClientId, callback: r => finishGoogle(r.credential, link, onFail)});
    btn.replaceWith(slot);
    google.accounts.id.renderButton(slot, {type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with', shape:
```
## function signIn
No match
## playerColor
No match
## myColor
Line 791
```html
ass="code tap" id="codeShow" role="button" tabindex="0" aria-label="Скопировать код комнаты"></div><small class="tapcopy">Нажмите на код, чтобы скопировать</small>
              <div class="row2"><button class="chip" id="copyLink">🔗 Скопировать код</button></div></div>
            <div class="h3">Ваш цвет</div>
            <div class="mycolor" id="myColor"></div>
            <p class="shint">Если два игрока выберут один цвет, при старте он достанется одному из них случайно, второму — другой свободный.</p>
            <div class="h3" id="lbCount">Игроки</div>
            <ul class="plist" id="plist"></ul>
            <button class="chip" id="addBot">+ Добавить бота</button>
            <div id="lobbyOnline" hidden>
              <div class="h3" id="lobbyOnlineTitle">Друзья онлайн</div>
              <ul class="flist" id="lobbyOnlineList"></ul>
            </div>
            <div class="h3">Правила партии</div>
            <div class="rulesbox" data-rules id="lbRules"></div>
            <button class="cta wide" id="backToGame" hidden>Вернуться в партию</button>
            <button class="cta wide" id="lobbyStart">Начать игру</button>
            <div class="lbwait" id="lbWait" hidden><div class="pz sm"><div class="pzb"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><
```
Line 3399
```html
() - .5);
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
  if (net) netSend({t: 'hello', id: myId, uid: myUid(), reg: registered() ? 1 : 0, name: myName(), fig: wallet.fig, col: wallet.color});
});
$('#create').onclick = () => openSetup('friends');
const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length: 5}, () => A[(Math.random() * A.length) | 0]).join(''); };
function createRoom() { connect(newCode(), true); net.max = setup.onN || 2; show('lobby'); }
$('#join').onclick = () => {
  const code = $('#codeIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) return toastAny('Код комнаты — 5 символов');
  connect(code, false);
};
$('#lobbyBack').onclick = () => { if (net && phase === 'end' || net && !net.gameId) leaveRoom
```
Line 3401
```html
.col) && !out.some(x => x.col === seats[i].col)) out[i].col = seats[i].col;
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
  if (net) netSend({t: 'hello', id: myId, uid: myUid(), reg: registered() ? 1 : 0, name: myName(), fig: wallet.fig, col: wallet.color});
});
$('#create').onclick = () => openSetup('friends');
const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length: 5}, () => A[(Math.random() * A.length) | 0]).join(''); };
function createRoom() { connect(newCode(), true); net.max = setup.onN || 2; show('lobby'); }
$('#join').onclick = () => {
  const code = $('#codeIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) return toastAny('Код комнаты — 5 символов');
  connect(code, false);
};
$('#lobbyBack').onclick = () => { if (net && phase === 'end' || net && !net.gameId) leaveRoom(); show('menu'); renderLobby(); };
$('#addBot').onclick
```
## File ending
```html
h.PI / 2); g.drawImage(img, -48, -48, 96, 96);
  return c.toDataURL('image/jpeg', .85);
}
function relayLoader(pz) {
  const grid = loaderLayout(); if (!grid) return;
  pz.querySelectorAll('i').forEach((el, i) => { el.style.backgroundImage = `url(${pieceUrl(grid[i])})`; });
}
const loaderReady = Promise.all(Object.keys(TYPES).map(k => new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = TILE_URL[k]; loaderImgs[k] = im; }))).then(() => {
  document.querySelectorAll('.pz').forEach(pz => {
    relayLoader(pz);
    // all pieces are hidden at the end of a cycle: swap in a new layout then
    pz.querySelector('i').addEventListener('animationiteration', () => relayLoader(pz));
  });
});
window.__ready = true;
// In the app the loader stays a moment as a splash, long enough to see a few tiles land.
// On app start the splash lays one full fitting 3x3 (restarted once the real pieces are in).
{ const el = $('#boot'); if (el) {
  if (!isApp) { boot.min = boot.checked = true; bootHide(); }
  else loaderReady.then(() => {
    const pieces = el.querySelectorAll('.pz i');
    pieces.forEach(i => { i.style.animation = 'none'; void i.offsetWidth; i.style.animation = ''; });
    setTimeout(() => {
      boot.min = true; bootHide();
      if (!boot.gone && !boot.update) { const s = el.querySelector('small'); if (s) s.textContent = 'Проверяем обновления…'; }
    }, 3000);
    // An older app shell, or no answer at all: do not hold the game.
    setTimeout(() => { boot.checked = true; bootHide(); }, 6000);
  });
} }
show(isApp ? 'menu' : 'game');
})();
</script>

```
## Tests
```text
stRun (node:internal/test_runner/test:889:19)
    Test.run (node:internal/test_runner/test:835:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:526:7)
  ...
# Subtest: all inline JavaScript compiles
ok 7 - all inline JavaScript compiles
  ---
  duration_ms: 10.133894
  ...
# Subtest: impossible tiles use finite silent scan
ok 8 - impossible tiles use finite silent scan
  ---
  duration_ms: 0.480703
  ...
# Subtest: placement probe stops on first legal rotation
ok 9 - placement probe stops on first legal rotation
  ---
  duration_ms: 1.121774
  ...
# Subtest: finished marker is bounded and idempotent
ok 10 - finished marker is bounded and idempotent
  ---
  duration_ms: 20.469874
  ...
# Subtest: finished saved game is rejected and removed
ok 11 - finished saved game is rejected and removed
  ---
  duration_ms: 1.596158
  ...
# Subtest: active save is blocked in terminal phase
ok 12 - active save is blocked in terminal phase
  ---
  duration_ms: 1.270464
  ...
# Subtest: history replaces preliminary row with final row
ok 13 - history replaces preliminary row with final row
  ---
  duration_ms: 1.412935
  ...
# Subtest: remote move reserves its number before catch-up yield
ok 14 - remote move reserves its number before catch-up yield
  ---
  duration_ms: 0.4452
  ...
# Subtest: network queue rejects old and duplicate move numbers
ok 15 - network queue rejects old and duplicate move numbers
  ---
  duration_ms: 0.470978
  ...
# Subtest: duplicate start message has an explicit guard
ok 16 - duplicate start message has an explicit guard
  ---
  duration_ms: 0.598878
  ...
# Subtest: terminal marker precedes asynchronous final scoring
ok 17 - terminal marker precedes asynchronous final scoring
  ---
  duration_ms: 0.568133
  ...
# Subtest: return from background routes terminal game home
ok 18 - return from background routes terminal game home
  ---
  duration_ms: 0.239495
  ...
# Subtest: confirmation dialog is singleton and actions are one-shot
ok 19 - confirmation dialog is singleton and actions are one-shot
  ---
  duration_ms: 0.507894
  ...
# Subtest: test source does not contain secret material
ok 20 - test source does not contain secret material
  ---
  duration_ms: 0.516366
  ...
# Subtest: malformed finished marker is ignored without crashing
ok 21 - malformed finished marker is ignored without crashing
  ---
  duration_ms: 3.212745
  ...
# Subtest: active legacy save remains compatible without localId
ok 22 - active legacy save remains compatible without localId
  ---
  duration_ms: 1.589127
  ...
# Subtest: invalid saved structure is rejected
ok 23 - invalid saved structure is rejected
  ---
  duration_ms: 3.592558
  ...
# Subtest: late final scoring cannot pay out into another game
ok 24 - late final scoring cannot pay out into another game
  ---
  duration_ms: 0.787438
  ...
# Subtest: dialog uses full text safely and disposes the previous listener
ok 25 - dialog uses full text safely and disposes the previous listener
  ---
  duration_ms: 0.505019
  ...
# Subtest: replay suppresses opening effects before the initial tile
ok 26 - replay suppresses opening effects before the initial tile
  ---
  duration_ms: 0.720228
  ...
# Subtest: historic placement skips the puff effect
ok 27 - historic placement skips the puff effect
  ---
  duration_ms: 0.335637
  ...
# Subtest: source guard: mark only after Android accepts submission
ok 28 - source guard: mark only after Android accepts submission
  ---
  duration_ms: 1.870935
  ...
# Subtest: source guard: concurrent announcements serialized
ok 29 - source guard: concurrent announcements serialized
  ---
  duration_ms: 0.229311
  ...
# Subtest: source guard: permission and disabled channel checked
ok 30 - source guard: permission and disabled channel checked
  ---
  duration_ms: 0.249069
  ...
# Subtest: source guard: denied notification is not marked
ok 31 - source guard: denied notification is not marked
  ---
  duration_ms: 0.207397
  ...
# Subtest: diagnostics records Firebase acceptance, not display
ok 32 - diagnostics records Firebase acceptance, not display
  ---
  duration_ms: 1.896302
  ...
# Subtest: diagnostics checks retained token
ok 33 - diagnostics checks retained token
  ---
  duration_ms: 0.203392
  ...
# Subtest: diagnostics uses requested topic
ok 34 - diagnostics uses requested topic
  ---
  duration_ms: 0.319143
  ...
1..34
# tests 34
# suites 0
# pass 31
# fail 3
# cancelled 0
# skipped 0
# todo 0
# duration_ms 153.604046

```
## Compiler
```text
> Task :app:compileStagingDebugJavaWithJavac
/home/runner/work/play/play/app/src/main/java/com/crownfall/mosaic/AccountIdentity.java:64: error: no suitable method found for getCredentialAsync(Context,GetCredentialRequest,<null>,Executor,(result)->[...]; } })
            manager.getCredentialAsync(context, request, null, IO, result -> {
                   ^
    method CredentialManager.getCredentialAsync(Context,GetCredentialRequest,CancellationSignal,Executor,CredentialManagerCallback<GetCredentialResponse,GetCredentialException>) is not applicable
      (argument mismatch; CredentialManagerCallback is not a functional interface
          multiple non-overriding abstract methods found in interface CredentialManagerCallback)
      (argument mismatch; GetCredentialRequest cannot be converted to PendingGetCredentialHandle)
/home/runner/work/play/play/app/src/main/java/com/crownfall/mosaic/AccountIdentity.java:87: error: method clearCredentialStateAsync in interface CredentialManager cannot be applied to given types;
                .clearCredentialStateAsync(new ClearCredentialStateRequest(), null, IO,
                ^
  required: ClearCredentialStateRequest,CancellationSignal,Executor,CredentialManagerCallback<Void,ClearCredentialException>
  found:    ClearCredentialStateRequest,<null>,Executor,(result)->[...]ener),(error)->f[...]ener)
  reason: actual and formal argument lists differ in length

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:compileStagingDebugJavaWithJavac'.
> Compilation failed; see the compiler error output for details.

* Try:
> Run with --info option to get more log output.

BUILD FAILED in 6m 54s
16 actionable tasks: 16 executed
```
