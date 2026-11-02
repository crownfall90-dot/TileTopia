const test = require('node:test'), assert = require('node:assert'), {execFileSync, spawnSync} = require('node:child_process');
const pyBin = process.platform === 'win32' ? 'python' : 'python3';
const py = (code, env = {}) => spawnSync(pyBin, ['-c', code], {cwd: __dirname + '/..', env: {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ...env}, encoding: 'utf8'});

test('telegram: message lists changes, escapes HTML, links and platforms', () => {
  const r = py("import importlib.util as u;s=u.spec_from_file_location('t','scripts/telegram-notify.py');m=u.module_from_spec(s);s.loader.exec_module(m);print(m.build('1.0.9','- Новое <b>окно</b>\\n- Ещё','https://x/y/','https://x/a.apk','https://t.me/mybot'))");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Puzzlegrad 1\.0\.9/);
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
