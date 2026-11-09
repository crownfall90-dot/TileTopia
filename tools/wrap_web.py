import os, sys, json, shutil, subprocess

sys.stdout.reconfigure(encoding='utf-8')

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
os.chdir(root)

target = sys.argv[1] if len(sys.argv) > 1 else 'android'
raw_ver = sys.argv[2] if len(sys.argv) > 2 else 'dev'

# 1. Run Vite build
print("Building bundle via Vite...")
subprocess.run(["cmd.exe", "/c", "npm run build"], check=True)

# 2. Firebase config
firebase = 'null'
gs_path = 'app/google-services.json'
if os.path.exists(gs_path):
    try:
        g = json.load(open(gs_path, encoding='utf-8'))
        info = g['project_info']
        db = info.get('firebase_url') or f"https://{info['project_id']}-default-rtdb.europe-west1.firebasedatabase.app"
        oc = g.get('client', [{}])[0].get('oauth_client', [])
        gid = next((x['client_id'] for x in oc if x.get('client_type') == 3), '')
        api_key = g['client'][0]['api_key'][0]['current_key']
        firebase = json.dumps({'apiKey': api_key, 'dbUrl': db, 'googleClientId': gid})
    except Exception as e:
        print(f"Warning: could not parse google-services.json: {e}")

# 3. Release notes
notes = json.dumps(open('release-notes.md', encoding='utf-8').read().strip())

# 4. Read pg.js
pg_js = open('build/bundle/pg.js', encoding='utf-8').read()

# 5. Read styles.css
styles_css = open('src/ui/styles.css', encoding='utf-8').read()

# 6. Read game.html
game_html = open('web/game.html', encoding='utf-8').read()

# Process game.html lines: strip google fonts
clean_lines = []
for line in game_html.splitlines():
    if 'fonts.googleapis.com' in line or 'fonts.gstatic.com' in line:
        continue
    if '<!-- styles: src/ui/styles.css' in line:
        clean_lines.append('<style>')
        clean_lines.append(styles_css)
        clean_lines.append('</style>')
    else:
        clean_lines.append(line)
game_body = '\n'.join(clean_lines)

def build_page(dest, is_staging, vstring):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    parts = []
    parts.append('<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">')
    parts.append('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">')
    parts.append('<link rel="stylesheet" href="fonts/fonts.css">')
    
    if target == 'web':
        parts.append('''<meta name="theme-color" content="#101729">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>try{if(window.Telegram&&window.Telegram.WebApp){window.Telegram.WebApp.ready();window.Telegram.WebApp.expand();}}catch(_){}</script>
<script>
(function () {
  if (!/iP(hone|od)/.test(navigator.userAgent)) return;
  var w = Math.min(screen.width, screen.height), z = Math.max(.82, Math.min(1, w / 460));
  if (z < .995) document.querySelector('meta[name=viewport]').setAttribute('content', 'width=' + Math.round(w / z) + ',viewport-fit=cover,user-scalable=no');
})();
</script>
<meta name="description" content="Tiletopia — стройте города, дороги и крепости из общей стопки. Играйте онлайн, с друзьями и с ботами.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tiletopia">
<meta property="og:title" content="Tiletopia"><meta property="og:description" content="Стройте города, дороги и крепости — играйте с друзьями онлайн"><meta property="og:image" content="icons/icon-512.png">
<script>
(function () {
  setTimeout(function () {
    if (window.__ready) return;
    document.body.innerHTML = '<div style="font:16px sans-serif;color:#eef1f8;background:#101729;position:fixed;inset:0;padding:32px;line-height:1.5"><h2 style="margin:0 0 12px">Не удалось запустить игру</h2><p>Обновите браузер (Safari, Chrome) до последней версии и откройте страницу снова.</p></div>';
  }, 10000);
})();
</script>''')
        if is_staging:
            parts.append(f'<script>window.WEBAPP = true; window.IS_STAGING = true; window.WEB_VERSION = "{vstring}";</script>')
        else:
            parts.append(f'<script>window.WEBAPP = true; window.IS_STAGING = false; window.WEB_VERSION = "{vstring}";</script>')
    else:
        parts.append('''<script>
/* If the game cannot start (usually an outdated Android System WebView), say how to fix it instead of a blank screen. */
(function () {
  function fail() {
    if (window.__ready) return;
    if (document.getElementById('boot') || document.getElementById('bnav') || document.querySelector('.screen:not([hidden])')) {
      window.__ready = true;
      return;
    }
    document.body.innerHTML = '<div style="font:16px sans-serif;color:#eef1f8;background:#101729;position:fixed;top:0;left:0;right:0;bottom:0;padding:32px;line-height:1.5;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">' +
      '<div style="font-size:48px;margin-bottom:16px">🧩</div>' +
      '<h2 style="margin:0 0 12px">Не удалось запустить игру</h2>' +
      '<p style="max-width:380px;color:#94a3b8;margin:0 0 20px">Произошла задержка при инициализации компонентов. Попробуйте перезапустить игру или обновить системный компонент WebView.</p>' +
      '<button onclick="location.reload()" style="background:#4f8ef7;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:16px">Попробовать снова</button>' +
      '<p style="font-size:13px;color:#64748b;margin:0"><a style="color:#f2b84b;text-decoration:none" href="https://play.google.com/store/apps/details?id=com.google.android.webview">Обновить Android System WebView в Google Play</a></p></div>';
  }
  setTimeout(fail, 20000);
})();
</script>''')
    
    parts.append(f'<script>window.RELEASE_NOTES = {notes}; window.FIREBASE = {firebase};</script>')
    parts.append(f'<script>{pg_js}</script>')
    parts.append('</head><body>')
    parts.append(game_body)
    parts.append('\n</body></html>')
    
    with open(dest, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    print(f"Wrote {dest} ({os.path.getsize(dest)} bytes)")

# Always update app/src/main/assets/index.html (Android app)
build_page("app/src/main/assets/index.html", False, raw_ver)

# Also update web builds
site = "build/web"
os.makedirs(f"{site}/staging", exist_ok=True)
if os.path.exists("app/src/main/assets/fonts"):
    shutil.copytree("app/src/main/assets/fonts", f"{site}/fonts", dirs_exist_ok=True)
    shutil.copytree("app/src/main/assets/fonts", f"{site}/staging/fonts", dirs_exist_ok=True)
if os.path.exists("web/icons"):
    shutil.copytree("web/icons", f"{site}/icons", dirs_exist_ok=True)
    shutil.copytree("web/icons", f"{site}/staging/icons", dirs_exist_ok=True)
if os.path.exists("web/manifest.webmanifest"):
    shutil.copy2("web/manifest.webmanifest", f"{site}/manifest.webmanifest")
    shutil.copy2("web/manifest.webmanifest", f"{site}/staging/manifest.webmanifest")
if os.path.exists("tools/export-tiles.html"):
    os.makedirs(f"{site}/tiles", exist_ok=True)
    shutil.copy2("tools/export-tiles.html", f"{site}/tiles/index.html")
if os.path.exists("assets/tiles"):
    shutil.copytree("assets/tiles", f"{site}/tiles", dirs_exist_ok=True)
if os.path.exists("store"):
    shutil.copytree("store", f"{site}/store", dirs_exist_ok=True)
    shutil.copytree("store", f"{site}/staging/store", dirs_exist_ok=True)

# Build web pages
target = 'web'
build_page(f"{site}/index.html", False, raw_ver)
build_page(f"{site}/staging/index.html", True, raw_ver)

print("Wrap web completed successfully!")
