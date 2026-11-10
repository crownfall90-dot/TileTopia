// src/state/avatars.js
// Profile pictures: a picture inside the avatar (the frame goes round it) and the avatar's shape.
// The round shape is everyone's; the square one and the wide banner are bought, the banner dearer.
// Pictures are bought one by one: portraits of the game's characters (assets figs/) and scenes from the cards (tiles/).
// Kept in wallet.avatars (owned pictures), wallet.avatar (worn, '' = the letter), wallet.avShapes, wallet.avShape.
import {canPay, pay} from './coins.js';

export const SHAPES = {
  round: {name: 'Круглая', price: 0},
  square: {name: 'Квадратная', price: 800},
  rect: {name: 'Баннер', price: 2500},
};
const P = (name, src, price, pos) => ({name, src, price, pos});
/** Portraits: for the round and the square avatar. */
export const PICS = {
  peasant: P('Крестьянин', 'figs/peasant.webp', 300, '50% 14%'), archer: P('Лучник', 'figs/archer.webp', 400, '50% 14%'),
  monk: P('Монах', 'figs/monk.webp', 400, '50% 14%'), knight: P('Рыцарь', 'figs/knight.webp', 600, '50% 14%'),
  ninja: P('Ниндзя', 'figs/ninja.webp', 700, '50% 14%'), wizard: P('Волшебник', 'figs/wizard.webp', 800, '50% 12%'),
  paladin: P('Паладин', 'figs/paladin.webp', 900, '50% 14%'), queen: P('Королева', 'figs/queen.webp', 2000, '50% 12%'),
  king: P('Король', 'figs/king.webp', 2000, '50% 12%'),
};
/** Banners: wide scenes of the kingdom, only for the banner shape. */
export const BANNERS = {
  meadow: P('Луга', 'tiles/rC.webp', 500, '50% 40%'),
  river: P('Река', 'tiles/wS.webp', 600, '50% 50%'),
  lake: P('Озёрный край', 'tiles/wLake.webp', 750, '50% 50%'),
  bridge: P('Мост', 'tiles/wBr.webp', 800, '50% 50%'),
  mine: P('Древняя шахта', 'tiles/rMine.webp', 850, '50% 50%'),
  town: P('Город', 'tiles/band.webp', 900, '50% 50%'),
  abbey: P('Монастырь', 'tiles/fort.webp', 1000, '50% 50%'),
  watercity: P('Водный замок', 'tiles/wCity.webp', 1100, '50% 50%'),
  abbeyriver: P('Обитель у реки', 'tiles/fortR.webp', 1300, '50% 50%'),
  rocks: P('Скалистый утёс', 'tiles/rocks.webp', 2000, '50% 50%'),
  citadel: P('Цитадель', 'tiles/c4.webp', 3000, '50% 50%'),
  dragons: P('Пик Дракона', 'tiles/banner_dragons.webp', 5000, '50% 45%'),
  harbor: P('Королевская гавань', 'tiles/banner_harbor.webp', 8000, '50% 50%'),
};
const POOL = {pic: [PICS, 'avatars', 'avatar'], banner: [BANNERS, 'banners', 'banner']};

const list = (w, k) => (Array.isArray(w[k]) ? w[k] : (w[k] = []));
export const owns = (w, kind, id) => kind === 'shape' ? id === 'round' || list(w, 'avShapes').includes(id) : list(w, POOL[kind][1]).includes(id);
export const ownsShape = (w, s) => owns(w, 'shape', s);

/** Buys a portrait, a banner or a shape ('pic' | 'banner' | 'shape'). {ok} or {ok: false, reason: 'unknown' | 'owned' | 'gold'}. */
export function buy(w, kind, id) {
  if (kind === 'banner' && !owns(w, 'shape', 'rect')) return {ok: false, reason: 'need_banner'};
  const item = kind === 'shape' ? SHAPES[id] : POOL[kind] && POOL[kind][0][id];
  if (!item) return {ok: false, reason: 'unknown'};
  if (owns(w, kind, id)) return {ok: false, reason: 'owned'};
  if (!canPay(w, item.price)) return {ok: false, reason: 'gold'};
  pay(w, item.price);
  list(w, kind === 'shape' ? 'avShapes' : POOL[kind][1]).push(id);
  return {ok: true, price: item.price};
}
/** Wears a shape, a portrait or a banner ('' = none: the letter, or the portrait stretched); only what is owned. */
export function wear(w, kind, id) {
  if (kind === 'shape') { if (SHAPES[id] && owns(w, 'shape', id)) w.avShape = id; return; }
  if (!POOL[kind] || (id && !owns(w, kind, id))) return;
  w[POOL[kind][2]] = id || '';
}
/** Extra classes and style of the player's own avatar: the shape, and its picture (the banner on the banner shape). */
export function look(w) {
  const shape = SHAPES[w.avShape] && owns(w, 'shape', w.avShape) ? w.avShape : 'round';
  const ban = shape === 'rect' && w.banner && BANNERS[w.banner] && owns(w, 'banner', w.banner) ? BANNERS[w.banner] : null;
  const pic = ban || (w.avatar && PICS[w.avatar] && owns(w, 'pic', w.avatar) ? PICS[w.avatar] : null);
  return {cls: (shape !== 'round' ? ' sh-' + shape : '') + (pic ? ' pic' : ''), style: pic ? `--pic:url(${pic.src});--pp:${pic.pos};` : ''};
}
