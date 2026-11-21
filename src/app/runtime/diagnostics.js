// Telemetry, Device Diagnostics & Performance lag tracking
window._recentLags = [];
window._actionTrail = [];
function recordAction(action) {
  try {
    window._actionTrail.push({a: String(action).slice(0, 60), t: Date.now()});
    if (window._actionTrail.length > 20) window._actionTrail.shift();
  } catch (_) {}
}

let lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
let frameCount = 0;
let lastFpsCheck = lastFrameTime;
window._currentFps = 60;
function perfTick(now) {
  try {
    const delta = now - lastFrameTime;
    lastFrameTime = now;
    frameCount++;
    if (now - lastFpsCheck >= 1000) {
      window._currentFps = Math.round((frameCount * 1000) / (now - lastFpsCheck));
      frameCount = 0;
      lastFpsCheck = now;
    }
    if (delta > 250 && typeof document !== 'undefined' && !document.hidden && window.boot && window.boot.gone) {
      const cur = (document.querySelector('.screen:not([hidden])') || {}).id || 'menu';
      window._recentLags.push({ms: Math.round(delta), scr: cur, t: Date.now()});
      if (window._recentLags.length > 10) window._recentLags.shift();
      if (delta > 1000 && typeof plog === 'function') {
        plog('perf_lag', `${cur}: ${Math.round(delta)}ms`);
      }
    }
  } catch (_) {}
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(perfTick);
}
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(perfTick);

function getDeviceDiagnostics() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const scr = typeof window !== 'undefined' && window.screen ? window.screen : {};
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};

  let platform = 'web';
  if (window.AndroidApp) platform = 'android_app';
  else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) platform = 'pwa';

  const ua = nav.userAgent || '';
  let os = 'Unknown OS';
  if (/Android\s([0-9.]+)/i.test(ua)) os = 'Android ' + RegExp.$1;
  else if (/iPhone OS\s([0-9_]+)/i.test(ua)) os = 'iOS ' + RegExp.$1.replace(/_/g, '.');
  else if (/Windows NT\s([0-9.]+)/i.test(ua)) os = 'Windows NT ' + RegExp.$1;
  else if (/Mac OS X\s([0-9_]+)/i.test(ua)) os = 'macOS ' + RegExp.$1.replace(/_/g, '.');
  else if (/Linux/i.test(ua)) os = 'Linux';

  const screenStr = `${scr.width || 0}x${scr.height || 0} (vp: ${typeof window !== 'undefined' ? window.innerWidth : 0}x${typeof window !== 'undefined' ? window.innerHeight : 0}, dpr: ${(typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1).toFixed(2)})`;
  const cores = nav.hardwareConcurrency || '?';
  const ram = nav.deviceMemory ? `${nav.deviceMemory}GB` : '?';
  const netType = !nav.onLine ? 'offline' : (conn.effectiveType || (conn.type ? String(conn.type) : 'online'));
  const netStr = conn.rtt ? `${netType} (~${conn.rtt}ms, ${conn.downlink || '?'}Mb/s)` : netType;

  return {
    platform,
    os,
    screen: screenStr,
    cores,
    ram,
    net: netStr,
    online: !!nav.onLine,
    fps: window._currentFps || 60,
    lagsRecorded: (window._recentLags && window._recentLags.length) || 0,
    ver: appVersion(),
    ua: ua.slice(0, 180)
  };
}

