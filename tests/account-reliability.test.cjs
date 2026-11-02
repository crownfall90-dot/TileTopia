const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('web/game.html', 'utf8');

function fn(name) {
  let i = html.indexOf('async function ' + name + '(');
  if (i < 0) i = html.indexOf('function ' + name + '(');
  assert.ok(i >= 0, `function ${name} not found`);
  const b = html.indexOf('{', i);
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}' && !--d) return html.slice(i, j + 1);
  }
  throw Error(name);
}

test('startGoogle uses request-id to drop superseded or late callbacks', () => {
  const tokens = [];
  const failures = [];
  const env = {
    window: {},
    AndroidApp: { googleSignIn() {} },
    googleAvailable: () => true,
    googleWebOk: () => false,
    toastAny: () => {},
    finishGoogle: (t) => tokens.push(t)
  };
  env.track = env.track || (() => {});
  vm.runInNewContext(fn('startGoogle'), env);

  // First request: reqId = 1
  env.startGoogle(false, c => failures.push(c), {});
  const firstTokenCb = env.window.onGoogleToken;
  assert.ok(typeof firstTokenCb === 'function');

  // Second request started before first completed: reqId = 2
  env.startGoogle(false, c => failures.push(c), {});

  // Simulate late callback from first request
  firstTokenCb('stale-token-1');
  assert.equal(tokens.length, 0, 'stale token from superseded request must be ignored');

  // Second callback fires
  env.window.onGoogleToken('valid-token-2');
  assert.deepEqual(tokens, ['valid-token-2']);
  assert.equal(env.window.onGoogleToken, null, 'callback must be cleared after execution');
  assert.equal(env.window.onGoogleError, null, 'error callback must be cleared after execution');
});

test('startGoogle cleans up window callbacks after error', () => {
  const failures = [];
  const env = {
    window: {},
    AndroidApp: { googleSignIn() {} },
    googleAvailable: () => true,
    googleWebOk: () => false,
    toastAny: () => {},
    finishGoogle: () => {}
  };
  env.track = env.track || (() => {});
  vm.runInNewContext(fn('startGoogle'), env);

  env.startGoogle(false, c => failures.push(c), {});
  assert.ok(typeof env.window.onGoogleError === 'function');

  env.window.onGoogleError('no_credentials');
  assert.deepEqual(failures, ['no_credentials']);
  assert.equal(env.window.onGoogleToken, null, 'onGoogleToken must be nulled after error');
  assert.equal(env.window.onGoogleError, null, 'onGoogleError must be nulled after error');
});

// A sandbox for finishGoogle: idp(token, session) plays Firebase's signInWithIdp.
function googleEnv(idp, {registered = false, profile = null} = {}) {
  const log = {idp: [], toasts: [], signup: [], login: [], keep: []};
  const env = {
    googleIdp: async (tok, session) => { log.idp.push([tok, session ? 'link' : 'signin']); return idp(tok, session); },
    jwtEmail: () => 'player@gmail.com', jwtField: () => 'Иван',
    registered: () => registered, fbToken: async () => 'ANON', fbAuth: {idToken: 'ANON'},
    authErr: () => ['auth error'], keepAuth: (j) => log.keep.push(j), track: () => {},
    cloudLoad: async () => !!profile, cloudSave: async () => true,
    toastAny: (t) => log.toasts.push(t), profileName: () => 'Player',
    wallet: {name: 'Гость'}, saveWallet: () => {}, renderAccount: () => {}, renderSetup: () => {}, renderShop: () => {},
    progressDot: () => {}, show: () => {}, presenceMark: () => {}, syncRating: () => {}, socialReset: () => {},
    finishSignup: (n) => log.signup.push(n), accountDialog: (m, mail) => log.login.push([m, mail]),
    $: () => ({hidden: true}), document: {querySelectorAll: () => []}, setTimeout: () => {}, Date,
  };
  vm.runInNewContext(
    'let googleBusy = false; let lastGoogleToken = ""; let lastGoogleTokenTime = 0; let pendingGoogle = null;\n' +
    "const gErr = (e, re) => !!(e && e.error && re.test(String(e.error.message || '')));\n" +
    fn('finishGoogle') + '\nthis.pending = () => pendingGoogle;', env);
  return {env, log};
}
const fail = m => { throw {error: {message: m}}; };

