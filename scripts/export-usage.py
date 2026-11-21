"""Read the last 30 UTC days of opt-in usage and write an aggregate report."""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fbadmin import token

ROOT = Path(__file__).resolve().parent.parent
MIN_PLAYERS = 3


def summarize(days, allowed):
    totals = Counter()
    visitors = defaultdict(set)
    for users in days.values():
        if not isinstance(users, dict):
            continue
        for uid, counters in users.items():
            if not isinstance(counters, dict):
                continue
            for name, count in counters.items():
                if name in allowed and type(count) is int and 0 < count <= 5000:
                    totals[name] += count
                    visitors[name].add(uid)
    return [
        {'feature': name, 'count': count, 'players': len(visitors[name])}
        for name, count in sorted(totals.items(), key=lambda row: (-len(visitors[row[0]]), -row[1], row[0]))
        if len(visitors[name]) >= MIN_PLAYERS
    ]


def main():
    today = datetime.now(timezone.utc).date()
    first = today - timedelta(days=29)
    query = urlencode({'orderBy': '"$key"', 'startAt': json.dumps(first.isoformat()), 'endAt': json.dumps(today.isoformat())})
    account = json.loads(os.environ['FIREBASE_SERVICE_ACCOUNT'])
    base = os.environ['FIREBASE_DB_URL'].rstrip('/')
    request = Request(f'{base}/usage.json?{query}', headers={'Authorization': 'Bearer ' + token(account)})
    with urlopen(request, timeout=30) as response:
        data = json.load(response)
    if data is not None and not isinstance(data, dict):
        raise ValueError('Invalid usage snapshot')
    source = (ROOT / 'src/state/usage.js').read_text(encoding='utf-8').split('export const ESSENTIAL_LOG', 1)[0]
    allowed = set(re.findall(r"'([A-Za-z0-9_-]+:[A-Za-z0-9_-]+)'\s*:", source))
    features = summarize(data or {}, allowed)
    result = {'from': first.isoformat(), 'through': today.isoformat(), 'minimum_players': MIN_PLAYERS, 'features': features}
    out = ROOT / 'build/usage-report'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'usage.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    lines = [
        '# Tiletopia feature usage', '',
        f'UTC dates {first} through {today}. Today is partial.',
        'Opt-in counters only. Each row needs at least three distinct players in the window.', '',
        '| Feature | Players | Count |', '|---|---:|---:|',
    ]
    lines.extend(f"| `{row['feature']}` | {row['players']} | {row['count']} |" for row in features)
    (out / 'ANALYTICS.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
