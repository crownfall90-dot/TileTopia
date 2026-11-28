const { gameSource } = require('../scripts/compose-page.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const s=gameSource();
const bridge=fs.readFileSync('app/src/main/java/com/crownfall/mosaic/MainActivity.java','utf8');
test('existing settings expose account container and lobby color picker (source check)',()=>{
  for(const q of ['id="scr-settings"','id="acct"','id="myColor"']) assert.ok(s.includes(q));
});
test('existing Google flow exchanges token with Firebase and retains native bridge (source check)',()=>{
  for(const q of ['function googleIdp(',"idt('signInWithIdp', body)",'AndroidApp.googleSignIn()']) assert.ok(s.includes(q));
  for(const q of ['public boolean googleReady()', 'public void googleSignIn()', 'window.onGoogleToken']) assert.ok(bridge.includes(q));
});
test('existing lobby color preference is saved through wallet (source check)',()=>{
  assert.ok(s.includes('wallet.color = sw.dataset.sw; saveWallet(); renderMyColor();'));
  assert.ok(s.includes('swatches(wallet.color, [])'));
});

const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');
const pw = loadPlaywright();

test('Google collision confirms the existing password account and reset stays available', {skip: !pw, timeout: 60000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const file = instrumentedCopy();
    const html = fs.readFileSync(file, 'utf8');
    const end = html.lastIndexOf('})();');
    fs.writeFileSync(file, html.slice(0, end) + 'window.__googleTest = finishGoogle;\n' + html.slice(end));
    const {page, errors} = await openGame(browser, file, null, () => {
      window.WEBAPP = true;
      window.FIREBASE = {apiKey: 'synthetic', dbUrl: 'https://firebase.test'};
      localStorage.setItem('fbAuth', JSON.stringify({uid:'guest',idToken:'guest-token',exp:Date.now()+1000000}));
      localStorage.setItem('wallet', JSON.stringify({name:'QA',tut:true,tutAsked:true,statsAsked:true,notifAt:Date.now(),installHinted:true}));
    });
    const requests = [];
    const original = {localId:'existing-profile',email:'player@example.com',idToken:'password-token'};
    await page.route('https://identitytoolkit.googleapis.com/**', async route => {
      const method = /accounts:(\w+)/.exec(route.request().url())[1];
      const body = route.request().postDataJSON();
      requests.push({method, body});
      if (method === 'signInWithIdp') {
        return route.fulfill({json: body.idToken === original.idToken ? {...original,idToken:'linked-token'} : {needConfirmation:true,email:original.email}});
      }
      if (method === 'sendOobCode') return route.fulfill({status:400,json:{error:{message:'EMAIL_NOT_FOUND'}}});
      if (method === 'signInWithPassword') {
        return body.password === 'correct-password' ? route.fulfill({json:original})
          : route.fulfill({status:400,json:{error:{message:'INVALID_LOGIN_CREDENTIALS'}}});
      }
      return route.fulfill({status:400,json:{error:{message:'UNEXPECTED_TEST_REQUEST'}}});
    });
    await page.route('https://firebase.test/**', route => {
      const url = new URL(route.request().url());
      const profile = url.pathname === '/profiles/existing-profile.json' && url.searchParams.get('auth') === 'linked-token';
      return route.fulfill({json:profile ? {w:JSON.stringify({name:'Старый профиль',gold:601,prog:{}})} : null});
    });
    await page.evaluate(() => window.__googleTest('synthetic-google-token', false));
    await page.getByRole('heading', {name:'Подтвердите вход для Google'}).waitFor();
    assert.equal(await page.locator('#accMail').inputValue(), original.email);
    assert.equal(await page.locator('#accMail').getAttribute('readonly'), '');
    await page.locator('#accReset').click();
    await page.getByText(/Если к .* привязан профиль/).waitFor();
    assert.equal(requests.find(x => x.method === 'sendOobCode').body.email, original.email);
    const consent = page.locator('.over:has(#accMail) input[type=checkbox]');
    if (await consent.count()) await page.locator('.over:has(#accMail) label:has(#consentBox) .cbox').click();
    await page.locator('#accPass').fill('incorrect-password');
    await page.locator('#accGo').click();
    await page.getByText(/Почта или пароль не подходят/).waitFor();
    assert.ok(!requests.some(x => x.method === 'signUp' || x.method === 'update'));
    await page.locator('#accPass').fill('correct-password');
    await page.locator('#accGo').click();
    await page.locator('#accGo').waitFor({state:'detached'});
    const saved = await page.evaluate(() => ({uid:JSON.parse(localStorage.fbAuth).uid,gold:JSON.parse(localStorage.wallet).gold}));
    assert.deepEqual(saved, {uid:original.localId,gold:601});
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
