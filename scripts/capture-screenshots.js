import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, {recursive: true});
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('.chrome-ss-profile');
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, {recursive: true});

const port = 9225;
const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--allow-file-access-from-files',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
]);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Could not connect to Chrome debugging port');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id && this.callbacks.has(data.id)) {
        this.callbacks.get(data.id)(data);
        this.callbacks.delete(data.id);
      }
    };
  }

  ready() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, res => {
        if (res.error) reject(res.error);
        else resolve(res.result);
      });
      this.ws.send(JSON.stringify({id, method, params}));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  try {
    const wsUrl = await getWsUrl();
    const cdp = new CDPClient(wsUrl);
    await cdp.ready();

    // Create a new target/page
    const target = await cdp.send('Target.createTarget', {url: 'about:blank'});
    const pageTargetUrl = `http://127.0.0.1:${port}/json/list`;
    const listRes = await fetch(pageTargetUrl);
    const pages = await listRes.json();
    const pageWs = pages.find(p => p.id === target.targetId)?.webSocketDebuggerUrl;

    const pageCdp = new CDPClient(pageWs);
    await pageCdp.ready();

    await pageCdp.send('Page.enable');
    await pageCdp.send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.5,
      mobile: true
    });

    const screens = [
      {id: '01-main-menu', name: 'menu', title: 'Главное меню (Рейтинг 🏆, Золото 🪙, Квесты)'},
      {id: '02-friends', name: 'friends', title: 'Раздел «Друзья» (Статусы онлайна и время активности)'},
      {id: '03-profile', name: 'progress', title: 'Профиль игрока (Кубки, награды, предметы, статистика)'},
      {id: '04-shop', name: 'shop', title: 'Магазин (Статусы, рамки, фигурки, локации)'},
      {id: '05-settings', name: 'settings', title: 'Настройки (Звуки, Telegram-канал +500 золота, удаление аккаунта)'},
      {id: '06-history', name: 'history', title: 'История партий (Прошлые игры и результаты)'},
      {id: '07-lobby-room', name: 'lobby', title: 'Комната / Лобби (Код комнаты и быстрый инвайт друзей)'},
      {id: '08-rules', name: 'rules', title: 'Правила игры и обучение'},
      {id: '09-match-search', name: 'match', title: 'Поиск онлайн-соперников'}
    ];

    const harnessPath = path.resolve('tools/screenshot-harness.html').replace(/\\/g, '/');

    // First load to ensure cache and iframe ready
    await pageCdp.send('Page.navigate', {url: `file:///${harnessPath}?screen=menu`});
    await sleep(2500);

    for (const scr of screens) {
      console.log(`Capturing ${scr.id} (${scr.title})...`);
      const url = `file:///${harnessPath}?screen=${scr.name}`;
      await pageCdp.send('Page.navigate', {url});
      await sleep(1800);

      const shot = await pageCdp.send('Page.captureScreenshot', {format: 'png'});
      const outPath = path.join(outDir, `${scr.id}.png`);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved ${outPath}`);
    }

    pageCdp.close();
    cdp.close();
    console.log('All screenshots captured successfully!');
  } finally {
    chromeProc.kill();
    try { fs.rmSync(userDataDir, {recursive: true, force: true}); } catch (_) {}
  }
}

main().catch(err => {
  console.error(err);
  chromeProc.kill();
  process.exit(1);
});
