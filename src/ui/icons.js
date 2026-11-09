// Line icons for the settings rows and UI elements: one 24-px grid, one stroke width, drawn in currentColor.
// Emoji stay only in reactions; everywhere else the game uses these.
const P = {
  sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 010 6"/><path d="M18 6.5a7.5 7.5 0 010 11"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  vib: '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 9v6"/><path d="M19.5 9v6"/><path d="M11 17h2"/>',
  view: '<path d="M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7z"/><path d="M4.5 7.7L12 12l7.5-4.3"/><path d="M12 12v8.5"/>',
  botlvl: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8"/><circle cx="12" cy="4" r="1"/><circle cx="9.5" cy="13" r="1.2"/><circle cx="14.5" cy="13" r="1.2"/><path d="M2.5 12.5v3"/><path d="M21.5 12.5v3"/>',
  speed: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  alert: '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 2"/><path d="M4.5 5.5l2.5-2"/><path d="M19.5 5.5l-2.5-2"/>',
  coach: '<path d="M9 17.5h6"/><path d="M10 20.5h4"/><path d="M12 3.5a5.5 5.5 0 00-3.2 10c.6.5 1 1.2 1 2V16h4.4v-.5c0-.8.4-1.5 1-2A5.5 5.5 0 0012 3.5z"/>',
  zones: '<path d="M12 3.5a8.5 8.5 0 000 17c1.3 0 1.8-.9 1.8-1.8 0-1.4-1-1.6-1-2.6 0-.8.7-1.3 1.6-1.3h2a3.6 3.6 0 003.6-3.6c0-4.3-3.6-7.7-8-7.7z"/><circle cx="8" cy="11" r="1.1"/><circle cx="10.5" cy="7.5" r="1.1"/><circle cx="15" cy="8" r="1.1"/>',
  gfx: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16v4"/><path d="M16.5 18h4"/>',
  notify: '<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 004 0"/>',
  stats: '<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="6" rx="1"/><rect x="10.5" y="7" width="3" height="11" rx="1"/><rect x="15.5" y="10" width="3" height="8" rx="1"/>',
  backpack: '<path d="M7 8V6a5 5 0 0110 0v2"/><rect x="4" y="8" width="16" height="13" rx="3"/><path d="M4 14h16"/><path d="M10 11h4"/>',
  scroll: '<path d="M8 4h10a3 3 0 013 3v11a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h2"/><path d="M8 4v16"/><path d="M12 9h5M12 13h5M12 17h3"/>',
  trophy: '<path d="M8 21h8M12 17v4M5 4h14v4a7 7 0 01-14 0V4z"/><path d="M5 6H3a2 2 0 00-2 2v1a4 4 0 004 4h0M19 6h2a2 2 0 012 2v1a4 4 0 01-4 4h0"/>',
  medal: '<circle cx="12" cy="14" r="6"/><path d="M8.5 8.5L7 3l5 3 5-3-1.5 5.5"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.3" fill="currentColor"/><circle cx="15" cy="13" r="1.3" fill="currentColor"/><path d="M12 4v4M9 17h6"/>',
  friends: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a14 14 0 000 18 14 14 0 000-18z"/>',
  castle: '<path d="M4 21V9l2-2 2 2v12M16 21V9l2-2 2 2v12M8 21V11h8v10M10 14h4v7h-4z"/>',
  road: '<path d="M4 21l4-18h8l4 18M12 3v4M12 11v4M12 19v2"/>',
  monastery: '<path d="M12 3v4M10 5h4M6 21v-9l6-4 6 4v9H6z"/><path d="M10 21v-5a2 2 0 014 0v5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/><path d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};

/** SVG markup for a settings row, or '' when there is no drawn icon for this key. */
export function prefIcon(key) {
  const p = P[key];
  return p ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>` : '';
}

/** Generic UI icon helper */
export function uiIcon(key, size = 20, extraClass = '') {
  const p = P[key];
  if (!p) return '';
  const cls = extraClass ? ` class="${extraClass}"` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cls} aria-hidden="true">${p}</svg>`;
}

export const PREF_ICON_KEYS = Object.keys(P);
