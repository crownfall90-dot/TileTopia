#!/usr/bin/env python3
import json
import os
import subprocess
import urllib.request

custom_code = os.environ.get('CUSTOM_CODE', '').strip()
if custom_code:
    code = int(custom_code)
    version = f"1.0.{code}-test"
else:
    repo = os.environ.get('GITHUB_REPOSITORY', 'crownfall90-dot/TileTopia')
    prev_staging = 0
    try:
        url = f"https://github.com/{repo}/releases/download/staging-latest/latest-staging.json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            prev_staging = int(data.get('code', 0))
    except Exception:
        prev_staging = 0

    prod_max = 260
    try:
        res = subprocess.run(['git', 'ls-remote', '--tags', 'origin', 'v*'], capture_output=True, text=True, timeout=5)
        for line in res.stdout.splitlines():
            parts = line.strip().split('refs/tags/v')
            if len(parts) == 2 and parts[1].isdigit():
                num = int(parts[1])
                if num > prod_max:
                    prod_max = num
    except Exception:
        pass

    base_code = prod_max + 1
    code = max(base_code, prev_staging + 1)
    version = f"1.0.{code}-test"

print(f"::notice::Computed Test APK code={code}, version={version}")
gh_out = os.environ.get('GITHUB_OUTPUT')
if gh_out:
    with open(gh_out, 'a', encoding='utf-8') as f:
        f.write(f"code={code}\n")
        f.write(f"version={version}\n")
