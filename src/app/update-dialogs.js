function inlineNotes(text) {
  const escaped = text.replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,!?:;]|$)/g, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function notesHtml(markdown) {
  const output = [];
  let inList = false;
  for (const raw of String(markdown || '').split(/\r?\n/)) {
    const line = raw.trim();
    const item = /^[-*•]\s+(.*)$/.exec(line);
    if (item) {
      if (!inList) output.push('<ul class="nl-list">');
      inList = true;
      output.push(`<li>${inlineNotes(item[1])}</li>`);
      continue;
    }
    if (inList) output.push('</ul>');
    inList = false;
    if (!line) continue;
    const heading = /^#{1,6}\s*(.*)$/.exec(line);
    output.push(heading ? `<div class="nl-h">${inlineNotes(heading[1])}</div>` : `<p class="nl-p">${inlineNotes(line)}</p>`);
  }
  if (inList) output.push('</ul>');
  return output.join('');
}

function overlay(doc) {
  const box = doc.createElement('div');
  box.className = 'over';
  box.style.position = 'fixed';
  return box;
}

export function showReleaseNotes(doc, version, notes) {
  const box = overlay(doc);
  box.innerHTML = '<div class="ocard"><h3></h3><div class="notes-list"></div><button class="cta wide">Играть</button></div>';
  box.querySelector('h3').textContent = `Что нового в версии ${version}`;
  box.querySelector('.notes-list').innerHTML = notesHtml(notes);
  box.querySelector('.cta').onclick = () => box.remove();
  doc.body.append(box);
}

export function showReleaseDialog(doc, info, {mandatory, onSplash, match, startUpdate, postpone}) {
  const box = overlay(doc);
  box.innerHTML = `<div class="ocard"><h3></h3><p></p><div class="notes-list"></div><div class="prog" hidden><i></i></div><button class="cta wide" id="upd">Обновить</button>${mandatory ? '' : '<button class="ghostbtn" id="updLater" style="margin-top:6px">Позже</button>'}<a class="ghostbtn manual" id="manual" hidden>Скачать вручную</a></div>`;
  box.querySelector('h3').textContent = `Вышло обновление ${info.version}`;
  let message = mandatory ? 'Для продолжения сетевой игры требуется обновление. ' : '';
  if (match.active) message = match.online ? 'Партия на паузе: после обновления вернитесь в комнату — игра продолжится, когда обновятся все. ' : 'Партия сохранится. ';
  box.querySelector('p').textContent = message + 'Что нового:';
  box.querySelector('.notes-list').innerHTML = notesHtml(info.notes || 'Исправления и улучшения');
  if (!mandatory) box.querySelector('#updLater').onclick = () => { box.remove(); postpone(); };
  if (onSplash) {
    Object.assign(box.style, {zIndex: '101', background: 'linear-gradient(transparent 35%,rgba(8,12,24,.75))', backdropFilter: 'none', alignItems: 'flex-end', paddingBottom: 'calc(24px + var(--ib,0px))'});
    const label = doc.querySelector('#boot small');
    if (label) label.textContent = 'Доступна новая версия';
    doc.querySelector('#boot')?.classList.add('withupd');
  }
  const button = box.querySelector('#upd');
  const progress = box.querySelector('.prog');
  button.onclick = () => {
    button.disabled = true;
    button.textContent = 'Скачиваем…';
    progress.hidden = false;
    startUpdate(info.url);
  };
  doc.body.append(box);
  return {
    box,
    progress(percent) { progress.querySelector('i').style.width = percent + '%'; },
    error() {
      button.hidden = true;
      progress.hidden = true;
      const link = box.querySelector('#manual');
      link.href = info.url;
      link.textContent = 'Скачать новую версию вручную';
      link.className = 'cta wide';
      link.hidden = false;
    }
  };
}

// The confirmed cloud save belongs to the identity that initiated it. Signing out or
// switching accounts while the write is in flight must keep the removal warning active.
export function showReinstallDialog(doc, info, {linkedUid, saveProfile, linkAccount, confirmRemoval, download, openSettings, notify, track}) {
  const box = overlay(doc);
  box.id = 'reinst';
  box.innerHTML = `<div class="ocard reinst"><div class="rbig">🔐</div><h3>Новое приложение Tiletopia</h3>
    <p>У Tiletopia новый ключ подписи. Сначала сохраните профиль и скачайте APK, затем подтвердите удаление старой версии в Android.</p>
    <ol class="rsteps2">
      <li><i>1</i><div><b>Сохраните прогресс в профиле</b><small>Перед переустановкой завершите начатую партию на устройстве.</small></div><button class="chip pri" id="rsSave">Сохранить</button><em hidden>✓</em></li>
      <li><i>2</i><div><b>Скачайте новую версию</b><small>Дождитесь появления APK в папке «Загрузки».</small></div><button class="chip pri" id="rsGet">Скачать</button></li>
      <li><i>3</i><div><b>Удалите старую версию</b><small>В системных настройках нажмите «Удалить».</small></div><button class="chip" id="rsDel" disabled>Открыть</button></li>
      <li><i>4</i><div><b>Установите скачанный файл</b><small>Откройте APK из «Загрузок» и войдите в тот же профиль.</small></div></li>
    </ol><button class="ghostbtn wide" id="rsLater">Позже</button></div>`;
  let savedUid = null;
  const isSaved = () => Boolean(savedUid && savedUid === linkedUid());
  const saveButton = box.querySelector('#rsSave');
  const removeButton = box.querySelector('#rsDel');
  const refresh = () => {
    const saved = isSaved();
    const row = saveButton.closest('li');
    row.classList.toggle('ok', saved);
    row.querySelector('b').textContent = saved ? 'Профиль сохранён' : 'Сохраните прогресс в профиле';
    row.querySelector('em').hidden = !saved;
    saveButton.hidden = saved;
  };
  saveButton.onclick = async () => {
    const uid = linkedUid();
    if (!uid) return linkAccount();
    saveButton.disabled = true;
    let confirmed = false;
    try { confirmed = await saveProfile() && uid === linkedUid(); } catch (_) {}
    if (confirmed) savedUid = uid;
    else if (box.isConnected) notify('Не удалось подтвердить сохранение. Проверьте подключение и повторите.');
    saveButton.disabled = false;
    refresh();
  };
  box.querySelector('#rsGet').onclick = () => {
    removeButton.disabled = false;
    refresh();
    track('reinstall_download');
    download(info.url);
  };
  removeButton.onclick = () => {
    refresh();
    const remove = () => { track('reinstall_remove'); openSettings(); };
    if (isSaved()) remove();
    else confirmRemoval('Профиль не сохранён. Прогресс на этом устройстве может пропасть.', 'Всё равно продолжить', remove);
  };
  box.querySelector('#rsLater').onclick = () => box.remove();
  doc.body.append(box);
  track('reinstall_offer');
  return {box, refresh};
}