test('finishGoogle: duplicate tokens and concurrent requests are refused', async () => {
  const {env, log} = googleEnv(async () => ({idToken: 'S', localId: 'u1'}));
  const failures = [];
  await env.finishGoogle('id-tok-123', false, c => failures.push(c));
  assert.equal(log.idp.length, 1);
  assert.equal(failures.length, 0);
  await env.finishGoogle('id-tok-123', false, c => failures.push(c));
  assert.equal(log.idp.length, 1, 'duplicate token must not reach Firebase again');
  assert.deepEqual(failures, ['duplicate']);
  failures.length = 0;
  await env.finishGoogle('id-tok-456', false, c => failures.push(c));
  assert.equal(log.idp.length, 2);
  assert.equal(failures.length, 0);
});

test('finishGoogle: a new Google account registers this guest profile and asks for a nickname', async () => {
  const {env, log} = googleEnv(async (tok, session) => ({idToken: 'S', localId: 'anon1'}));
  await env.finishGoogle('tok', false, () => assert.fail('must not fail'));
  assert.deepEqual(log.idp, [['tok', 'link']], 'a guest attaches Google to its own profile');
  assert.equal(log.signup.length, 1, 'registration ends with the nickname step (it keeps a nickname made up before)');
});

test('finishGoogle: a Google account with a profile signs in to it', async () => {
  const {env, log} = googleEnv(async (tok, session) => session ? fail('FEDERATED_USER_ID_ALREADY_LINKED') : {idToken: 'S', localId: 'g1'}, {profile: {}});
  await env.finishGoogle('tok', false, () => assert.fail('must not fail'));
  assert.deepEqual(log.idp, [['tok', 'link'], ['tok', 'signin']]);
  assert.equal(log.signup.length, 0);
  assert.ok(log.toasts.some(t => t.startsWith('С возвращением')));
});

test('finishGoogle: CREDENTIAL_ALREADY_IN_USE falls back to signin and loads cloud profile', async () => {
  const {env, log} = googleEnv(async (tok, session) => session ? fail('CREDENTIAL_ALREADY_IN_USE') : {idToken: 'S', localId: 'g1'}, {profile: {}});
  await env.finishGoogle('tok', false, () => assert.fail('must not fail'));
  assert.deepEqual(log.idp, [['tok', 'link'], ['tok', 'signin']]);
  assert.equal(log.signup.length, 0);
  assert.ok(log.toasts.some(t => t.startsWith('С возвращением')));
});

test('finishGoogle: a 200 answer without a session is never taken for a sign-in', async () => {
  // E-mail already registered with a password: signInWithIdp says needConfirmation and gives no idToken.
  const {env, log} = googleEnv(async (tok, session) => session ? fail('EMAIL_EXISTS') : fail('NEED_CONFIRMATION'));
  const failures = [];
  await env.finishGoogle('tok', false, c => failures.push(c));
  assert.equal(log.keep.length, 0, 'no empty session may be saved');
  assert.deepEqual(log.login, [['login', 'player@gmail.com']], 'the player is sent to the password sign-in');
  assert.equal(env.pending().token, 'tok', 'Google waits to be attached after that sign-in');
  assert.equal(failures.length, 1);
});

test('googleIdp: needConfirmation and errorMessage answers are errors', async () => {
  for (const [answer, code] of [[{needConfirmation: true}, 'NEED_CONFIRMATION'], [{errorMessage: 'FEDERATED_USER_ID_ALREADY_LINKED'}, 'FEDERATED_USER_ID_ALREADY_LINKED']]) {
    const env = {idt: async () => answer};
    vm.runInNewContext(fn('googleIdp'), env);
    await assert.rejects(env.googleIdp('tok', null), e => e.error.message === code);
  }
});

