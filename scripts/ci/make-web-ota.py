"""The game update over the air for one release (see app/src/main/java/com/crownfall/mosaic/ContentUpdater.java):
the game page the APK was built with (app/src/main/assets/index.html), copied as <name>.html, and <name>.json naming
it with its size, SHA-256 and an ECDSA P-256 signature made with the owner's key (env OTA_SIGNING_KEY, PEM).
    python3 scripts/ci/make-web-ota.py <code> <release-tag> <name>
Without OTA_SIGNING_KEY it does nothing (the apps then just keep the page their APK has).
minApp: the oldest APK whose native side this page needs, from scripts/ci/ota-min-app.txt; raise it when the game
starts to need a new AndroidApp method that older APKs do not have."""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

code, tag, name = int(sys.argv[1]), sys.argv[2], sys.argv[3]
key = os.environ.get('OTA_SIGNING_KEY', '').strip()
if not key:
    print('make-web-ota: no OTA_SIGNING_KEY, skipped')
    sys.exit(0)
page = open('app/src/main/assets/index.html', 'rb').read()
min_app = int(open('scripts/ci/ota-min-app.txt').read().split()[0])
sha = hashlib.sha256(page).hexdigest()
with tempfile.TemporaryDirectory() as d:
    kf, df = os.path.join(d, 'k.pem'), os.path.join(d, 'data')
    open(kf, 'w').write(key + '\n')
    open(df, 'w', newline='').write(f'{code}\n{min_app}\n{sha}')
    sig = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', kf, df], check=True, capture_output=True).stdout
import base64
repo = os.environ.get('GITHUB_REPOSITORY', 'crownfall90-dot/TileTopia')
open(name + '.html', 'wb').write(page)
json.dump({'code': code, 'minApp': min_app, 'size': len(page), 'sha256': sha, 'sig': base64.b64encode(sig).decode(),
           'url': f'https://github.com/{repo}/releases/download/{tag}/{name}.html'}, open(name + '.json', 'w'))
print(f'make-web-ota: {name}.html ({len(page) // 1024} KB) for code {code}, minApp {min_app}')
