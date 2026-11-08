// The consent tick-box: «Я принимаю Соглашение и Политику конфиденциальности».
// It stands before the first thing that makes a profile (a name seen by other players, a mail or a Google account), and the
// buttons stay locked until it is ticked. The answer is kept in the wallet (wallet.consent = {v, t}) so it is asked once per
// version of the texts: raise LEGAL_VERSION when the Terms or the Privacy Policy change in a way that needs a new answer.
export const LEGAL_VERSION = 1;
export const TERMS_URL = 'https://crownfall90-dot.github.io/TileTopia/terms.html';
export const PRIVACY_URL = 'https://crownfall90-dot.github.io/TileTopia/privacy.html';

/** Has this player already agreed to the current texts? */
export const hasConsent = w => !!(w && w.consent && w.consent.v === LEGAL_VERSION);

/** Writes (on = true) or withdraws (on = false) the answer. Returns the wallet. */
export function setConsent(w, on, now = Date.now()) {
  if (!w) return w;
  if (on) w.consent = {v: LEGAL_VERSION, t: now};
  else delete w.consent;
  return w;
}

/** The tick-box. `id` is the input's id. A tap anywhere on the card ticks it (the whole row is the target, 48 px high). */
export function consentHtml(id = 'consentBox') {
  return `<label class="consent" for="${id}">`
    + `<input type="checkbox" id="${id}" class="consent-in">`
    + `<span class="cbox" aria-hidden="true"></span>`
    + `<span class="ctext"><b>Я принимаю</b> <a href="${TERMS_URL}" target="_blank" rel="noopener">Соглашение</a> и <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Политику конфиденциальности</a>`
    + `<small>Ник, цвет и прогресс сохраняются в профиле, ник видят другие игроки.</small></span>`
    + `</label>`
    + `<p class="consent-hint" id="${id}Hint">Поставьте галочку, чтобы продолжить</p>`;
}
