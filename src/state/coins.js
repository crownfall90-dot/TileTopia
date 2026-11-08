// Two currencies.
//   Тайлы  (tile): the main one, earned in games, quests, rewards and gifts. Kept in wallet.gold (the key of the old single
//                  currency, so saved wallets and the checksum stay valid).
//   Звёзды (star): the rare one, given for the top achievements and spent on the rarest goods. Kept in wallet.stars.
// There is no exchange between them. A price in the catalogue is written in tiles; the dearest goods (from 2000) are paid in
// stars instead, 1 star for every 1000 tiles of the price, rounded up.
export const NAME = {tile: 'тайлов', star: 'звёзд'};
export const STAR_FROM = 2000;   // prices from here are paid in stars
export const STAR_COST = 1000;   // tiles of a price that one star stands for

/** The coin and the number of coins a catalogue price is paid in. */
export function priceCoin(p) {
  p = Math.max(0, +p || 0);
  if (p >= STAR_FROM) return {c: 'star', n: Math.ceil(p / STAR_COST)};
  return {c: 'tile', n: p};
}
export const balance = (w, c) => Math.max(0, Math.floor(+((c === 'star' ? w.stars : w.gold)) || 0));
export const canPay = (w, p) => { const {c, n} = priceCoin(p); return balance(w, c) >= n; };
/** Takes the price from the wallet; false (and nothing taken) when there is not enough. */
export function pay(w, p) {
  const {c, n} = priceCoin(p);
  if (balance(w, c) < n) return false;
  if (c === 'star') w.stars = balance(w, 'star') - n;
  else w.gold = balance(w, 'tile') - n;
  return true;
}
/** Gives coins: kind 'tile' (default) or 'star'. */
export function give(w, n, c = 'tile') {
  n = Math.max(0, Math.floor(+n || 0));
  if (c === 'star') w.stars = balance(w, 'star') + n; else w.gold = balance(w, 'tile') + n;
  return n;
}
export const lackText = (w, p) => { const {c, n} = priceCoin(p); return `Не хватает ${n - balance(w, c)} ${NAME[c]}`; };
/** A price for the shop: the coin's picture and the number. */
export const priceTag = p => { const {c, n} = priceCoin(p); return `<i class="coin ${c}"></i><b>${n}</b>`; };

/**
 * Moves an old three-coin wallet to two currencies, once. Copper was the same as the tiles (wallet.gold) and stays. Silver is
 * worth 100 tiles (the old rate), so each one becomes 100 tiles. Gold coins were the rare ones and become stars one to one.
 * Safe to call again: the old fields are removed. Returns true when something was moved.
 */
export function migrate(w) {
  if (!w) return false;
  const s = Math.max(0, Math.floor(+w.silver || 0));
  const g = Math.max(0, Math.floor(+w.goldCoins || +w.gold_rare || 0));
  const had = ('silver' in w) || ('goldCoins' in w) || ('gold_rare' in w) || ('copper' in w);
  if (!had) return false;
  w.gold = Math.max(0, Math.floor(+w.gold || 0)) + s * 100;
  w.stars = Math.max(0, Math.floor(+w.stars || 0)) + g;
  delete w.silver; delete w.goldCoins; delete w.gold_rare; delete w.copper;
  return s > 0 || g > 0;
}
