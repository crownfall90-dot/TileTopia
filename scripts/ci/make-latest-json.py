#!/usr/bin/env python3
"""Generates latest.json with update policy (mandatory flag, minRequiredCode) for production releases."""
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

def main():
    code = int(os.environ.get("CODE", "262"))
    repo = os.environ.get("GITHUB_REPOSITORY", "crownfall90-dot/TileTopia")
    notes_file = sys.argv[1] if len(sys.argv) > 1 else "release-notes.md"
    out_file = sys.argv[2] if len(sys.argv) > 2 else "latest.json"

    notes = ""
    if os.path.exists(notes_file):
        with open(notes_file, encoding="utf-8") as f:
            notes = f.read().strip()

    cert = os.environ.get("SIGNING_CERT_SHA256") or "d4409cee878c4142c7d28039571023d693071fd8c88bfdd72b73aa52f2154d76"

    # Check inputs / environment
    input_mandatory = os.environ.get("INPUT_MANDATORY", "").strip().lower()
    input_min_code = os.environ.get("INPUT_MIN_CODE", "").strip()

    is_mandatory = input_mandatory in ("true", "1", "yes")
    min_code = int(input_min_code) if input_min_code.isdigit() else 0

    # Also check Firebase RTDB config if available
    db_url = os.environ.get("FIREBASE_DB_URL", "https://puzzlegrad-default-rtdb.europe-west1.firebasedatabase.app")

    try:
        req = urllib.request.Request(f"{db_url}/config/update.json", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            fb_update_cfg = json.loads(r.read().decode("utf-8"))
            if isinstance(fb_update_cfg, dict):
                if not input_mandatory and fb_update_cfg.get("nextMandatory") is True:
                    is_mandatory = True
                    print("::notice::Setting update as MANDATORY based on Firebase config/update/nextMandatory")
                if not min_code and fb_update_cfg.get("minRequiredCode"):
                    min_code = int(fb_update_cfg.get("minRequiredCode"))
    except Exception as e:
        print(f"Notice: public Firebase config/update read check: {e}")

    payload = {
        "code": code,
        "version": f"1.0.{code}",
        "notes": notes,
        "mandatory": bool(is_mandatory),
        "url": f"https://github.com/{repo}/releases/download/v{code}/Tiletopia-1.0.{code}.apk",
        "cert": cert,
        "package": "app.crownfall.tiletopia"
    }
    if min_code > 0:
        payload["minRequiredCode"] = min_code

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Generated {out_file}: code={code}, mandatory={is_mandatory}, minRequiredCode={min_code}")

    # Reset nextMandatory in Firebase RTDB if service account is provided
    sa_env = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if sa_env:
        try:
            sa = json.loads(sa_env)
            now = int(time.time())
            b64 = lambda d: base64.urlsafe_b64encode(d).rstrip(b'=').decode()
            head = b64(json.dumps({'alg': 'RS256', 'typ': 'JWT'}).encode())
            scopes = 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email'
            claim = b64(json.dumps({'iss': sa['client_email'], 'scope': scopes, 'aud': 'https://oauth2.googleapis.com/token', 'iat': now, 'exp': now + 3600}).encode())
            with tempfile.NamedTemporaryFile('w', suffix='.pem', delete=False) as k:
                k.write(sa['private_key'])
            try:
                sig = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', k.name], input=f'{head}.{claim}'.encode(), capture_output=True, check=True).stdout
            finally:
                os.unlink(k.name)
            t_body = urllib.parse.urlencode({'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion': f'{head}.{claim}.{b64(sig)}'}).encode()
            with urllib.request.urlopen('https://oauth2.googleapis.com/token', t_body, timeout=10) as t_resp:
                token = json.load(t_resp)['access_token']
            
            # Reset nextMandatory to false, set latestCode to code
            update_patch = json.dumps({"nextMandatory": False, "latestCode": code}).encode('utf-8')
            patch_req = urllib.request.Request(
                f"{db_url}/config/update.json?access_token={token}",
                data=update_patch,
                headers={"Content-Type": "application/json"},
                method="PATCH"
            )
            with urllib.request.urlopen(patch_req, timeout=10) as p_resp:
                print("Firebase config/update successfully updated and nextMandatory reset.")
        except Exception as e:
            print(f"Notice: could not update Firebase config/update with service account: {e}")

if __name__ == "__main__":
    main()
