/**
 * Cloudflare Worker for Tiletopia Telegram Bot.
 * Handles Telegram Webhooks and answers /start and /play with the game banner photo and «🎮 Открыть игру» inline button.
 *
 * Free 24/7 serverless deployment:
 * 1. Create a free worker on cloudflare.com (or via wrangler)
 * 2. Set Secret: TELEGRAM_BOT_TOKEN
 * 3. Set Secret: TELEGRAM_WEBHOOK_SECRET (random string, A-Z a-z 0-9 _ -, up to 256 chars)
 * 4. Set Webhook (Telegram then sends the secret in X-Telegram-Bot-Api-Secret-Token; other callers get 403):
 *    curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-worker>.workers.dev&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
 */

const DEFAULT_WEB_URL = 'https://crownfall90-dot.github.io/TileTopia/';
const BANNER_URL = 'https://crownfall90-dot.github.io/TileTopia/store/feature-1024x500.png';
const CHANNEL_URL = 'https://t.me/diarydevelopment';

const START_CAPTION = `🧩 <b>Tiletopia — Плиточная стратегия</b>

Выкладывайте квадратные плитки из общего запаса, развивайте города, прокладывайте тракты и возводите ключевые объекты. Выставляйте своих миплов и соревнуйтесь за контроль над территориями на игровом столе!

🌍 <b>Разные локации стола:</b> меняют мир плиток и добавляют уникальные особенности
⚔️ <b>Рейтинговые онлайн-битвы и дуэли 1×1</b>
🏆 <b>До +10 кубков за победу</b> — ничьих нет, побеждает сильнейший тактик!
🤖 <b>Умные боты</b> 3 уровней сложности для тренировок
👑 <b>Коллекции фигурок, рамки и статусы</b>

Нажмите <b>«🎮 Открыть игру»</b> ниже, чтобы начать партию прямо в Telegram:`;

const RULES_CAPTION = `📖 <b>Правила плиточной стратегии Tiletopia</b>

1️⃣ <b>Плитка за ход:</b> берите плитку из запаса и стыкуйте её с соседними на столе (город к городу, дорога к дороге, река к реке).
2️⃣ <b>Миплы:</b> выставляйте подданных на только что выложенную плитку (в город, на дорогу или особый объект).
3️⃣ <b>Очки:</b>
• Дорога: 1 очко за плитку (с мостом ×2)
• Город: 2 очка за плитку
• Монастырь/крепость: 9 очков при окружении 8 плитками
4️⃣ <b>Никаких ничьих:</b> при равенстве очков побеждает тот, кто завершил больше объектов или сохранил больше миплов!`;

function getKeyboard(webUrl = DEFAULT_WEB_URL) {
  return {
    inline_keyboard: [
      [
        {
          text: '🎮 Открыть игру',
          web_app: { url: webUrl }
        }
      ],
      [
        {
          text: '📖 Правила стратегии',
          web_app: { url: `${webUrl.replace(/\/+$/, '')}/#rules` }
        },
        {
          text: '📢 Наш канал',
          url: CHANNEL_URL
        }
      ]
    ]
  };
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Tiletopia Telegram Bot Webhook endpoint', { status: 200 });
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return new Response('TELEGRAM_BOT_TOKEN not configured', { status: 500 });
    }

    // Without the shared secret anyone could make the bot message arbitrary chats.
    const secret = env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) {
      return new Response('TELEGRAM_WEBHOOK_SECRET not configured', { status: 500 });
    }
    const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
    let diff = got.length ^ secret.length;
    for (let i = 0; i < secret.length; i++) diff |= (got.charCodeAt(i) || 0) ^ secret.charCodeAt(i);
    if (diff !== 0) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const update = await request.json();
      const message = update.message || update.edited_message;
      if (!message || !message.chat) {
        return new Response('OK');
      }

      const chatId = message.chat.id;
      const text = (message.text || '').trim();
      const cmd = text.split(/\s+/)[0].toLowerCase();
      const webUrl = env.WEB_APP_URL || DEFAULT_WEB_URL;

      const tgApi = (method, data) => fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (cmd === '/start' || cmd === '/play' || cmd === '/game') {
        await tgApi('sendPhoto', {
          chat_id: chatId,
          photo: BANNER_URL,
          caption: START_CAPTION,
          parse_mode: 'HTML',
          reply_markup: getKeyboard(webUrl)
        });
      } else if (cmd === '/rules') {
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: RULES_CAPTION,
          parse_mode: 'HTML',
          reply_markup: getKeyboard(webUrl)
        });
      } else if (cmd === '/help') {
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: `🧩 <b>Tiletopia — Плиточная стратегия</b>\n\n• Открыть игру: нажмите кнопку «🎮 Открыть игру» внизу.\n• Правила: /rules\n• Канал: ${CHANNEL_URL}`,
          parse_mode: 'HTML',
          reply_markup: getKeyboard(webUrl)
        });
      }

      return new Response('OK');
    } catch (e) {
      return new Response('Error', { status: 200 });
    }
  }
};
