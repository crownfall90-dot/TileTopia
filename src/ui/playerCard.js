// Player card modal & report dialog UI components
// Clean, readable primary info, actions (friend, room invite, report with reasons)
// No standard emojis - custom styled vector SVGs throughout.

/** Formats online presence string and badge status. */
export function formatPresenceDetails(pres, lead, stateTextMap = {}) {
  const lastT = (pres && pres.t) || (lead && lead.t) || 0;
  const ago = lastT ? Math.round((Date.now() - lastT) / 60000) : null;
  const isOnline = Boolean(pres && pres.s && pres.s !== 'off' && (ago == null || ago < 3));

  let seenText = 'Офлайн';
  if (isOnline) {
    seenText = (stateTextMap && pres && stateTextMap[pres.s]) || 'В игре';
  } else if (ago != null) {
    if (ago < 1) seenText = 'только что';
    else if (ago < 60) seenText = `${ago} мин назад`;
    else if (ago < 1440) seenText = `${Math.round(ago / 60)} ч назад`;
    else if (Math.round(ago / 1440) === 1) seenText = 'вчера';
    else seenText = `${Math.round(ago / 1440)} дн назад`;
  }

  return {
    isOnline,
    seenText,
    badgeText: isOnline ? `В сети · ${seenText}` : `Был(а) ${seenText}`,
  };
}

