// Tests for src/ui/feedback.js and src/ui/owner.js (E-1.6 decomposition)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const feedback = require('../src/ui/feedback.js');
const owner = require('../src/ui/owner.js');

test('ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics', () => {
  const payload = feedback.formatFeedbackPayload({
    cat: 'bug',
    msg: 'Game froze on tile placement',
    stars: 4,
    ver: '1.0.244',
    attachDiag: true,
    diag: {
      os: 'Android 14',
      screen: '1080x2400',
      cores: 8,
      ram: 6,
      net: '4g',
      fps: 58,
      lagsRecorded: 2
    }
  });

  assert.equal(payload.k, 'bug');
  assert.equal(payload.m, 'Game froze on tile placement');
  assert.equal(payload.stars, 4);
  assert.equal(payload.v, '1.0.244');
  assert.ok(payload.device, 'attaches device diagnostics when requested');
  assert.equal(payload.device.os, 'Android 14');
  assert.equal(payload.device.lags, 2);
});

test('ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero', () => {
  const html = feedback.renderFeedbackCardHtml({
    first: true,
    namePromo: '<div id="promo">contest</div>',
    stars: 5,
    starLabel: '5/5 — Отличная игра! 🔥',
    cat: 'idea',
    placeholder: 'Опишите идею...',
    diagSummary: 'Android · 60fps'
  });

  assert.ok(html.includes('fbcard'), 'contains card container');
  assert.ok(html.includes('🎁 +10 золота'), 'first time reward badge displayed');
  assert.ok(html.includes('promo'), 'contains name contest promo');
  assert.ok(html.includes('5/5 — Отличная игра!'), 'renders star label');
  assert.ok(html.includes('Опишите идею...'), 'renders placeholder');

  // Verify opening with 0 stars initially (not auto-selecting 5 stars)
  const zeroHtml = feedback.renderFeedbackCardHtml({
    first: false,
    stars: 0,
    starLabel: 'Нажмите на звезду, чтобы оценить',
    cat: 'idea',
    placeholder: 'Опишите идею...',
    diagSummary: ''
  });
  assert.ok(!zeroHtml.includes('fb-star active'), 'starts without active stars');
  assert.ok(zeroHtml.includes('Нажмите на звезду, чтобы оценить'), 'displays prompt to rate');
});

test('ui/owner: devGet and devSet handle native preferences bridge and storage', () => {
  const mockStorage = new Map();
  const storage = {
    getItem: k => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: k => mockStorage.delete(k)
  };

  const nativePrefs = new Map();
  const nativeApp = {
    getPref: k => nativePrefs.get(k) || '',
    setPref: (k, v) => nativePrefs.set(k, String(v))
  };

  owner.devSet('devToken', 'ghp_secret123', storage, nativeApp);
  assert.equal(storage.getItem('devToken'), 'ghp_secret123');
  assert.equal(nativePrefs.get('devToken'), 'ghp_secret123');

  const retrieved = owner.devGet('devToken', storage, nativeApp);
  assert.equal(retrieved, 'ghp_secret123');
});

test('ui/owner: formatDevStatus formats workflow run status and dates', () => {
  assert.equal(owner.formatDevStatus(null), 'Ещё ничего не отправляли');

  const runSuccess = {
    created_at: '2026-11-01T04:30:00Z',
    status: 'completed',
    conclusion: 'success'
  };
  const statusStr = owner.formatDevStatus(runSuccess);
  assert.ok(statusStr.includes('доставлена в Firebase'), 'successful run formatted correctly');

  const runProgress = {
    created_at: '2026-11-01T04:30:00Z',
    status: 'in_progress'
  };
  assert.ok(owner.formatDevStatus(runProgress).includes('отправляется'), 'in progress run formatted correctly');

  // Stats calculation and grid markup
  const now = Date.parse('2026-11-01T12:00:00Z');
  const pres = {
    u1: {n: 'Игрок1', s: 'online', t: now - 10000, r: 1, p: 'play', fs: '2026-10-31', d1: 1},
    u2: {n: 'Игрок2', s: 'menu', t: now - 3600000, r: 0, p: 'web'}
  };
  const stats = owner.computePresenceStats({pres, rels: [{id: 1}], now});
  assert.equal(stats.totalPlayers, 2);
  assert.equal(stats.registered, 1);
  assert.equal(stats.onlineNow, 1);
  assert.equal(stats.playingNow, 1);
  assert.equal(stats.withApp, 1);
  assert.equal(stats.releasesCount, 1);
  assert.equal(stats.d1Str, '100%');

  const gridHtml = owner.renderStatsGridHtml(stats);
  assert.ok(gridHtml.includes('stgrid'));
  assert.ok(gridHtml.includes('игроков заходили'));
  assert.ok(gridHtml.includes('удержание D1'));
});
