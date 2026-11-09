#!/usr/bin/env python3
"""Tiletopia Telegram Bot service.

Handles:
- /start, /play, /game: Sends game banner photo + rich strategy description + inline button [🎮 Открыть игру]
- /rules: Sends overview of rules & button to open rules
- /help: Community and support links

Supports:
- Long-polling (default when running locally or on server):
    TELEGRAM_BOT_TOKEN=... python3 scripts/telegram-bot.py
- Webhook processing (for serverless / CGI / HTTP handlers)
"""

import json, os, sys, time, urllib.request, urllib.error

DEFAULT_WEB_URL = 'https://crownfall90-dot.github.io/TileTopia/'
BANNER_URL = 'https://crownfall90-dot.github.io/TileTopia/store/feature-1024x500.png'
CHANNEL_URL = 'https://t.me/diarydevelopment'

START_CAPTION = (
    "🧩 <b>Tiletopia — Плиточная стратегия</b>\n\n"
    "Выкладывайте квадратные плитки из общего запаса, развивайте города, прокладывайте тракты и возводите ключевые объекты. "
    "Выставляйте своих миплов и соревнуйтесь за контроль над территориями на игровом столе!\n\n"
    "🌍 <b>Разные локации стола:</b> меняют мир плиток и добавляют уникальные особенности\n"
    "⚔️ <b>Рейтинговые онлайн-битвы и дуэли 1×1</b>\n"
    "🏆 <b>До +10 кубков за победу</b> — ничьих нет, побеждает сильнейший тактик!\n"
    "🤖 <b>Умные боты</b> 3 уровней сложности для тренировок\n"
    "👑 <b>Коллекции фигурок, рамки и статусы</b>\n\n"
    "Нажмите <b>«🎮 Открыть игру»</b> ниже, чтобы начать партию прямо в Telegram:"
)

RULES_CAPTION = (
    "📖 <b>Правила плиточной стратегии Tiletopia</b>\n\n"
    "1️⃣ <b>Плитка за ход:</b> берите плитку из запаса и стыкуйте её с соседними на столе (город к городу, дорога к дороге, река к реке).\n"
    "2️⃣ <b>Миплы:</b> выставляйте подданных на только что выложенную плитку (в город, на дорогу или особый объект).\n"
    "3️⃣ <b>Очки:</b>\n"
    "• Дорога: 1 очко за плитку (с мостом ×2)\n"
    "• Город: 2 очка за плитку\n"
    "• Монастырь/крепость: 9 очков при окружении 8 плитками\n"
    "4️⃣ <b>Никаких ничьих:</b> при равенстве очков побеждает тот, кто завершил больше объектов или сохранил больше миплов!"
)

def build_start_keyboard(web_url: str = DEFAULT_WEB_URL) -> dict:
    return {
        'inline_keyboard': [
            [
                {
                    'text': '🎮 Открыть игру',
                    'web_app': {'url': web_url}
                }
            ],
            [
                {
                    'text': '📖 Правила стратегии',
                    'web_app': {'url': f"{web_url.rstrip('/')}/#rules"}
                },
                {
                    'text': '📢 Наш канал',
                    'url': CHANNEL_URL
                }
            ]
        ]
    }

def api_call(token: str, method: str, data: dict = None) -> dict:
    url = f'https://api.telegram.org/bot{token}/{method}'
    body = json.dumps(data).encode('utf-8') if data else None
    headers = {'Content-Type': 'application/json'} if data else {}
    req = urllib.request.Request(url, body, headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='replace')
        print(f"API Error {e.code} for {method}: {err_msg}")
        return {'ok': False, 'description': err_msg}
    except Exception as e:
        print(f"Network error calling {method}: {e}")
        return {'ok': False, 'description': str(e)}

def handle_update(token: str, update: dict, web_url: str = DEFAULT_WEB_URL):
    message = update.get('message') or update.get('edited_message')
    if not message:
        return

    chat = message.get('chat', {})
    chat_id = chat.get('id')
    text = (message.get('text') or '').strip()

    if not chat_id:
        return

    cmd = text.split()[0].lower() if text else ''

    if cmd in ('/start', '/play', '/game'):
        payload = {
            'chat_id': chat_id,
            'photo': BANNER_URL,
            'caption': START_CAPTION,
            'parse_mode': 'HTML',
            'reply_markup': build_start_keyboard(web_url)
        }
        res = api_call(token, 'sendPhoto', payload)
        if not res.get('ok'):
            api_call(token, 'sendMessage', {
                'chat_id': chat_id,
                'text': START_CAPTION,
                'parse_mode': 'HTML',
                'reply_markup': build_start_keyboard(web_url)
            })

    elif cmd == '/rules':
        api_call(token, 'sendMessage', {
            'chat_id': chat_id,
            'text': RULES_CAPTION,
            'parse_mode': 'HTML',
            'reply_markup': build_start_keyboard(web_url)
        })

    elif cmd == '/help':
        help_text = (
            "🧩 <b>Tiletopia — Плиточная стратегия</b>\n\n"
            "• Нажмите «🎮 Открыть игру», чтобы начать играть онлайн или против ботов.\n"
            "• Правила игры: /rules\n"
            f"• Новости и анонсы обновлений: {CHANNEL_URL}"
        )
        api_call(token, 'sendMessage', {
            'chat_id': chat_id,
            'text': help_text,
            'parse_mode': 'HTML',
            'reply_markup': build_start_keyboard(web_url)
        })

def run_polling(token: str, web_url: str = DEFAULT_WEB_URL):
    print("Tiletopia Telegram Bot is starting polling...")
    me = api_call(token, 'getMe')
    if not me.get('ok'):
        print("Failed to authenticate bot token:", me)
        return 1

    bot_user = me['result'].get('username', 'bot')
    print(f"Bot connected: @{bot_user}")

    api_call(token, 'deleteWebhook', {'drop_pending_updates': False})

    offset = 0
    while True:
        try:
            updates = api_call(token, 'getUpdates', {'offset': offset, 'timeout': 25})
            if updates.get('ok'):
                for item in updates.get('result', []):
                    offset = item['update_id'] + 1
                    handle_update(token, item, web_url)
            else:
                time.sleep(2)
        except KeyboardInterrupt:
            print("\nBot polling stopped by user.")
            break
        except Exception as e:
            print(f"Polling loop exception: {e}")
            time.sleep(3)
    return 0

def main():
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not token and len(sys.argv) > 1 and not sys.argv[1].startswith('http'):
        token = sys.argv[1]
    web_url = sys.argv[2] if len(sys.argv) > 2 else (sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('http') else DEFAULT_WEB_URL)

    if not token:
        print("Error: TELEGRAM_BOT_TOKEN is required. Set env var or pass as 1st argument.")
        return 1

    return run_polling(token, web_url)

if __name__ == '__main__':
    sys.exit(main())