/** Formats primary player card HTML modal. */
export function renderPlayerCardHtml({
  uid = '',
  name = 'Игрок',
  col = '#5b6684',
  frame = '',
  statusText = '',
  cups = 0,
  wins = 0,
  games = 0,
  isOnline = false,
  seenText = 'Офлайн',
  isFriend = false,
  isMe = false,
  pendingInvite = false,
  incomingRequest = false,
  hasActiveRoom = false,
  roomCode = '',
  frameRing = '',
  achievements = null,
  achTotal = 0,
  level = null,
  hasBanner = false,
  bannerSrc = '',
  bannerPos = 'center',
}) {
  const cleanName = String(name || 'Игрок').replace(/[<>&"']/g, '').slice(0, 20);
  const initial = (cleanName[0] || '?').toUpperCase();
  const safeCol = (/^#[0-9a-fA-F]{3,8}$/.test(col) || /^rgb/i.test(col)) ? col : '#5b6684';
  const safeFrame = String(frame || '').replace(/[^\w-]/g, '');

  const winrate = (games > 0 && wins > 0) ? Math.min(100, Math.round((wins / games) * 100)) : null;

  // Status badge if equipped
  const statusBadge = statusText
    ? `<span class="pl-v2-status-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffd875" stroke-width="2.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <em class="fst">${String(statusText).replace(/[<>&"']/g, '')}</em></span>`
    : '';

  // Online indicator pill
  const onlinePill = isOnline
    ? `<span class="pl-v2-badge on"><i class="pl-v2-dot"></i> <span>В сети</span>${seenText && seenText !== 'В сети' ? `<small> · ${seenText}</small>` : ''}</span>`
    : `<span class="pl-v2-badge off"><i class="pl-v2-dot"></i> <span>${seenText.startsWith('Был') || seenText === 'Офлайн' ? seenText : 'Был(а) ' + seenText}</span></span>`;

  // Action buttons
  let actionsHtml = '';
  if (isMe) {
    actionsHtml = `
      <button class="cta wide pl-v2-act-btn" id="plEditSelf">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>Редактировать профиль</span>
      </button>
      <button class="ghostbtn pl-v2-act-btn" id="plNo">Закрыть</button>
    `;
  } else {
    // 1. Invite to room button (creates customizable room or invites directly)
    const roomSub = hasActiveRoom && roomCode ? `в комнату ${roomCode}` : 'в новую комнату';
    const inviteBtn = `
      <button class="cta wide pl-v2-act-btn invite-btn" id="plInviteRoom" title="Создать настраиваемую комнату и пригласить игрока">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 12h4m-2-2v4"/><circle cx="17" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/>
        </svg>
        <span>Пригласить в комнату</span>
        <small class="pl-btn-sub">(${roomSub})</small>
      </button>
    `;

    // 2. Friend relation button
    let friendAction = '';
    if (incomingRequest) {
      friendAction = `
        <button class="cta wide pl-v2-act-btn accept-btn" id="plAcceptFriend">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          <span>Принять заявку в друзья</span>
        </button>
      `;
    } else if (isFriend) {
      friendAction = `
        <div class="pl-v2-friend-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.4" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          <span>В друзьях</span>
          <button class="pl-v2-del-link" id="plDel" title="Удалить из друзей">Удалить</button>
        </div>
      `;
    } else if (pendingInvite) {
      friendAction = `
        <button class="ghostbtn wide pl-v2-act-btn" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Заявка отправлена</span>
        </button>
      `;
    } else {
      friendAction = `
        <button class="cta wide pl-v2-act-btn friend-btn" id="plAdd">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <span>Предложить дружить</span>
        </button>
      `;
    }

    // 3. Secondary row action: report
    const secondaryActions = `
      <div class="pl-v2-sub-row">
        <button class="chip pl-v2-chip danger-chip" id="plReport" aria-label="Пожаловаться на игрока">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          <span>Пожаловаться</span>
        </button>
      </div>
    `;

    actionsHtml = inviteBtn + friendAction + secondaryActions;
  }

  const bannerCls = (hasBanner && bannerSrc) ? ' has-banner' : '';
  const bannerStyle = (hasBanner && bannerSrc) ? ` style="--banner-bg:url(${bannerSrc});--banner-pos:${bannerPos}"` : '';

  return `
    <div class="ocard prof pcard pl-dialog-v2${bannerCls}"${bannerStyle}>
      <button class="pl-v2-close" id="plCloseBtn" aria-label="Закрыть">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <!-- Player Identity Header -->
      <div class="pl-v2-header">
        <div class="pl-v2-av-box" style="--pl-c:${safeCol}">
          <span class="pl-v2-av${frameRing ? ' fr' : ''}" style="--c:${safeCol}${frameRing ? ';--fr:' + String(frameRing).replace(/[;"<>]/g, '') : ''}">${initial}</span>${level != null ? `<span class="pl-v2-lvl">${+level || 1}</span>` : ''}
        </div>
        <div class="pl-v2-identity">
          <h3 class="pl-v2-name">${cleanName}</h3>
          ${statusBadge}
          <div class="pl-v2-presence-row">${onlinePill}</div>
        </div>
      </div>

      <!-- Quick Stats 3-tile Grid (SVG icons, no standard emojis) -->
      <div class="pl-v2-stats">
        <div class="pl-v2-stat" title="Кубки рейтинга">
          <div class="pl-v2-stat-icon cup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd875" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M6 3h12v7a6 6 0 0 1-12 0V3z"/><path d="M12 16v4"/><path d="M8 20h8"/>
            </svg>
          </div>
          <b class="pl-v2-stat-val" id="plCupsVal">${cups}</b>
          <small class="pl-v2-stat-lbl">Кубки</small>
        </div>

        <div class="pl-v2-stat" title="Количество побед">
          <div class="pl-v2-stat-icon win">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
          </div>
          <b class="pl-v2-stat-val" id="plWinsVal">${wins}</b>
          <small class="pl-v2-stat-lbl">${winrate != null ? `Победы (${winrate}%)` : 'Победы'}</small>
        </div>

        <div class="pl-v2-stat" title="Всего сыграно партий">
          <div class="pl-v2-stat-icon game">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
            </svg>
          </div>
          <b class="pl-v2-stat-val" id="plGamesVal">${games}</b>
          <small class="pl-v2-stat-lbl">Партий</small>
        </div>
        <div class="pl-v2-stat" title="Достижения">
          <div class="pl-v2-stat-icon ach">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f2b84b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>
          </div>
          <b class="pl-v2-stat-val" id="plAchVal">${achievements != null ? +achievements : '—'}</b>
          <small class="pl-v2-stat-lbl">${achTotal ? `из ${+achTotal}` : 'Достижения'}</small>
        </div>
      </div>

      <!-- Actions Area -->
      <div class="pl-v2-actions">
        ${actionsHtml}
      </div>
    </div>
  `;
}

/** Formats report dialog modal with reasons and comment field. */
export function renderReportDialogHtml({
  uid = '',
  name = 'Игрок',
}) {
  const cleanName = String(name || 'Игрок').replace(/[<>&"']/g, '').slice(0, 24);

  return `
    <div class="ocard prof report-dialog-v2" id="reportDialogCard">
      <div class="rep-v2-head">
        <div class="rep-v2-ic">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <h3 class="rep-v2-title">Пожаловаться на игрока</h3>
          <p class="rep-v2-name">«<b>${cleanName}</b>»</p>
        </div>
      </div>

      <p class="rep-v2-prompt">Выберите причину нарушения для модерации:</p>

      <div class="rep-v2-reasons" id="repReasonList">
        <label class="rep-v2-item">
          <input type="radio" name="repReasonChoice" value="offensive_name" checked>
          <span class="rep-v2-text">
            <b>Оскорбительный никнейм или статус</b>
            <small>Мат, оскорбления, запрещённые темы, реклама</small>
          </span>
        </label>

        <label class="rep-v2-item">
          <input type="radio" name="repReasonChoice" value="unsporting_afk">
          <span class="rep-v2-text">
            <b>Неспортивное поведение / AFK</b>
            <small>Умышленная затяжка времени, бойкот игры</small>
          </span>
        </label>

        <label class="rep-v2-item">
          <input type="radio" name="repReasonChoice" value="cheating_exploit">
          <span class="rep-v2-text">
            <b>Читерство / Использование багов</b>
            <small>Подозрительные разрывы связи, эксплойты</small>
          </span>
        </label>

        <label class="rep-v2-item">
          <input type="radio" name="repReasonChoice" value="spam_disruption">
          <span class="rep-v2-text">
            <b>Спам эмодзи / помеха игре</b>
            <small>Флуд реакциями, спам инвайтами</small>
          </span>
        </label>

        <label class="rep-v2-item">
          <input type="radio" name="repReasonChoice" value="other">
          <span class="rep-v2-text">
            <b>Другая причина</b>
            <small>Опишите детали в поле ниже</small>
          </span>
        </label>
      </div>

      <div class="rep-v2-comment-box">
        <textarea class="field rep-v2-textarea" id="repCommentInput" rows="2" maxlength="300" placeholder="Подробности нарушения (необязательно)…"></textarea>
      </div>

      <div class="rep-v2-actions">
        <button class="cta wide danger-cta" id="btnSubmitReport">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          <span>Отправить жалобу</span>
        </button>
        <button class="ghostbtn" id="btnCancelReport">Отмена</button>
      </div>
    </div>
  `;
}
