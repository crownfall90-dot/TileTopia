// Renders the launcher icon (store/src/*.svg) into Android mipmaps and the 512px Play Store icon.
// Usage: node scripts/render-icons.cjs
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const res = path.join(root, 'app/src/main/res');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const svg = f => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'store/src', f)).toString('base64');
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  console.log('Rendering launcher icons...');
  const b = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const shot = async (file, size, out, css = '') => {
    const p = await b.newPage();
    await p.setViewport({ width: Math.round(size), height: Math.round(size) });
    await p.setContent(`<body style="margin:0;background:transparent;overflow:hidden"><img src="${svg(file)}" style="width:${size}px;height:${size}px;display:block;${css}"></body>`);
    await new Promise(r => setTimeout(r, 60));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await p.screenshot({ path: out, omitBackground: true });
    await p.close();
  };

  for (const [d, k] of Object.entries(DENS)) {
    const dir = path.join(res, 'mipmap-' + d);
    await shot('icon-foreground.svg', 108 * k, path.join(dir, 'ic_launcher_foreground.png'));
    await shot('icon-background.svg', 108 * k, path.join(dir, 'ic_launcher_background.png'));
    // Icons for Android 7.x
    await shot('icon.svg', 48 * k, path.join(dir, 'ic_launcher.png'), 'border-radius:18%');
    await shot('icon.svg', 48 * k, path.join(dir, 'ic_launcher_round.png'), 'border-radius:50%');
  }

  // 512px Play Store icon
  await shot('icon.svg', 512, path.join(root, 'store/icon-512.png'));

  // Web / PWA icons
  const W = path.join(root, 'web/icons');
  await shot('icon.svg', 192, path.join(W, 'icon-192.png'), 'border-radius:18%');
  await shot('icon.svg', 512, path.join(W, 'icon-512.png'), 'border-radius:18%');
  await shot('icon.svg', 512, path.join(W, 'maskable-512.png'));
  await shot('icon.svg', 180, path.join(W, 'apple-touch-icon.png'));
  await shot('icon.svg', 32, path.join(W, 'favicon-32.png'), 'border-radius:18%');

  await b.close();
  console.log('✓ All launcher and PWA icons rendered successfully!');
})();
