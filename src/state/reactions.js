import {canPay, pay} from './coins.js';
// Emoji and quick phrases for games: three of each, the most ordinary ones, are free; the rest are bought in the shop
// for gold or earned (progress road) and collected like figures and frames. The deck (up to 5 + 5 shown in a game)
// is chosen in «Мои предметы» only from what the player owns.
// The lists and their order must stay as they are: a message carries the index of the line in SAYS.

export const DEFAULT_EMOTES = ['👏', '🤝', '❤️'];
export const DEFAULT_PHRASES = ['Отличный ход!', 'Удачи за столом! 🤝', 'Спасибо за игру! ❤️'];
// The free set before reactions cost gold: players who already had it keep it (see migrate).
const OLD_DEFAULT_EMOTES = ['👑', '🧩', '🏰', '⚔️', '🤝'];
const OLD_DEFAULT_PHRASES = ['Отличный ход!', 'Мой замок!', 'Так и планировал 😎', 'Удачи за столом! 🤝', 'Спасибо за игру! ❤️'];

export const ALL_EMOTES = [
  '👑', '🧩', '🏰', '⚔️', '🛡️', '🌊',
  '🌉', '🌲', '🎲', '🏆', '💡', '🧐',
  '🍵', '🔥', '🤝', '🎯', '⏳', '😱',
  '🧱', '🥳', '😎', '😅', '👏', '❤️'
];

export const ALL_PHRASES = [
  'Отличный ход!',
  'Мой замок!',
  'Так и планировал 😎',
  'Вот это поворот!',
  'Красивая карта!',
  'Удачи за столом! 🤝',
  'Секунду, считаю очки... ⏳',
  'Дзен превыше всего 🍵',
  'Неожиданный стык! 🧩',
  'Защищай границы! ⚔️',
  'Река к победе 🌊',
  'Почти получилось!',
  'Ну ты гроссмейстер! 👑',
  'Тут моя дорога 🛤️',
  'Ловушка захлопнулась 🏰',
  'Ещё партию? 🎮',
  'Рискнём на удачу! 🎲',
  'Красиво строишь!',
  'Я думал иначе... 🤔',
  'Всё под контролем!',
  'Спасибо за игру! ❤️',
  'Каждый тайл на счету 🎯',
  'Партия века! 🔥',
  'Приветствую в TileTopia! 👋'
];

export const SAYS = [...ALL_EMOTES, ...ALL_PHRASES];

/** Rarity → its name and the price in gold of an emoji / a phrase. */
export const RARITY = {
  common: {name: 'Обычная', emote: 40, phrase: 60},
  rare: {name: 'Редкая', emote: 90, phrase: 120},
  epic: {name: 'Эпическая', emote: 180, phrase: 240},
};
const EMOTE_RARITY = {'👑': 'rare', '🧐': 'rare', '🍵': 'rare', '🎯': 'rare', '😱': 'rare', '😎': 'rare', '🥳': 'rare', '🏆': 'epic', '🔥': 'epic'};
const PHRASE_RARITY = {
  'Ну ты гроссмейстер! 👑': 'epic', 'Партия века! 🔥': 'epic',
  'Ловушка захлопнулась 🏰': 'rare', 'Дзен превыше всего 🍵': 'rare', 'Каждый тайл на счету 🎯': 'rare',
  'Приветствую в TileTopia! 👋': 'rare', 'Рискнём на удачу! 🎲': 'rare',
};
/** Reactions that can also be earned, and where (shown next to the price). */
export const EARN = {
  emote: {'😎': 'Дорога прогресса · ур. 5', '🏰': 'Дорога прогресса · ур. 15', '🏆': 'Дорога прогресса · ур. 50'},
  phrase: {'Красиво строишь!': 'Дорога прогресса · ур. 25', 'Ну ты гроссмейстер! 👑': 'Дорога прогресса · ур. 40'},
};
/** Gold for collecting every emoji / every phrase, given once. */
export const COLLECTION_REWARD = {emote: 150, phrase: 200};

const LISTS = {emote: [ALL_EMOTES, DEFAULT_EMOTES, 'emotesOwned', 'emotes', EMOTE_RARITY, OLD_DEFAULT_EMOTES],
  phrase: [ALL_PHRASES, DEFAULT_PHRASES, 'phrasesOwned', 'phrases', PHRASE_RARITY, OLD_DEFAULT_PHRASES]};