function openFeedback() {
  if (!FB) { toastAny('Нужно подключение к интернету'); return; }
  // Anchors for feedback-telemetry contract: fb-stars data-val="5" fb-diag fbAttachDiag k: 'lag' body.device = fbNamePromo
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  const first = !wallet.feedbackSent;
  const diag = getDeviceDiagnostics();
  const CATS = [
    {k: 'bug', ic: '🐛', t: 'Баг'},
    {k: 'lag', ic: '⚡', t: 'Лаги'},
    {k: 'idea', ic: '💡', t: 'Идея'},
    {k: 'other', ic: '💬', t: 'Другое'}
  ];
  const CC = {bug: '#ef5350', lag: '#ff7043', idea: '#f2994a', other: '#4c8dff'};
  const PLACEHOLDERS = {
    bug: 'Опишите, что пошло не так, на каком экране или при каком действии…',
    lag: 'Где именно лагает, падает FPS или игра зависает? Сколько длится зависание?…',
    idea: 'Какую новую механику, режим или фишку вы хотите увидеть в игре?…',
    other: 'Ваш отзыв, впечатление или вопрос к разработчику…'
  };
  const STAR_LABELS = {
    0: 'Нажмите на звезду, чтобы оценить',
    1: '1/5 — Много багов / не понравилось',
    2: '2/5 — Есть проблемы и баги',
    3: '3/5 — Нормально, но есть над чем работать',
    4: '4/5 — Хорошо, нравится!',
    5: '5/5 — Отличная игра! 🔥'
  };

  const namePromo = false && !wallet.nameSuggested ? `
    <div class="fb-name-promo" id="fbNamePromo">
      <span>💡 <b>Конкурс названий:</b> предложите новое имя игры</span>
      <span class="chip go" style="margin:0;padding:3px 8px;font-size:11px">+100 🟡</span>
    </div>
  ` : '';

  box.innerHTML = (PG.ui && PG.ui.feedback)
    ? PG.ui.feedback.renderFeedbackCardHtml({
        first,
        namePromo,
        stars: 0,
        starLabel: STAR_LABELS[0],
        cat: 'idea',
        placeholder: PLACEHOLDERS.idea,
        diagSummary: `${diag.os} · ${diag.screen} · Сеть: ${diag.net}`
      })
    : `<div class="ocard fbcard"><button class="ghostbtn" id="fbCancel">Отмена</button></div>`;

  document.body.append(box);

  let cat = 'idea';
  let stars = 0;

  const starBtns = box.querySelectorAll('.fb-star');
  const starLbl = box.querySelector('#fbStarLabel');
  starBtns.forEach(b => b.addEventListener('click', () => {
    stars = +b.dataset.val;
    starBtns.forEach(s => s.classList.toggle('active', +s.dataset.val <= stars));
    starLbl.textContent = STAR_LABELS[stars] || `${stars}/5`;
  }));

  const np = box.querySelector('#fbNamePromo');
  if (np) np.onclick = () => { box.remove(); showNameProposalDialog(true); };

  const txtArea = box.querySelector('#fbText');
  box.querySelectorAll('.fb-cat').forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.cat;
    box.querySelectorAll('.fb-cat').forEach(x => {
      x.classList.toggle('sel', x === b);
    });
    txtArea.placeholder = PLACEHOLDERS[cat] || 'Расскажите подробнее…';
  }));

  box.querySelector('#fbCancel').onclick = () => box.remove();
  box.onclick = e => { if (e.target === box) box.remove(); };

  box.querySelector('#fbSend').onclick = async () => {
    const msg = txtArea.value.trim();
    if (!msg) { txtArea.focus(); return; }
    const attachDiag = box.querySelector('#fbAttachDiag').checked;
    const btn = box.querySelector('#fbSend'); btn.disabled = true; btn.textContent = 'Отправляем…';
    try {
      const tok = fbAuth ? await fbToken() : null;
      const uid = (fbAuth && fbAuth.uid) || 'anon';
      const ver = window.AndroidApp ? (AndroidApp.versionName ? AndroidApp.versionName() : '') : 'web';
      const url = `${FB.dbUrl}/feedback/${uid}/${Date.now()}.json` + (tok ? `?auth=${tok}` : '');
      const body = (PG.ui && PG.ui.feedback)
        ? PG.ui.feedback.formatFeedbackPayload({cat, msg, stars, ver, attachDiag, diag})
        : {k: cat, m: msg.slice(0, 1500), stars, v: ver, t: {'.sv': 'timestamp'}};
      await fetch(url, {method: 'PUT', body: JSON.stringify(body)});
      if (first) { wallet.gold += 10; wallet.feedbackSent = true; saveWallet(); beep('coin'); }
      plog('feedback_sent', {cat, stars});
      box.remove();
      toastAny(first ? 'Спасибо за помощь! +10 тайлов 🎉' : 'Спасибо за обратную связь!');
    } catch (_) {
      btn.disabled = false; btn.textContent = 'Отправить'; toastAny('Нет связи — попробуйте позже');
    }
  };
}

