// Platform startup shows release notes before this part of the runtime is initialized.
function showWhatsNew(version) { return PG.app.update.showWhatsNew(version); }

let updBox = null, pendingUpdate = null;
var boot = {checked: !window.AndroidApp || Boolean(window.__updateChecked), min: false, update: false, gone: false};
var bootDone, bootReady = new Promise(resolve => { bootDone = resolve; });
function bootHide() {
  if (boot.gone || !boot.min || !boot.checked || boot.update) return;
  boot.gone = true;
  const el = $('#boot');
  if (el) {
    if (RM || window.AndroidApp?.holdsLaunchCover?.()) el.remove();
    else {
      el.classList.add('gone');
      el.setAttribute('aria-hidden', 'true');
      setTimeout(() => el.remove(), 260);
    }
  }
  window.__finishNativeLaunch?.();
  bootDone();
}

const releaseUpdates = PG.app.update.createReleaseController({
  doc: document, boot, finishBoot: bootHide,
  getPolicy: () => ({currentCode: appCode(), minRequiredCode: window.MIN_REQUIRED_CODE, staging: window.IS_STAGING}),
  getMatch: () => ({
    active: Boolean(players?.length && phase !== 'end' && phase !== 'idle'),
    visible: gameVisible || Boolean(document.querySelector('#scr-game:not([hidden])')),
    online: Boolean(net)
  }),
  defer: info => { pendingUpdate = info; },
  startUpdate: url => AndroidApp.startUpdate(url),
  notify: toastAny,
  migration: {
    linkedUid: () => linkedNow() ? fbAuth.uid : null,
    saveProfile: cloudSave,
    linkAccount: () => accountDialog('link'),
    confirmRemoval: confirmBox,
    download: url => { location.href = url; },
    openSettings: () => window.AndroidApp?.openAppSettings?.(),
    track
  }
});

window.onUpdateChecked = () => releaseUpdates.checked();
window.onUpdateAvailable = (info, manual) => {
  lastUpd = info;
  updateSettingsUpdateBtn(info);
  releaseUpdates.offer(info, manual);
  updBox = releaseUpdates.box;
  if (boot.update && updBox) window.__finishNativeLaunch?.();
};
window.onUpdateProgress = percent => releaseUpdates.progress(percent);
window.onUpdateError = message => releaseUpdates.error(message);
// The boot guard retains an offer made by Android before the game initialized.
if (window.__upd) setTimeout(() => window.onUpdateAvailable(window.__upd, false));
