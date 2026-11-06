// Unit tests for extracted UI modules: src/ui/shop.js and src/ui/progress.js (E-1.4)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid', async () => {
  const {renderGiftCard, renderGiftTrioShowcase, renderFiguresGrid, renderFramesGrid, renderLocationsGrid} = await import('../src/ui/shop.js');

  // Gift card markup
  const readyCard = renderGiftCard({giftReady: true, chestSvg: '<svg>chest</svg>', boosts: {double: 2}});
  assert.ok(readyCard.includes('class="chest ready"'));
  assert.ok(readyCard.includes('Двойное золото ×2'));
  assert.ok(readyCard.includes('<button class="cta" id="openGift">Открыть</button>'));

  const waitingCard = renderGiftCard({giftReady: false, chestSvg: '<svg>chest</svg>', boosts: {}});
  assert.ok(!waitingCard.includes('ready'));
  assert.ok(!waitingCard.includes('id="openGift"'));

  // Trio showcase ready markup
  const trioReady = renderGiftTrioShowcase({
    giftReady: true,
    day: 1,
    streakDays: [15, 25, 40, 60],
    chestSvg: '<svg>chest</svg>',
    boosts: {double: 1}
  });
  assert.ok(trioReady.includes('Три сундука удачи'));
  assert.ok(trioReady.includes('Выбрать 👆'));
  assert.ok(trioReady.includes('data-gidx="0"'));
  assert.ok(trioReady.includes('data-gidx="1"'));
  assert.ok(trioReady.includes('data-gidx="2"'));

  // Trio showcase claimed markup with revealed contents
  const trioClaimed = renderGiftTrioShowcase({
    giftReady: false,
    day: 1,
    streakDays: [15, 25, 40, 60],
    options: [{title: '+35 золота'}, {title: '×2 золото'}, {title: '+1 фигурка'}],
    chosenIdx: 0,
    nextGiftTimeStr: '08:15:30',
    chestSvg: '<svg>chest</svg>',
    chestOpenedSvg: '<svg>open</svg>'
  });
  assert.ok(trioClaimed.includes('Ваш выбор 🏆'));
  assert.ok(trioClaimed.includes('+35 золота'));
  assert.ok(trioClaimed.includes('А здесь было:'));
  assert.ok(trioClaimed.includes('×2 золото'));
  assert.ok(trioClaimed.includes('08:15:30'));

  // Figures grid markup
  const figs = {
    classic: {name: 'Классик', price: 0},
    knight: {name: 'Рыцарь', price: 150}
  };
  const wallet = {owned: ['classic'], fig: 'classic', gold: 50, frames: []};
  const figPreview = k => `img/${k}.png`;

  const figsHtml = renderFiguresGrid({figs, wallet, figPreview});
  assert.ok(figsHtml.includes('data-fig="classic"'));
  assert.ok(figsHtml.includes('Выбрана'));
  assert.ok(figsHtml.includes('data-fig="knight"'));
  assert.ok(figsHtml.includes('poor')); // gold 50 < 150
  assert.ok(figsHtml.includes('150'));

  // Frames grid markup
  const frames = {
    none: {name: 'Без рамки', price: 0, ring: ''},
    royal: {name: 'Королевская', price: 200, ring: 'gold'}
  };
  const framesHtml = renderFramesGrid({frames, wallet, initial: 'А'});
  assert.ok(framesHtml.includes('data-fr="none"'));
  assert.ok(framesHtml.includes('data-fr="royal"'));
  assert.ok(framesHtml.includes('А'));

  // Locations grid markup
  const locs = [
    {name: 'Замок', open: true, desc: 'Красивый замок', art: '<g></g>'},
    {name: 'Таверна', open: false, desc: 'Уютное место', art: '<g></g>'}
  ];
  const locsHtml = renderLocationsGrid(locs);
  assert.ok(locsHtml.includes('Замок'));
  assert.ok(locsHtml.includes('Открыта'));
  assert.ok(locsHtml.includes('Таверна'));
  assert.ok(locsHtml.includes('Скоро'));

  // Status shop & items markup
  const {renderStatusShopHtml, renderItemsStatusesHtml, renderItemsFramesHtml, renderItemsFigsHtml, renderItemsLocsHtml} = await import('../src/ui/shop.js');
  const shopStatuses = [{id: 'king', text: 'Король', price: 100}, {id: 'baron', text: 'Барон', price: 200}];
  const statusHtml = renderStatusShopHtml({shopStatuses, ownedStatuses: ['sh:king'], wornKey: 'sh:king', gold: 50});
  assert.ok(statusHtml.includes('data-stb="king"'));
  assert.ok(statusHtml.includes('sel'));
  assert.ok(statusHtml.includes('Надет'));
  assert.ok(statusHtml.includes('data-stb="baron"'));
  assert.ok(statusHtml.includes('poor'));

  const itemsStHtml = renderItemsStatusesHtml({
    shopStatuses,
    exclusiveStatuses: [{id: 'champ', ic: '🏆', text: 'Чемпион', how: 'Победите', soon: false}],
    ownedStatuses: ['sh:king'],
    wornKey: 'sh:king',
    statusTextFn: k => k === 'sh:king' ? 'Король' : k
  });
  assert.ok(itemsStHtml.includes('Король'));
  assert.ok(itemsStHtml.includes('data-unwear'));
  assert.ok(itemsStHtml.includes('Чемпион'));

  const itemsFrHtml = renderItemsFramesHtml({frames, ownedFrames: ['none'], wornFrame: 'none', color: '#ff0000', profileInitial: 'K'});
  assert.ok(itemsFrHtml.includes('data-ifr="none"'));
  assert.ok(itemsFrHtml.includes('Королевская'));
  assert.ok(itemsFrHtml.includes('lockd'));

  const itemsFigsHtml = renderItemsFigsHtml({figs, ownedFigs: ['classic'], selectedFig: 'classic', figPreviewFn: figPreview});
  assert.ok(itemsFigsHtml.includes('data-ifig="classic"'));
  assert.ok(itemsFigsHtml.includes('lockd'));

  const itemsLocsHtml = renderItemsLocsHtml(locs);
  assert.ok(itemsLocsHtml.includes('locgrid'));

  // Emotes tab markup
  const {renderItemsEmotesHtml, ALL_EMOTES, ALL_PHRASES, DEFAULT_EMOTES, DEFAULT_PHRASES} = await import('../src/ui/shop.js');
  // three free of each; the rest are bought in the shop or earned (tests/reactions-shop.test.cjs)
  assert.equal(DEFAULT_EMOTES.length, 3);
  assert.equal(DEFAULT_PHRASES.length, 3);
  assert.ok(ALL_EMOTES.length >= 20);
  assert.ok(ALL_PHRASES.length >= 20);

  const emotesHtml = renderItemsEmotesHtml({
    allEmotes: ALL_EMOTES,
    allPhrases: ALL_PHRASES,
    selectedEmotes: ['👑', '🧩'],
    selectedPhrases: ['Отличный ход!'],
    maxEmotes: 5,
    maxPhrases: 5
  });
  assert.ok(emotesHtml.includes('deck-summary-card'));
  assert.ok(emotesHtml.includes('data-toggle-emote="👑"'));
  assert.ok(emotesHtml.includes('data-toggle-phrase="Отличный ход!"'));
  assert.ok(emotesHtml.includes('data-reset-deck'));
});

