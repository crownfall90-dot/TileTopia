const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

test('best move names the biggest single score and its object', async () => {
  const {renderBestMoveHtml} = await import(path.join(__dirname, '..', 'src/ui/results.js'));
  const html = renderBestMoveHtml([
    {name: 'Аня', col: '#f00', best: {pts: 9, kind: 'r', n: 9}},
    {name: 'Боря', col: '#0f0', best: {pts: 14, kind: 'c', n: 7}},
    {name: 'Вика', col: '#00f'},
  ]);
  assert.match(html, /Боря<\/b> — город из 7 карт, \+14/);
  assert.match(renderBestMoveHtml([{name: 'Г', col: '#000', best: {pts: 9, kind: 'f', n: 9}}]), /монастырь, \+9/);
  assert.match(renderBestMoveHtml([{name: 'Д', col: '#000', best: {pts: 4, kind: 'r', n: 21}}]), /дорога из 21 карты/);
});

test('no best move line when nobody scored an object', async () => {
  const {renderBestMoveHtml} = await import(path.join(__dirname, '..', 'src/ui/results.js'));
  assert.strictEqual(renderBestMoveHtml([{name: 'А', col: '#000'}, {name: 'Б', col: '#111', best: {pts: 0, kind: 'c', n: 2}}]), '');
});