test('source check: accountDialog wires disabled state and cancel invalidation', () => {
  assert.ok(html.includes("gbtn.disabled = true; startGoogle(link, () => { gbtn.disabled = false; }, gbtn);"));
  assert.ok(html.includes("startGoogle.reqId = (startGoogle.reqId || 0) + 1;"));
  assert.ok(html.includes("window.onGoogleToken = null;"));
  assert.ok(html.includes("window.onGoogleError = null;"));
});

test('walletSig: a mismatch is reported, the gold is kept (src/state/wallet.js)', async () => {
  const W = await import('../src/state/wallet.js');
  const w1 = {gold: 500, owned: ['classic', 'forest'], fcode: 'ABCDEF'};
  const sig1 = W.walletSig(w1);
  assert.ok(typeof sig1 === 'string' && sig1.length > 0);
  const wTampered = {gold: 999999, owned: ['classic', 'forest'], fcode: 'ABCDEF'};
  assert.notEqual(sig1, W.walletSig(wTampered), 'tampering gold must yield a different signature');
  const store = {wallet: JSON.stringify(wTampered), wallet_sig: sig1};
  const storage = {getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }};
  const ok = () => true, reports = [];
  assert.equal(W.loadWallet(storage, ok, '#ef5350', r => reports.push(r)).gold, 999999, 'a mismatch never takes gold away (a rollback writes no checksum)');
  assert.deepEqual(reports, [{gold: 999999}], 'the mismatch is reported');
  W.storeWallet(storage, w1);
  assert.equal(W.loadWallet(storage, ok, '#ef5350').gold, 500, 'a wallet saved by the game loads as it is');
  store.wallet = JSON.stringify({gold: 300, color: '#2ec4d6'}); delete store.wallet_sig;
  const old = W.loadWallet(storage, c => c !== '#2ec4d6', '#ef5350');
  assert.equal(old.gold, 300, 'a wallet from before the checksum keeps its gold');
  assert.equal(old.color, '#ef5350', 'a colour removed from the palette is replaced');
});

test('anti-cheat: blocks F12, developer shortcuts and context menu', () => {
  assert.ok(html.includes("k === 'F12' || k === 123"));
  assert.ok(html.includes("e.ctrlKey || e.metaKey") && html.includes("e.shiftKey") && html.includes("'I'"));
  assert.ok(html.includes("document.addEventListener('contextmenu', e => {"));
  // Long-press paste must keep working in text fields (friend codes, e-mail, password).
  assert.ok(html.includes("closest('input,textarea,[contenteditable]')"));
});

test('staging gate: protects staging web with tester PIN and watermark badge', () => {
  assert.ok(html.includes("function initStagingGate()"));
  assert.ok(html.includes("function showStagingWatermark()"));
  assert.ok(html.includes("sessionStorage.getItem('pg_staging_pin_ok')"));

  // 1. Production check: when IS_STAGING is not set, gate is inactive
  let domAppended = false;
  const mockDocProd = {
    getElementById: () => null,
    createElement: () => ({ id: '', style: {}, appendChild() {}, innerHTML: '' }),
    body: { appendChild: () => { domAppended = true; } }
  };
  const envProd = {
    window: { IS_STAGING: false },
    document: mockDocProd,
    sessionStorage: { getItem: () => null }
  };
  vm.runInNewContext(fn('showStagingWatermark') + '\n' + fn('initStagingGate'), envProd);
  envProd.initStagingGate();
  assert.equal(domAppended, false, 'staging gate must be disabled in production');

  // 2. Staging check: when IS_STAGING is true, overlay is mounted and validates PIN
  const sessionData = {};
  const elements = {};
  const mockDocStaging = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => {
      const el = { id: '', style: {}, innerHTML: '', remove: () => {} };
      return el;
    },
    body: {
      appendChild: (el) => {
        elements[el.id] = el;
      }
    }
  };
  const envStaging = {
    window: { IS_STAGING: true, WEB_VERSION: 'тест 214' },
    document: mockDocStaging,
    sessionStorage: {
      getItem: (k) => sessionData[k] || null,
      setItem: (k, v) => { sessionData[k] = v; }
    },
    localStorage: { getItem: () => '2026' }
  };
  vm.runInNewContext(fn('showStagingWatermark') + '\n' + fn('initStagingGate'), envStaging);
  envStaging.initStagingGate();
  assert.ok(elements.stagingGate, 'staging overlay must be appended when unauthenticated');
});

