import {PREFS, PREF_GROUPS} from '../state/config.js';
import {prefIcon} from './icons.js';

const settings = new Map(PREFS.map(pref => [pref.k, pref]));

export function renderPreferences(wallet, native, expanded = new Set()) {
  function row(pref) {
    const {k, label, hint, opts} = pref;
    const toggle = typeof opts[0][0] === 'boolean';
    const detail = k === 'stats' ? `<small>${hint}</small>` : '';
    const control = toggle
      ? `<button class="tgl" role="switch" data-pref="${k}" aria-checked="${!!wallet[k]}" aria-label="${label}"><span></span></button>`
      : `<span class="mseg" data-pref="${k}" role="group" aria-label="${label}">${opts.map(([value, caption], index) =>
        `<button data-i="${index}" aria-pressed="${wallet[k] === value}">${caption}</button>`).join('')}</span>`;
    return `<div class="srow${toggle ? '' : ' sseg'}"><span class="sic" aria-hidden="true">${prefIcon(k)}</span><span class="stx"><b>${label}</b>${detail}</span>${control}</div>`;
  }

  return PREF_GROUPS.map(([title, keys, collapsible]) => {
    const rows = keys.map(key => settings.get(key)).filter(pref => native || !pref.app);
    if (!rows.length) return '';
    const contents = `<div class="sgroup">${rows.map(row).join('')}</div>`;
    return collapsible
      ? `<details class="settings-details" data-group="${keys[0]}"${expanded.has(keys[0]) ? ' open' : ''}><summary>${title}</summary>${contents}</details>`
      : `<section class="settings-section" aria-label="${title}"><h3 class="h3">${title}</h3>${contents}</section>`;
  }).join('');
}

export function preferenceChange(target, wallet) {
  const toggle = target.closest('.tgl');
  const option = target.closest('.mseg button');
  const row = toggle || option?.parentElement;
  const pref = row && settings.get(row.dataset.pref);
  if (!pref) return null;
  const value = toggle ? !wallet[pref.k] : pref.opts[Number(option.dataset.i)]?.[0];
  return value === undefined ? null : {key: pref.k, value};
}
