#!/usr/bin/env python3
"""Posts the release announcement to the game's Telegram channel.

Usage: TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=@channel_or_-100… scripts/telegram-notify.py VERSION NOTES_FILE [WEB_URL] [APK_URL] [BOT_URL] [--poll]
The token and the chat id come ONLY from the environment (GitHub Actions secrets) and are never printed.
A failure here must not fail a release, so the workflow step is marked continue-on-error.
Only the Python standard library is needed.
"""
import html, json, os, re, sys, urllib.request

DEV_FILTER_PATTERNS = [
    r'экспорт\s+плиток',
    r'экспорт\s+спрайт',
    r'спрайт',
    r'плитк.*(?:отдельн|архив|zip|дизайн)',
    r'для\s+дизайнера',
    r'дизайнеру',
    r'staging',
    r'стеджинг',
    r'пин-код',
    r'pin[-:\s]*\d+',
    r'testerpin',
    r'\.md\b',
    r'документац',
    r'скриншот',
    r'screenshot',
    r'cdp',
    r'harness',
    r'playwright',
    r'unit-test',
    r'\btests?\b',
    r'workflow',
    r'ci/cd',
    r'пайплайн',
    r'zip-архив',
]

HEADLINES = [
    '🧩 <b>Tiletopia {ver}</b> — вышло обновление!',
    '🚀 <b>Tiletopia {ver}</b> уже в игре! Встречайте свежий патч',
    '✨ <b>Tiletopia {ver}</b> — новое обновление доступно!',
    '⚔️ <b>Tiletopia {ver}</b> — готовы к новым партиям?',
    '🎉 <b>Tiletopia {ver}</b> — встречаем свежие улучшения!',
]

COMMUNITY_QUESTIONS = [
    'Как вам обновлённый интерфейс и статус друзей в сети? Стало ли удобнее звать друзей в комнату?',
    'Какой режим или механику вы хотите увидеть в игре следующей? Ждём ваши идеи!',
    'Хватает ли вам золота за победы и квесты, или стоит добавить больше ежедневных наград?',
    'С кем чаще играете — с друзьями по комнатам или со случайными соперниками в поиске матча?',
    'Какая тактика при расстановке плиток у вас любимая: быстрый захват городов или блокировка соперника?',
    'Успели опробовать новые фичи обновления? Напишите, если заметили баг или есть пожелания!',
]

DEFAULT_POLL_OPTIONS = [
    '🔥 Отличное обновление!',
    '👍 Всё нравится',
    '👌 Нормально, играем дальше',
    '💡 Есть идея для улучшения',
    '🐛 Нашёл баг (напишу в комменты)',
]

def fetch_bot_username(token: str) -> str:
    """Discovers the bot username using Telegram Bot API getMe."""
    if not token:
        return ''
    try:
        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/getMe')
        with urllib.request.urlopen(req, timeout=10) as r:
            res = json.load(r)
            if res.get('ok'):
                return res.get('result', {}).get('username', '')
    except Exception:
        pass
    return ''

def is_internal_item(line: str) -> bool:
    """Checks if a release note line is internal/developer-facing."""
    lower = line.strip().lower()
    for pat in DEV_FILTER_PATTERNS:
        if re.search(pat, lower):
            return True
    return False

def parse_release_notes(notes: str, version: str) -> dict:
    """Splits release notes into player-facing sections: new (quotes), changed, removed, and poll."""
    new_items, changed_items, removed_items = [], [], []
    custom_poll = ''

    current_section = None
    has_explicit_sections = False

    for raw_line in notes.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        # Bullet items start with -, •, *
        is_bullet = line.startswith(('-', '•', '*'))

        # Only non-bullets can be section headers
        if not is_bullet:
            header_clean = re.sub(r'^[#\s✨🔧🧹📊]+', '', line).strip().lower().rstrip(':')
            if header_clean in ('что нового', 'новое', 'новинки', 'добавлено', 'новые функции', 'features', 'added'):
                current_section = 'new'
                has_explicit_sections = True
                continue
            elif header_clean in ('что изменилось', 'изменения', 'изменено', 'улучшения', 'исправления', 'changed', 'fixes'):
                current_section = 'changed'
                has_explicit_sections = True
                continue
            elif header_clean in ('что убрано', 'убрано', 'удалено', 'очистка', 'removed'):
                current_section = 'removed'
                has_explicit_sections = True
                continue
            elif header_clean in ('опрос', 'вопрос', 'poll', 'feedback', 'опрос тестерам', 'вопрос игрокам'):
                current_section = 'poll'
                has_explicit_sections = True
                continue

        clean_item = line.lstrip('-•*# ').strip()
        if not clean_item:
            continue

        if current_section == 'poll':
            custom_poll = clean_item
            continue

        # Filter out developer/internal items
        if is_internal_item(clean_item):
            continue

        if has_explicit_sections:
            if current_section == 'new':
                new_items.append(clean_item)
            elif current_section == 'changed':
                changed_items.append(clean_item)
            elif current_section == 'removed':
                removed_items.append(clean_item)
            else:
                new_items.append(clean_item)
        else:
            # Unstructured list: classify line dynamically
            lower_item = clean_item.lower()
            if any(w in lower_item for w in ['убран', 'удален', 'убрали', 'скрыт', 'отключен', 'без ']):
                removed_items.append(clean_item)
            elif any(w in lower_item for w in ['изменен', 'обновлен', 'перенесен', 'улучшен', 'исправлен', 'переработан', 'оптимиз']):
                changed_items.append(clean_item)
            elif '?' in clean_item:
                custom_poll = clean_item
            else:
                new_items.append(clean_item)

    # Pick deterministic variation based on version
    seed = sum(ord(c) for c in version) if version else 0
    headline = HEADLINES[seed % len(HEADLINES)].format(ver=html.escape(version))
    poll_q = custom_poll or COMMUNITY_QUESTIONS[seed % len(COMMUNITY_QUESTIONS)]

    return {
        'headline': headline,
        'new': new_items[:8],
        'changed': changed_items[:6],
        'removed': removed_items[:4],
        'poll_question': poll_q,
    }

