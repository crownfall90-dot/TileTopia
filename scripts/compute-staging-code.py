import os, sys, json, urllib.request, subprocess

def get_last_prod_code():
    try:
        remote = subprocess.check_output(
            ["git", "ls-remote", "--tags", "origin", "v*"],
            text=True, stderr=subprocess.DEVNULL
        )
        codes = [int(line.split('refs/tags/v')[-1]) for line in remote.splitlines() if 'refs/tags/v' in line and line.split('refs/tags/v')[-1].isdigit()]
        if codes:
            return max(codes)
    except Exception:
        pass
    try:
        local = subprocess.check_output(
            ["git", "tag", "-l", "v*"],
            text=True, stderr=subprocess.DEVNULL
        )
        codes = [int(t[1:]) for t in local.splitlines() if t.startswith('v') and t[1:].isdigit()]
        if codes:
            return max(codes)
    except Exception:
        pass
    return 260

def get_prev_staging_code(repo):
    url = f"https://github.com/{repo}/releases/download/staging-latest/latest-staging.json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'TileTopia-CI'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return int(data.get('code', 0))
    except Exception:
        return 0

def main():
    custom = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].strip() else os.environ.get('CUSTOM_CODE', '').strip()
    if custom and custom.isdigit():
        code = int(custom)
    else:
        last_prod = get_last_prod_code()
        prod_min = last_prod + 1
        repo = os.environ.get('GITHUB_REPOSITORY', 'crownfall90-dot/TileTopia')
        prev_staging = get_prev_staging_code(repo)
        code = (prev_staging + 1) if prev_staging >= prod_min else prod_min

    version = f"1.0.{code}-test"
    print(f"code={code}")
    print(f"version={version}")

    github_output = os.environ.get('GITHUB_OUTPUT')
    if github_output:
        try:
            with open(github_output, 'a', encoding='utf-8') as f:
                f.write(f"code={code}\n")
                f.write(f"version={version}\n")
        except Exception as e:
            sys.stderr.write(f"Warning: could not write to GITHUB_OUTPUT: {e}\n")

if __name__ == '__main__':
    main()
