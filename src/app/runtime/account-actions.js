/* ---------------- delete my account and data (Google Play: in-app deletion) ----------------
   Remove owner-writable records before Firebase Authentication and local storage.
   Some records, including append-only errors and room messages, require server-side cleanup. */
function confirmWordDialog(word, title, promptHtml, btnText, onConfirm) {
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard acc"><h3>${title}</h3><p style="font-size:14px;color:var(--muted);margin:0 0 14px">${promptHtml}</p><input class="field" id="cwInp" maxlength="20" placeholder="${word}" autocomplete="off" autocapitalize="characters" style="margin-bottom:14px;text-align:center;font-weight:700;letter-spacing:1px"><button class="cta wide" id="cwGo" disabled style="background:#ef5350;margin-bottom:8px">${btnText}</button><button class="ghostbtn" id="cwNo">Отмена</button></div>`;
  document.body.append(box);
  const inp = box.querySelector('#cwInp'), go = box.querySelector('#cwGo'), no = box.querySelector('#cwNo');
  inp.oninput = () => { go.disabled = clean(inp.value).trim().toUpperCase() !== word.toUpperCase(); };
  no.onclick = () => box.remove();
  go.onclick = () => { box.remove(); if (typeof onConfirm === 'function') onConfirm(); };
  setTimeout(() => inp.focus(), 200);
}
function askDeleteAccount() {
  confirmBox('Удалить аккаунт и все данные?<br><small style="font-weight:500;color:var(--muted)">Профиль, уровень, тайлы, фигурки, друзья и место в рейтинге будут удалены с сервера и с этого телефона. Отменить это нельзя.</small>', 'Продолжить', () => {
    confirmBox('Точно удалить навсегда?<br><small style="font-weight:500;color:var(--muted)">Вернуть прогресс будет невозможно. Все достижения, тайлы и предметы сгорят навсегда.</small>', 'Я понимаю риски', () => {
      confirmWordDialog('УДАЛИТЬ', 'Удаление аккаунта', 'Чтобы случайно не удалить аккаунт, введите слово <b>УДАЛИТЬ</b> для подтверждения:', 'Удалить аккаунт навсегда', deleteMyAccount);
    });
  });
}
function accountDataDialog() {
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard acc"><h3>Аккаунт и данные</h3><p style="font-size:14px;color:var(--muted);margin:0 0 16px">Управление вашими данными в игре Tiletopia</p><div class="sgroup" style="margin-bottom:16px"><a class="srow btn" href="https://crownfall90-dot.github.io/TileTopia/delete-account.html" target="_blank" rel="noopener"><span class="sic">📄</span><span class="stx"><b>Как удалить данные</b><small>Инструкция и сроки хранения</small></span><span class="sgo">›</span></a><button class="srow btn" id="dlgDelAction"><span class="sic">🗑️</span><span class="stx"><b style="color:#ef5350">Удалить аккаунт и данные</b><small>Удаление профиля и связанных записей</small></span><span class="sgo">›</span></button></div><button class="ghostbtn" id="accDataClose">Закрыть</button></div>`;
  document.body.append(box);
  box.querySelector('#accDataClose').onclick = () => box.remove();
  box.querySelector('#dlgDelAction').onclick = () => { box.remove(); askDeleteAccount(); };
}
let deletingAccount = false;
async function deleteMyAccount() {
  if (!FB) return toastAny('Удаление доступно в версии с интернетом');
  if (deletingAccount) return;
  deletingAccount = true;
  toastAny('Удаляем данные…');
  try {
    clearTimeout(cloudTimer);
    if (syncing) await syncing;
    await FBC.deleteAccount({friendCode: wallet.fcode, usageDay: usageState?.d});
    try { if (window.AndroidApp && AndroidApp.resetAnalytics) AndroidApp.resetAnalytics(); } catch (_) {}
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
    location.reload();
  } catch (error) {
    const reason = error?.error?.message || error?.message || '';
    if (fbAuth?.email && /CREDENTIAL_TOO_OLD|TOKEN_EXPIRED|INVALID_ID_TOKEN|auth expired/.test(reason)) {
      toastAny('Войдите в тот же профиль и повторите удаление в настройках.');
      accountDialog('login', fbAuth.email);
    } else {
      toastAny('Удаление не подтверждено. Проверьте подключение и повторите попытку.');
    }
  } finally {
    deletingAccount = false;
  }
}
$('#delAccBtn').onclick = accountDataDialog;
async function signOut() {
  toastAny('Выходим…');
  try { await Promise.race([cloudSync(true), new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  try { await presenceMark(false); } catch (_) {}
  clearTimeout(cloudTimer);
  track('logout');
  FBC?.clear();
  usageState = null;
  ['wallet', 'walletBase', 'setup', 'lastGame', 'savedGame', 'verSeen', 'usage'].forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
  location.reload();
}
