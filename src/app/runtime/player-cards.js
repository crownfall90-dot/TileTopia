// The last games (kept on this phone, newest first): when, how it went and who played. Saved profiles met online
// can be added as friends from here.
// Another player's card: name, colour, cups and when seen, with "add friend". Opened from the history, the room and
// the players at a table. Only public data: the name, /leaders and /presence (no e-mail, no profile contents).
async function invitePlayerToRoom(targetUid, targetName) {
  if (isPlayerBlocked(targetUid)) return toastAny('Игрок заблокирован');
  if (!registered()) return show('friends');
  if (net && !net.quick && !(net.gameId && phase !== 'end') && net.code) {
    show('lobby');
    return inviteFriend(targetUid, targetName);
  }
  if (!(await serverReachable())) return noServer(() => invitePlayerToRoom(targetUid, targetName));
  if (isPlayerBlocked(targetUid)) return;
  const newRoomCode = newCode();
  connect(newRoomCode, true);
  net.max = Math.max(2, setup.onN || 2);
  friendsBack = 'lobby';
  show('lobby');
  toastAny(`Создана комната ${newRoomCode}. Отправляем приглашение…`);
  return inviteFriend(targetUid, targetName);
}

function openReportDialog(uid, name) {
  const old = document.getElementById('reportBox'); if (old) old.remove();
  const box = document.createElement('div'); box.className = 'over'; box.id = 'reportBox'; box.style.position = 'fixed';
  if (PG.ui.playerCard && PG.ui.playerCard.renderReportDialogHtml) {
    box.innerHTML = PG.ui.playerCard.renderReportDialogHtml({ uid, name });
  } else {
    box.innerHTML = `<div class="ocard"><h3>Жалоба на игрока «${clean(name)}»</h3><button class="cta wide" id="btnSubmitReport">Отправить жалобу</button><button class="ghostbtn" id="btnCancelReport">Отмена</button></div>`;
  }
  document.body.append(box);
  box.onclick = e => { if (e.target === box || e.target.id === 'btnCancelReport') box.remove(); };

  const submitBtn = box.querySelector('#btnSubmitReport');
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const selectedRadio = box.querySelector('input[name="repReasonChoice"]:checked');
      const reasonKey = selectedRadio ? selectedRadio.value : 'other';
      const commentInput = box.querySelector('#repCommentInput');
      const comment = commentInput ? commentInput.value.trim() : '';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка…';

      try {
        const pres = await fbGet('presence/' + uid).catch(() => null);
        const reportPayload = {
          k: 'report_v2',
          targetUid: uid,
          targetName: clean(name),
          reason: reasonKey,
          comment: comment.slice(0, 300),
          st: (pres && pres.st) || '',
          byUid: myUid(),
          byName: profileName(),
          t: {'.sv': 'timestamp'}
        };
        await fbPut(`feedback/${myUid()}/rep_${Date.now().toString(36)}`, reportPayload);
        toastAny('Жалоба отправлена на рассмотрение. Спасибо за помощь!');
        track('player_report');
        box.remove();
      } catch (_) {
        toastAny('Не удалось отправить жалобу — проверьте интернет');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить жалобу';
      }
    };
  }
}

