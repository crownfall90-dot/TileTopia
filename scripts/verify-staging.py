import os
from pathlib import Path
import re
import subprocess
import sys
from ci.apk_cert import signer_digest

report = {'status': 'verification_error', 'expected': 'unavailable', 'actual': 'unavailable'}

def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Tool failed: ' + Path(args[0]).name + ' - ' + result.stderr)
    return result.stdout

def verify():
    apk = Path('app/build/outputs/apk/staging/release/app-staging-release.apk')
    if not apk.is_file():
        report['status'] = 'staging_apk_missing'
        return False

    sdk = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
    aapt, apksigner = ('aapt.exe', 'apksigner.bat') if os.name == 'nt' else ('aapt', 'apksigner')
    root = Path(sdk) / 'build-tools' if sdk else None
    candidates = [p for p in root.iterdir() if (p / aapt).is_file() and (p / apksigner).is_file()] if root and root.is_dir() else []
    if not candidates:
        report['status'] = 'sdk_tools_missing'
        return False
    tools = max(candidates, key=lambda p: tuple(int(n) for n in re.findall(r'\d+', p.name)))

    badging = run([str(tools / aapt), 'dump', 'badging', str(apk)])
    if not re.search(r"^package: name='app\.crownfall\.tiletopia\.test'", badging, re.M):
        report['status'] = 'wrong_application_id'
        return False
    permissions = run([str(tools / aapt), 'dump', 'permissions', str(apk)])
    if "'android.permission.INTERNET'" not in permissions:
        report['status'] = 'internet_permission_missing'
        return False

    expected = os.environ.get('SIGNING_CERT_SHA256', '').strip().lower()
    if not re.fullmatch(r'[a-f0-9]{64}', expected):
        report['status'] = 'expected_signer_missing'
        return False
    report['expected'] = expected
    certs = run([str(tools / apksigner), 'verify', '--print-certs-pem', str(apk)])
    try:
        report['actual'] = signer_digest(certs)
    except ValueError:
        report['status'] = 'signer_digest_parse_error'
        return False
    report['status'] = 'match' if report['actual'] == expected else 'certificate_mismatch'
    return report['status'] == 'match'

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
