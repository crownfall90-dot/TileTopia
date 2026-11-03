#!/usr/bin/env python3
"""
Tiletopia database cleanup script (S-3).
Prunes stale database nodes to prevent storage bloat and performance degradation:
- Rooms older than 7 days
- Presence older than 24 hours
- Telemetry errors older than 30 days
- Admin logs older than 30 days

Usage:
  python cleanup-db.py [--dry-run] [--days 7]
"""
import argparse
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Add scripts directory to path to import fbadmin if available
sys.path.insert(0, str(Path(__file__).resolve().parent))

DB_URL = os.environ.get("FIREBASE_DB_URL", "https://puzzlegrad-default-rtdb.europe-west1.firebasedatabase.app")


def get_token():
    """Returns ('bearer', token) or ('secret', token) or ('', '')."""
    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if sa_json:
        try:
            import fbadmin
            return "bearer", fbadmin.token(json.loads(sa_json))
        except Exception as e:
            print(f"[warning] failed to get token via fbadmin: {e}", file=sys.stderr)
    secret = os.environ.get("FIREBASE_SECRET", "")
    return ("secret", secret) if secret else ("", "")


def api_request(path, method="GET", body=None, token=("", "")):
    kind, value = token
    url = f"{DB_URL.rstrip('/')}/{path.lstrip('/')}.json"
    headers = {"User-Agent": "Tiletopia-Cleanup/1.0"}
    if kind == "bearer":
        headers["Authorization"] = f"Bearer {value}"
    elif kind == "secret":
        url += f"?auth={value}"

    data = json.dumps(body).encode("utf-8") if body is not None else None
    if data:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except Exception as e:
        print(f"[error] {method} {path}: {e}", file=sys.stderr)
        return None


def cleanup(dry_run=True, room_days=7, presence_hours=24, log_days=30):
    token = get_token()
    now_ms = int(time.time() * 1000)
    print(f"[{'DRY-RUN' if dry_run else 'ACTIVE'}] Starting database cleanup at {datetime.now(timezone.utc).isoformat()}...")

    # 1. Clean rooms older than room_days
    cutoff_rooms = now_ms - (room_days * 86400 * 1000)
    rooms = api_request("rooms", "GET", token=token)
    removed_rooms = 0
    if isinstance(rooms, dict):
        for code, room_data in rooms.items():
            if not isinstance(room_data, dict):
                continue
            msgs = room_data.get("msgs", {})
            latest_ts = 0
            if isinstance(msgs, dict):
                for mid, mdata in msgs.items():
                    if isinstance(mdata, dict):
                        ts = mdata.get("ts", 0)
                        if isinstance(ts, (int, float)) and ts > latest_ts:
                            latest_ts = ts
            if latest_ts == 0 or latest_ts < cutoff_rooms:
                removed_rooms += 1
                if not dry_run:
                    api_request(f"rooms/{code}", "DELETE", token=token)
    print(f"Rooms pruned: {removed_rooms} (older than {room_days}d)")

    # 2. Clean presence older than presence_hours
    cutoff_presence = now_ms - (presence_hours * 3600 * 1000)
    presence = api_request("presence", "GET", token=token)
    removed_presence = 0
    if isinstance(presence, dict):
        for uid, pdata in presence.items():
            if isinstance(pdata, dict):
                t = pdata.get("t", 0)
                if isinstance(t, (int, float)) and t < cutoff_presence:
                    removed_presence += 1
                    if not dry_run:
                        api_request(f"presence/{uid}", "DELETE", token=token)
    print(f"Stale presence pruned: {removed_presence} (older than {presence_hours}h)")

    # 3. Clean errors older than log_days
    cutoff_errors = now_ms - (log_days * 86400 * 1000)
    errors = api_request("errors", "GET", token=token)
    removed_errors = 0
    if isinstance(errors, dict):
        for eid, edata in errors.items():
            if isinstance(edata, dict):
                ts = edata.get("ts", 0)
                if isinstance(ts, (int, float)) and ts < cutoff_errors:
                    removed_errors += 1
                    if not dry_run:
                        api_request(f"errors/{eid}", "DELETE", token=token)
    print(f"Stale errors pruned: {removed_errors} (older than {log_days}d)")

    print(f"Cleanup completed. Total candidates: {removed_rooms + removed_presence + removed_errors}")


def main():
    parser = argparse.ArgumentParser(description="Tiletopia Realtime Database Cleanup")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Preview deletions without deleting")
    parser.add_argument("--execute", action="store_true", help="Perform real deletions")
    parser.add_argument("--room-days", type=int, default=7, help="Max room age in days")
    parser.add_argument("--presence-hours", type=int, default=24, help="Max presence age in hours")
    parser.add_argument("--log-days", type=int, default=30, help="Max log/error age in days")

    args = parser.parse_args()
    dry_run = not args.execute
    cleanup(dry_run=dry_run, room_days=args.room_days, presence_hours=args.presence_hours, log_days=args.log_days)


if __name__ == "__main__":
    main()
