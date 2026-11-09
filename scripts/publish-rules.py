#!/usr/bin/env python3
"""Publishes docs/firebase-rules.json as the Realtime Database security rules (the console's Rules tab).
The rules in force before are saved to build/rules-before.json first (the workflow keeps it as an artifact),
and the published ones are read back and compared.

Usage: FIREBASE_SERVICE_ACCOUNT='<json>' scripts/publish-rules.py [--apply]
"""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fbadmin as an

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def main():
    apply = '--apply' in sys.argv
    sa = json.loads(os.environ['FIREBASE_SERVICE_ACCOUNT'])
    pid, tok = sa['project_id'], an.token(sa)
    db = json.load(open(os.path.join(ROOT, 'app', 'google-services.json')))['project_info'].get('firebase_url') \
        or f'https://{pid}-default-rtdb.europe-west1.firebasedatabase.app'
    def call(method, body=None):
        req = urllib.request.Request(f'{db}/.settings/rules.json', body, method=method, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as r: return r.read().decode()
    new = open(os.path.join(ROOT, 'docs', 'firebase-rules.json'), encoding='utf-8').read()
    json.loads(new)                                                     # refuse a broken file before touching anything
    before = call('GET')
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    open(os.path.join(ROOT, 'build', 'rules-before.json'), 'w', encoding='utf-8').write(before)
    print('rules in force:', len(before), 'bytes, saved to build/rules-before.json')
    if not apply:
        print('dry run: nothing published'); return
    call('PUT', new.encode('utf-8'))
    after = json.loads(call('GET'))
    ok = json.dumps(after, sort_keys=True) == json.dumps(json.loads(new), sort_keys=True)
    print('published:', 'rules match docs/firebase-rules.json' if ok else 'WARNING: read-back differs')
    if not ok: sys.exit(1)


if __name__ == '__main__':
    main()
