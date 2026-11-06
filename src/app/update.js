// Update pause during online matches and release notes handling.

export const UPD_WAIT = 10 * 60 * 1000;

export function appCode(isAndroid) {
  if (isAndroid && typeof window !== 'undefined' && window.AndroidApp && window.AndroidApp.versionName) {
    return parseInt(String(window.AndroidApp.versionName()).split('.').pop(), 10) || 0;
  }
  return 1e9;
}

export function showWhatsNew(ver, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage || !ver) return false;
  let last = null;
  try {
    last = storage.getItem('seenVersion');
    storage.setItem('seenVersion', ver);
  } catch (_) {
    return false;
  }
  if (!last || last === ver || typeof window === 'undefined' || !window.RELEASE_NOTES) return false;

  const box = document.createElement('div');
  box.className = 'over';
  box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard"><h3>Что нового в версии ${ver}</h3><div class="notes-list"></div><button class="cta wide">Играть</button></div>`;
  box.querySelector('.notes-list').textContent = window.RELEASE_NOTES;
  box.querySelector('.cta').onclick = () => box.remove();
  document.body.append(box);
  return true;
}

export function renderUpdPlayerRowsHtml(players = [], readySet = new Set()) {
  return players
    .filter(p => p.owner && p.human && !p.resigned)
    .map(p => {
      const isReady = readySet && readySet.has && readySet.has(p.owner);
      return `<li class="${isReady ? 'ok' : ''}"><i style="background:${p.col || '#5b6684'}"></i><b>${p.name}</b><span>${isReady ? '✓ обновился' : 'обновляется…'}</span></li>`;
    })
    .join('');
}

export function formatUpdPauseHtml({rowsHtml = '', mine = false}) {
  return `<div class="ocard"><div style="font-size:38px">⏸</div><h3>Партия на паузе</h3><p>Вышло обновление. Время хода остановлено, пока все игроки не обновятся.</p><ul class="updlist">${rowsHtml}</ul>${mine ? '<button class="cta wide" id="updGo">Обновить</button>' : ''}<button class="ghostbtn" id="updSkip">Продолжить без ожидания</button><small id="updLeft"></small></div>`;
}

export function formatUpdCountdown(secondsLeft) {
  const s = Math.max(0, Math.floor(secondsLeft || 0));
  return `Само продолжится через ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function isUpdateMandatory(info, minRequiredCode = 0, currentCode = 0) {
  if (!info) return false;
  if (info.mandatory === true || info.force === true) return true;
  const minCode = Number(minRequiredCode) || Number(info.minRequiredCode) || 0;
  const curCode = Number(currentCode) || 0;
  if (minCode > 0 && curCode > 0 && curCode < minCode) return true;
  return false;
}

export function shouldPromptUpdate(info, {manual = false, minRequiredCode = 0, currentCode = 0} = {}) {
  if (!info) return false;
  if (manual) return true;
  if (info.version && info.version.includes('-test')) return true;
  return isUpdateMandatory(info, minRequiredCode, currentCode);
}

export function formatUpdateSettingsBadge(info) {
  if (!info || !info.version) return 'Проверить обновления';
  if (info.mandatory === true || info.force === true) {
    return `Обновить до ${info.version} (важно!)`;
  }
  return `Обновить до ${info.version} (по желанию)`;
}
