/* ---------------- Inbox & Rewards Controller ---------------- */
let ntab = 'rewards';

function openNewsReaderModal(item) {
  const old = document.getElementById('newsReaderModal'); if (old) old.remove();
  wallet.inbox = wallet.inbox || { claimed: [], read: [] };
  if (!wallet.inbox.read.includes(item.id)) {
    wallet.inbox.read.push(item.id);
    saveWallet();
    updateNotifBadge();
  }
  const m = document.createElement('div');
  m.id = 'newsReaderModal';
  m.className = 'over news-reader-modal';
  m.style.position = 'fixed';

  const rawText = item.fullText || item.desc || '';
  const paras = rawText.split('\n\n').map(p => {
    const lines = p.split('\n');
    if (lines.length > 1 && lines.some(l => l.trim().startsWith('•') || l.trim().startsWith('-'))) {
      return '<ul class="nrm-list">' + lines.map(l => {
        const cleanLine = clean(l.replace(/^[•\-]\s*/, ''));
        return cleanLine ? '<li>' + cleanLine + '</li>' : '';
      }).filter(Boolean).join('') + '</ul>';
    }
    return '<p>' + lines.map(clean).join('<br>') + '</p>';
  }).join('');

  m.innerHTML = '<div class="ocard news-modal-card">'
    + '<div class="nrm-head">'
    + '  <div class="nrm-top"><span class="nrm-icon">' + (item.icon || '📣') + '</span><div class="nrm-meta"><span class="nc-badge ' + (item.badgeClass || 'b-gold') + '">' + clean(item.badge || 'Новость') + '</span><span class="nc-date">' + clean(item.date || '') + '</span></div></div>'
    + '  <button class="iconbtn nrm-close" id="nrmClose" aria-label="Закрыть"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'
    + '</div>'
    + '<h3 class="nrm-title">' + clean(item.title) + '</h3>'
    + '<div class="nrm-body">' + paras + '</div>'
    + '<div class="nrm-foot"><button class="cta wide" id="nrmAction">' + (item.actionLabel || 'Понятно') + '</button></div>'
    + '</div>';
  document.body.append(m);
  const close = () => { m.remove(); updateNotifBadge(); };
  m.onclick = e => {
    if (e.target === m || e.target.closest('#nrmClose')) return close();
    if (e.target.closest('#nrmAction')) {
      close();
      if (item.actionLink) show(item.actionLink);
    }
  };
}

