import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('assets/tiles');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, {recursive: true});
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('tools/export-tiles.html').replace(/\\/g, '/');

console.log('Rendering 512x512 tiles with Chrome headless...');
const cmd = `"${chromePath}" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=5000 --dump-dom "file:///${htmlPath}"`;

const html = execSync(cmd, {maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8'});

const cards = html.split('class="tile-card"').slice(1);
let count = 0;
const list = [];

for (const card of cards) {
  const imgMatch = card.match(/src="data:image\/(?:jpeg|png);base64,([^"]+)"/);
  const idMatch = card.match(/class="tile-id">([^<]+)<\/span>/);
  const nameMatch = card.match(/class="tile-name">([^<]*)<\/span>/);
  const edgesMatch = card.match(/class="tile-edges">([^<]*)<\/span>/);
  if (!imgMatch || !idMatch) continue;

  const base64 = imgMatch[1];
  const id = idMatch[1].trim();
  const name = nameMatch ? nameMatch[1].trim() : '';
  const edges = edgesMatch ? edgesMatch[1].trim() : '';

  const fileName = `tile_${id}.png`;
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  list.push({id, name, edges, fileName});
  count++;
}

console.log(`Saved ${count} tiles to ${outDir}`);

// Generate README.md in assets/tiles
let readme = `# 🧩 Спрайты плиток Tiletopia (512×512)

Все плитки игры, экспортированные в высоком разрешении 512×512 px.
Вы можете открывать и дорабатывать каждую плитку в Photoshop, Figma, Aseprite или любом другом графическом редакторе.

Также для интерактивного просмотра и выгрузки ZIP доступен инструмент: \`tools/export-tiles.html\`.

## Список плиток (${list.length} шт):

| Превью | Файл | Название | Стороны (N E S W) |
|---|---|---|---|
`;

for (const t of list) {
  readme += `| <img src="./${t.fileName}" width="64" height="64"> | \`${t.fileName}\` | **${t.name || '—'}** | \`${t.edges}\` |\n`;
}

fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf-8');
console.log('Wrote assets/tiles/README.md');