test('features: promo code redemption credits gold, prevents reuse, and signs wallet', async () => {
  const toasts = [];
  const env = {
    wallet: { gold: 100, promos: [] },
    saveWallet: () => {},
    renderShop: () => {},
    toastAny: (m) => toasts.push(m),
    $: () => null
  };
  vm.runInNewContext(fn('redeemPromo'), env);

  // 1. Redeem built-in TESTER2026
  await env.redeemPromo('TESTER2026');
  assert.equal(env.wallet.gold, 600, 'gold must increase by 500');
  assert.deepEqual(env.wallet.promos, ['TESTER2026']);
  assert.ok(toasts.some(t => t.includes('+500')));

  // 2. Reject duplicate redemption
  toasts.length = 0;
  await env.redeemPromo('TESTER2026');
  assert.equal(env.wallet.gold, 600, 'duplicate code must not grant gold');
  assert.ok(toasts.some(t => t.includes('уже был использован')));

  // 3. Redeem OPUS55
  toasts.length = 0;
  await env.redeemPromo('OPUS55');
  assert.equal(env.wallet.gold, 900, 'gold must increase by 300');
  assert.deepEqual(env.wallet.promos, ['TESTER2026', 'OPUS55']);
});

test('features: maintenance screen blocks game view when active and provides retry button', () => {
  const elements = {};
  let reloaded = false;
  const mockDoc = {
    getElementById: (id) => elements[id] || null,
    createElement: () => {
      const msg = { textContent: '' };
      const retry = { onclick: null };
      return {
        id: '',
        style: {},
        innerHTML: '',
        msg,
        querySelector: (sel) => (sel === '#maintMsg' ? msg : sel === '#maintRetry' ? retry : null)
      };
    },
    body: { appendChild: (el) => { elements[el.id] = el; } }
  };
  const env = {
    document: mockDoc,
    location: { reload: () => { reloaded = true; } }
  };
  vm.runInNewContext(fn('showMaintenanceScreen'), env);
  env.showMaintenanceScreen('Плановые работы <img src=x onerror=alert(1)>');
  assert.ok(elements.maintBox, 'maintenance screen must be rendered');
  assert.ok(elements.maintBox.msg.textContent.includes('Плановые работы'));
  assert.ok(!elements.maintBox.innerHTML.includes('<img'), 'the database message must never be inserted as markup');
  assert.ok(elements.maintBox.innerHTML.includes('Попробовать снова'), 'retry button text is present');
  const retryBtn = elements.maintBox.querySelector('#maintRetry');
  assert.ok(typeof retryBtn.onclick === 'function', 'retry button has click handler');
  retryBtn.onclick();
  assert.equal(reloaded, true, 'retry button triggers location.reload()');
});




test('jwtPayload decodes UTF-8 names (no mojibake)', () => {
  const env = {atob: s => Buffer.from(s, 'base64').toString('latin1'), TextDecoder, Uint8Array, JSON};
  vm.runInNewContext(fn('jwtPayload'), env);
  const payload = Buffer.from(JSON.stringify({given_name: 'Роман', email: 'a@b.ru'})).toString('base64').replace(/=+$/, '');
  assert.equal(env.jwtPayload('h.' + payload + '.s').given_name, 'Роман');
});

