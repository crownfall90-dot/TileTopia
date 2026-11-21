/* ---------------- account: keep the profile across reinstalls ----------------
   The anonymous Firebase account gets an e-mail and password ("protect the profile"); the whole
   wallet (gold, figures, progress, name, rating) is then saved to /profiles/{uid}. On a new phone
   or after a reinstall, signing in with the same e-mail brings it back. Rules: docs/firebase-rules.json. */
const RENAME_PRICE = 500;
// Server answers → [text, field to mark]. 'mail' / 'pass' put a red frame on that field.
const AUTH_ERR = {
  EMAIL_EXISTS: ['Эта почта уже привязана к другому профилю. Войдите в него или укажите другую почту', 'mail'],
  EMAIL_NOT_FOUND: ['Профиля с такой почтой нет. Проверьте почту или сначала сохраните профиль', 'mail'],
  INVALID_PASSWORD: ['Неверный пароль. Проверьте раскладку и Caps Lock или нажмите «Забыли пароль?»', 'pass'],
  INVALID_LOGIN_CREDENTIALS: ['Почта или пароль не подходят. Проверьте оба поля — нажмите 👁, чтобы увидеть пароль', 'both'],
  INVALID_EMAIL: ['Почта записана с ошибкой. Пример: name@mail.ru', 'mail'],
  MISSING_EMAIL: ['Введите почту', 'mail'],
  WEAK_PASSWORD: ['Пароль слишком простой — нужно хотя бы 6 символов', 'pass'],
  MISSING_PASSWORD: ['Введите пароль', 'pass'],
  USER_DISABLED: ['Этот профиль отключён. Напишите в поддержку', 'mail'],
  TOO_MANY_ATTEMPTS_TRY_LATER: ['Слишком много попыток подряд. Подождите несколько минут или смените пароль через «Забыли пароль?»', ''],
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: ['Для этого нужно войти заново', ''],
  CREDENTIAL_ALREADY_IN_USE: ['Этот аккаунт Google уже используется. Выполняем вход...', ''],
  FEDERATED_USER_ID_ALREADY_LINKED: ['Этот аккаунт Google уже привязан к другому профилю. Выполняем вход...', ''],
  SHORT_OR_WRONG: ['Пароль не подходит. Для нового профиля пароль нужен от 6 символов', 'pass'],
};
// Server-side setup problems (sign-in method off, e-mail change blocked…) are not the player's
// fault: they get a calm message, and the exact answer goes to the crash reports for the owner.
const authErr = (j, link) => {
  if (typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.classifyAuthError) {
    const res = PG.account.auth.classifyAuthError(j, link);
    if (!j || !j.error) return res;
    const c = String(j.error.message || '').split(' ')[0];
    if (AUTH_ERR[c]) return res;
    try { if (window.AndroidApp && AndroidApp.logError) AndroidApp.logError('auth ' + (link ? 'link' : 'login') + ': ' + String(j.error.message).slice(0, 300)); } catch (_) {}
    return res;
  }
  if (!j || !j.error) return ['Нет связи с сервером — проверьте интернет', ''];
  const c = String(j.error.message || '').split(' ')[0];
  if (AUTH_ERR[c]) return AUTH_ERR[c];
  try { if (window.AndroidApp && AndroidApp.logError) AndroidApp.logError('auth ' + (link ? 'link' : 'login') + ': ' + String(j.error.message).slice(0, 300)); } catch (_) {}
  return [link ? 'Не удалось сохранить профиль. Попробуйте позже — тайлы и прогресс никуда не денутся' : 'Не удалось войти. Попробуйте чуть позже', ''];
};
// Common slips in the mail domain → the likely intended one.
const MAIL_FIX = {'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.ru': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'mail.ri': 'mail.ru', 'mail.r': 'mail.ru', 'mial.ru': 'mail.ru', 'yandex.ry': 'yandex.ru', 'yandex.com.ru': 'yandex.ru', 'yandeks.ru': 'yandex.ru', 'yndex.ru': 'yandex.ru', 'ya.ry': 'ya.ru', 'rambler.ry': 'rambler.ru', 'icloud.con': 'icloud.com', 'outlok.com': 'outlook.com', 'hotmail.con': 'hotmail.com'};
// Checks before asking the server: [text, field] or null.
function checkAuthInput(mail, pass, link) {
  if (typeof PG !== 'undefined' && PG.account && PG.account.auth && PG.account.auth.checkAuthInput) {
    return PG.account.auth.checkAuthInput(mail, pass, link);
  }
  if (!mail) return ['Введите почту', 'mail'];
  if (/\s/.test(mail)) return ['В почте не должно быть пробелов', 'mail'];
  if (!/^[^@]+@[^@]+\.[^@.]{2,}$/.test(mail)) return [mail.includes('@') ? 'После @ нужен адрес почты целиком, например name@mail.ru' : 'В почте не хватает «@». Пример: name@mail.ru', 'mail'];
  const dom = mail.split('@')[1].toLowerCase();
  if (MAIL_FIX[dom]) return [`Возможно, опечатка: ${mail.split('@')[0]}@${MAIL_FIX[dom]}?`, 'mail', 'typo', mail.split('@')[0] + '@' + MAIL_FIX[dom]];
  if (!pass) return ['Введите пароль', 'pass'];
  if (link && pass.length < 6) return [`Пароль слишком короткий: ${pass.length} из 6 символов`, 'pass'];
  if (link && pass !== pass.trim()) return ['В начале или в конце пароля пробел — уберите его, чтобы потом не ошибиться', 'pass'];
  return null;
}
function idt(method, body) { return FBC.idt(method, body); }
function keepAuth(j, email) { FBC.keep(j, email); }
