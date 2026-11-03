// src/app/telegram.js
// Telegram Mini App (TMA) integration: WebApp lifecycle, user info, haptics, BackButton, deep links.

export function getTelegramWebApp(win = typeof window !== 'undefined' ? window : null) {
  return (win && win.Telegram && win.Telegram.WebApp) ? win.Telegram.WebApp : null;
}

export function isTelegramWebApp(win = typeof window !== 'undefined' ? window : null) {
  const tg = getTelegramWebApp(win);
  return Boolean(tg && (tg.initData || tg.initDataUnsafe));
}

export function initTelegramWebApp(win = typeof window !== 'undefined' ? window : null, {themeColor = '#0d142a'} = {}) {
  const tg = getTelegramWebApp(win);
  if (!tg) return null;
  try {
    if (typeof tg.ready === 'function') tg.ready();
    if (typeof tg.expand === 'function') tg.expand();
    if (typeof tg.enableClosingConfirmation === 'function') tg.enableClosingConfirmation();
    if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(themeColor);
    if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(themeColor);
  } catch (_) {}
  return tg;
}

export function getTelegramUser(win = typeof window !== 'undefined' ? window : null) {
  const tg = getTelegramWebApp(win);
  const u = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
  if (!u || typeof u !== 'object') return null;
  return {
    id: u.id,
    firstName: u.first_name || '',
    lastName: u.last_name || '',
    username: u.username || '',
    languageCode: u.language_code || '',
    photoUrl: u.photo_url || ''
  };
}

export function getTelegramStartParam(win = typeof window !== 'undefined' ? window : null) {
  const tg = getTelegramWebApp(win);
  const param = tg && tg.initDataUnsafe ? tg.initDataUnsafe.start_param : '';
  if (typeof param !== 'string') return '';
  return param.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

export function telegramHaptic(type = 'light', win = typeof window !== 'undefined' ? window : null) {
  const tg = getTelegramWebApp(win);
  if (!tg || !tg.HapticFeedback) return false;
  try {
    if (type === 'success' || type === 'error' || type === 'warning') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
    return true;
  } catch (_) {
    return false;
  }
}

export function updateTelegramBackButton(visible, onClickFn, win = typeof window !== 'undefined' ? window : null) {
  const tg = getTelegramWebApp(win);
  if (!tg || !tg.BackButton) return;
  try {
    if (visible) {
      tg.BackButton.show();
      if (typeof onClickFn === 'function') {
        tg.BackButton.onClick(onClickFn);
      }
    } else {
      tg.BackButton.hide();
    }
  } catch (_) {}
}

export function shareRoomToTelegram(code, message = 'Присоединяйся к моей партии в Tiletopia! 🧩', webUrl = 'https://crownfall90-dot.github.io/play/') {
  const safeCode = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  const url = `${webUrl}?room=${safeCode}`;
  const text = `${message}\nКод комнаты: ${safeCode}`;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