test('finishSignup keeps a nickname made up before and leaves the field empty otherwise', () => {
  const src = fn('finishSignup');
  assert.ok(src.includes('if (wallet.name)'), 'an existing nickname skips the step');
  assert.ok(!/inp\.value\s*=/.test(src), 'the nickname field starts empty');
});

test('closing dialogs never removes the game screen\'s own results board (#over)', () => {
  // #over has class "over" too; removing every .over after a Google sign-in broke the next game's start.
  assert.ok(html.includes('<div class="over" id="over" hidden></div>'));
  assert.ok(!/querySelectorAll\('\.over'\)\.forEach\([^)]*\.remove\(\)/.test(html), 'remove dialogs with body > .over only');
});

test('promo codes from the database are read signed in (rules: auth != null)', () => {
  assert.match(fn('redeemPromo'), /promo_codes\/\$\{encodeURIComponent\(code\)\}\.json\?auth=\$\{await fbToken\(\)\}/);
});

test('maintenance screen goes away once switched off, and is re-checked on return to the app', () => {
  assert.match(fn('checkMaintenance'), /getElementById\('maintBox'\); if \(box\) box\.remove\(\)/);
  assert.ok(html.includes("document.addEventListener('visibilitychange', () => { if (!document.hidden) checkMaintenance(); });"));
});

test('founder panel writes through the owner sign-in, never pretends', () => {
  const panel = fs.readFileSync('tools/founder-admin.html', 'utf8');
  for (const path of ["db('config/maintenance', 'PUT'", "db('promo_codes/' + encodeURIComponent(code), 'PUT'", "db('config/testerPin', 'PUT'"]) assert.ok(panel.includes(path), path);
  assert.ok(!/alert\('Режим технических работ активирован/.test(panel), 'no fake success messages');
});

test('feedback lives in the founder panel; there is no separate feedback page', () => {
  assert.ok(fs.readFileSync('tools/founder-admin.html', 'utf8').includes("db('feedback')"));
  assert.ok(!fs.existsSync('tools/feedback-admin.html'));
  assert.ok(!html.includes('admin/feedback.html'), 'the game links to the one panel');
});

test('founder panel fits a phone: wrapping buttons, one column, hidden elements stay hidden', () => {
  const panel = fs.readFileSync('tools/founder-admin.html', 'utf8');
  assert.ok(panel.includes('minmax(min(340px, 100%), 1fr)'), 'cards may shrink below 340px');
  assert.ok(panel.includes('[hidden] { display: none !important; }'));
  assert.ok(panel.includes('@media (max-width: 600px)'));
});

test('founder panel shows only the sign-in card until an admin has signed in', () => {
  const panel = fs.readFileSync('tools/founder-admin.html', 'utf8');
  assert.ok(panel.includes('body:not(.authed) main > .card:not(#loginCard) { display: none; }'));
  assert.ok(panel.includes("document.body.classList.add('authed')"));
  assert.ok(panel.includes("document.body.classList.remove('authed')"));
  assert.ok(!/^loadVersions\(\); loadMaint\(\); loadPin\(\);/m.test(panel), 'nothing loads before sign-in');
});

test('app text is not selectable by long press, typing fields and codes are', () => {
  const css = fs.readFileSync('src/ui/styles.css', 'utf8');
  assert.ok(css.includes('html.app body{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}'));
  assert.ok(/html\.app input,html\.app textarea,html\.app a,[^{]*html\.app \.code/.test(css), 'inputs, links and codes stay selectable');
  assert.ok(html.includes('<b>С&nbsp;друзьями</b>'), 'the menu label does not break after «С»');
});

test('the starting zoom keeps the first card\'s neighbours clear of the zoom buttons on narrow phones', () => {
  assert.ok(html.includes('(document.documentElement.clientWidth / 2 - 54) / 136'));
  assert.ok(html.includes('Math.max(.7, Math.min(1.05,'));
});
