// Feedback categories, styling, and formatting of feedback telemetry payloads

export const FEEDBACK_CATS = [
  {k: 'bug', ic: '🐛', t: 'Баг'},
  {k: 'lag', ic: '⚡', t: 'Лаги'},
  {k: 'idea', ic: '💡', t: 'Идея'},
  {k: 'other', ic: '💬', t: 'Другое'}
];

export const FEEDBACK_COLORS = {
  bug: '#ef5350',
  lag: '#ff7043',
  idea: '#f2994a',
  other: '#4c8dff'
};

export const FEEDBACK_PLACEHOLDERS = {
  bug: 'Опишите, что пошло не так, на каком экране или при каком действии…',
  lag: 'Где именно лагает, падает FPS или игра зависает? Сколько длится зависание?…',
  idea: 'Какую новую механику, режим или фишку вы хотите увидеть в игре?…',
  other: 'Ваш отзыв, впечатление или вопрос к разработчику…'
};

export const FEEDBACK_STAR_LABELS = {
  0: 'Нажмите на звезду, чтобы оценить',
  1: '1/5 — Много багов / не понравилось',
  2: '2/5 — Есть проблемы и баги',
  3: '3/5 — Нормально, но есть над чем работать',
  4: '4/5 — Хорошо, нравится!',
  5: '5/5 — Отличная игра! 🔥'
};

/**
 * Creates the feedback payload sent to Firebase Realtime DB
 */
export function formatFeedbackPayload({cat, msg, stars, ver, attachDiag, diag}) {
  const body = {
    k: cat || 'idea',
    m: String(msg || '').slice(0, 1500),
    stars: typeof stars === 'number' && stars > 0 ? stars : 0,
    v: ver || 'web',
    t: {'.sv': 'timestamp'}
  };
  if (attachDiag && diag) {
    body.device = {
      os: diag.os || '',
      screen: diag.screen || '',
      cores: diag.cores || 0,
      ram: diag.ram || 0,
      net: diag.net || '',
      fps: diag.fps || 0,
      lags: diag.lagsRecorded || 0
    };
  }
  return body;
}

/**
 * Generates the HTML content for the feedback dialog card
 */
export function renderFeedbackCardHtml({first, namePromo, stars = 0, starLabel, cat, placeholder, diagSummary}) {
  const currentStars = typeof stars === 'number' ? stars : 0;
  const starsHtml = [1, 2, 3, 4, 5].map(v =>
    `<button type="button" class="fb-star${currentStars > 0 && v <= currentStars ? ' active' : ''}" data-val="${v}" aria-label="${v} ${v === 1 ? 'звезда' : v < 5 ? 'звезды' : 'звёзд'}">⭐</button>`
  ).join('');

  // Plain colour tiles (a jigsaw outline with tabs crowded four labels into a narrow dialog and looked broken).
  const catsHtml = FEEDBACK_CATS.map(c =>
    `<button class="fbcat fb-cat${c.k === cat ? ' sel' : ''}" data-cat="${c.k}" style="--cc:${FEEDBACK_COLORS[c.k]}"><i>${c.ic}</i><span>${c.t}</span></button>`
  ).join('');

  return `<div class="ocard fbcard">
    <div class="jig shero small" id="fbHero"><div class="mhero"><span class="mhi">💬</span><div><b>Поддержка и отзывы</b><p>Оценки, идеи и сообщения об ошибках</p></div></div></div>
    ${first ? '<p class="fbgift">🎁 +10 золота за первое сообщение</p>' : ''}
    ${namePromo || ''}
    <div style="font-size:12px;font-weight:700;color:var(--muted);text-align:center;margin-top:2px">Оцените игру:</div>
    <div class="fb-stars" id="fbStars" role="radiogroup" aria-label="Оценка">${starsHtml}</div>
    <div class="fb-star-label" id="fbStarLabel">${starLabel}</div>
    <div class="fbcats" id="fbCats">${catsHtml}</div>
    <textarea id="fbText" class="fbtext" rows="3" placeholder="${placeholder}"></textarea>
    <div class="fb-diag">
      <label class="fb-diag-check">
        <input type="checkbox" id="fbAttachDiag" checked>
        <span>Прикрепить данные устройства для диагностики</span>
      </label>
      <div style="font-size:11px;opacity:.7">${diagSummary || ''}</div>
    </div>
    <button class="cta wide" id="fbSend">Отправить${first ? ' (+10 золота)' : ''}</button>
    <button class="ghostbtn" id="fbCancel">Отмена</button>
  </div>`;
}
