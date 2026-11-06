// Card types: edges N E S W (c city, r road, w river, f field, b big-bridge half, x cliff) and how many of each
// are in the stack. Rare cards fill every town/road/field combination the regular set lacks.
// Changing anything here changes every game: tests/golden.test.cjs replays recorded games against it.

export const TYPES = {
  cap:{e:'cfff',n:5,name:'Край города'}, capRS:{e:'crfr',n:4,name:'Город и дорога'},
  capRL:{e:'cfrr',n:3,name:'Город и поворот'}, capRR:{e:'crrf',n:3,name:'Город и поворот'},
  c2:{e:'ccff',n:3,name:'Угол города'}, c2r:{e:'ccrr',n:3,name:'Угол города с дорогой'},
  band:{e:'fcfc',n:2,name:'Городская улица'}, c3:{e:'cccf',n:3,name:'Большой город'},
  c3r:{e:'cccr',n:2,name:'Город с воротами'}, c4:{e:'cccc',n:1,name:'Центр города'},
  rS:{e:'rfrf',n:6,name:'Прямая дорога'}, rC:{e:'ffrr',n:6,name:'Поворот дороги'},
  r3:{e:'frrr',n:3,name:'Развилка'}, r4:{e:'rrrr',n:1,name:'Перекрёсток'},
  fort:{e:'ffff',n:3,fort:true,name:'Монастырь'}, fortR:{e:'ffrf',n:2,fort:true,name:'Монастырь у дороги'},
  wS:{e:'wfwf',n:2,name:'Река'}, wC:{e:'wwff',n:2,name:'Излучина реки'},
  wBr:{e:'wrwr',n:2,name:'Мост через реку'}, brHalf:{e:'fbfr',n:2,bridge:true,name:'Половина большого моста'}, wCity:{e:'wcwf',n:1,name:'Город у реки'},
  wEnd:{e:'wfff',n:2,name:'Исток реки'}, wRC:{e:'wwrr',n:1,name:'Излучина и дорога'},
  wLake:{e:'wwww',n:2,lake:true,name:'Разлив реки'}, wTee:{e:'wwwf',n:2,lake:true,name:'Заводь с протокой'},
  rRock:{e:'rfff',n:2,end:'boulders',name:'Тупик у валунов'}, rMine:{e:'rfff',n:2,end:'mine',name:'Вход в шахту'},
  rEnd:{e:'rfxf',n:1,end:'cliff',name:'Дорога к обрыву'}, rocks:{e:'ffff',n:2,rocks:true,name:'Валуны'},
};
/* Rare pieces: one for every combination of town, road and field edges the regular set lacks,
   so towns and roads can nearly always be finished. Odd river mixes (three or four rivers, a river
   running into a town from several sides) stay impossible on purpose: blocking a spot is part of
   the game. A big-bridge edge only fits the other half of the bridge. */
export const normEdge = k => k;
(() => {
  const rots = s => [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(d => s[(d - r + 4) % 4]).join(''));
  const have = new Set(); for (const id in TYPES) rots([...TYPES[id].e].map(normEdge).join('')).forEach(x => have.add(x));
  const K = 'crf';
  for (const a of K) for (const b of K) for (const c of K) for (const d of K) {
    const e = a + b + c + d; if (have.has(e)) continue;
    rots(e).forEach(x => have.add(x));
    TYPES['x' + e] = {e, n: 1, rare: true, name: rareName(e)};
  }
})();
export function rareName(e) {
  const n = k => [...e].filter(x => x === k).length, parts = [];
  if (n('c')) parts.push('город'); if (n('w')) parts.push(n('w') >= 3 ? 'слияние рек' : 'река'); if (n('r')) parts.push(n('r') >= 3 ? 'развилка' : 'дорога');
  const t = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' и ' + parts[parts.length - 1] : parts[0] || 'поле';
  return t[0].toUpperCase() + t.slice(1);
}

export const isRareTile = type => !!(TYPES[type] && TYPES[type].rare);

/** The cards of one stack for these rules, in TYPES order (shuffled by the caller). */
export function deckList(rules) {
  const d = [], k = rules.mode === 'epic' ? 2 : 1;
  for (const id in TYPES) {
    const t = TYPES[id];
    if (!rules.rivers && t.e.includes('w')) continue;
    if ((rules.mode === 'fast' || rules.mode === 'duel') && t.rare) continue;
    for (let i = 0; i < t.n * (t.rare ? 1 : k); i++) d.push(id);
  }
  return d;
}
