import re

# 1. Update web/game.html
with open('web/game.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Update itabs buttons in HTML
old_itabs = '<div class="seg itabs" id="itabs"><button data-it="st" aria-pressed="true">Статусы</button><button data-it="fr" aria-pressed="false">Рамки</button><button data-it="fg" aria-pressed="false">Фигурки</button><button data-it="lc" aria-pressed="false">Локации</button></div>'
new_itabs = '<div class="seg itabs" id="itabs"><button data-it="st" aria-pressed="true">Статусы</button><button data-it="fr" aria-pressed="false">Рамки</button><button data-it="fg" aria-pressed="false">Фигурки</button><button data-it="em" aria-pressed="false">Эмоции</button><button data-it="lc" aria-pressed="false">Локации</button></div>'

assert old_itabs in html, "old_itabs not found in game.html"
html = html.replace(old_itabs, new_itabs)

# Update SAYS and renderSayBox
old_says_block = """const SAYS = [
  '👍', '😄', '😮', '😅', '🔥', '👏', '😎', '🤔', '😢', '🎉', '❤️', '🤝', '👑', '⚔️', '🎯', '💪', '🤯', '☕',
  'Привет!', 'Хороший ход!', 'Ой!', 'Ну ты даёшь!', 'Удачи!', 'Спасибо за игру!',
  'Красиво построено!', 'Вот это поворот!', 'Моя очередь?', 'Ещё партию?',
  'Я думал иначе...', 'Всё идёт по плану!', 'Неожиданно!', 'Красивая партия!',
  'Ура!', 'Почти получилось!', 'Секунду, думаю...', 'Отличная игра!'
];"""

new_says_block = """const DEFAULT_EMOTES = ['👑', '🧩', '🏰', '⚔️', '🤝'];
const DEFAULT_PHRASES = [
  'Отличный ход!',
  'Мой замок!',
  'Так и планировал 😎',
  'Удачи за столом! 🤝',
  'Спасибо за игру! ❤️'
];

const ALL_EMOTES = [
  '👑', '🧩', '🏰', '⚔️', '🛡️', '🌊',
  '🌉', '🌲', '🎲', '🏆', '💡', '🧐',
  '🍵', '🔥', '🤝', '🎯', '⏳', '😱',
  '🧱', '🥳', '😎', '😅', '👏', '❤️'
];

const ALL_PHRASES = [
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

const SAYS = [...ALL_EMOTES, ...ALL_PHRASES];"""

assert old_says_block in html, "old_says_block not found in game.html"
html = html.replace(old_says_block, new_says_block)

# Update renderSayBox
old_render_say = """function renderSayBox() {
  const em = SAYS.filter(x => !isText(x)), tx = SAYS.filter(isText);
  $('#sayBox').innerHTML = `<div class="sy-lock">Подождите: прошлое сообщение ещё на экране</div><div class="sy-h">Эмоции</div><div class="sy-e">${em.map(x => `<button class="e" data-say="${SAYS.indexOf(x)}">${x}</button>`).join('')}</div>` +
    `<div class="sy-h">Фразы</div><div class="sy-t">${tx.map(x => `<button data-say="${SAYS.indexOf(x)}">${x}</button>`).join('')}</div>`;
}"""

new_render_say = """function renderSayBox() {
  const chosenEm = (wallet.emotes && wallet.emotes.length) ? wallet.emotes.slice(0, 5) : DEFAULT_EMOTES;
  const chosenTx = (wallet.phrases && wallet.phrases.length) ? wallet.phrases.slice(0, 5) : DEFAULT_PHRASES;
  $('#sayBox').innerHTML = `<div class="sy-lock">Подождите: прошлое сообщение ещё на экране</div>` +
    `<div class="sy-top"><span class="sy-h">Эмоции</span><span class="sy-cnt">${chosenEm.length}/5</span></div>` +
    `<div class="sy-e sy-deck">${chosenEm.map(x => `<button class="e" data-say="${SAYS.indexOf(x)}" title="${x}">${x}</button>`).join('')}</div>` +
    `<div class="sy-top" style="margin-top:10px"><span class="sy-h">Фразы</span><span class="sy-cnt">${chosenTx.length}/5</span></div>` +
    `<div class="sy-t sy-deck">${chosenTx.map(x => `<button data-say="${SAYS.indexOf(x)}" title="${x}">${x}</button>`).join('')}</div>` +
    `<div class="sy-footer"><button type="button" class="sy-deck-btn" id="syDeckBtn">⚙️ Выбрать реакции в «Моих предметах»</button></div>`;
  const sdb = document.getElementById('syDeckBtn');
  if (sdb) sdb.onclick = () => { $('#sayBox').hidden = true; show('items'); itab = 'em'; renderItems(); };
}"""

assert old_render_say in html, "old_render_say not found in game.html"
html = html.replace(old_render_say, new_render_say)

# Update sparks in showSay to trigger for any emoji
old_sparks = "if (!isText(txt) && ['🔥', '🎉', '❤️', '👏', '👑', '⚔️', '🎯', '💪', '🤯'].includes(txt) && !RM) for (let k = 0; k < 7; k++) {"
new_sparks = "if (!isText(txt) && !RM) for (let k = 0; k < 8; k++) {"

assert old_sparks in html, "old_sparks not found in game.html"
html = html.replace(old_sparks, new_sparks)

# Update renderItems in game.html for itab === 'em'
old_tab_branch = """    } else if (itab === 'fg') {
      tabContent = PG.ui.shop.renderItemsFigsHtml({figs: FIGS, ownedFigs: wallet.owned, selectedFig: wallet.fig, figPreviewFn: figPreview});
    } else {
      tabContent = PG.ui.shop.renderItemsLocsHtml(LOCS);
    }"""

new_tab_branch = """    } else if (itab === 'fg') {
      tabContent = PG.ui.shop.renderItemsFigsHtml({figs: FIGS, ownedFigs: wallet.owned, selectedFig: wallet.fig, figPreviewFn: figPreview});
    } else if (itab === 'em') {
      const allE = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.ALL_EMOTES) ? PG.ui.shop.ALL_EMOTES : ALL_EMOTES;
      const allP = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.ALL_PHRASES) ? PG.ui.shop.ALL_PHRASES : ALL_PHRASES;
      tabContent = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.renderItemsEmotesHtml)
        ? PG.ui.shop.renderItemsEmotesHtml({
            allEmotes: allE,
            allPhrases: allP,
            selectedEmotes: wallet.emotes || DEFAULT_EMOTES,
            selectedPhrases: wallet.phrases || DEFAULT_PHRASES,
            maxEmotes: 5,
            maxPhrases: 5
          })
        : '<p>Загрузка реакций...</p>';
    } else {
      tabContent = PG.ui.shop.renderItemsLocsHtml(LOCS);
    }"""

assert old_tab_branch in html, "old_tab_branch not found in game.html"
html = html.replace(old_tab_branch, new_tab_branch)

# Update #itemsBody click listener in game.html for emote & phrase toggles
old_items_click = "const w = t.closest('[data-iwear]'); if (w) { ST().wearStatus(wallet, wallet.statusKey === w.dataset.iwear ? null : w.dataset.iwear); return afterStatusChange(); }"
new_items_click = """const te = t.closest('[data-toggle-emote]');
  if (te) {
    const em = te.dataset.toggleEmote;
    let cur = (wallet.emotes && wallet.emotes.length) ? wallet.emotes.slice() : DEFAULT_EMOTES.slice();
    if (cur.includes(em)) {
      if (cur.length <= 1) { toastAny('В колоде должна остаться хотя бы 1 эмоция'); return; }
      cur = cur.filter(x => x !== em);
    } else {
      if (cur.length >= 5) { toastAny('В колоде максимум 5 эмодзи. Снимите один, чтобы взять другой'); return; }
      cur.push(em);
    }
    wallet.emotes = cur;
    saveWallet();
    renderItems();
    renderSayBox();
    return;
  }
  const tp = t.closest('[data-toggle-phrase]');
  if (tp) {
    const ph = tp.dataset.togglePhrase;
    let cur = (wallet.phrases && wallet.phrases.length) ? wallet.phrases.slice() : DEFAULT_PHRASES.slice();
    if (cur.includes(ph)) {
      if (cur.length <= 1) { toastAny('В колоде должна остаться хотя бы 1 фраза'); return; }
      cur = cur.filter(x => x !== ph);
    } else {
      if (cur.length >= 5) { toastAny('В колоде максимум 5 фраз. Снимите одну, чтобы взять другую'); return; }
      cur.push(ph);
    }
    wallet.phrases = cur;
    saveWallet();
    renderItems();
    renderSayBox();
    return;
  }
  if (t.closest('[data-reset-deck]')) {
    wallet.emotes = DEFAULT_EMOTES.slice();
    wallet.phrases = DEFAULT_PHRASES.slice();
    saveWallet();
    renderItems();
    renderSayBox();
    toastAny('Сброшено на базовую колоду (5 эмодзи + 5 фраз)');
    return;
  }
  const w = t.closest('[data-iwear]'); if (w) { ST().wearStatus(wallet, wallet.statusKey === w.dataset.iwear ? null : w.dataset.iwear); return afterStatusChange(); }"""

assert old_items_click in html, "old_items_click not found in game.html"
html = html.replace(old_items_click, new_items_click)

with open('web/game.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Successfully updated web/game.html")