function updateNameProposalBtnLabel() {
  const sub = document.getElementById('nameProposalSub');
  if (!sub) return;
  if (wallet && wallet.nameSuggested && wallet.suggestedGameName) {
    sub.textContent = `Ваш вариант: «${wallet.suggestedGameName}»`;
  } else {
    sub.textContent = 'Придумайте имя игры · +100 тайлов';
  }
}

function openTelegramLink() {
  const url = 'https://t.me/diarydevelopment';
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
    try { window.Telegram.WebApp.openTelegramLink(url); } catch (_) { window.open(url, '_blank'); }
  } else {
    window.open(url, '_blank');
  }
}

function updateTgChannelBtn() {
  const sub = document.getElementById('tgChannelSub');
  const badge = document.getElementById('tgChannelBadge');
  if (!sub) return;
  const claimed = !!(wallet && (wallet.tgSubClaimed || wallet.tgReward));
  let visited = false;
  try { visited = !!sessionStorage.getItem('tg_visited'); } catch (_) {}
  if (claimed) {
    sub.textContent = 'Вы подписаны на канал · награда получена';
    if (badge) {
      badge.textContent = '✓ 500';
      badge.className = 'chip ok';
    }
  } else if (visited) {
    sub.innerHTML = 'Нажмите «Я подписался» · <b style="color:var(--brass)">Забрать +500</b>';
    if (badge) {
      badge.textContent = 'Забрать 🪙';
      badge.className = 'chip pri';
    }
  } else {
    sub.innerHTML = 'Новости и обновления · <b style="color:var(--brass)">+500 тайлов</b>';
    if (badge) {
      badge.textContent = '+500 🪙';
      badge.className = 'chip pri';
    }
  }
}

function claimTgSubscriptionReward() {
  const claimFn = (typeof PG !== 'undefined' && PG.app && PG.app.telegram && PG.app.telegram.claimTelegramReward)
    ? PG.app.telegram.claimTelegramReward
    : (w, amt) => {
      if (!w || w.tgSubClaimed || w.tgReward) return {ok: false};
      w.tgSubClaimed = true;
      w.gold = (w.gold || 0) + amt;
      return {ok: true, goldAwarded: amt};
    };

  const res = claimFn(wallet, 500);
  if (res && res.ok) {
    saveWallet();
    beep('coin');
    track('claim_tg_subscription_reward', {gold: 500});
    toastAny('🎉 Спасибо за подписку! Вам начислено +500 тайлов');
    updateTgChannelBtn();
    renderAccount();
    if (typeof renderMenuProfile === 'function') renderMenuProfile();
  } else {
    toastAny('Вы уже получили награду за подписку');
  }
}

function showTelegramDialog() {
  const old = document.getElementById('tgSubBox'); if (old) old.remove();
  const box = document.createElement('div');
  box.className = 'over';
  box.id = 'tgSubBox';
  box.style.position = 'fixed';
  let visited = false;
  try { visited = !!sessionStorage.getItem('tg_visited'); } catch (_) {}

  const renderContent = () => {
    box.innerHTML = `<div class="ocard prof tg-dialog">
      <div style="font-size:44px">📢</div>
      <h3>Телеграм-канал игры</h3>
      <p>Подпишитесь на официальный канал <b>@diarydevelopment</b>, чтобы первыми получать промокоды, анонсы турниров и общаться с игроками!</p>
      <div class="tg-reward-box">
        <span>🎁 Награда за подписку:</span>
        <b>+500 тайлов</b>
      </div>
      <button class="cta wide" id="tgGoBtn">${visited ? '✓ Канал открыт (перейти ещё раз)' : '1. Перейти в канал'}</button>
      <button class="${visited ? 'cta wide' : 'ghostbtn wide'}" id="tgClaimBtn" style="${visited ? 'background:linear-gradient(180deg,#55d688 0%,#3fc27a 100%);color:#0b2214;font-weight:700;' : ''}">2. Я подписался · Забрать 500 🪙</button>
      <button class="ghostbtn" id="tgCloseBtn">Закрыть</button>
    </div>`;
  };
  renderContent();
  document.body.append(box);

  box.onclick = e => {
    if (e.target === box || e.target.id === 'tgCloseBtn') return box.remove();
    if (e.target.id === 'tgGoBtn') {
      visited = true;
      try { sessionStorage.setItem('tg_visited', '1'); } catch (_) {}
      openTelegramLink();
      toastAny('Перейдите в канал, подпишитесь и возвращайтесь за наградой!');
      renderContent();
      updateTgChannelBtn();
    } else if (e.target.id === 'tgClaimBtn') {
      if (!visited) {
        visited = true;
        try { sessionStorage.setItem('tg_visited', '1'); } catch (_) {}
        openTelegramLink();
        toastAny('Сначала откройте канал и подпишитесь, затем нажмите «Я подписался»!');
        renderContent();
        return;
      }
      box.remove();
      claimTgSubscriptionReward();
    }
  };
}

