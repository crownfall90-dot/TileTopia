// tests/telegram-webapp.test.cjs
// Tests for Telegram Mini App helpers, lifecycle, haptics, and bot setup script.

const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');

test('telegram: isTelegramWebApp detects Telegram environment', async () => {
  const {isTelegramWebApp} = await import('../src/app/telegram.js');

  assert.equal(isTelegramWebApp(null), false);
  assert.equal(isTelegramWebApp({}), false);
  assert.equal(isTelegramWebApp({Telegram: {}}), false);

  const fakeWin = {
    Telegram: {
      WebApp: {
        initData: 'query_id=AAHd&user=%7B%22id%22%3A123%7D'
      }
    }
  };
  assert.equal(isTelegramWebApp(fakeWin), true);
});

test('telegram: initTelegramWebApp expands and configures theme colors', async () => {
  const {initTelegramWebApp} = await import('../src/app/telegram.js');

  const calls = [];
  const fakeWin = {
    Telegram: {
      WebApp: {
        ready: () => calls.push('ready'),
        expand: () => calls.push('expand'),
        enableClosingConfirmation: () => calls.push('closingConf'),
        setHeaderColor: (c) => calls.push('header:' + c),
        setBackgroundColor: (c) => calls.push('bg:' + c)
      }
    }
  };

  const tg = initTelegramWebApp(fakeWin, {themeColor: '#0d142a'});
  assert.ok(tg);
  assert.deepEqual(calls, [
    'ready',
    'expand',
    'closingConf',
    'header:#0d142a',
    'bg:#0d142a'
  ]);
});

test('telegram: getTelegramUser extracts user profile and start param', async () => {
  const {getTelegramUser, getTelegramStartParam} = await import('../src/app/telegram.js');

  const fakeWin = {
    Telegram: {
      WebApp: {
        initDataUnsafe: {
          user: {
            id: 987654321,
            first_name: 'Александр',
            username: 'crownfall',
            language_code: 'ru'
          },
          start_param: 'k9w2x'
        }
      }
    }
  };

  const user = getTelegramUser(fakeWin);
  assert.equal(user.id, 987654321);
  assert.equal(user.firstName, 'Александр');
  assert.equal(user.username, 'crownfall');

  const room = getTelegramStartParam(fakeWin);
  assert.equal(room, 'K9W2X');
});

test('telegram: telegramHaptic triggers impact and notification feedback', async () => {
  const {telegramHaptic} = await import('../src/app/telegram.js');

  const haptics = [];
  const fakeWin = {
    Telegram: {
      WebApp: {
        HapticFeedback: {
          impactOccurred: (style) => haptics.push('impact:' + style),
          notificationOccurred: (type) => haptics.push('notify:' + type)
        }
      }
    }
  };

  assert.equal(telegramHaptic('light', fakeWin), true);
  assert.equal(telegramHaptic('medium', fakeWin), true);
  assert.equal(telegramHaptic('success', fakeWin), true);
  assert.equal(telegramHaptic('error', fakeWin), true);

  assert.deepEqual(haptics, [
    'impact:light',
    'impact:medium',
    'notify:success',
    'notify:error'
  ]);
});

test('telegram: shareRoomToTelegram builds share URL with room code', async () => {
  const {shareRoomToTelegram} = await import('../src/app/telegram.js');

  const shareUrl = shareRoomToTelegram('M4P7X', 'Сыграем в Tiletopia!');
  assert.ok(shareUrl.startsWith('https://t.me/share/url?'));
  assert.ok(shareUrl.includes('M4P7X'));
  assert.ok(shareUrl.includes('crownfall90-dot.github.io%2Fplay'));
});

test('telegram: openTelegramChannel and claimTelegramReward granting 500 gold', async () => {
  const {openTelegramChannel, claimTelegramReward, TELEGRAM_CHANNEL_URL, TELEGRAM_SUBSCRIPTION_REWARD} = await import('../src/app/telegram.js');

  assert.equal(TELEGRAM_CHANNEL_URL, 'https://t.me/diarydevelopment');
  assert.equal(TELEGRAM_SUBSCRIPTION_REWARD, 500);

  // Opening in browser window
  let openedUrl = null;
  const fakeWin = {
    open: (url) => { openedUrl = url; }
  };
  assert.equal(openTelegramChannel(fakeWin), true);
  assert.equal(openedUrl, 'https://t.me/diarydevelopment');

  // Opening in Telegram WebApp
  let tgLink = null;
  const fakeTgWin = {
    Telegram: {
      WebApp: {
        openTelegramLink: (url) => { tgLink = url; }
      }
    }
  };
  assert.equal(openTelegramChannel(fakeTgWin), true);
  assert.equal(tgLink, 'https://t.me/diarydevelopment');

  // First claim grants 500 gold
  const wallet = {gold: 150};
  const res1 = claimTelegramReward(wallet);
  assert.equal(res1.ok, true);
  assert.equal(res1.alreadyClaimed, false);
  assert.equal(res1.goldAwarded, 500);
  assert.equal(wallet.gold, 650);
  assert.equal(wallet.tgSubClaimed, true);

  // Second claim rejected
  const res2 = claimTelegramReward(wallet);
  assert.equal(res2.ok, false);
  assert.equal(res2.alreadyClaimed, true);
  assert.equal(res2.goldAwarded, 0);
  assert.equal(wallet.gold, 650);
});

test('telegram: telegram-setup-bot.py handles missing token gracefully', () => {
  const pyBin = process.platform === 'win32' ? 'python' : 'python3';
  const r = spawnSync(pyBin, ['scripts/telegram-setup-bot.py'], {
    cwd: __dirname + '/..',
    env: {PATH: process.env.PATH, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1'},
    encoding: 'utf8'
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /skipping/i);
});