// The last card data of each player, so opening a card again is instant (a fresh copy is still fetched).
const plCache = new Map();
async function openPlayer(uid, name, col, meta = {}) {
  if (!uid || !FB) return;
  const old = document.getElementById('plBox'); if (old) old.remove();
  const box = document.createElement('div'); box.className = 'over'; box.id = 'plBox'; box.style.position = 'fixed';
  const me = uid === myUid(), n = clean(name) || 'Игрок';
  const c = validCol(col) ? col : (meta && meta.c && validCol(meta.c) ? meta.c : '#5b6684');
  const room = net && !net.quick && !(net.gameId && phase !== 'end') ? net.code : null;
  const accountUid = myUid();

  let cups = (meta && meta.cups) ? +meta.cups : 0;
  let wins = 0;
  let games = 0;
  let statusText = (meta && meta.st) ? meta.st : '';
  let frame = (meta && meta.fr) ? meta.fr : '';
  let ach = null, level = null;

  const renderCard = (pData = {}) => {
    if (PG.ui.playerCard && PG.ui.playerCard.renderPlayerCardHtml) {
      box.innerHTML = PG.ui.playerCard.renderPlayerCardHtml({
        uid,
        name: n,
        col: pData.col || c,
        frame: pData.frame || frame,
        frameRing: FRAMES[pData.frame || frame] ? FRAMES[pData.frame || frame].ring : '',
        achievements: pData.ach != null ? pData.ach : ach, achTotal: ACH.length, level: pData.level != null ? pData.level : level,
        statusText: pData.statusText || statusText,
        cups: pData.cups != null ? pData.cups : cups,
        wins: pData.wins != null ? pData.wins : wins,
        games: pData.games != null ? pData.games : games,
        isOnline: pData.isOnline || false,
        seenText: pData.seenText || 'Офлайн',
        isFriend: isFriend(uid),
        isBlocked: isPlayerBlocked(uid),
        canContact: meta.guest !== '1',
        isMe: me,
        pendingInvite: Boolean(invited && invited.uids && invited.uids.has(uid)),
        incomingRequest: Boolean(inbox && inbox[uid + '_f']),
        hasActiveRoom: Boolean(room),
        roomCode: room || '',
        hasBanner: Boolean((pData.banner && AV.BANNERS[pData.banner]) || (me && wallet.avShape === 'rect' && wallet.banner && AV.BANNERS[wallet.banner])),
        bannerSrc: ((pData.banner && AV.BANNERS[pData.banner]) || (me && wallet.avShape === 'rect' && wallet.banner && AV.BANNERS[wallet.banner])) ? ((pData.banner && AV.BANNERS[pData.banner]) || AV.BANNERS[wallet.banner]).src : '',
        bannerPos: ((pData.banner && AV.BANNERS[pData.banner]) || (me && wallet.avShape === 'rect' && wallet.banner && AV.BANNERS[wallet.banner])) ? ((pData.banner && AV.BANNERS[pData.banner]) || AV.BANNERS[wallet.banner]).pos : 'center'
      });
      wireCardEvents();
    } else {
      box.innerHTML = `<div class="ocard prof pcard">${me ? '' : '<button id="plReport">Пожаловаться</button><button id="plBlock">' + (isPlayerBlocked(uid) ? 'Разблокировать' : 'Заблокировать') + '</button>'}<button id="plNo">Закрыть</button></div>`;
      wireCardEvents();
    }
  };

  const wireCardEvents = () => {
    const closeBtn = box.querySelector('#plCloseBtn') || box.querySelector('#plNo');
    if (closeBtn) closeBtn.onclick = () => box.remove();

    const inv = box.querySelector('#plInviteRoom');
    if (inv) {
      inv.onclick = async () => {
        box.remove();
        await invitePlayerToRoom(uid, n);
      };
    }

    const add = box.querySelector('#plAdd');
    if (add) {
      add.onclick = () => {
        add.disabled = true;
        add.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg><span>Заявка отправлена</span>';
        addFriend(uid, n, 'profile');
      };
    }

    const acc = box.querySelector('#plAcceptFriend');
    if (acc) {
      acc.onclick = () => {
        box.remove();
        acceptFriend(uid);
      };
    }

    const del = box.querySelector('#plDel');
    if (del) {
      del.onclick = () => {
        box.remove();
        confirmBox(`Удалить ${n} из друзей?`, 'Удалить', () => removeFriend(uid));
      };
    }


    const block = box.querySelector('#plBlock');
    if (block) block.onclick = () => {
      const blocked = isPlayerBlocked(uid);
      const change = async () => {
        if (!myUid()) {
          try { await fbToken(); } catch (_) { return toastAny('Откройте профиль после подключения к интернету'); }
        }
        if ((accountUid && myUid() !== accountUid) || !box.isConnected || !setPlayerBlocked(uid, n, !blocked)) return;
        renderCard(plCache.get(uid) || {});
      };
      if (blocked) change();
      else confirmBox(`Заблокировать игрока «${n}»?<br><small>На этом устройстве вы перестанете получать его заявки, приглашения и реакции. Снять блокировку можно в разделе «Друзья».</small>`, 'Заблокировать', change);
    };
    const rep = box.querySelector('#plReport');
    if (rep) {
      rep.onclick = () => {
        box.remove();
        openReportDialog(uid, n);
      };
    }

    const ed = box.querySelector('#plEditSelf');
    if (ed) {
      ed.onclick = () => {
        box.remove();
        editProfile();
      };
    }
  };

  // A card seen before opens with what was known; a new one waits for its numbers instead of showing zeros.
  const cached = plCache.get(uid);
  renderCard(cached || {});
  if (!cached) box.classList.add('plload');
  document.body.append(box);
  box.onclick = e => { if (e.target === box) box.remove(); };

  try {
    const [lead, pres] = await Promise.all([
      fbGet('leaders/' + uid).catch(() => null),
      fbGet('presence/' + uid).catch(() => null)
    ]);
    const details = (PG.ui.playerCard && PG.ui.playerCard.formatPresenceDetails)
      ? PG.ui.playerCard.formatPresenceDetails(pres, lead, STATE_TEXT)
      : { isOnline: false, seenText: 'Офлайн' };

    cups = (lead && +lead.r) ? +lead.r : cups;
    wins = (pres && +pres.w) || (lead && +lead.w) || (lead && +lead.owins) || 0;
    games = (pres && +pres.g) || (lead && +lead.games) || (lead && +lead.g) || wins;
    ach = pres && pres.a != null ? +pres.a : null; level = pres && pres.lv ? +pres.lv : null;
    statusText = PG.state.status.shownStatus((pres && pres.st) || (lead && lead.st) || statusText);
    frame = (lead && lead.fr) || (pres && pres.fr) || frame;

    const data = {cups, wins, games, statusText, frame, ach, level, isOnline: details.isOnline, seenText: details.seenText};
    plCache.set(uid, data);
    if (!box.isConnected) return;
    renderCard(data);
  } catch (_) {}
  box.classList.remove('plload');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-pl]'); if (b && !e.target.closest('button.chip')) openPlayer(b.dataset.pl, b.dataset.n, b.dataset.c, b.dataset); });
