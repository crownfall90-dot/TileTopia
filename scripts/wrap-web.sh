#!/bin/sh
# Wraps web/game.html (artifact fragment) into a full document for the Android app:
# swaps Google Fonts for the bundled copies in assets/fonts and embeds release-notes.md.
#   sh scripts/wrap-web.sh          → app/src/main/assets/index.html (Android)
#   sh scripts/wrap-web.sh web [N]  → build/web/ (the site for iPhone, Android browsers and computers;
#                                     N is the build number shown as the version;
#                                     also builds build/web/staging/ with tester PIN gate)
set -e
cd "$(dirname "$0")/.."
target=${1:-android}

if python3 -c 'exit(0)' >/dev/null 2>&1; then
  PY_BIN="python3"
elif python -c 'exit(0)' >/dev/null 2>&1; then
  PY_BIN="python"
else
  echo "Error: working python not found" >&2
  exit 1
fi

if [ "$target" = web ]; then
  site=build/web; out=$site/index.html; webver="веб ${2:-dev}"
  rm -rf "$site"; mkdir -p "$site/staging"
  cp -r app/src/main/assets/fonts "$site/fonts"
  cp -r app/src/main/assets/fonts "$site/staging/fonts"
  cp -r web/icons "$site/icons"
  cp -r web/icons "$site/staging/icons"
  cp web/manifest.webmanifest "$site/"
  cp web/manifest.webmanifest "$site/staging/"
  sed "s/__VERSION__/$(echo "${2:-dev}" | tr -cd 'A-Za-z0-9.-')/" web/sw.js > "$site/sw.js"
  touch "$site/.nojekyll"
  touch "$site/staging/.nojekyll"
  "$PY_BIN" scripts/privacy-page.py "$site/privacy.html"
  # Owner pages (the in-game owner panel links here). No secrets inside: the data behind them is
  # admin-only in the Firebase rules. Kept out of search engines.
  mkdir -p "$site/admin"
  sed 's|<head>|<head><meta name="robots" content="noindex,nofollow">|' tools/founder-admin.html > "$site/admin/index.html"
  printf '%s\n' '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=./#feedback"><a href="./#feedback">Отзывы теперь в админ-панели</a>' > "$site/admin/feedback.html"
else
  out=app/src/main/assets/index.html
fi
mkdir -p "$(dirname "$out")"

# Modules from src/ (TASK-008): Vite bundles them into one script, window.PG, inlined before game.html,
# so the page stays a single file (the Android WebView loads it from file://).
if [ ! -x node_modules/.bin/vite ]; then npm ci --no-audit --no-fund >/dev/null; fi
node_modules/.bin/vite build --logLevel error

# Firebase web config from app/google-services.json, if the project has one.
firebase=$("$PY_BIN" - <<'PY'
import json, os
p = 'app/google-services.json'
if not os.path.exists(p):
    print('null')
else:
    g = json.load(open(p))
    info = g['project_info']
    db = info.get('firebase_url') or 'https://%s-default-rtdb.europe-west1.firebasedatabase.app' % info['project_id']
    oc = g['client'][0].get('oauth_client') or []
    gid = next((x['client_id'] for x in oc if x.get('client_type') == 3), '')
    print(json.dumps({'apiKey': g['client'][0]['api_key'][0]['current_key'], 'dbUrl': db, 'googleClientId': gid}))
PY
)
notes=$(PYTHONIOENCODING=utf-8 "$PY_BIN" -c 'import json; print(json.dumps(open("release-notes.md", encoding="utf-8").read().strip()))')

build_page() {
  dest="$1"
  staging="$2"
  vstring="$3"
  {
    printf '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">\n'
    printf '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'
    printf '<link rel="stylesheet" href="fonts/fonts.css">\n'
    if [ "$target" = web ]; then
      cat <<'HEAD'
<meta name="theme-color" content="#101729">
<script>
// iPhone: the same physical size as in the Android app (which zooms by the screen diagonal). Safari has no
// diagonal, so the narrow side in points stands in for it: a wider layout, scaled down to fit the screen.
(function () {
  if (!/iP(hone|od)/.test(navigator.userAgent)) return;
  var w = Math.min(screen.width, screen.height), z = Math.max(.82, Math.min(1, w / 460));
  if (z < .995) document.querySelector('meta[name=viewport]').setAttribute('content', 'width=' + Math.round(w / z) + ',viewport-fit=cover,user-scalable=no');
})();
</script>
<meta name="description" content="Puzzlegrad — стройте города, дороги и крепости из общей стопки. Играйте онлайн, с друзьями и с ботами.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Puzzlegrad">
<meta property="og:title" content="Puzzlegrad"><meta property="og:description" content="Стройте города, дороги и крепости — играйте с друзьями онлайн"><meta property="og:image" content="icons/icon-512.png">
<script>
(function () {
  setTimeout(function () {
    if (window.__ready) return;
    document.body.innerHTML = '<div style="font:16px sans-serif;color:#eef1f8;background:#101729;position:fixed;inset:0;padding:32px;line-height:1.5"><h2 style="margin:0 0 12px">Не удалось запустить игру</h2><p>Обновите браузер (Safari, Chrome) до последней версии и откройте страницу снова.</p></div>';
  }, 10000);
})();
</script>
HEAD
      if [ "$staging" = "true" ]; then
        printf '<script>window.WEBAPP = true; window.IS_STAGING = true; window.WEB_VERSION = "%s";</script>\n' "$vstring"
      else
        printf '<script>window.WEBAPP = true; window.IS_STAGING = false; window.WEB_VERSION = "%s";</script>\n' "$vstring"
      fi
    else
      cat <<'BOOT'
<script>
/* If the game cannot start (usually an outdated Android System WebView), say how to fix it instead of a blank screen. */
(function () {
  var m = /Chrome\/(\d+)/.exec(navigator.userAgent), old = m && +m[1] < 80;
  function fail() {
    if (window.__ready) return;
    document.body.innerHTML = '<div style="font:16px sans-serif;color:#eef1f8;background:#101729;position:fixed;top:0;left:0;right:0;bottom:0;padding:32px;line-height:1.5">' +
      '<h2 style="margin:0 0 12px">Не удалось запустить игру</h2><p>Обновите приложения «Android System WebView» и «Chrome» в Google Play и откройте игру снова.</p>' +
      '<p><a style="color:#f2b84b" href="https://play.google.com/store/apps/details?id=com.google.android.webview">Открыть Android System WebView в Google Play</a></p></div>';
  }
  if (old) document.addEventListener('DOMContentLoaded', fail); else setTimeout(fail, 8000);
})();
</script>
BOOT
    fi
    printf '<script>window.RELEASE_NOTES = %s; window.FIREBASE = %s;</script>\n' "$notes" "$firebase"
    printf '<script>'; cat build/bundle/pg.js; printf '</script>\n'
    printf '</head><body>\n'
    # The page with its styles put back in place of the marker line (same spot, so the cascade order is unchanged).
    grep -v -e 'fonts.googleapis.com' -e 'fonts.gstatic.com' web/game.html | awk '/^<!-- styles: src\/ui\/styles.css/ { print "<style>"; while ((getline l < "src/ui/styles.css") > 0) print l; print "</style>"; next } { print }'
    printf '\n</body></html>\n'
  } > "$dest"
  echo "wrote $dest"
}

if [ "$target" = web ]; then
  build_page "$out" "false" "$webver"
  build_page "$site/staging/index.html" "true" "тест ${2:-dev}"
else
  build_page "$out" "false" ""
fi
