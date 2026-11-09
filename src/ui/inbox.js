// Renders the Notifications screen (inbox): two sections, rewards (with friend requests on top) and news.

export const INBOX_ITEMS = [
  {
    id: 'notif_old_status', category: 'rewards', icon: '🗿', badge: 'Эксклюзив', badgeClass: 'b-gold', requires: 'registered',
    title: 'Статус «Олд» — за регистрацию', date: 'Награда',
    desc: 'Спасибо, что вы с нами с самого начала! Статус «Олд» получают только игроки, которые завели профиль до 2027 года. Его видят соперники в партиях и в рейтинге.',
    rewardType: 'status', rewardKey: 'ex:old', rewardTitle: 'Статус «Олд»', actionLabel: 'Забрать статус'
  },
  {
    id: 'notif_welcome_gold', category: 'rewards', icon: '🪙', badge: 'Подарок', badgeClass: 'b-gold',
    title: 'Подарок: +500 тайлов', date: 'Награда',
    desc: 'Тайлы на витрину: фигурки, рамки, картинки профиля и статусы.',
    rewardType: 'gold', rewardAmount: 500, rewardTitle: '+500 тайлов', actionLabel: 'Забрать 500 тайлов'
  },
  {
    id: 'notif_news_seasons', category: 'news', icon: '🏆', badge: 'Сезоны', badgeClass: 'b-gold',
    title: 'Чемпионы каждые две недели', date: '10.11.2026',
    desc: 'Раз в две недели лучшие игроки рейтинга получают звания: «Чемпион», «Чемпион ×2» и дальше, а места со второго по третье — «Призёр». Рейтинг при этом не сбрасывается.',
    actionLabel: 'Открыть рейтинг', actionLink: 'rating'
  },
  {
    id: 'notif_news_tiles', category: 'news', icon: '🏰', badge: 'Обновление', badgeClass: 'b-purple',
    title: 'Новые плитки и картинки профиля', date: '10.11.2026',
    desc: 'Плитки «Классики» перерисованы так же подробно, как в «Классике 2.0». В витрине появились аватарки и баннеры, а у аватара — квадратная форма и форма-баннер.',
    actionLabel: 'В витрину', actionLink: 'shop'
  }
];

const visible = (items, registered) => items.filter(it => it.requires !== 'registered' || registered);

export function unreadInboxCount(claimed = [], read = [], friendRequests = [], registered = false) {
  const baseCount = visible(INBOX_ITEMS, registered).filter(it => {
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
  filter = 'rewards',
  friendRequests = [],
  registered = false
}) {
  const filtered = visible(items, registered).filter(it => filter === 'all' || it.category === filter);
  const showFriends = (filter === 'all' || filter === 'rewards') && Array.isArray(friendRequests) && friendRequests.length > 0;

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
        <small>${filter === 'news' ? 'Новости игры появятся здесь' : 'Награды и заявки в друзья появятся здесь'}</small>
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
