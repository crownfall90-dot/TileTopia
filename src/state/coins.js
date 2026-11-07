// Three coins: copper (earned in games, rewards and quests; kept in wallet.gold, the old single currency), silver
// (wallet.silver) and gold (wallet.goldCoins). 100 copper = 1 silver, 10 silver = 1 gold, exchanged one way in the shop.
// A price is written in copper everywhere (the catalogue); dear things are paid in the bigger coin: from 1000 copper in
// silver, from 2000 in gold, at the same worth (1200 → 12 silver, 2500 → 3 gold rounded up).
export const RATE = {silver: 100, gold: 1000};
export const NAME = {copper: 'меди', silver: 'серебра', gold: 'золота'};

/** The coin and the number of coins a copper price is paid in. */
export function priceCoin(p) {
  p = Math.max(0, +p || 0);
  if (p >= 2000) return {c: 'gold', n: Math.ceil(p / RATE.gold)};
  if (p >= 1000) return {c: 'silver', n: Math.ceil(p / RATE.silver)};
  return {c: 'copper', n: p};
}
export const balance = (w, c) => Math.max(0, Math.floor(+((c === 'gold' ? w.goldCoins : c === 'silver' ? w.silver : w.gold)) || 0));
export const canPay = (w, p) => { const {c, n} = priceCoin(p); return balance(w, c) >= n; };
/** Takes the price from the wallet; false (and nothing taken) when there is not enough. */
export function pay(w, p) {
  const {c, n} = priceCoin(p);
  if (balance(w, c) < n) return false;
  if (c === 'gold') w.goldCoins = balance(w, 'gold') - n;
  else if (c === 'silver') w.silver = balance(w, 'silver') - n;
  else w.gold = balance(w, 'copper') - n;
  return true;
}
export const lackText = (w, p) => { const {c, n} = priceCoin(p); return `Не хватает ${n - balance(w, c)} ${NAME[c]}`; };
/** A price for the shop: the coin's picture and the number. */
export const priceTag = p => { const {c, n} = priceCoin(p); return `<i class="coin ${c}"></i><b>${n}</b>`; };

/** Exchange `times` lots: 'silver' turns 100 copper into 1 silver, 'gold' turns 10 silver into 1 gold. Returns the lots done. */
export function exchange(w, to, times = 1) {
  const from = to === 'gold' ? 'silver' : 'copper', cost = to === 'gold' ? RATE.gold / RATE.silver : RATE.silver;
  const k = Math.min(Math.max(0, times | 0), Math.floor(balance(w, from) / cost));
  if (!k) return 0;
  if (from === 'silver') w.silver = balance(w, 'silver') - k * cost; else w.gold = balance(w, 'copper') - k * cost;
  if (to === 'gold') w.goldCoins = balance(w, 'gold') + k; else w.silver = balance(w, 'silver') + k;
  return k;
}
