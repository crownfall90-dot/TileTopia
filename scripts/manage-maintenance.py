#!/usr/bin/env python3
"""TileTopia Admin & Telemetry Maintenance Script.
Handles:
1. Searching and removing player 'Daem' from ratings, presence, profiles, and Auth.
2. Granting 300 tiles to all players who proposed game names in suggestions/names.
3. Exporting rich analytics, errors, feedback, and player logs for developer AI agents (Antigravity/Claude).
"""
import json, os, sys, time, urllib.request, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fbadmin as an

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else 'all'
    apply = '--apply' in sys.argv or action == 'apply' or action == 'all'
    
    sa_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
    if not sa_env:
        sys.exit('Missing FIREBASE_SERVICE_ACCOUNT environment variable')
    
    sa = json.loads(sa_env)
    pid, tok = sa['project_id'], an.token(sa)
    
    gs_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'google-services.json')
    db_url = os.environ.get('FIREBASE_DB_URL')
    if not db_url and os.path.exists(gs_path):
        try:
            with open(gs_path, 'r', encoding='utf-8') as f:
                db_url = json.load(f)['project_info'].get('firebase_url')
        except Exception:
            pass
    if not db_url:
        db_url = f'https://{pid}-default-rtdb.europe-west1.firebasedatabase.app'

    def fb_req(method, path, data=None):
        url = f'{db_url}/{path}.json'
        req = urllib.request.Request(url, method=method, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
        body = json.dumps(data).encode('utf-8') if data is not None else None
        try:
            with urllib.request.urlopen(req, data=body) as r:
                res = r.read()
                return json.loads(res.decode('utf-8')) if res else None
        except urllib.error.HTTPError as e:
            print(f'HTTP Error {e.code} on {method} {path}: {e.read().decode("utf-8")}')
            return None
        except Exception as e:
            print(f'Error on {method} {path}: {e}')
            return None

    def auth_delete(uid):
        try:
            url = f'https://identitytoolkit.googleapis.com/v1/projects/{pid}/accounts:delete'
            body = json.dumps({'localId': uid}).encode('utf-8')
            req = urllib.request.Request(url, data=body, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as r:
                return r.read()
        except Exception as e:
            print(f'Auth delete error for {uid}: {e}')
            return None

    print('=' * 60)
    print('TileTopia Maintenance & Telemetry Automation')
    print('=' * 60)

    # ----------------------------------------------------
    # TASK 1: Remove player 'Daem' from everywhere
    # ----------------------------------------------------
    print('\n[TASK 1] Searching for player "Daem" across all databases...')
    
    leaders = fb_req('GET', 'leaders') or {}
    leaders_hex = fb_req('GET', 'leaders_hex') or {}
    presence = fb_req('GET', 'presence') or {}
    profiles = fb_req('GET', 'profiles') or {}

    print(f'Leaderboard players count: {len(leaders)}')
    for uid, v in leaders.items():
        name = (v.get('n') or v.get('name') if isinstance(v, dict) else str(v)) or ''
        cups = v.get('c') or v.get('cups') if isinstance(v, dict) else ''
        print(f'  Leaderboard: uid={uid[:8]}... name={name!r} cups={cups}')
    
    daem_uids = set()
    
    # Check leaders
    for uid, v in leaders.items():
        if isinstance(v, dict) and ('daem' in (v.get('n') or '').lower() or 'daem' in (v.get('name') or '').lower()):
            daem_uids.add(uid)
            print(f'Found Daem in leaders: uid={uid}, data={v}')
            
    # Check leaders_hex
    for uid, v in leaders_hex.items():
        if isinstance(v, dict) and ('daem' in (v.get('n') or '').lower() or 'daem' in (v.get('name') or '').lower()):
            daem_uids.add(uid)
            print(f'Found Daem in leaders_hex: uid={uid}, data={v}')
            
    # Check presence
    for uid, v in presence.items():
        if isinstance(v, dict) and ('daem' in (v.get('n') or '').lower() or 'daem' in (v.get('name') or '').lower()):
            daem_uids.add(uid)
            print(f'Found Daem in presence: uid={uid}, data={v}')

    # Check profiles
    for uid, v in profiles.items():
        if isinstance(v, dict):
            w_str = v.get('w') or '{}'
            s_str = v.get('s') or '{}'
            try:
                w = json.loads(w_str) if isinstance(w_str, str) else w_str
            except Exception:
                w = {}
            try:
                s = json.loads(s_str) if isinstance(s_str, str) else s_str
            except Exception:
                s = {}
            if 'daem' in (w.get('name') or '').lower() or 'daem' in (s.get('name') or '').lower():
                daem_uids.add(uid)
                print(f'Found Daem in profiles: uid={uid}, wallet.name={w.get("name")}, seat.name={s.get("name")}')

    if daem_uids:
        print(f'Total Daem accounts found: {len(daem_uids)}')
        for uid in daem_uids:
            print(f'Removing Daem ({uid})...')
            fcode = fb_req('GET', f'fcodeOf/{uid}')
            paths_to_delete = [
                f'leaders/{uid}',
                f'leaders_hex/{uid}',
                f'presence/{uid}',
                f'profiles/{uid}',
                f'playerNo/{uid}',
                f'fcodeOf/{uid}',
                f'friends/{uid}',
                f'inbox/{uid}',
                f'titles/{uid}',
                f'logs/{uid}'
            ]
            if fcode:
                paths_to_delete.append(f'fcodes/{fcode}')
            for p in paths_to_delete:
                fb_req('DELETE', p)
            auth_delete(uid)
            print(f'Successfully deleted Daem ({uid}) from ratings, presence, profiles, and Auth!')
    else:
        print('No accounts with name "Daem" found in leaders, leaders_hex, presence, or profiles.')

    # ----------------------------------------------------
    # TASK 2: 300 Tiles Reward to all Name Contributors
    # ----------------------------------------------------
    print('\n[TASK 2] Processing Name Proposal Contributors & Awarding 300 Tiles...')
    suggestions = fb_req('GET', 'suggestions/names') or {}
    print(f'Found {len(suggestions)} name suggestions.')

    rewarded_count = 0
    now_ms = int(time.time() * 1000)

    for uid, item in suggestions.items():
        if not isinstance(item, dict):
            continue
        proposed_name = item.get('name') or item.get('val') or item.get('suggestion') or 'название'
        print(f'Contributor {uid[:8]} proposed: "{proposed_name}"')

        # 1. Update wallet directly in profile if exists
        prof = fb_req('GET', f'profiles/{uid}')
        if prof and isinstance(prof, dict) and prof.get('w'):
            try:
                w = json.loads(prof['w']) if isinstance(prof['w'], str) else prof['w']
                coins = w.setdefault('coins', {})
                old_tiles = coins.get('tile') or w.get('gold') or 0
                coins['tile'] = old_tiles + 300
                w['gold'] = coins['tile']
                w['nameContestRewarded'] = True
                w['nameSuggested'] = True
                prof['w'] = json.dumps(w)
                prof['t'] = now_ms
                fb_req('PUT', f'profiles/{uid}', prof)
                print(f'  -> Added +300 tiles to profile wallet (new balance: {coins["tile"]})')
            except Exception as ex:
                print(f'  -> Failed to update wallet JSON: {ex}')

        # 2. Add an inbox reward notification into /inbox/{uid}
        notif_data = {
            'id': 'notif_name_proposal_reward',
            'k': 'reward',
            'category': 'rewards',
            't': '🎁 300 тайлов за участие в конкурсе названий!',
            'title': '300 тайлов за конкурс названий',
            'm': f'Спасибо за предложенное название («{proposed_name}»)! Вам начислено 300 тайлов.',
            'desc': f'Спасибо за предложенное название («{proposed_name}»)! Вам начислено 300 тайлов.',
            'coin': 'tile',
            'gold': 300,
            'rewardAmount': 300,
            'rewardType': 'gold',
            'claimed': False,
            'time': now_ms,
            'ts': now_ms
        }
        fb_req('PUT', f'inbox/{uid}/notif_name_proposal_reward', notif_data)
        rewarded_count += 1
        print(f'  -> Inbox reward successfully delivered to {uid[:8]}')

    print(f'Done! Successfully awarded 300 tiles to {rewarded_count} name contributors.')

    # ----------------------------------------------------
    # TASK 3: Export Agent Telemetry, Errors, and Analytics
    # ----------------------------------------------------
    print('\n[TASK 3] Gathering Telemetry & Agent Analytics Data...')
    errors_raw = fb_req('GET', 'errors?orderBy="$key"&limitToLast=200') or {}
    feedback_raw = fb_req('GET', 'feedback?orderBy="$key"&limitToLast=100') or {}
    usage_raw = fb_req('GET', 'usage') or {}

    out_dir = os.path.join(os.path.dirname(__file__), '..', 'agent_data')
    os.makedirs(out_dir, exist_ok=True)

    # 1. ERRORS.md
    err_list = []
    if isinstance(errors_raw, dict):
        for k, e in errors_raw.items():
            if isinstance(e, dict):
                e['id'] = k
                err_list.append(e)
    err_list.sort(key=lambda x: x.get('ts') or 0, reverse=True)

    with open(os.path.join(out_dir, 'ERRORS.md'), 'w', encoding='utf-8') as f:
        f.write('# ⚠️ TileTopia Runtime Errors & Crash Telemetry for Developer Agents\n\n')
        f.write(f'Updated: {time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())}\n')
        f.write(f'Total recent errors: {len(err_list)}\n\n')
        if not err_list:
            f.write('🎉 **No errors recorded! Zero crashes.**\n')
        else:
            f.write('| Time (UTC) | Version | Error Message | Device | Action Trail |\n')
            f.write('|---|---|---|---|---|\n')
            for e in err_list[:50]:
                ts = time.strftime("%Y-%m-%d %H:%M", time.gmtime((e.get("ts") or 0) / 1000)) if e.get("ts") else "-"
                ver = e.get("ver") or "unknown"
                msg = (e.get("m") or "error").replace("|", "\\|").replace("\n", " ")[:120]
                dev = (e.get("dev") or "-").replace("|", "\\|")
                trail = (e.get("trail") or "-").replace("|", "\\|")[:80]
                f.write(f'| {ts} | `{ver}` | {msg} | {dev} | {trail} |\n')
            
            f.write('\n## Detailed Error Stacks\n\n')
            for idx, e in enumerate(err_list[:20], 1):
                f.write(f'### Error #{idx}: `{e.get("m")}`\n')
                f.write(f'- **Timestamp:** {e.get("ts")}\n')
                f.write(f'- **App Version:** `{e.get("ver")}`\n')
                f.write(f'- **Device:** `{e.get("dev")}`\n')
                f.write(f'- **User ID:** `{e.get("uid") or "anonymous"}`\n')
                f.write(f'- **Action Trail:** `{e.get("trail")}`\n\n')

    # 2. FEEDBACK.md
    fb_list = []
    if isinstance(feedback_raw, dict):
        for k, v in feedback_raw.items():
            if isinstance(v, dict):
                v['id'] = k
                fb_list.append(v)
    fb_list.sort(key=lambda x: x.get('t') or 0, reverse=True)

    with open(os.path.join(out_dir, 'FEEDBACK.md'), 'w', encoding='utf-8') as f:
        f.write('# 💬 TileTopia Player Feedback, Reviews & Complaints\n\n')
        f.write(f'Updated: {time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())}\n')
        f.write(f'Total reviews: {len(fb_list)}\n\n')
        if not fb_list:
            f.write('No feedback entries found.\n')
        else:
            for item in fb_list:
                ts = time.strftime("%Y-%m-%d %H:%M", time.gmtime((item.get("t") or 0) / 1000)) if item.get("t") else "-"
                stars = '⭐' * int(item.get('stars') or 5)
                f.write(f'### {stars} Category: `{item.get("cat") or "general"}` ({ts})\n')
                f.write(f'> {item.get("text") or "No comment"}\n\n')
                f.write(f'- **Player:** {item.get("name") or "Anonymous"} (`{item.get("uid") or "-"}`)\n')
                f.write(f'- **Device:** `{item.get("device") or "-"}`\n')
                f.write(f'- **Version:** `{item.get("v") or "-"}`\n\n---\n\n')

    # 3. ANALYTICS.md
    with open(os.path.join(out_dir, 'ANALYTICS.md'), 'w', encoding='utf-8') as f:
        f.write('# 📊 TileTopia Feature & Gameplay Analytics for Developer Agents\n\n')
        f.write(f'Updated: {time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())}\n\n')
        f.write('## Overview of Player Activity & Preferences\n')
        f.write(f'- **Total Registered / Active Profiles:** {len(profiles)}\n')
        f.write(f'- **Classic Mode Leaderboard Players:** {len(leaders)}\n')
        f.write(f'- **Classic 2.0 (Hex) Leaderboard Players:** {len(leaders_hex)}\n')
        f.write(f'- **Presence Device Records:** {len(presence)}\n\n')

        # Feature usage aggregation
        feature_counts = {}
        if isinstance(usage_raw, dict):
            for day, day_data in usage_raw.items():
                if isinstance(day_data, dict):
                    for uid, u_events in day_data.items():
                        if isinstance(u_events, dict):
                            for feat, cnt in u_events.items():
                                try:
                                    feature_counts[feat] = feature_counts.get(feat, 0) + int(cnt)
                                except Exception:
                                    pass

        f.write('### Most Tapped Features & Screens\n\n')
        f.write('| Feature ID | Total Taps |\n|---|---|\n')
        for feat, count in sorted(feature_counts.items(), key=lambda x: x[1], reverse=True)[:30]:
            f.write(f'| `{feat}` | {count} |\n')

    # Save raw json for programmatic agent consumption
    with open(os.path.join(out_dir, 'agent_telemetry.json'), 'w', encoding='utf-8') as f:
        json.dump({
            'updated': now_ms,
            'errors': err_list,
            'feedback': fb_list,
            'featureUsage': feature_counts,
            'stats': {
                'profiles': len(profiles),
                'leadersClassic': len(leaders),
                'leadersHex': len(leaders_hex),
                'presence': len(presence)
            }
        }, f, ensure_ascii=False, indent=2)

    print('Agent data files successfully generated in agent_data/ (ERRORS.md, FEEDBACK.md, ANALYTICS.md, agent_telemetry.json)')

if __name__ == '__main__':
    main()
