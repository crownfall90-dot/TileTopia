import base64
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

report = {'status': 'verification_error', 'expected': 'unavailable', 'actual': 'unavailable'}

def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Tool failed: ' + Path(args[0]).name + ' - ' + result.stderr)
    return result.stdout

def signer_digest(text):
    blocks = re.findall(r'-----BEGIN CERTIFICATE-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END CERTIFICATE-----', text)
    certificates = {base64.b64decode(re.sub(r'\s+', '', block), validate=True) for block in blocks}
    if len(certificates) != 1:
        raise ValueError('Expected exactly one distinct signing certificate')
    certificate = next(iter(certificates))
    if not certificate:
        raise ValueError('Empty signing certificate')
    return hashlib.sha256(certificate).hexdigest()

def verify():
    apk = Path('app/build/outputs/apk/github/release/app-github-release.apk')
    if not apk.is_file():
        apk = Path('app/build/outputs/apk/staging/debug/app-staging-debug.apk')
    if not apk.is_file():
        candidates = list(Path('app/build/outputs/apk').glob('*/*/*.apk'))
        if candidates:
            apk = candidates[0]
        else:
            raise FileNotFoundError('No APK found in app/build/outputs/apk')

    root = Path(os.environ.get('ANDROID_HOME', '')) / 'build-tools'
    tools = None
    if root.is_dir():
        candidates = [p for p in root.iterdir() if (p / 'aapt').is_file() and (p / 'apksigner').is_file()]
        if candidates:
            tools = max(candidates, key=lambda p: tuple(int(n) for n in re.findall(r'\d+', p.name)))

    if tools:
        badging = run([str(tools / 'aapt'), 'dump', 'badging', str(apk)])
        if not re.search(r"^package: name='com\.crownfall\.mosaic", badging, re.M):
            report['status'] = 'wrong_application_id'
            return False
        permissions = run([str(tools / 'aapt'), 'dump', 'permissions', str(apk)])
        if 'android.permission.INTERNET' not in permissions:
            report['status'] = 'internet_permission_missing'
            return False
        certs = run([str(tools / 'apksigner'), 'verify', '--verbose', '--print-certs-pem', str(apk)])
        try:
            report['actual'] = signer_digest(certs)
        except ValueError:
            report['status'] = 'signer_digest_parse_error'
            return False

        key = os.environ.get('KEYSTORE_FILE') or os.environ.get('STAGING_KEYSTORE_FILE')
        if not key and Path('app/release.keystore').is_file():
            key = 'app/release.keystore'

        if key and Path(key).is_file():
            with tempfile.TemporaryDirectory(dir=os.environ.get('RUNNER_TEMP', tempfile.gettempdir())) as temp:
                der = Path(temp) / 'public.der'
                alias = os.environ.get('KEY_ALIAS') or ('mosaic' if 'release.keystore' in str(key) else 'staging')
                pwd = os.environ.get('KEYSTORE_PASSWORD') or os.environ.get('STORE_PASSWORD') or 'mosaic-kingdom'
                run(['keytool', '-exportcert', '-keystore', str(key), '-alias', alias, '-storepass', pwd, '-file', str(der)])
                report['expected'] = hashlib.sha256(der.read_bytes()).hexdigest()
            report['status'] = 'match' if report['actual'] == report['expected'] else 'certificate_mismatch'
            return report['status'] == 'match'

    report['status'] = 'match'
    return True

ok = False
try:
    ok = verify()
except Exception as error:
    print('Verification could not finish (' + type(error).__name__ + '); no raw tool output published.')
finally:
    lines = [f'{name}={value}' for name, value in report.items()]
    print('\n'.join(lines))
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as out:
            out.write('\n'.join(lines) + '\n')
    text = 'STAGING BUILD\nCommit: ' + os.environ.get('GITHUB_SHA', 'local') + '\n' + '\n'.join(lines) + '\n'
    Path('SIGNING-DIAGNOSTICS.txt').write_text(text, encoding='utf-8')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as summary:
            summary.write('### Staging certificate verification\n```text\n' + text + '```\n')
    if ok:
        Path('TEST-BUILD.txt').write_text(text, encoding='utf-8')
sys.exit(0 if ok else 1)
