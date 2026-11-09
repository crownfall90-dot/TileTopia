// Line icons for the settings rows: one 24-px grid, one stroke width, drawn in currentColor.
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
};

/** SVG markup for a settings row, or '' when there is no drawn icon for this key. */
export function prefIcon(key) {
  const p = P[key];
  return p ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>` : '';
}

export const PREF_ICON_KEYS = Object.keys(P);
