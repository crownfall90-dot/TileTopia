// The consent tick-box: asked once per version of the texts, and the buttons of the sign-up dialogs wait for it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('consent: markup has a real checkbox, both documents and a hint; the answer is stored per version', async () => {
  const C = await import('../src/ui/consent.js');
  const html = C.consentHtml('x1');
  assert.match(html, /<input type="checkbox" id="x1"/);
  assert.ok(html.includes(C.TERMS_URL) && html.includes(C.PRIVACY_URL));
  assert.match(html, /id="x1Hint"/);
  const w = {};
  assert.equal(C.hasConsent(w), false);
  C.setConsent(w, true, 5); assert.deepEqual(w.consent, {v: C.LEGAL_VERSION, t: 5}); assert.equal(C.hasConsent(w), true);
  w.consent.v = C.LEGAL_VERSION - 1; assert.equal(C.hasConsent(w), false, 'an answer to older texts does not count');
  C.setConsent(w, false); assert.ok(!('consent' in w), 'withdrawn');
});

test('consent: the profile and sign-in dialogs get the tick-box and lock their buttons', () => {
  const html = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
  assert.match(html, /addConsent\(box, '#profOk', \['#profOk'\]\)/);
  assert.match(html, /addConsent\(box, '#accGo', \['#accGo', '#accGoogle', '#accGSlot'\]\)/);
  const css = fs.readFileSync(__dirname + '/../src/ui/styles.css', 'utf8');
  assert.match(css, /\.consent-lock\s*\{[^}]*pointer-events: none/);
  assert.match(css, /prefers-reduced-motion[^}]*consent/);
});