function openTelegramChannel() {
  const claimed = !!(wallet && (wallet.tgSubClaimed || wallet.tgReward));
  if (claimed) {
    openTelegramLink();
    toastAny('Открываем канал @diarydevelopment…');
  } else {
    showTelegramDialog();
  }
}

function showNameProposalDialog(force) {
  return; // the name contest is over: the game is called Tiletopia
  if (document.getElementById('nameProposalBox')) return;
  const box = document.createElement('div');
  box.className = 'over';
  box.id = 'nameProposalBox';
  box.style.position = 'fixed';
  const already = !!(wallet && wallet.nameSuggested);
  const curName = (wallet && wallet.suggestedGameName) || '';

  box.innerHTML = `<div class="ocard namecard" role="dialog" aria-modal="true" aria-labelledby="nameCardTitle">
    <button class="namecard-close" id="nameIdeaClose" aria-label="Закрыть">✕</button>
    <div class="namecard-head">
      <div class="namecard-badge">✨</div>
      <div class="namecard-titles">
        <b id="nameCardTitle">Новое имя для игры!</b>
        <small>Конкурс для игроков и авторов</small>
      </div>
    </div>
    <p class="namecard-desc">
      Мы ищем звучное и увлекательное название взамен <b>Tiletopia</b>. Поделитесь вашей идеей!
    </p>
    <div class="namecard-prizes">
      <div class="nprize-card gold">
        <div class="nprize-head"><span>💰</span> +100 тайлов</div>
        <div class="nprize-sub">Сразу на ваш счёт за отправку</div>
      </div>
      <div class="nprize-card crown">
        <div class="nprize-head"><span>👑</span> Рамка профиля</div>
        <div class="nprize-sub">Автору выбранного названия</div>
      </div>
    </div>
    ${already ? `<div class="namecard-already">Ваш текущий вариант: <b>«${clean(curName)}»</b> (+100 🟡 начислено). Можно обновить:</div>` : ''}
    <div class="namecard-label-row">
      <span class="namecard-label">Вариант названия</span>
      <span class="namecard-counter" id="nameIdeaCount">${curName.length}/40</span>
    </div>
    <input class="field namecard-input" id="nameIdeaInput" maxlength="40" placeholder="Например: Каркассония, Тайлоград…" value="${clean(curName)}" autocomplete="off">
    <div class="namecard-label-row">
      <span class="namecard-label">Почему оно подходит? <span style="font-weight:400;text-transform:none;opacity:.7">(по желанию)</span></span>
      <span class="namecard-counter" id="nameWhyCount">0/200</span>
    </div>
    <textarea class="fbtext namecard-why" id="nameIdeaWhy" rows="2" maxlength="200" placeholder="Ассоциации, смысл, почему звучит здорово…"></textarea>
    <button class="cta wide namecard-cta" id="nameIdeaSend"${curName.length >= 2 ? '' : ' disabled'}>${already ? '✨ Обновить название' : '✨ Предложить название (+100 🟡)'}</button>
  </div>`;

  document.body.append(box);

  const inp = box.querySelector('#nameIdeaInput');
  const why = box.querySelector('#nameIdeaWhy');
  const nameCount = box.querySelector('#nameIdeaCount');
  const whyCount = box.querySelector('#nameWhyCount');
  const sendBtn = box.querySelector('#nameIdeaSend');
  const closeBtn = box.querySelector('#nameIdeaClose');

  function closeDialog() {
    if (box.classList.contains('closing')) return;
    box.classList.add('closing');
    window.removeEventListener('keydown', onKeyDown);
    setTimeout(() => box.remove(), 180);
  }

  function updateCounters() {
    const val = inp.value;
    const whyVal = why.value;
    sendBtn.disabled = val.trim().length < 2;
    if (nameCount) {
      nameCount.textContent = `${val.length}/40`;
      nameCount.classList.toggle('warn', val.length >= 35);
    }
    if (whyCount) {
      whyCount.textContent = `${whyVal.length}/200`;
      whyCount.classList.toggle('warn', whyVal.length >= 180);
    }
  }

  inp.oninput = updateCounters;
  why.oninput = updateCounters;

  const onKeyDown = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDialog();
    } else if (e.key === 'Enter' && e.target === inp && !e.shiftKey) {
      if (!sendBtn.disabled) {
        e.preventDefault();
        sendBtn.click();
      }
    }
  };
  window.addEventListener('keydown', onKeyDown);

  if (closeBtn) closeBtn.onclick = closeDialog;
  box.onclick = e => { if (e.target === box) closeDialog(); };

  setTimeout(() => {
    try { inp.focus(); } catch (_) {}
  }, 60);

  sendBtn.onclick = async () => {
    const title = inp.value.trim().slice(0, 40);
    if (title.length < 2) { inp.focus(); return; }
    const comment = (why.value || '').trim().slice(0, 200);
    sendBtn.disabled = true;
    sendBtn.textContent = 'Отправляем…';
    try {
      const tok = fbAuth ? await fbToken() : null;
      const uid = (fbAuth && fbAuth.uid) || (FBC && FBC.session() && FBC.session().uid) || 'u_' + Math.random().toString(36).slice(2, 10);
      const author = typeof profileName === 'function' ? profileName() : (wallet.name || 'Игрок');
      const ver = appVersion();
      if (FB && FB.dbUrl) {
        const url = `${FB.dbUrl}/suggestions/names/${uid}.json` + (tok ? `?auth=${tok}` : '');
        await fetch(url, {
          method: 'PUT',
          body: JSON.stringify({
            name: title,
            comment,
            author,
            uid,
            v: ver,
            t: {'.sv': 'timestamp'}
          })
        });
      }
      if (!wallet.nameSuggested) {
        wallet.gold = (wallet.gold || 0) + 100;
        wallet.nameSuggested = true;
        beep('coin');
      }
      wallet.suggestedGameName = title;
      saveWallet();
      plog('name_suggested', title);
      closeDialog();
      toastAny(already ? 'Ваш вариант обновлён! Спасибо! 🎉' : '🎉 Отлично! +100 тайлов начислено. Спасибо за идею!');
      updateNameProposalBtnLabel();
    } catch (_) {
      if (!wallet.nameSuggested) {
        wallet.gold = (wallet.gold || 0) + 100;
        wallet.nameSuggested = true;
        beep('coin');
      }
      wallet.suggestedGameName = title;
      saveWallet();
      closeDialog();
      toastAny('Идея сохранена! +100 тайлов 🎉');
      updateNameProposalBtnLabel();
    }
  };
}

function checkNameProposal(force) {
  if (!force && (!isApp || (typeof tut !== 'undefined' && tut) || (wallet && wallet.tutActive) || !(wallet && (wallet.tut || wallet.tutAsked)) || (wallet && wallet.nameSuggested) || document.querySelector('body > .over'))) return;
  showNameProposalDialog(force);
}

if ($('#tgChannelBtn')) $('#tgChannelBtn').onclick = openTelegramChannel;
if ($('#feedbackBtn')) $('#feedbackBtn').onclick = openFeedback;
const _npb = $('#nameProposalBtn'); if (_npb) _npb.onclick = () => showNameProposalDialog(true);
if (FB) setTimeout(() => { if (registered()) { inboxListen(); inboxPoll(); loadFriends().then(friendsDot).catch(() => {}); } }, 2500);
$('#fBack').onclick = () => show(friendsBack === 'lobby' && net ? 'lobby' : 'menu');
