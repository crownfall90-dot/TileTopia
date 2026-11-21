// Update pause during online matches and release notes handling.
import {showReleaseNotes, showReleaseDialog, showReinstallDialog} from './update-dialogs.js';

export const UPD_WAIT = 10 * 60 * 1000;

export function appCode(isAndroid) {
  if (isAndroid && typeof window !== 'undefined' && window.AndroidApp && window.AndroidApp.versionName) {
    return parseInt(String(window.AndroidApp.versionName()).split('.').pop(), 10) || 0;
  }
  return 1e9;
}

export function showWhatsNew(ver, storage, shell = globalThis.window) {
  if (!ver) return false;
  let last = null;
  try {
    if (storage === undefined) storage = shell?.localStorage;
    if (!storage) return false;
    last = storage.getItem('seenVersion');
    storage.setItem('seenVersion', ver);
  } catch (_) {
    return false;
  }
  if (!last || last === ver || !shell?.RELEASE_NOTES) return false;
  showReleaseNotes(shell.document, ver, shell.RELEASE_NOTES);
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

function isTestRelease(info, staging) {
  return Boolean(staging || info?.version?.includes('-test') || info?.package?.endsWith('.test'));
}

export function isUpdateMandatory(info, minRequiredCode = 0, currentCode = 0, staging = false) {
  if (!info) return false;
  // Test / staging builds (-test) are NOT mandatory by default (testers can postpone)
  if (isTestRelease(info, staging)) return info.force === true;

  // Production build: ALL updates are mandatory by default unless explicitly disabled
  if (info.mandatory === false) {
    const minCode = Number(minRequiredCode) || Number(info.minRequiredCode) || 0;
    const curCode = Number(currentCode) || 0;
    if (minCode > 0 && curCode > 0 && curCode < minCode) return true;
    return false;
  }
  return true;
}

export function shouldPromptUpdate(info, {manual = false, minRequiredCode = 0, currentCode = 0, staging = false} = {}) {
  if (!info) return false;
  if (manual || info.reinstall || isTestRelease(info, staging)) return true;
  return isUpdateMandatory(info, minRequiredCode, currentCode);
}

// Java supplies the reinstall decision after checking the installed package and signature.
// The runtime supplies live match/profile/bridge state, which can change between callbacks.
export function createReleaseController({doc, boot, finishBoot, getPolicy, getMatch, defer, startUpdate, notify, migration}) {
  let release = null;
  let reinstall = null;

  function checked() {
    boot.checked = true;
    finishBoot();
  }

  function offer(info, manual) {
    const policy = {...getPolicy(), manual};
    if (!shouldPromptUpdate(info, policy)) return checked();
    const match = getMatch();
    if (!manual && match.active && match.visible) return defer(info);

    if (info.reinstall) {
      release?.box.remove();
      release = null;
      boot.update = false;
      checked();
      if (reinstall?.box.isConnected && reinstall.code === info.code && reinstall.url === info.url) {
        reinstall.refresh();
        return;
      }
      reinstall?.box.remove();
      reinstall = {...showReinstallDialog(doc, info, {...migration, notify}), code: info.code, url: info.url};
      return;
    }
    if (release?.box.isConnected) return;
    reinstall?.box.remove();
    reinstall = null;
    boot.checked = true;
    boot.update = !boot.gone;
    release = showReleaseDialog(doc, info, {
      mandatory: isUpdateMandatory(info, policy.minRequiredCode, policy.currentCode, policy.staging),
      onSplash: boot.update,
      match,
      startUpdate,
      postpone() { boot.update = false; finishBoot(); }
    });
  }

  return {
    offer, checked,
    get box() { return release?.box || null; },
    progress(percent) { release?.progress(percent); },
    error(message) {
      if (!release?.box.isConnected) return;
      release.error();
      notify(message);
    }
  };
}

export function formatUpdateSettingsBadge(info) {
  if (!info || !info.version) return 'Проверить обновления';
  if (info.mandatory === true || info.force === true) {
    return `Обновить до ${info.version} (важно!)`;
  }
  return `Обновить до ${info.version} (по желанию)`;
}