def build(version: str, notes: str, web_url: str = '', apk_url: str = '', bot_url: str = '') -> str:
    parsed = parse_release_notes(notes, version)

    text = f"{parsed['headline']}\n\n"

    # 1. Что нового (выделяется красивой цитатой blockquote)
    if parsed['new']:
        text += '✨ <b>Что нового:</b>\n'
        quote_content = '\n'.join(f'• {html.escape(i)}' for i in parsed['new'])
        text += f'<blockquote>{quote_content}</blockquote>\n\n'
    elif not parsed['changed'] and not parsed['removed']:
        # Fallback if no specific player items found
        text += '✨ <b>Что нового:</b>\n'
        text += '<blockquote>• Множество улучшений геймплея, плавности и стабильности сетевой игры!</blockquote>\n\n'

    # 2. Что изменилось
    if parsed['changed']:
        text += '🔧 <b>Что изменилось:</b>\n'
        text += '\n'.join(f'• {html.escape(i)}' for i in parsed['changed']) + '\n\n'

    # 3. Что убрано
    if parsed['removed']:
        text += '🧹 <b>Что убрано:</b>\n'
        text += '\n'.join(f'• {html.escape(i)}' for i in parsed['removed']) + '\n\n'

    # 4. 3 способа как играть (всегда должно быть)
    text += '🎮 <b>3 способа играть:</b>\n'
    if apk_url:
        text += f'• <b>Android:</b> APK-приложение (<a href="{html.escape(apk_url, quote=True)}">Скачать APK</a> с автообновлением)\n'
    else:
        text += '• <b>Android:</b> APK-приложение с автообновлением\n'

    if web_url:
        text += f'• <b>Все устройства (ПК, iOS, планшеты):</b> сайт в браузере (<a href="{html.escape(web_url, quote=True)}">Играть в браузере</a>)\n'
    else:
        text += '• <b>Все устройства (ПК, iOS, планшеты):</b> сайт в браузере\n'

    if bot_url:
        text += f'• <b>Telegram:</b> мини-приложение прямо в боте (<a href="{html.escape(bot_url, quote=True)}">Играть в Telegram</a>)\n\n'
    else:
        text += '• <b>Telegram:</b> мини-приложение прямо в боте без установки\n\n'

    # 5. Опрос / вопрос для поддержания статистики и общения
    text += '📊 <b>Вопрос для игроков и тестеров:</b>\n'
    text += f'<i>{html.escape(parsed["poll_question"])}</i>\n'
    text += '💬 <i>Делитесь впечатлениями и идеями в комментариях! 👇</i>'

    return text[:4000]

def send_telegram_poll(token: str, chat: str, question: str, options: list[str]) -> bool:
    """Optionally sends a native interactive poll to the Telegram channel."""
    if not token or not chat or not question or not options:
        return False
    url = f'https://api.telegram.org/bot{token}/sendPoll'
    payload = {
        'chat_id': chat,
        'question': question[:255],
        'options': [opt[:100] for opt in options[:10]],
        'is_anonymous': True,
    }
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, body, {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            res = json.load(r)
            return bool(res.get('ok'))
    except Exception as e:
        print('Telegram poll failed (non-critical):', type(e).__name__)
        return False

def main() -> int:
    token, chat = os.environ.get('TELEGRAM_BOT_TOKEN', ''), os.environ.get('TELEGRAM_CHAT_ID', '')
    if not token or not chat:
        print('Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID); skipping'); return 0

    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = [a for a in sys.argv[1:] if a.startswith('--')]

    if len(args) < 2:
        print('Usage: telegram-notify.py VERSION NOTES_FILE [WEB_URL] [APK_URL] [BOT_URL]')
        return 1

    version, notes_file = args[0], args[1]
    web = args[2] if len(args) > 2 else ''
    apk = args[3] if len(args) > 3 else ''
    bot_url = args[4] if len(args) > 4 else os.environ.get('TELEGRAM_BOT_URL', '')

    if not bot_url:
        bot_user = os.environ.get('TELEGRAM_BOT_USERNAME', '') or fetch_bot_username(token)
        if bot_user:
            bot_user = bot_user.lstrip('@')
            bot_url = f'https://t.me/{bot_user}'

    raw_notes = open(notes_file, encoding='utf-8').read() if os.path.isfile(notes_file) else ''
    text = build(version, raw_notes, web, apk, bot_url)

    # 1. Send the announcement message
    body = json.dumps({'chat_id': chat, 'text': text, 'parse_mode': 'HTML', 'disable_web_page_preview': True}).encode('utf-8')
    req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendMessage', body, {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            ok = json.load(r).get('ok')
    except Exception as e:
        print('Telegram send failed:', type(e).__name__); return 1

    print('Telegram: sent' if ok else 'Telegram: refused')

    # 2. If --poll or TELEGRAM_SEND_POLL is requested, send an official interactive poll
    send_poll_flag = '--poll' in flags or os.environ.get('TELEGRAM_SEND_POLL', '').lower() in ('1', 'true', 'yes')
    if ok and send_poll_flag:
        parsed = parse_release_notes(raw_notes, version)
        poll_q = f"Опрос по обновлению {version}: как вам изменения?"
        send_telegram_poll(token, chat, poll_q, DEFAULT_POLL_OPTIONS)

    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
