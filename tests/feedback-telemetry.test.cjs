// Tests for feedback modernization, device diagnostics & lag telemetry, and game name proposal contest.
'use strict';
const { gameSource, stylesSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADMIN_PATH = path.join(__dirname, '..', 'tools', 'founder-admin.html');
const RULES_PATH = path.join(__dirname, '..', 'docs', 'firebase-rules.json');

test('firebase rules: suggestions/names, extended feedback and error telemetry', () => {
  const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

  // Verify suggestions/names rule
  assert.ok(rules.rules.suggestions, 'suggestions rule branch exists');
  assert.ok(rules.rules.suggestions.names, 'suggestions/names branch exists');
  assert.ok(rules.rules.suggestions.names.$uid, 'suggestions/names/$uid exists');
  const suggValidate = rules.rules.suggestions.names.$uid['.validate'];
  assert.ok(suggValidate.includes("newData.hasChildren(['name', 't'])"), 'validates name and timestamp');
  assert.ok(suggValidate.includes("newData.child('name').val().length <= 100"), 'limits name length');

  // Verify feedback length
  const fbValidate = rules.rules.feedback.$uid.$key['.validate'];
  assert.ok(fbValidate.includes('1500'), 'feedback allows messages up to 1500 chars');

  // Verify errors allows dev and trail
  const errValidate = rules.rules.errors.$id['.validate'];
  assert.ok(errValidate.includes('dev'), 'errors rule permits dev diagnostics info');
  assert.ok(errValidate.includes('trail'), 'errors rule permits trail action info');
});

test('game.html: device diagnostics & lag telemetry', () => {
  const code = gameSource();

  assert.ok(code.includes('function getDeviceDiagnostics()'), 'getDeviceDiagnostics function exists');
  assert.ok(code.includes('platform'), 'diagnostics captures platform');
  assert.ok(code.includes('screenStr'), 'diagnostics captures screen metrics');
  assert.ok(code.includes('hardwareConcurrency'), 'diagnostics captures CPU cores');
  assert.ok(code.includes('perfTick'), 'performance lag tick loop exists');
  assert.ok(code.includes('_recentLags'), 'tracks recent lag events');
  assert.ok(code.includes('_actionTrail'), 'tracks recent user actions');
  assert.ok(code.includes("plog('perf_lag'"), 'logs severe frame drops');

  // Verify reportError attaches diagnostics
  assert.ok(code.includes('dev: devStr'), 'reportError attaches dev string');
  assert.ok(code.includes('trail: trailStr'), 'reportError attaches action trail');
});

test('game.html: upgraded feedback UI with 5-star rating & device diagnostics', () => {
  const code = gameSource();

  assert.ok(code.includes('fb-stars'), 'feedback includes star rating element');
  assert.ok(code.includes('data-val="5"'), 'feedback includes 5 star options');
  assert.ok(code.includes('fb-diag'), 'feedback includes diagnostics block');
  assert.ok(code.includes('fbAttachDiag'), 'feedback includes attach diagnostics checkbox');
  assert.ok(code.includes("k: 'lag'"), 'feedback includes lag category');
  assert.ok(code.includes('body.device ='), 'feedback attaches device payload when checked');
  assert.ok(code.includes('fbNamePromo'), 'feedback links to name proposal contest');
});

test('game.html: new game name proposal contest (+100 gold)', () => {
  const code = gameSource();

  assert.ok(code.includes('function showNameProposalDialog('), 'showNameProposalDialog exists');
  assert.ok(code.includes('function checkNameProposal('), 'checkNameProposal exists');
  assert.ok(code.includes('nameIdeaInput'), 'has input for proposed game name');
  assert.ok(code.includes('nameIdeaWhy'), 'has optional input for rationale');
  assert.ok(code.includes('wallet.gold = (wallet.gold || 0) + 100'), 'rewards 100 gold for proposal');
  assert.ok(code.includes('wallet.nameSuggested = true'), 'marks proposal completed to not nag repeatedly');
  assert.ok(code.includes('wallet.suggestedGameName ='), 'stores proposed game name locally');
  assert.ok(code.includes('suggestions/names/'), 'writes proposal to suggestions/names in firebase');
  assert.ok(code.includes('id="nameProposalBtn"'), 'settings screen has name proposal button');
  assert.ok(code.includes('updateNameProposalBtnLabel'), 'updates button label with proposed name');
});

test('founder-admin.html: displays name proposals, stars, and device diagnostics', () => {
  const admin = fs.readFileSync(ADMIN_PATH, 'utf8');

  assert.ok(admin.includes('id="nameSuggestionsCard"'), 'nameSuggestionsCard element exists');
  assert.ok(admin.includes('function loadNameSuggestions()'), 'loadNameSuggestions function exists');
  assert.ok(admin.includes('function renderNameSuggestions()'), 'renderNameSuggestions function exists');
  assert.ok(admin.includes("db('suggestions/names')"), 'fetches suggestions/names from database');
  assert.ok(admin.includes('f.stars'), 'renderFeedback displays stars');
  assert.ok(admin.includes('f.device'), 'renderFeedback displays device diagnostics');
  assert.ok(admin.includes('r.dev'), 'loadErrors displays device diagnostics');
  assert.ok(admin.includes('r.trail'), 'loadErrors displays action trail');
});

test('styles.css: contains styles for star ratings, diagnostics & name card', () => {
  const css = stylesSource();

  assert.ok(css.includes('.fb-stars'), 'contains .fb-stars style');
  assert.ok(css.includes('.fb-star'), 'contains .fb-star style');
  assert.ok(css.includes('.fb-diag'), 'contains .fb-diag style');
  assert.ok(css.includes('.ocard.namecard'), 'contains .ocard.namecard style');
  assert.ok(css.includes('.nprize'), 'contains .nprize style');
});