/** A wallet that has played before (it had the old free set of five). */
const played = w => !!((w.prog && (w.prog.xp > 0 || w.prog.lvl > 1 || w.prog.games > 0)) || (w.owned || []).length > 1
  || w.daily || (w.roadClaimed || []).length);

export const isDefault = (kind, id) => !!LISTS[kind] && LISTS[kind][1].includes(id);
export const exists = (kind, id) => !!LISTS[kind] && LISTS[kind][0].includes(id);

/** 'base' for the free ones, else common / rare / epic. */
export function rarity(kind, id) {
  if (!exists(kind, id)) return null;
  if (isDefault(kind, id)) return 'base';
  return LISTS[kind][4][id] || 'common';
}

export function price(kind, id) {
  const r = rarity(kind, id);
  return !r || r === 'base' ? 0 : RARITY[r][kind];
}

export function isOwned(w, kind, id) {
  return exists(kind, id) && (isDefault(kind, id) || ((w && w[LISTS[kind][2]]) || []).includes(id));
}

/** What the player owns, in catalogue order (the free ones included). */
export function owned(w, kind) {
  return LISTS[kind][0].filter(id => isOwned(w, kind, id));
}

/**
 * Once per wallet: nothing is taken away from a player who had reactions before they cost gold — whatever an older
 * version let them put in the deck, and the old free set of five if they had played, stay theirs.
 * Returns true when the wallet changed.
 */
export function migrate(w) {
  if (!w || w.reactionsV >= 1) return false;
  const old = played(w);
  for (const kind of Object.keys(LISTS)) {
    const [all, defs, ownKey, deckKey, , oldDefs] = LISTS[kind];
    const had = [...(Array.isArray(w[deckKey]) ? w[deckKey] : []), ...(old ? oldDefs : [])]
      .filter(id => all.includes(id) && !defs.includes(id));
    w[ownKey] = [...new Set([...(w[ownKey] || []), ...had])];
  }
  w.reactionsV = 1;
  return true;
}

/** The deck the game shows: only owned lines, at most 5; the free set when nothing is left. */
export function deck(w, kind) {
  const [, defs, , deckKey] = LISTS[kind];
  const mine = (Array.isArray(w && w[deckKey]) ? w[deckKey] : []).filter(id => isOwned(w, kind, id));
  return (mine.length ? [...new Set(mine)] : defs).slice(0, 5);
}

/** Drops from the saved deck what the player does not own (e.g. a copy edited by hand). */
export function sanitizeDeck(w) {
  if (!w) return;
  for (const kind of Object.keys(LISTS)) {
    const deckKey = LISTS[kind][3];
    if (Array.isArray(w[deckKey])) w[deckKey] = w[deckKey].filter(id => isOwned(w, kind, id)).slice(0, 5);
  }
}

/** Gives one emoji or phrase as a reward (progress road, events). True when it is new. */
export function grant(w, kind, id) {
  if (!exists(kind, id) || isOwned(w, kind, id)) return false;
  const ownKey = LISTS[kind][2];
  w[ownKey] = [...(w[ownKey] || []), id];
  return true;
}

/** Buys one emoji or phrase. {ok, price} or {ok: false, reason: 'unknown' | 'owned' | 'gold', need}. */
export function buy(w, kind, id) {
  if (!exists(kind, id)) return {ok: false, reason: 'unknown'};
  if (isOwned(w, kind, id)) return {ok: false, reason: 'owned'};
  const p = price(kind, id);
  if (!canPay(w, p)) return {ok: false, reason: 'gold', need: p - (w.gold || 0)};
  pay(w, p);
  const ownKey = LISTS[kind][2];
  w[ownKey] = [...(w[ownKey] || []), id];
  return {ok: true, price: p};
}

export function progress(w) {
  return {
    emote: {have: owned(w, 'emote').length, total: ALL_EMOTES.length},
    phrase: {have: owned(w, 'phrase').length, total: ALL_PHRASES.length},
  };
}

/** Gold for a finished collection, once each. Returns the rewards given now: [{kind, gold}]. */
export function claimCollections(w) {
  const done = w.reactionRewards || [], out = [];
  const pr = progress(w);
  for (const kind of Object.keys(LISTS)) {
    if (pr[kind].have === pr[kind].total && !done.includes(kind)) {
      w.gold = (w.gold || 0) + COLLECTION_REWARD[kind];
      done.push(kind);
      out.push({kind, gold: COLLECTION_REWARD[kind]});
    }
  }
  w.reactionRewards = done;
  return out;
}
