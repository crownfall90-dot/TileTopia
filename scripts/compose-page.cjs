'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const include = /^ *<!-- include: ((?:web\/views|src\/app\/runtime)\/[a-z0-9-]+\.(?:html|js)) -->\n/gm;
const stylesheet = /^@import "(styles\/[a-z0-9-]+\.css)";\n/gm;
const styleSlot = /^<!-- styles: src\/ui\/styles\.css.*-->$/m;

function gameSource() {
  return read('web/game.html').replace(include, (_, file) => read(file));
}

function stylesSource() {
  return read('src/ui/styles.css').replace(stylesheet, (_, file) => read('src/ui/' + file));
}

function gameMarkup() {
  return gameSource().replace(styleSlot, () => '<style>\n' + stylesSource() + '</style>');
}

module.exports = { gameSource, stylesSource, gameMarkup };

if (require.main === module) {
  process.stdout.write(gameMarkup().split('\n').filter(line => !/fonts\.(?:googleapis|gstatic)\.com/.test(line)).join('\n'));
}
