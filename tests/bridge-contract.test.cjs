// The Android bridge both ways. Java calls window.onX(...) in the page; the page calls AndroidApp.x() in Java.
// A handler renamed or lost while code moves out of game.html would fail silently on the phone (Java checks
// `window.onX && ...`), so the two sides are checked against each other here.
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = gameSource();
const javaFiles = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.java')) javaFiles.push(p); } })('app/src');
const java = javaFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

test('every window.onX the Android app calls is defined by the game', () => {
  const called = [...new Set([...java.matchAll(/window\.(on[A-Za-z]+)/g)].map(m => m[1]))];
  assert.ok(called.length >= 8, 'bridge callbacks found in Java');
  for (const name of called) assert.match(html, new RegExp(`window\\.${name} = `), `game.html must define window.${name}`);
});

test('every AndroidApp.x() the game calls exists in the Java bridge', () => {
  const main = fs.readFileSync('app/src/main/java/com/crownfall/mosaic/MainActivity.java', 'utf8');
  const exposed = new Set([...main.matchAll(/@JavascriptInterface\s+public\s+[\w<>]+\s+(\w+)\(/g)].map(m => m[1]));
  const used = [...new Set([...html.matchAll(/AndroidApp\.([a-zA-Z]+)\(/g)].map(m => m[1]))];
  for (const name of used) assert.ok(exposed.has(name), `MainActivity must expose @JavascriptInterface ${name}()`);
});
