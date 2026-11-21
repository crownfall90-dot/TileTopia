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
