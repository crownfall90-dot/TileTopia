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

export function unreadInboxCount(claimed = [], read = [], friendRequests = []) {
  const baseCount = INBOX_ITEMS.filter(it => {
    if (it.rewardType && !claimed.includes(it.id)) return true;
    if (!it.rewardType && !read.includes(it.id)) return true;
    return false;
  }).length;
  const fCount = Array.isArray(friendRequests) ? friendRequests.length : 0;
  return baseCount + fCount;
}

export function renderInboxHtml({
  items = INBOX_ITEMS,
  claimed = [],
  filter = 'all',
  friendRequests = []
}) {
  const filtered = items.filter(it => filter === 'all' || it.category === filter);
  const showFriends = (filter === 'all' || filter === 'friends') && Array.isArray(friendRequests) && friendRequests.length > 0;

  let friendCardsHtml = '';
  if (showFriends) {
    friendCardsHtml = friendRequests.map(([k, v]) => {
      const fromUid = k.slice(0, -2);
      const safeName = String(v && v.n ? v.n : 'Игрок').replace(/[<>&"']/g, '').slice(0, 20);
      return `
        <div class="notif-card friends notif-friend-card" data-fkey="${k}">
          <div class="nc-top">
            <div class="nc-header">
              <span class="nc-icon notif-friend-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </span>
              <div class="nc-titles">
                <div class="nc-badge-row">
                  <span class="nc-badge b-blue">Заявка в друзья</span>
                  <span class="nc-date">Новое</span>
                </div>
                <b class="nc-title">${safeName} хочет дружить</b>
              </div>
            </div>
          </div>

          <div class="nc-desc">Игрок <b>${safeName}</b> хочет добавить вас в друзья. Примите заявку, чтобы видеть статус в сети и быстро приглашать друг друга в партии.</div>

          <div class="nc-actions">
            <button class="nc-claim-btn pri notif-btn-accept" data-facc="${fromUid}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="vertical-align:-2px;margin-right:4px"><path d="M20 6L9 17l-5-5"/></svg>
              Принять заявку
            </button>
            <button class="nc-link-btn notif-btn-drop" data-fdrop="${k}">
              Отклонить
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  if (!filtered.length && !friendCardsHtml) {
    return `
      <div class="notif-empty">
        <span class="ne-icon">📭</span>
        <b>В этой категории пока пусто</b>
        <small>Новые награды, промокоды и заявки появятся здесь</small>
      </div>
    `;
  }

  const itemsHtml = filtered.map(it => {
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

  return friendCardsHtml + itemsHtml;
}
