const test = require('node:test'), assert = require('node:assert'), {execFileSync, spawnSync} = require('node:child_process');
const pyBin = process.platform === 'win32' ? 'python' : 'python3';
const py = (code, env = {}) => spawnSync(pyBin, ['-c', code], {cwd: __dirname + '/..', env: {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ...env}, encoding: 'utf8'});

test('telegram: message lists changes, escapes HTML, links and platforms', () => {
  const r = py("import importlib.util as u;s=u.spec_from_file_location('t','scripts/telegram-notify.py');m=u.module_from_spec(s);s.loader.exec_module(m);print(m.build('1.0.9','- Новое <b>окно</b>\\n- Ещё','https://x/y/','https://x/a.apk','https://t.me/mybot'))");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Tiletopia 1\.0\.9/);
  assert.match(r.stdout, /• Новое &lt;b&gt;окно&lt;\/b&gt;/);
  assert.match(r.stdout, /Android:.*APK-приложение/);
  assert.match(r.stdout, /Все устройства.*сайт в браузере/);
  assert.match(r.stdout, /Telegram:.*мини-приложение/);
  assert.match(r.stdout, /Играть в Telegram/);
  assert.match(r.stdout, /Играть в браузере/);
  assert.match(r.stdout, /Скачать APK/);
});

test('telegram: without secrets it skips quietly and never leaks', () => {
  const r = spawnSync(pyBin, ['scripts/telegram-notify.py', '1.0.9', 'release-notes.md'], {cwd: __dirname + '/..', env: {PATH: process.env.PATH, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1'}, encoding: 'utf8'});
  assert.equal(r.status, 0);
  assert.match(r.stdout, /skipping/);
});

test('telegram: formats new items with quotes, separates changes and removals, filters internal dev tools and includes poll', () => {
  const notes = [
    '### ✨ Что нового',
    '- Кубки рейтинга на главной в плашке профиля',
    '- Зеленый кружок онлайна в разделе Друзья',
    '- Время активности друзей в сети',
    '### 🔧 Что изменилось',
    '- Кнопка удаления аккаунта перенесена в глубокие настройки',
    '### 🧹 Что убрано',
    '- Убран счетчик игроков в сети со всех экранов',
    '### Внутреннее (не для игроков)',
    '- Экспорт 37 спрайтов плиток в высоком разрешении 512x512',
    '- Документ APPLICATION_OVERVIEW.md со скриншотами',
    '- Приватный staging сайт для дизайнера с PIN-кодом 2026',
    '### 📊 Опрос',
    '- Как вам обновленный профиль с кубками и статус друзей в сети?',
  ].join('\\n');

  const r = py(`import importlib.util as u;s=u.spec_from_file_location('t','scripts/telegram-notify.py');m=u.module_from_spec(s);s.loader.exec_module(m);print(m.build('1.0.260',"""${notes}""",'https://crownfall90-dot.github.io/play/','https://github.com/crownfall90-dot/TileTopia/releases/download/v260/Tiletopia-1.0.260.apk','https://t.me/TiletopiaBot'))`);
  assert.equal(r.status, 0, r.stderr);

  // 1. New items in blockquote
  assert.match(r.stdout, /✨ <b>Что нового:<\/b>\r?\n<blockquote>/);
  assert.match(r.stdout, /• Кубки рейтинга на главной/);
  assert.match(r.stdout, /• Зеленый кружок онлайна/);
  assert.match(r.stdout, /• Время активности друзей/);

  // 2. Changed items
  assert.match(r.stdout, /🔧 <b>Что изменилось:<\/b>/);
  assert.match(r.stdout, /• Кнопка удаления аккаунта перенесена/);

  // 3. Removed items
  assert.match(r.stdout, /🧹 <b>Что убрано:<\/b>/);
  assert.match(r.stdout, /• Убран счетчик игроков в сети/);

  // 4. Developer / internal items MUST BE FILTERED OUT
  assert.doesNotMatch(r.stdout, /Экспорт 37 спрайтов/i);
  assert.doesNotMatch(r.stdout, /APPLICATION_OVERVIEW/i);
  assert.doesNotMatch(r.stdout, /staging/i);
  assert.doesNotMatch(r.stdout, /дизайнер/i);
  assert.doesNotMatch(r.stdout, /PIN-код/i);

  // 5. 3 ways to play
  assert.match(r.stdout, /🎮 <b>3 способа играть:<\/b>/);
  assert.match(r.stdout, /Android:.*APK-приложение/);
  assert.match(r.stdout, /Все устройства.*сайт в браузере/);
  assert.match(r.stdout, /Telegram:.*мини-приложение/);

  // 6. Interactive poll / question for players
  assert.match(r.stdout, /📊 <b>Вопрос для игроков и тестеров:<\/b>/);
  assert.match(r.stdout, /Как вам обновленный профиль с кубками/);
});
