// Tests for Security Audit 2026-11-01: SEC-01 (XSS/sanitization), SEC-02 (PIN exposure & staging gate), SEC-03 (promo claims)
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RULES_PATH = path.join(__dirname, '..', 'docs', 'firebase-rules.json');

function extractFn(html, name) {
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

test('security audit: firebase rules contain promo_claims and secure testerPin', () => {
  const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

  // SEC-02: testerPin is readable for staging testers (.read: true) but writable only by admins
  assert.ok(rules.rules.config && rules.rules.config.testerPin, 'testerPin rule exists');
  assert.equal(rules.rules.config.testerPin['.read'], true, 'testerPin is readable by staging gate');
  assert.ok(rules.rules.config.testerPin['.write'].includes('admins'), 'testerPin is writable only by admins');
  assert.ok(rules.rules.config.testerPin['.validate'].includes('matches'), 'testerPin requires 4-8 digits regex');

  // SEC-03: promo_claims node exists with one-time write protection
  assert.ok(rules.rules.promo_claims, 'promo_claims rule branch exists');
  const claim = rules.rules.promo_claims.$code.$uid;
  assert.ok(claim['.write'].includes('!data.exists()'), 'prevents multiple claims of same promo');
  assert.ok(claim['.read'].includes('auth.uid === $uid'), 'users only read their own claims');

  // Status moderation: admins can moderate and clear custom status in presence and leaders
  assert.ok(rules.rules.presence.$uid['.write'].includes('admins'), 'admins can write to presence for status moderation');
  assert.ok(rules.rules.presence.$uid['.validate'].includes('admins'), 'admins pass presence validation');
  assert.ok(rules.rules.leaders.$uid['.write'].includes('admins'), 'admins can write to leaders for status moderation');
  assert.ok(rules.rules.leaders.$uid['.validate'].includes('admins'), 'admins pass leaders validation');
});

test('security audit: game.html sanitizes remote seats, uid, and results board against XSS', () => {
  const html = gameSource();

  // SEC-01: remote seats in startGame use clean() and sanitized UID
  assert.match(html, /startGame\(\{seats:\s*m\.seats\.map\(\(x,\s*i\)\s*=>\s*\(\{name:\s*clean\(x\.name\)/);
  assert.match(html, /replace\(\/\[\^\\w-\]\/g,\s*''\)/);

  // SEC-01: results board sanitizes player names on podium and table
  assert.match(html, /podium.*clean\(p\.name\)/s);
  assert.match(html, /#bd.*clean\(p\.name\)/s);

  // SEC-03: redeemPromo checks promo_claims
  assert.match(html, /promo_claims\/\$\{encodeURIComponent\(code\)\}/);
});

test('security audit: redeemPromo handles 401 on promo_claims gracefully without crediting gold', async () => {
  const html = gameSource();
  const code = extractFn(html, 'redeemPromo');

  const toasts = [];
  const env = {
    wallet: { gold: 100, promos: [] },
    saveWallet: () => {},
    renderShop: () => {},
    toastAny: (m) => toasts.push(m),
    $: () => null,
    FB: { dbUrl: 'https://test-puzzlegrad.firebaseio.com' },
    fbToken: async () => 'mock-token',
    fbAuth: { uid: 'user-123' },
    fetch: async (url, opts) => {
      if (url.includes('/promo_codes/')) {
        return { ok: true, status: 200, json: async () => ({ active: true, gold: 50 }) };
      }
      if (url.includes('/promo_claims/')) {
        // Simulate Firebase 401 Unauthorized because rules are not yet published
        return { ok: false, status: 401, json: async () => ({ error: 'Permission denied' }) };
      }
      return { ok: false, status: 404 };
    }
  };

  vm.runInNewContext(code, env);
  await env.redeemPromo('COMMUNITY50');

  assert.equal(env.wallet.gold, 100, 'gold must NOT be credited when promo_claims returns 401');
  assert.equal(env.wallet.promos.length, 0, 'promo must NOT be recorded as claimed');
  assert.ok(toasts.some(t => t.includes('правил базы') || t.includes('доступ')), 'player receives clear error message');
});
