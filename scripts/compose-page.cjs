'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const include = /^ *<!-- include: ((?:web\/views|src\/app\/runtime)\/[a-z0-9-]+\.(?:html|js)) -->\n/gm;
const stylesheet = /^@import "(styles\/[a-z0-9-]+\.css)";\n/gm;
const styleSlot = /^<!-- styles: src\/ui\/styles\.css.*-->$/m;
const splashFile = 'web/views/boot.html';

function splashMarkup() {
  const image = file => `data:image/webp;base64,${readFileSync(path.join(root, 'web', file)).toString('base64')}`;
  const {size: [width, height], atlas: [atlasWidth, atlasHeight], duration, tiles} = JSON.parse(read('web/splash-tiles.json'));
  const pct = (a, b) => `${(100 * a / b).toFixed(4)}%`;
  const pieces = tiles.map(({frame: [sx, sy, w, h], anchor: [x, y], travel: [dx, dy], delay}) => {
    const layout = `left:${pct(x, width)};top:${pct(y, height)};width:${pct(w, width)};height:${pct(h, height)}`;
    const atlas = `background-size:${pct(atlasWidth, w)} ${pct(atlasHeight, h)};background-position:${pct(sx, atlasWidth - w)} ${pct(sy, atlasHeight - h)}`;
    const motion = `--dx:${pct(dx, w)};--dy:${pct(dy, h)};--tile-delay:${delay}ms`;
    return `<i class="boot-tile" style="${layout};${atlas};${motion}"></i>`;
  });
  const end = duration + Math.max(...tiles.map(tile => tile.delay));
  return read(splashFile).replace('__SPLASH_ART__', image('splash-landscape.webp'))
    .replace('__SPLASH_ATLAS__', image('splash-tiles.webp')).replace('__SPLASH_DURATION__', duration)
    .replaceAll('__SPLASH_END__', end).replace('__SPLASH_TILES__', pieces.join('\n    '));
}

function gameSource() {
  return read('web/game.html').replace(include, (_, file) => file === splashFile ? splashMarkup() : read(file));
}

function stylesSource() {
  return read('src/ui/styles.css').replace(stylesheet, (_, file) => read('src/ui/' + file));
}

function gameMarkup() {
  return addStyles(gameSource(), stylesSource());
}

const addStyles = (html, css) => html.replace(styleSlot, () => `<style>\n${css}</style>`);

function packagedMarkup() {
  const splash = splashMarkup();
  const splashCss = read('src/ui/styles/splash.css');
  const bundle = read('build/bundle/pg.js');
  const game = addStyles(gameSource().replace(splash, ''), stylesSource().replace(splashCss, ''))
    .split('\n').filter(line => !/fonts\.(?:googleapis|gstatic)\.com/.test(line)).join('\n');
  const start = '<script>\n(() => {\n';
  const end = '\n})();\n\n</script>';
  if (!game.includes(start) || !game.includes(end)) throw new Error('Missing game script boundaries');
  const runtime = game.replace(start, () => `<script>\nwindow.__afterSplash(() => {\n${bundle}\nwindow.PG = PG;\n(() => {\n`)
    .replace(end, () => '\n})();\n});\n</script>');
  return `<style>\n${splashCss}</style>\n${splash}\n<script>window.__showWebLaunch();</script>\n${runtime}`;
}

module.exports = { gameSource, stylesSource, gameMarkup, packagedMarkup };

if (require.main === module) {
  process.stdout.write(packagedMarkup());
}
