// Tests for extracted account modules: src/account/google.js, src/account/sync.js, src/account/auth.js (E-1.2, E-1.3)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('account/google: jwtPayload decodes UTF-8 and handles malformed tokens', async () => {
  const {jwtPayload, jwtEmail, googleIdpBody, classifyGoogleError} = await import('../src/account/google.js');

  // UTF-8 payload
  const token = 'header.' + Buffer.from(JSON.stringify({email: 'test@example.com', name: 'Tiletopia'})).toString('base64url') + '.sig';
  const payload = jwtPayload(token);
  assert.equal(payload.email, 'test@example.com');
  assert.equal(payload.name, 'Tiletopia');
  assert.equal(jwtEmail(token), 'test@example.com');

  // Malformed token
  assert.deepEqual(jwtPayload('bad-token'), {});
  assert.equal(jwtEmail('bad-token'), '');

  // IDP Body
  const bodyNoSession = googleIdpBody('my-token');
  assert.ok(bodyNoSession.postBody.includes('my-token'));
  assert.equal(bodyNoSession.returnSecureToken, true);
  assert.equal(bodyNoSession.idToken, undefined);

  const bodyWithSession = googleIdpBody('my-token', 'session-123');
  assert.equal(bodyWithSession.idToken, 'session-123');

  // Error classifier
  assert.equal(classifyGoogleError({message: 'User cancelled sign-in'}), 'canceled');
  assert.equal(classifyGoogleError({message: 'No credentials found'}), 'no_credentials');
  assert.equal(classifyGoogleError({message: 'Server connection failed'}), 'failed');
});

test('account/sync: encodeProfilePayload, decodeProfilePayload, and mergeWallets', async () => {
  const {encodeProfilePayload, decodeProfilePayload, mergeWallets} = await import('../src/account/sync.js');

  const wallet = {gold: 250, promos: ['OPUS55'], owned: ['classic', 'knight'], frames: ['royal']};
  const seats = [{name: 'Алиса', col: '#ef5350'}];
  const encoded = encodeProfilePayload(wallet, seats, 1700000000);

  assert.equal(encoded.t, 1700000000);
  assert.equal(typeof encoded.w, 'string');
  assert.equal(typeof encoded.s, 'string');

  const decoded = decodeProfilePayload(encoded);
  assert.deepEqual(decoded.wallet.gold, 250);
  assert.deepEqual(decoded.wallet.promos, ['OPUS55']);
  assert.equal(decoded.seats.name, 'Алиса');
  assert.equal(decoded.timestamp, 1700000000);

  // Merging local and remote wallets
  const localW = {gold: 150, promos: ['A'], owned: ['classic']};
  const remoteW = {gold: 300, promos: ['B'], owned: ['classic', 'queen']};
  const merged = mergeWallets(localW, remoteW);
  assert.equal(merged.gold, 300, 'gold takes maximum');
  assert.deepEqual(merged.promos.sort(), ['A', 'B'], 'promos union');
  assert.deepEqual(merged.owned.sort(), ['classic', 'queen'], 'cosmetics union');

  // History serialization and merging
  const {mergeHistory} = await import('../src/account/sync.js');
  const hist = [{id: 'l:1', at: 1000, players: [{name: 'A', me: true, score: 10}]}];
  const encodedWithH = encodeProfilePayload(wallet, seats, 1700000000, hist);
  assert.equal(typeof encodedWithH.h, 'string');
  const decodedWithH = decodeProfilePayload(encodedWithH);
  assert.equal(decodedWithH.history.length, 1);
  assert.equal(decodedWithH.history[0].id, 'l:1');

  const localH = [{id: 'l:1', at: 1000, final: false, players: []}, {id: 'l:2', at: 2000, final: true, players: []}];
  const remoteH = [{id: 'l:1', at: 1100, final: true, players: []}, {id: 'o:3', at: 3000, final: true, players: []}];
  const mergedH = mergeHistory(localH, remoteH);
  assert.equal(mergedH.length, 3);
  assert.equal(mergedH[0].id, 'o:3');
  assert.equal(mergedH.find(x => x.id === 'l:1').final, true);
});

test('account/auth: sanitizeNickname, isValidNickname, getDisplayName', async () => {
  const {sanitizeNickname, isValidNickname, getDisplayName, RENAME_PRICE} = await import('../src/account/auth.js');

  assert.equal(RENAME_PRICE, 50);
  assert.equal(sanitizeNickname('<Иван>'), 'Иван');
  assert.equal(sanitizeNickname('   ОченьДлинныйНикнеймСверхЛимита   '), 'ОченьДлинный');

  assert.equal(isValidNickname('Алиса'), true);
  assert.equal(isValidNickname('А'), false);
  assert.equal(isValidNickname('Игрок'), false);
  assert.equal(isValidNickname(''), false);

  assert.equal(getDisplayName({name: 'Боб'}), 'Боб');
  assert.equal(getDisplayName({guest: 'Гость_42'}), 'Гость_42');
  assert.equal(getDisplayName({}), 'Игрок');

  // classifyAuthError and checkAuthInput
  const {classifyAuthError, checkAuthInput} = await import('../src/account/auth.js');
  const errExists = classifyAuthError({error: {message: 'EMAIL_EXISTS detail'}}, true);
  assert.ok(errExists[0].includes('уже привязана'));
  assert.equal(errExists[1], 'mail');

  const errNetwork = classifyAuthError(null, false);
  assert.ok(errNetwork[0].includes('Нет связи'));

  assert.deepEqual(checkAuthInput('', 'pass123', true), ['Введите почту', 'mail']);
  assert.deepEqual(checkAuthInput('test @mail.ru', 'pass123', true), ['В почте не должно быть пробелов', 'mail']);
  assert.deepEqual(checkAuthInput('test@gmial.com', 'pass123', true), ['Возможно, опечатка: test@gmail.com?', 'mail', 'typo', 'test@gmail.com']);
  assert.deepEqual(checkAuthInput('test@mail.ru', '', true), ['Введите пароль', 'pass']);
  assert.deepEqual(checkAuthInput('test@mail.ru', '123', true), ['Пароль слишком короткий: 3 из 6 символов', 'pass']);
  assert.equal(checkAuthInput('test@mail.ru', 'validPass123', true), null);

  // renderAccountDialogHtml and eye SVGs
  const {renderAccountDialogHtml, EYE_OPEN, EYE_SHUT} = await import('../src/account/auth.js');
  assert.ok(EYE_OPEN.includes('<svg'));
  assert.ok(EYE_SHUT.includes('<svg'));

  const loginHtml = renderAccountDialogHtml({link: false, prefill: 'test@example.com'});
  assert.ok(loginHtml.includes('Вход в профиль'));
  assert.ok(loginHtml.includes('value="test@example.com"'));
  assert.ok(loginHtml.includes('Отмена'));

  const linkHtml = renderAccountDialogHtml({link: true});
  assert.ok(linkHtml.includes('Позже'));
});
