const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const java = fs.readFileSync('app/src/main/java/com/crownfall/mosaic/MainActivity.java', 'utf8');
const html = fs.readFileSync('web/game.html', 'utf8');

function fn(name) {
  const i = html.indexOf('function ' + name + '(');
  assert.ok(i >= 0, `function ${name} not found`);
  const b = html.indexOf('{', i);
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}' && !--d) return html.slice(i, j + 1);
  }
  throw Error(name);
}

function nativeEnv(failBridge = false) {
  const messages = [];
  const failures = [];
  const tokens = [];
  const env = {
    window: {},
    AndroidApp: {
      googleSignIn() {
        if (failBridge) throw Error('bridge failure');
      }
    },
    googleAvailable: () => true,
    googleWebOk: () => false,
    toastAny: m => messages.push(m),
    finishGoogle: (...a) => tokens.push(a)
  };
  env.track = env.track || (() => {});
  vm.runInNewContext(fn('startGoogle'), env);
  env.startGoogle(false, c => failures.push(c), {});
  return { env, messages, failures, tokens };
}

test('explicit native button uses dedicated Google option (source check)', () => {
  assert.ok(java.includes('new GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_CLIENT_ID)'));
  assert.ok(!java.includes('GetGoogleIdOption'));
  assert.ok(java.includes('String code = googleErrorCode(e)'));
});

const hasJavac = (() => {
  try { return cp.spawnSync('javac', ['-version']).status === 0; } catch (_) { return false; }
})();

test('actual Java error classifier separates cancellation, missing credentials and failure', {skip: !hasJavac && 'javac is not installed'}, () => {
  const method = java.match(/static String googleErrorCode\(GetCredentialException e\) \{[\s\S]*?\n    \}/);
  assert.ok(method, 'googleErrorCode method should match');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'google-error-'));
  try {
    const file = path.join(dir, 'Harness.java');
    fs.writeFileSync(file,
      'class GetCredentialException extends Exception {}\n' +
      'class NoCredentialException extends GetCredentialException {}\n' +
      'class GetCredentialCancellationException extends GetCredentialException {}\n' +
      'public class Harness {\n' +
      method[0] + '\n' +
      '  public static void main(String[] a) {\n' +
      '    if (!googleErrorCode(new NoCredentialException()).equals("no_credentials")) throw new AssertionError("expected no_credentials");\n' +
      '    if (!googleErrorCode(new GetCredentialCancellationException()).equals("canceled")) throw new AssertionError("expected canceled");\n' +
      '    if (!googleErrorCode(new GetCredentialException()).equals("failed")) throw new AssertionError("expected failed");\n' +
      '  }\n' +
      '}\n'
    );
    let r = cp.spawnSync('javac', ['-d', dir, file], { encoding: 'utf8', timeout: 30000 });
    assert.equal(r.status, 0, r.stdout + (r.stderr || ''));
    r = cp.spawnSync('java', ['-cp', dir, 'Harness'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(r.status, 0, r.stdout + (r.stderr || ''));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('native errors reach failure callback; only real cancellation is silent', () => {
  for (const code of ['canceled', 'no_credentials', 'failed', 'not_configured']) {
    const x = nativeEnv();
    x.env.window.onGoogleError(code);
    assert.deepEqual(x.failures, [code]);
    assert.equal(x.messages.length, code === 'canceled' ? 0 : 1);
  }
});

test('synchronous bridge failure is visible and allows another attempt', () => {
  const x = nativeEnv(true);
  assert.deepEqual(x.failures, ['failed']);
  assert.equal(x.messages.length, 1);
  x.env.AndroidApp.googleSignIn = () => {};
  x.env.startGoogle(false, c => x.failures.push(c), {});
  x.env.window.onGoogleToken('dummy-test-token');
  assert.equal(x.tokens.length, 1);
  assert.equal(x.tokens[0][0], 'dummy-test-token');
});

test('existing browser entry still selects Google web button', () => {
  let called = 0;
  const button = {};
  const env = {
    window: {},
    googleAvailable: () => false,
    googleWebOk: () => true,
    googleWebButton: (b, link) => {
      assert.equal(b, button);
      assert.equal(link, true);
      called++;
    }
  };
  env.track = env.track || (() => {});
  vm.runInNewContext(fn('startGoogle'), env);
  env.startGoogle(true, () => {}, button);
  assert.equal(called, 1);
});
