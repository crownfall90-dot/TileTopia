# Telegram Bot — Tiletopia

Бот игры: [@pazzlegradbot](https://t.me/pazzlegradbot)

## Возможности бота
1. **Команда `/start`**:
   - Присылает графический баннер игры `store/feature-1024x500.png`.
   - Описание игры как плиточной стратегии (выкладывание плиток, строительство объектов, управление миплами, локации стола со своими особенностями, онлайн-бои).
   - Инлайн-кнопка **«🎮 Открыть игру»**, запускающая Mini App.
   - Инлайн-кнопки **«📖 Правила стратегии»** и **«📢 Наш канал»**.
2. **Кнопка меню чата (Menu Button)**:
   - Закреплена слева от поля ввода: **«🎮 Открыть игру»** (запуск Mini App в один клик).
3. **Команды**:
   - `/start` — Запустить плиточную стратегию Tiletopia
   - `/play` — Открыть игру (Tiletopia Mini App)
   - `/rules` — Правила плиточной стратегии, миплы и подсчёт очков
   - `/help` — Сообщество и ссылки

## Варианты запуска

### Вариант 1. Автонастройка меню и описания бота через GitHub Actions
В репозитории есть готовый workflow `.github/workflows/telegram-bot-setup.yml`.
Запустите его через вкладку Actions или CLI:
```bash
gh workflow run telegram-bot-setup.yml
```

### Вариант 2. Локальный запуск или сервер (Long Polling)
```bash
TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН" python3 scripts/telegram-bot.py
```

### Вариант 3. Бесплатный серверлесс 24/7 (Cloudflare Workers)
Файл `workers/telegram-bot-worker.js`:
1. Создайте бесплатный воркер в Cloudflare.
2. Вставьте содержимое `workers/telegram-bot-worker.js`.
3. Добавьте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` (случайная строка из латиницы, цифр, `_` и `-`) в Secrets. Без секрета воркер отвечает 500, а запросы без верного секрета получают 403.
4. Привяжите вебхук (Telegram будет присылать секрет в заголовке `X-Telegram-Bot-Api-Secret-Token`):
```bash
curl -F "url=https://<your-worker-subdomain>.workers.dev" -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
```