test('ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard', async () => {
  const {ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard} = await import('../src/ui/progress.js');

  // Ring SVG
  const ring = ringSvg(0.5);
  assert.ok(ring.includes('<svg width="58" height="58"'));
  assert.ok(ring.includes('stroke-dasharray'));

  // Mastery grid
  const byMode = {
    bots: {games: 10, wins: 8, best: 70},
    friends: {games: 2, wins: 1, best: 40},
    online: {games: 0, wins: 0, best: 0}
  };
  const masteryHtml = renderMasteryGrid(byMode);
  assert.ok(masteryHtml.includes('Боты'));
  assert.ok(masteryHtml.includes('80% (8/10) · рек. 70'));
  assert.ok(!masteryHtml.includes('Дуэль'), 'no duel tile');
  assert.ok(masteryHtml.includes('Друзья'));
  assert.ok(masteryHtml.includes('Онлайн'));

  // Building stats
  const buildHtml = renderBuildingStats({c: 12, r: 25, f: 4, maxCity: 14});
  assert.ok(buildHtml.includes('12</b> городов'));
  assert.ok(buildHtml.includes('рекорд: 14 карт'));
  assert.ok(buildHtml.includes('25</b> дорог'));
  assert.ok(buildHtml.includes('4</b> монастырей'));

  // Collection card
  const col = {
    id: 'court',
    name: 'Королевский двор',
    desc: 'Набор знати',
    reward: 200,
    ic: '👑',
    figs: ['knight'],
    frames: ['royal']
  };
  const prog = {
    isComplete: true,
    isClaimed: false,
    done: 2,
    total: 2,
    figsDone: new Set(['knight']),
    framesDone: new Set(['royal'])
  };
  const figs = {knight: {name: 'Рыцарь'}};
  const frames = {royal: {name: 'Королевская', ring: 'gold'}};
  const cardHtml = renderCollectionCard(col, prog, figs, frames, {color: '#ef5350'}, k => k, 'П');

  assert.ok(cardHtml.includes('Королевский двор'));
  assert.ok(cardHtml.includes('+200'));
  assert.ok(cardHtml.includes('data-claimcol="court"'));
  assert.ok(cardHtml.includes('Забрать +200'));

  // Rewards tab and history markup
  const {renderRewardsTabHtml, renderHistoryHtml} = await import('../src/ui/progress.js');
  const rewardsHtml = renderRewardsTabHtml({
    progQuests: [{id: 'c3', n: 3, got: false}],
    questDefs: [{id: 'c3', ic: '🏰', t: '3 города', n: 3, g: 15}],
    progWeekly: [{id: 'w1', n: 5, got: true}],
    weeklyDefs: [{id: 'w1', ic: '🏆', t: '5 побед', n: 5, g: 50}],
    weeklyChestGold: 100,
    weeklyChestClaimed: false,
    achDefs: [{id: 'a1', ic: '🥇', t: 'Первая', d: 'Победа', ok: () => true, g: 20}],
    progAch: {a1: 'got'},
    progStats: {wins: 1},
    progLvl: 2,
    rewardReady: true
  });
  assert.ok(rewardsHtml.includes('data-claimq="c3"'));
  assert.ok(rewardsHtml.includes('Задания на сегодня'));
  assert.ok(rewardsHtml.includes('Недельные цели'));
  assert.ok(rewardsHtml.includes('Большой сундук недели'));
  assert.ok(rewardsHtml.includes('Есть награды: заберите их ниже'));

  const historyHtml = renderHistoryHtml([
    {
      id: 'o:room1',
      at: 1700000000000,
      reason: 'end',
      players: [
        {name: 'Аня', score: 45, me: true, uid: 'u1', col: '#ef5350'},
        {name: 'Боря', score: 30, me: false, uid: 'u2', col: '#4c8dff'}
      ]
    }
  ], uid => uid === 'u2');
  assert.ok(historyHtml.includes('Победа'));
  assert.ok(historyHtml.includes('онлайн'));
  assert.ok(historyHtml.includes('data-pl="u2"'));

  // Dedicated achievements screen markup
  const {renderAchievementsHtml} = await import('../src/ui/progress.js');
  const achHtml = renderAchievementsHtml({
    achDefs: [
      {id: 'a1', ic: '🥇', t: 'Первая победа', d: 'Выиграйте матч', ok: () => true, g: 30, tier: 1},
      {id: 'a2', ic: '👑', t: 'Король стола', d: 'Наберите 100 очков', ok: () => false, g: 50, tier: 3}
    ],
    progAch: {a1: 'got'},
    progStats: {wins: 1},
    progLvl: 2
  });
  assert.ok(achHtml.includes('Зал славы королевства'));
  assert.ok(achHtml.includes('Первая победа'));
  assert.ok(achHtml.includes('Король стола'));
  assert.ok(achHtml.includes('Получено ✓'));
  assert.ok(achHtml.includes('В процессе'));
  assert.ok(achHtml.includes('tier-1'));

  // Separate shop stalls showcase (5 stalls: figures, frames, statuses, emotes, phrases)
  const {renderShopStallsShowcase, getStallUnownedItems} = await import('../src/ui/shop.js');
  const unownedSample = [
    {key: '1', price: 10}, {key: '2', price: 20}, {key: '3', price: 30},
    {key: '4', price: 40}, {key: '5', price: 50}, {key: '6', price: 60},
    {key: '7', price: 70}, {key: '8', price: 80}
  ];
  const picked6 = getStallUnownedItems(unownedSample, '2026-11-07:test', 6);
  assert.equal(picked6.length, 6, 'max 6 items per stall');

  const stallsHtml = renderShopStallsShowcase({
    figs: {
      guard: {name: 'Стражник', price: 100},
      merchant: {name: 'Купец', price: 150}
    },
    frames: {
      silver: {name: 'Серебряная', price: 80, ring: 'silver'}
    },
    statuses: [
      {id: 'st1', text: 'Барон', price: 50}
    ],
    wallet: {gold: 500, owned: ['classic'], frames: [], statuses: []},
    figPreview: k => `img/${k}.png`,
    initial: 'П',
    date: new Date('2026-11-07T12:00:00Z')
  });

  assert.ok(stallsHtml.includes('Прилавок резных фигурок'));
  assert.ok(stallsHtml.includes('Прилавок рамок мастера'));
  assert.ok(stallsHtml.includes('Прилавок благородных статусов'));
  assert.ok(stallsHtml.includes('Прилавок живых эмоций'));
  assert.ok(stallsHtml.includes('Прилавок крылатых фраз'));
  assert.ok(stallsHtml.includes('fig-pedestal-wrap'));
  assert.ok(stallsHtml.includes('stall-3x2'));
});
