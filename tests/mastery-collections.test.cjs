// Tests for R-9 Collections and R-11 Mastery stats
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');
const pw = loadPlaywright();

test('catalog: COLLECTIONS structure and collectionProgress logic (R-9)', async () => {
  const C = await import('../src/state/catalog.js');
  assert.ok(Array.isArray(C.COLLECTIONS), 'COLLECTIONS is an array');
  assert.equal(C.COLLECTIONS.length, 3, '3 collections defined');

  for (const col of C.COLLECTIONS) {
    assert.ok(col.id, 'has id');
    assert.ok(col.name, 'has name');
    assert.ok(col.reward > 0, 'has reward');
    assert.ok(Array.isArray(col.figs), 'has figs');
    assert.ok(Array.isArray(col.frames), 'has frames');
  }

  // Check progress with empty wallet
  const emptyWallet = {owned: ['classic'], frames: []};
  const courtProg = C.collectionProgress(C.COLLECTIONS[0], emptyWallet);
  assert.equal(courtProg.isComplete, false);
  assert.equal(courtProg.isClaimed, false);
  assert.equal(courtProg.done, 0);

  // Check progress with complete wallet
  const fullCourtWallet = {
    owned: ['classic', 'knight', 'king', 'queen'],
    frames: ['royal'],
    colClaimed: []
  };
  const completeProg = C.collectionProgress(C.COLLECTIONS[0], fullCourtWallet);
  assert.equal(completeProg.isComplete, true);
  assert.equal(completeProg.done, completeProg.total);
  assert.equal(completeProg.isClaimed, false);

  // After claim
  fullCourtWallet.colClaimed.push('court');
  const claimedProg = C.collectionProgress(C.COLLECTIONS[0], fullCourtWallet);
  assert.equal(claimedProg.isComplete, true);
  assert.equal(claimedProg.isClaimed, true);
});

test('collections: repeated claim attempt is refused and does not duplicate gold (R-9)', async () => {
  const C = await import('../src/state/catalog.js');
  const col = C.COLLECTIONS[0];
  const wallet = {
    gold: 50,
    owned: ['classic', 'knight', 'king', 'queen'],
    frames: ['royal'],
    colClaimed: []
  };

  function claim(w, targetCol) {
    const p = C.collectionProgress(targetCol, w);
    if (!p.isComplete || p.isClaimed) return false;
    w.gold += targetCol.reward;
    w.colClaimed = [...(w.colClaimed || []), targetCol.id];
    return true;
  }

  // First claim succeeds
  assert.equal(claim(wallet, col), true);
  assert.equal(wallet.gold, 50 + col.reward);
  assert.ok(wallet.colClaimed.includes(col.id));

  // Second claim attempt must be refused
  const goldBeforeSecond = wallet.gold;
  assert.equal(claim(wallet, col), false);
  assert.equal(wallet.gold, goldBeforeSecond, 'gold did not change on repeated claim');
  assert.equal(wallet.colClaimed.filter(id => id === col.id).length, 1, 'id not duplicated in colClaimed');
});

test('behavioral: progress UI renders collections and mastery with proper DOM elements (R-9, R-11)', async () => {
  const {renderCollectionCard, renderMasteryGrid} = await import('../src/ui/progress.js');
  const {COLLECTIONS, collectionProgress} = await import('../src/state/catalog.js');
  
  const wallet = {
    gold: 100,
    owned: ['classic'],
    frames: [],
    colClaimed: []
  };
  const col = COLLECTIONS[0];
  const prog = collectionProgress(col, wallet);
  const html = renderCollectionCard(col, prog, {}, {}, wallet, () => '', 'P');
  assert.ok(html.includes('col-card'));
  assert.ok(html.includes(col.name));
  assert.ok(html.includes('В процессе'));

  const masteryHtml = renderMasteryGrid({
    bots: {games: 10, wins: 8, best: 70}
  });
  assert.ok(masteryHtml.includes('mgrid'));
  assert.ok(masteryHtml.includes('Боты'));
  assert.ok(masteryHtml.includes('80% (8/10) · рек. 70'));
  assert.ok(!masteryHtml.includes('Дуэль'), 'no duel tile');
});

test('progress: normalizeStats and recordGameMode (R-11)', async () => {
  const P = await import('../src/state/progress.js');
  
  // Normalizing empty / legacy stats
  const norm = P.normalizeStats({games: 5, wins: 3, best: 42});
  assert.equal(norm.games, 5);
  assert.equal(norm.wins, 3);
  assert.equal(norm.best, 42);
  assert.equal(norm.maxCity, 0);
  assert.ok(norm.byMode.bots);
  assert.ok(norm.byMode.friends);
  assert.ok(norm.byMode.online);

  // Record games by mode
  P.recordGameMode(norm, 'bots', true, 50);
  assert.equal(norm.byMode.bots.games, 1);
  assert.equal(norm.byMode.bots.wins, 1);
  assert.equal(norm.byMode.bots.best, 50);

  P.recordGameMode(norm, 'bots', false, 30);
  assert.equal(norm.byMode.bots.games, 2);
  assert.equal(norm.byMode.bots.wins, 1);
  assert.equal(norm.byMode.bots.best, 50);

  P.recordGameMode(norm, 'online', true, 65);
  assert.equal(norm.byMode.online.games, 1);
  assert.equal(norm.byMode.online.wins, 1);
  assert.equal(norm.byMode.online.best, 65);

  P.recordGameMode(norm, 'friends', true, 48);
  assert.equal(norm.byMode.friends.games, 1);
  assert.equal(norm.byMode.friends.wins, 1);
  assert.equal(norm.byMode.friends.best, 48);
});

test('collections & mastery DOM: collections tab renders cards, claiming complete collection awards gold once', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 120000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    const res = await page.evaluate(() => {
      const P = window.__pg;
      const w = P.wallet();
      w.gold = 100;
      // Complete 'court' collection: classic, knight, king, queen figs + royal frame
      w.owned = ['classic', 'knight', 'king', 'queen'];
      w.frames = ['royal'];
      w.colClaimed = [];

      P.show('progress');
      const colBox = document.createElement('div'); document.body.append(colBox);
      P.renderCollections(colBox); colBox.addEventListener('click', P.onProgressClick);
      const cardCount = document.querySelectorAll('.col-card').length;
      const claimBtn = document.querySelector('[data-claimcol="court"]');
      const canClaimBefore = !!claimBtn;
      if (claimBtn) claimBtn.click();
      const goldAfterFirstClaim = w.gold;
      const claimedAfter = (w.colClaimed || []).includes('court');

      // Attempt second claim
      const secondBtn = document.querySelector('[data-claimcol="court"]');
      if (secondBtn) secondBtn.click();
      const goldAfterSecondClaim = w.gold;

      return {cardCount, canClaimBefore, goldAfterFirstClaim, claimedAfter, goldAfterSecondClaim};
    });
    assert.ok(res.cardCount >= 3, 'renders the collection cards');
    assert.equal(res.canClaimBefore, true, 'claim button is present when complete');
    assert.equal(res.goldAfterFirstClaim, 400, 'awards the court reward (100 + 300)');
    assert.equal(res.claimedAfter, true, 'court marked as claimed');
    assert.equal(res.goldAfterSecondClaim, 400, 'gold does not increase on second claim');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
