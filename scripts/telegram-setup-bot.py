#!/usr/bin/env python3
"""Configures the Telegram Bot to launch Tiletopia as a Telegram Mini App.

Sets:
1. Default chat Menu Button -> WebApp (https://crownfall90-dot.github.io/TileTopia/)
2. Bot commands (/play, /help)
3. Bot description & short description

Usage:
  TELEGRAM_BOT_TOKEN=... python3 scripts/telegram-setup-bot.py [WEB_APP_URL]
"""
import json, os, sys, urllib.request

DEFAULT_WEB_URL = 'https://crownfall90-dot.github.io/TileTopia/'

def api_call(token: str, method: str, data: dict = None) -> dict:
    url = f'https://api.telegram.org/bot{token}/{method}'
    body = json.dumps(data).encode('utf-8') if data else None
    headers = {'Content-Type': 'application/json'} if data else {}
    req = urllib.request.Request(url, body, headers)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)

def setup_bot(token: str, web_url: str = DEFAULT_WEB_URL) -> bool:
    if not token:
        print('Error: TELEGRAM_BOT_TOKEN is required')
        return False

    # 1. Verify token & get bot username
    me = api_call(token, 'getMe')
    if not me.get('ok'):
        print('Error verifying bot token:', me)
        return False
    bot_info = me['result']
    bot_username = bot_info.get('username', 'bot')
    print(f"Configuring bot: @{bot_username} ({bot_info.get('first_name', '')})")

    # 2. Set persistent WebApp Menu Button (left of chat input)
    menu_btn = {
        'menu_button': {
            'type': 'web_app',
            'text': 'Играть 🧩',
            'web_app': {'url': web_url}
        }
    }
    r_menu = api_call(token, 'setChatMenuButton', menu_btn)
    print(f"Set chat menu button: {'OK' if r_menu.get('ok') else 'Failed'}")

    # 3. Set bot commands
    commands = {
        'commands': [
            {'command': 'play', 'description': 'Запустить игру Tiletopia (Mini App)'},
            {'command': 'help', 'description': 'Как играть, правила и ссылки'}
        ]
    }
    r_cmds = api_call(token, 'setMyCommands', commands)
    print(f"Set bot commands: {'OK' if r_cmds.get('ok') else 'Failed'}")

    # 4. Set bot descriptions
    desc = {
        'description': (
            '🧩 Tiletopia — средневековая стратегическая настольная игра прямо в Telegram!\n\n'
            '• Стройте города, дороги и монастыри\n'
            '• Играйте онлайн с друзьями и в быстрых матчах\n'
            '• Умные боты, коллекция фишек и рамок\n\n'
            'Нажмите «Играть 🧩» внизу экрана, чтобы начать!'
        )
    }
    try:
        api_call(token, 'setMyDescription', desc)
    except Exception:
        pass

    short_desc = {
        'short_description': '🧩 Tiletopia — играй в средневековую мозаику онлайн с друзьями прямо в Telegram!'
    }
    try:
        api_call(token, 'setMyShortDescription', short_desc)
    except Exception:
        pass

    print(f"Telegram Mini App successfully linked: {web_url}")
    return True

def main() -> int:
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not token and len(sys.argv) > 1 and not sys.argv[1].startswith('http'):
        token = sys.argv[1]
    web_url = sys.argv[2] if len(sys.argv) > 2 else (sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('http') else DEFAULT_WEB_URL)

    if not token:
        print('Telegram bot token not provided (TELEGRAM_BOT_TOKEN env); skipping')
        return 0

    try:
        ok = setup_bot(token, web_url)
        return 0 if ok else 1
    except Exception as e:
        print('Telegram setup failed:', type(e).__name__, str(e))
        return 1

if __name__ == '__main__':
    sys.exit(main())
