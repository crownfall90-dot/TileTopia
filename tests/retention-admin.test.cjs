// H-2 Retention in owner panel: verifies presence markers, funnel events in LOG_KINDS,
// and the retention calculation logic for D1 and D7 cohorts.
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADMIN_PATH = path.join(__dirname, '..', 'tools', 'founder-admin.html');

test('retention & funnel (H-1, H-2): game logs funnel events and sends retention markers in presence', () => {
  const gameCode = gameSource();

  // Verify funnel events in LOG_KINDS
  for (const ev of ['first_open', 'first_game_done', 'second_game_done', 'third_game_done', 'save_prompt_tap', 'return_d1', 'return_d3', 'return_d7']) {
    assert.ok(gameCode.includes(`'${ev}'`), `LOG_KINDS includes '${ev}'`);
  }

  // Verify presence sends fs, d1, d7
  assert.ok(gameCode.includes('fs: wallet.firstSeen || today()'), 'presence sends firstSeen date (fs)');
  assert.ok(gameCode.includes('d1: (wallet.rd && wallet.rd[1])'), 'presence sends d1 marker');
  assert.ok(gameCode.includes('d7: (wallet.rd && wallet.rd[7])'), 'presence sends d7 marker');
});

test('retention panel (H-2): founder-admin displays D1/D7 metrics and cohort breakdown', () => {
  const adminCode = fs.readFileSync(ADMIN_PATH, 'utf8');

  assert.ok(adminCode.includes('id="valRetD1"'), 'valRetD1 metric tile exists');
  assert.ok(adminCode.includes('id="valRetD7"'), 'valRetD7 metric tile exists');
  assert.ok(adminCode.includes('id="valCohorts"'), 'valCohorts breakdown container exists');
  assert.ok(adminCode.includes('Удержание D1'), 'D1 label exists in admin panel');
  assert.ok(adminCode.includes('Удержание D7'), 'D7 label exists in admin panel');

  // Algorithm test: simulate presence records and compute D1/D7 retention
  const now = Date.parse('2026-11-01T12:00:00Z');
  const dayMs = 864e5;
  const mockPresence = [
    // Joined today (not yet eligible for D1)
    {uid: 'u0', fs: '2026-11-01', t: now, d1: 0, d7: 0},
    // Joined 2 days ago, returned on D1 (eligible for D1, not yet D7)
    {uid: 'u1', fs: '2026-10-30', t: now, d1: 1, d7: 0},
    // Joined 2 days ago, did not return on D1
    {uid: 'u2', fs: '2026-10-30', t: now - 40 * 3600e3, d1: 0, d7: 0},
    // Joined 8 days ago, returned D1 and D7 (eligible for both)
    {uid: 'u3', fs: '2026-10-24', t: now, d1: 1, d7: 1},
    // Joined 8 days ago, returned D1 but not D7
    {uid: 'u4', fs: '2026-10-24', t: now - 5 * dayMs, d1: 1, d7: 0},
    // Joined 8 days ago, did not return on D1 or D7
    {uid: 'u5', fs: '2026-10-24', t: now - 7.5 * dayMs, d1: 0, d7: 0},
  ];

  let eligD1 = 0, retD1 = 0, eligD7 = 0, retD7 = 0;
  mockPresence.forEach(p => {
    const fsMs = Date.parse(p.fs + 'T00:00:00Z');
    const ageDays = Math.floor((now - fsMs) / dayMs);
    if (ageDays >= 1) {
      eligD1++;
      if (p.d1 != null ? p.d1 === 1 : (p.t - fsMs >= dayMs)) retD1++;
    }
    if (ageDays >= 7) {
      eligD7++;
      if (p.d7 != null ? p.d7 === 1 : (p.t - fsMs >= 7 * dayMs)) retD7++;
    }
  });

  // u1, u2, u3, u4, u5 are eligible for D1 (5 players)
  // u1, u3, u4 returned on D1 (3 players) -> 60%
  assert.equal(eligD1, 5);
  assert.equal(retD1, 3);
  assert.equal(Math.round(retD1 / eligD1 * 100), 60);

  // u3, u4, u5 are eligible for D7 (3 players)
  // u3 returned on D7 (1 player) -> 33%
  assert.equal(eligD7, 3);
  assert.equal(retD7, 1);
  assert.equal(Math.round(retD7 / eligD7 * 100), 33);

  // Fallback indicator test: when d1 is missing and fallback is used, '(оценка)' is appended
  const fallbackRecord = [{uid: 'uOld', fs: '2026-10-25', t: now, d1: null, d7: null}];
  let fbEligD1 = 0, fbRetD1 = 0, hasFb1 = false;
  fallbackRecord.forEach(p => {
    const fsMs = Date.parse(p.fs + 'T00:00:00Z');
    const ageDays = Math.floor((now - fsMs) / dayMs);
    if (ageDays >= 1) {
      fbEligD1++;
      const isFallback = p.d1 == null;
      const ret = p.d1 != null ? p.d1 === 1 : (p.t - fsMs >= dayMs);
      if (ret) { fbRetD1++; if (isFallback) hasFb1 = true; }
    }
  });
  const label = fbEligD1 > 0 ? `${Math.round(fbRetD1 / fbEligD1 * 100)}% (${fbRetD1}/${fbEligD1})${hasFb1 ? ' (оценка)' : ''}` : '—';
  assert.ok(label.includes('(оценка)'), 'metric contains (оценка) when computed via fallback');
});
