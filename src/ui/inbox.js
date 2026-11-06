// Renders the Notifications & Rewards screen (inbox): developer rewards, promo codes, patch notes.

export const INBOX_ITEMS = [
  {
    id: 'notif_old_status',
    category: 'rewards',
    icon: '🗿',
    badge: 'Эксклюзив',
    badgeClass: 'b-gold',
    title: 'Эксклюзивный статус ветерана: «Олд»',
    date: 'Сегодня',
    desc: 'Награда первопроходца TileTopia! Заберите легендарный эксклюзивный статус ветерана «Олд» для отображения в профиле, лобби и онлайн-партиях.',
    rewardType: 'status',
    rewardKey: 'ex:old',
    rewardTitle: 'Статус «Олд» 🗿',
    actionLabel: 'Забрать статус'
  },
  {
    id: 'notif_welcome_gold',
    category: 'rewards',
    icon: '🪙',
    badge: 'Подарок',
    badgeClass: 'b-gold',
    title: 'Приветственный дар: +500 золота',
    date: 'Сегодня',
    desc: 'В честь масштабного визуального обновления дарим вам 500 золотых монет на покупку новых анимированных голографических рамок и фигурок!',
    rewardType: 'gold',
    rewardAmount: 500,
    rewardTitle: '+500 🪙',
    actionLabel: 'Забрать +500 🪙'
  },
  {
    id: 'notif_promo_diorama',
    category: 'promo',
    icon: '🎟️',
    badge: 'Промокод',
    badgeClass: 'b-blue',
    title: 'Секретный промокод: DIORAMA3D',
    date: 'Вчера',
    desc: 'Промокод разработчиков на +300 золота в честь релиза 3D-плиток и 6-сторонних гексов. Нажмите кнопку для мгновенной активации!',
    rewardType: 'promo',
    promoCode: 'DIORAMA3D',
    rewardTitle: '+300 🪙',
    actionLabel: 'Активировать DIORAMA3D'
  },
  {
    id: 'notif_news_diorama',
    category: 'news',
    icon: '🏰',
    badge: 'Обновление',
    badgeClass: 'b-purple',
    title: '3D-мир Tiletopia: Диорамы и Гексы',
    date: '06.11.2026',
    desc: 'В игру добавлены детализированные настольные 3D-диорамы: реки, каменные мосты, озера, большой акведук, деревни, цитадели и монастыри! Доступны классический режим (4 стороны) и гексагональный (6 сторон), а также настраиваемая колода реакций (5 эмодзи + 5 фраз).',
    actionLabel: 'В «Мои предметы»',
    actionLink: 'items'
  },
  {
    id: 'notif_news_cups',
    category: 'news',
    icon: '🏆',
    badge: 'Сезон',
    badgeClass: 'b-gold',
    title: 'Сезонный турнир: играйте за кубки',
    date: '04.11.2026',
    desc: 'Участвуйте в онлайн-партиях, сражайтесь за кубки рейтинга и поднимайтесь на вершину Зала Славы в профиле!',
    actionLabel: 'Открыть Зал Славы',
    actionLink: 'rating'
  }
];

export function unreadInboxCount(claimed = [], read = []) {
  return INBOX_ITEMS.filter(it => {
    if (it.rewardType && !claimed.includes(it.id)) return true;
    if (!it.rewardType && !read.includes(it.id)) return true;
    return false;
  }).length;
}

export function renderInboxHtml({
  items = INBOX_ITEMS,
  claimed = [],
  filter = 'all'
}) {
  const filtered = items.filter(it => filter === 'all' || it.category === filter);

  if (!filtered.length) {
    return `
      <div class="notif-empty">
        <span class="ne-icon">📭</span>
        <b>В этой категории пока пусто</b>
        <small>Новые награды и промокоды появятся здесь</small>
      </div>
    `;
  }

  return filtered.map(it => {
    const isClaimed = claimed.includes(it.id);
    const hasReward = !!it.rewardType;

    return `
      <div class="notif-card ${it.category} ${isClaimed ? 'claimed' : ''}" data-nid="${it.id}">
        <div class="nc-top">
          <div class="nc-header">
            <span class="nc-icon">${it.icon}</span>
            <div class="nc-titles">
              <div class="nc-badge-row">
                <span class="nc-badge ${it.badgeClass || ''}">${it.badge}</span>
                <span class="nc-date">${it.date}</span>
              </div>
              <b class="nc-title">${it.title}</b>
            </div>
          </div>
          ${hasReward ? `
            <div class="nc-reward-pill ${isClaimed ? 'done' : ''}">
              ${isClaimed ? '✓ Получено' : it.rewardTitle}
            </div>
          ` : ''}
        </div>

        <div class="nc-desc">${it.desc}</div>

        <div class="nc-actions">
          ${hasReward ? `
            <button class="nc-claim-btn ${isClaimed ? 'done' : 'pri'}" data-claim-notif="${it.id}" ${isClaimed ? 'disabled' : ''}>
              ${isClaimed ? '✓ Забрано' : `🎁 ${it.actionLabel}`}
            </button>
          ` : `
            <button class="nc-link-btn" data-notif-link="${it.actionLink || 'menu'}">
              ${it.actionLabel} →
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}
