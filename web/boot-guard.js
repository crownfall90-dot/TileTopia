/* Runs before the game script (scripts/wrap-web.sh puts it in the page head). If the game cannot start — an error while
   it sets itself up, or no sign of life in 20 s — the player gets a way out instead of an endless loading screen:
   the update the app found (the game's own update window is in the script that failed), a check for one, a retry.
   The game sets window.__ready = true at the very end of its start-up and then replaces window.onUpdateAvailable. */
(function () {
  var shown = false;
  // Until the game takes over, an update found by the app is kept here (the game picks it up, see game.html).
  window.onUpdateAvailable = function (info) { window.__upd = info; if (shown) fail(); };
  function btn(id, text, main) {
    return '<button id="' + id + '" style="background:' + (main ? '#f2b84b;color:#2a1a02' : 'rgba(255,255,255,.08);color:#eef1f8') + ';border:none;padding:13px 24px;border-radius:14px;font:700 15px sans-serif;cursor:pointer;margin:0 0 10px;min-width:240px">' + text + '</button>';
  }
  function fail() {
    if (window.__ready) return;
    shown = true;
    var u = window.__upd, a = window.AndroidApp, canUpdate = !!(u && u.url && a && a.startUpdate), canCheck = !!(a && a.checkUpdates);
    document.body.innerHTML = '<div style="font:16px sans-serif;color:#eef1f8;background:#101729;position:fixed;top:0;left:0;right:0;bottom:0;padding:32px;line-height:1.5;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:99999">' +
      '<div style="font-size:48px;margin-bottom:12px">🧩</div><h2 style="margin:0 0 10px">Не удалось запустить игру</h2>' +
      '<p style="max-width:360px;color:#94a3b8;margin:0 0 22px">' + (canUpdate ? 'Вышла исправленная версия' + (u.version ? ' ' + u.version : '') + '. Обновите игру — прогресс сохранится.' : 'Проверьте обновление игры или попробуйте ещё раз.') + '</p>' +
      (canUpdate ? btn('bootUpd', 'Обновить игру', true) : canCheck ? btn('bootChk', 'Проверить обновление', true) : '') +
      btn('bootRetry', 'Попробовать снова', !canUpdate && !canCheck) +
      (a ? '<p style="font-size:13px;margin:8px 0 0"><a style="color:#8db4ff" href="https://play.google.com/store/apps/details?id=com.google.android.webview">Обновить Android System WebView</a></p>' : '') + '</div>';
    var b = document.getElementById('bootUpd'), c = document.getElementById('bootChk');
    if (b) b.onclick = function () { b.disabled = true; b.textContent = 'Загружаем обновление…'; try { a.startUpdate(u.url); } catch (e) {} };
    if (c) c.onclick = function () { c.textContent = 'Проверяем…'; try { a.checkUpdates(); } catch (e) {} setTimeout(function () { if (!window.__upd) c.textContent = 'Обновлений нет · проверить снова'; }, 6000); };
    document.getElementById('bootRetry').onclick = function () { location.reload(); };
  }
  // an error while the game sets itself up means it will not start: say so at once (after a moment for the page to settle)
  window.addEventListener('error', function () { if (!window.__ready) setTimeout(fail, 1500); });
  setTimeout(fail, 20000);
})();