function renderInbox() {
  wallet.inbox = wallet.inbox || { claimed: [], read: [] };
  const claimed = Array.isArray(wallet.inbox.claimed) ? wallet.inbox.claimed : [];
  const listEl = $('#notifList');
  const friendRequests = Object.entries(inbox || {}).filter(([, v]) => v && v.k === 'f');
  if (listEl && typeof PG !== 'undefined' && PG.ui && PG.ui.inbox && PG.ui.inbox.renderInboxHtml) {
    listEl.innerHTML = PG.ui.inbox.renderInboxHtml({
      items: PG.ui.inbox.INBOX_ITEMS,
      claimed: claimed,
      filter: ntab,
      friendRequests: friendRequests,
      registered: registered()
    });
  }
  document.querySelectorAll('#ntabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.nt === ntab));
  updateNotifBadge();
}

function updateNotifBadge() {
  wallet.inbox = wallet.inbox || { claimed: [], read: [] };
  const claimed = Array.isArray(wallet.inbox.claimed) ? wallet.inbox.claimed : [];
  const read = Array.isArray(wallet.inbox.read) ? wallet.inbox.read : [];
  const friendRequests = Object.entries(inbox || {}).filter(([, v]) => v && v.k === 'f');
  const count = (typeof PG !== 'undefined' && PG.ui && PG.ui.inbox && PG.ui.inbox.unreadInboxCount)
    ? PG.ui.inbox.unreadInboxCount(claimed, read, friendRequests, registered())
    : 0;
  const dot = $('#notifDot');
  if (dot) {
    dot.hidden = count <= 0;
    dot.textContent = count > 9 ? '9+' : String(count);
  }
}

document.addEventListener('click', e => {
  const ntBtn = e.target.closest('#ntabs button');
  if (ntBtn) {
    ntab = ntBtn.dataset.nt;
    renderInbox();
    return;
  }

  // Clicking [data-open-news] button on news card
  const openNewsBtn = e.target.closest('[data-open-news]');
  if (openNewsBtn) {
    const nid = openNewsBtn.dataset.openNews;
    const item = (typeof PG !== 'undefined' && PG.ui && PG.ui.inbox && PG.ui.inbox.INBOX_ITEMS)
      ? PG.ui.inbox.INBOX_ITEMS.find(x => x.id === nid)
      : null;
    if (item) { openNewsReaderModal(item); return; }
  }

  // Clicking any notification or news card marks it read and clears badge
  const notifCard = e.target.closest('.notif-card[data-nid]');
  if (notifCard) {
    const nid = notifCard.dataset.nid;
    wallet.inbox = wallet.inbox || { claimed: [], read: [] };
    if (!wallet.inbox.read.includes(nid)) {
      wallet.inbox.read.push(nid);
      saveWallet();
      updateNotifBadge();
    }
    // If news card clicked, open the full news reading modal
    if (notifCard.classList.contains('news') && !e.target.closest('[data-claim-notif]')) {
      const item = (typeof PG !== 'undefined' && PG.ui && PG.ui.inbox && PG.ui.inbox.INBOX_ITEMS)
        ? PG.ui.inbox.INBOX_ITEMS.find(x => x.id === nid)
        : null;
      if (item) { openNewsReaderModal(item); return; }
    }
  }

  const claimBtn = e.target.closest('[data-claim-notif]');
  if (claimBtn) {
    const nid = claimBtn.dataset.claimNotif;
    wallet.inbox = wallet.inbox || { claimed: [], read: [] };
    if (!wallet.inbox.claimed.includes(nid)) {
      wallet.inbox.claimed.push(nid);
    }
    if (!wallet.inbox.read.includes(nid)) {
      wallet.inbox.read.push(nid);
    }
    saveWallet();
    updateNotifBadge();

    if (nid === 'notif_old_status') {
      wallet.statuses = Array.isArray(wallet.statuses) ? wallet.statuses : [];
      if (!wallet.statuses.includes('ex:old')) wallet.statuses.push('ex:old');
      ST().wearStatus(wallet, 'ex:old');
      saveWallet();
      renderMenuProfile();
      renderInbox();
      toastAny('Статус «Олд» успешно получен и надет! 🗿', 'ok', 'Награда');
      return;
    }

    if (nid === 'notif_name_proposal_reward') {
      if (typeof COINS !== 'undefined' && COINS.give) COINS.give(wallet, 'tile', 300);
      else wallet.gold = (wallet.gold || 0) + 300;
      saveWallet();
      renderMenuProfile();
      renderInbox();
      toastAny('Получено +300 тайлов за конкурс названий! 🪙', 'gold', 'Награда');
      return;
    }

    if (nid === 'notif_welcome_gold') {
      wallet.gold = (wallet.gold || 0) + 500;
      saveWallet();
      renderMenuProfile();
      renderInbox();
      toastAny('Получено +500 тайлов! 🪙', 'gold', 'Казна');
      return;
    }

    if (nid === 'notif_promo_diorama') {
      saveWallet();
      renderInbox();
      redeemPromo('DIORAMA3D');
      return;
    }

    saveWallet();
    renderInbox();
    return;
  }

  const faccBtn = e.target.closest('[data-facc]');
  if (faccBtn) {
    const fromUid = faccBtn.dataset.facc;
    acceptFriend(fromUid).then(() => {
      renderInbox();
      updateNotifBadge();
    });
    return;
  }

  const fdropBtn = e.target.closest('[data-fdrop]');
  if (fdropBtn) {
    const key = fdropBtn.dataset.fdrop;
    dropInbox(key);
    renderInbox();
    updateNotifBadge();
    return;
  }

  const linkBtn = e.target.closest('[data-notif-link]');
  if (linkBtn) {
    const target = linkBtn.dataset.notifLink;
    show(target);
    return;
  }
});
