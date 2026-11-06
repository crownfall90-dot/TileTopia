with open('src/ui/shop.js', 'r', encoding='utf-8') as f:
    content = f.read()

append_code = '''

export const DEFAULT_EMOTES = ['👑', '🧩', '🏰', '⚔️', '🤝'];
export const DEFAULT_PHRASES = [
  'Отличный ход!',
  'Мой замок!',
  'Так и планировал 😎',
  'Удачи за столом! 🤝',
  'Спасибо за игру! ❤️'
];

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

/** Generates HTML markup for Emotes and Phrases customization tab in "My items". */
export function renderItemsEmotesHtml({
  allEmotes = ALL_EMOTES,
  allPhrases = ALL_PHRASES,
  selectedEmotes = DEFAULT_EMOTES,
  selectedPhrases = DEFAULT_PHRASES,
  maxEmotes = 5,
  maxPhrases = 5
}) {
  const curEm = selectedEmotes && selectedEmotes.length ? selectedEmotes : DEFAULT_EMOTES;
  const curPh = selectedPhrases && selectedPhrases.length ? selectedPhrases : DEFAULT_PHRASES;

  const summaryHtml = `
    <div class="deck-summary-card">
      <div class="deck-header">
        <div class="deck-title">
          <span class="deck-icon">⚡</span>
          <div>
            <b>Колода реакций для партий</b>
            <small>Выберите до ${maxEmotes} эмоций и ${maxPhrases} фраз для быстрых реплик в игре</small>
          </div>
        </div>
        <button class="ghostbtn sm" data-reset-deck>Сброс</button>
      </div>

      <div class="deck-slots-box">
        <div class="deck-slot-group">
          <div class="deck-slot-title">
            <span>Эмоции для быстрых ответов</span>
            <span class="deck-count ${curEm.length === maxEmotes ? 'full' : ''}">${curEm.length} / ${maxEmotes}</span>
          </div>
          <div class="deck-active-emotes">
            ${curEm.map(em => `<span class="deck-active-chip e" data-toggle-emote="${em}" title="Нажмите, чтобы убрать">${em}</span>`).join('')}
            ${Array.from({length: Math.max(0, maxEmotes - curEm.length)}).map(() => '<span class="deck-empty-chip">+</span>').join('')}
          </div>
        </div>

        <div class="deck-slot-group">
          <div class="deck-slot-title">
            <span>Фразы для чата</span>
            <span class="deck-count ${curPh.length === maxPhrases ? 'full' : ''}">${curPh.length} / ${maxPhrases}</span>
          </div>
          <div class="deck-active-phrases">
            ${curPh.map(ph => `<span class="deck-active-chip t" data-toggle-phrase="${ph}" title="Нажмите, чтобы убрать">${ph}</span>`).join('')}
            ${Array.from({length: Math.max(0, maxPhrases - curPh.length)}).map(() => '<span class="deck-empty-chip t">+</span>').join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const emotesGridHtml = `
    <div class="h3 sec" style="display:flex;justify-content:space-between;align-items:center">
      <span>Все эмоции (${allEmotes.length})</span>
      <small style="color:var(--muted);font-weight:normal">нажмите для добавления в колоду</small>
    </div>
    <div class="emotes-catalog-grid">
      ${allEmotes.map(em => {
        const isSel = curEm.includes(em);
        return `
          <button class="em-cat-btn${isSel ? ' sel' : ''}" data-toggle-emote="${em}" title="${em}">
            <span class="em-icon">${em}</span>
            <span class="em-badge">${isSel ? '✓' : '+'}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  const phrasesGridHtml = `
    <div class="h3 sec" style="margin-top:20px;display:flex;justify-content:space-between;align-items:center">
      <span>Все реплики (${allPhrases.length})</span>
      <small style="color:var(--muted);font-weight:normal">нажмите для выбора</small>
    </div>
    <div class="phrases-catalog-list">
      ${allPhrases.map(ph => {
        const isSel = curPh.includes(ph);
        return `
          <button class="ph-cat-btn${isSel ? ' sel' : ''}" data-toggle-phrase="${ph}">
            <span class="ph-text">${ph}</span>
            <span class="ph-badge">${isSel ? '✓ В колоде' : '+ Добавить'}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  return summaryHtml + emotesGridHtml + phrasesGridHtml;
}
'''

with open('src/ui/shop.js', 'w', encoding='utf-8') as f:
    f.write(content.rstrip() + append_code)
print('Successfully appended to src/ui/shop.js')
