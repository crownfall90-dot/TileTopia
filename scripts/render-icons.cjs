'use strict';

// Install Playwright and its Chromium to regenerate the launcher, PWA and Google Play icons.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'store/src');
const web = path.join(root, 'web/icons');
const resources = path.join(root, 'app/src/main/res');
const fonts = path.join(root, 'app/src/main/assets/fonts');
const sizes = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function artwork(name) {
  const svg = fs.readFileSync(path.join(source, name), 'utf8');
  return svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>')).trim();
}

function font(name, weight) {
  const file = fs.readFileSync(path.join(fonts, name));
  return `@font-face{font-family:${name.split('-')[0]};font-weight:${weight};src:url(data:font/woff2;base64,${file.toString('base64')}) format('woff2')}`;
}

const type = [
  font('unbounded-800-latin.woff2', 900),
  font('onest-700-latin.woff2', 700),
].join('\n');
const background = artwork('icon-background.svg');
const tile = artwork('icon-foreground.svg');
const place = scale => `<g transform="translate(54 54) scale(${scale}) translate(-54 -55.5)">${tile}</g>`;
const framed = `<rect x="1" y="1" width="106" height="106" rx="22" fill="none" stroke="#bbcdfa" stroke-opacity=".15" stroke-width="1"/>`;
const standard = background + framed + place(1.22);

function svg(content, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">${content}</svg>`;
}

async function render() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    async function save(content, size, file, radius = '') {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<!doctype html><style>${type} body{margin:0} svg{display:block;border-radius:${radius || '0'}}</style>${svg(content, size)}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: file, omitBackground: true });
    }

    for (const [density, scale] of Object.entries(sizes)) {
      const folder = path.join(resources, `mipmap-${density}`);
      await save(standard, 48 * scale, path.join(folder, 'ic_launcher.png'), '22%');
      await save(background + place(1.15), 48 * scale, path.join(folder, 'ic_launcher_round.png'), '50%');
      await save(background, 108 * scale, path.join(folder, 'ic_launcher_background.png'));
      await save(place(.77), 108 * scale, path.join(folder, 'ic_launcher_foreground.png'));
    }

    await save(background + place(1.22), 512, path.join(root, 'store/icon-512.png'));
    await save(background + place(1.02), 512, path.join(web, 'maskable-512.png'));
    await save(background + place(1.22), 180, path.join(web, 'apple-touch-icon.png'));
    for (const [name, size] of [['favicon-32.png', 32], ['icon-192.png', 192], ['icon-512.png', 512]]) {
      await save(standard, size, path.join(web, name), '22%');
    }
    const fullSource = `\n<style>\n${type}\n</style>\n${background}\n${framed}\n${place(1.22)}\n`;
    fs.writeFileSync(path.join(source, 'icon.svg'), svg(fullSource, 512) + '\n');
  } finally {
    await browser.close();
  }
}

render().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
