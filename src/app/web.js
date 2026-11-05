// Web/PWA helpers: site URLs, standalone mode, platform detection and link parsing.

export const SITE_URL = 'https://crownfall90-dot.github.io/play/';
export const APK_URL = 'https://github.com/crownfall90-dot/TileTopia/releases/latest/download/Tiletopia.apk';

export function isStandalone(nav = typeof navigator !== 'undefined' ? navigator : {}, mm = typeof matchMedia !== 'undefined' ? matchMedia : null) {
  return (mm && mm('(display-mode: standalone)').matches) || nav.standalone === true;
}

export function detectPlatform(nav = typeof navigator !== 'undefined' ? navigator : {}) {
  const ua = nav.userAgent || '';
  const platform = nav.platform || '';
  const maxTouchPoints = nav.maxTouchPoints || 0;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isMobile = isIOS || /Android/i.test(ua);
  return {isIOS, isMobile};
}

export const linkCode = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function parseLink(href) {
  try {
    const u = new URL(href);
    if (u.protocol === 'puzzlegrad:') {
      const code = linkCode(u.pathname.replace(/^\/+/, ''));
      return u.hostname === 'room' ? {room: code} : u.hostname === 'friend' ? {friend: code} : null;
    }
    return {room: linkCode(u.searchParams.get('room')), friend: linkCode(u.searchParams.get('friend'))};
  } catch (_) {
    return null;
  }
}
