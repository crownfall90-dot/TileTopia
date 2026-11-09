#!/usr/bin/env python3
"""Season results every two weeks: the top three of the classic rating (/leaders) and of the Classic 2.0 one
(/leaders_hex) are written to /champions/{date}, and each of them gets a title in /titles/{uid}: c = times first in the
classic rating, h = times first in Classic 2.0, p = times in a top three. The game turns titles into statuses
(«Чемпион», «Чемпион ×2», «Призёр»…, src/state/status.js grantTitles). The rating itself is never reset.

Usage: FIREBASE_SERVICE_ACCOUNT='<json>' scripts/champions.py [--apply] [--force]
Without --force it only acts on even ISO weeks (so the weekly schedule gives one season every two weeks).
"""
import datetime, json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fbadmin as an

TOP = 3


def main():
    apply, force = '--apply' in sys.argv, '--force' in sys.argv
    today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3))).date()
    if not force and today.isocalendar()[1] % 2:
        print('odd week: no season ends today'); return
    sa = json.loads(os.environ['FIREBASE_SERVICE_ACCOUNT'])
    pid, tok = sa['project_id'], an.token(sa)
    db = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'app', 'google-services.json')))['project_info'].get('firebase_url') \
        or f'https://{pid}-default-rtdb.europe-west1.firebasedatabase.app'
    def call(method, path, body=None):
        req = urllib.request.Request(f'{db}/{path}.json', None if body is None else json.dumps(body).encode(), method=method,
                                     headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as r: return json.load(r)
    season = today.isoformat()
    if call('GET', f'champions/{season}') and not force:
        print('season', season, 'already done'); return
    result = {'at': season}
    gains = {}
    for board, first in (('leaders', 'c'), ('leaders_hex', 'h')):
        rows = [(uid, v) for uid, v in (call('GET', board) or {}).items() if isinstance(v, dict) and (v.get('r') or 0) > 0]
        rows.sort(key=lambda x: (-(x[1].get('r') or 0), x[1].get('t') or 0))
        top = rows[:TOP]
        result[board] = [{'uid': uid, 'n': v.get('n', ''), 'r': v.get('r', 0)} for uid, v in top]
        for place, (uid, v) in enumerate(top):
            g = gains.setdefault(uid, {})
            g['p'] = g.get('p', 0) + 1
            if place == 0: g[first] = g.get(first, 0) + 1
        print(board, [(v.get('n'), v.get('r')) for _, v in top])
    if not apply:
        print('dry run:', json.dumps(gains, ensure_ascii=False)); return
    for uid, g in gains.items():
        cur = call('GET', f'titles/{uid}') or {}
        call('PUT', f'titles/{uid}', {k: (cur.get(k) or 0) + g.get(k, 0) for k in ('c', 'h', 'p')})
    call('PUT', f'champions/{season}', result)
    print('season', season, 'saved;', len(gains), 'players titled')


if __name__ == '__main__':
    main()
