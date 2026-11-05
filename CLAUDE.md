# Tiletopia — инструкции для ведущего ревьюера (Claude Opus 5.5)

> **Ты — ведущий ревьюер и co-developer проекта Tiletopia.**
> Ты работаешь в тандеме с агентом Antigravity (Gemini 3.8 Flash / Claude Opus 4.6 / Sonnet 4.6), который выполняет основную инженерную работу: пишет код, запускает тесты, конфигурирует CI и готовит сборки. Твоя задача — проводить глубокое техническое ревью, верифицировать отсутствие регрессий, дорабатывать код при необходимости и подтверждать этапы.

## 1. Как устроена совместная работа

```
Antigravity (Gemini/Opus/Sonnet)     Claude Opus 5.5 (ты)
       │                                    │
       ├── пишет код, тесты ──────────►     │
       ├── пушит в ветку ─────────────►     │
       ├── обновляет HANDOFF.md ──────►     │
       │                                    ├── git pull
       │                                    ├── читает HANDOFF.md
       │                                    ├── проверяет код и CI
       │                                    ├── дорабатывает если нужно
       │                                    ├── обновляет HANDOFF.md
       │                                    ├── пушит
       │  ◄────────────────────────────     │
       ├── git pull                         │
       ├── читает HANDOFF.md                │
       ├── продолжает работу                │
       │                                    │
```

### Файл координации
**`docs/coordination/HANDOFF.md`** — главный источник правды и «доска задач» между агентами.
* Всегда делай `git pull origin dev/stage2-account-network-20261029` перед началом работы.
* Читай секцию `## От Antigravity → Claude`.
* После ревью записывай свои выводы и подтверждение в секцию `## От Claude → Antigravity`, коммить и пушь.

### Ветка и правила
* Рабочая ветка: **`dev/stage2-account-network-20261029`**.
* **Никогда не трогай `main` напрямую.**
* Формат коммитов: `тип(область): описание`.
* Перед коммитом всегда проверяй тесты: `node --test tests/*.test.cjs`.

---

## 2. Текущее фактическое состояние проекта (на 30.10.2026)

### Что уже сделано и проверено в CI:
1. **TASK-001 (Исправление нативного Google Sign-In в Android):**
   * В `app/src/main/java/com/crownfall/mosaic/MainActivity.java` заменён `GetGoogleIdOption` на `GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_CLIENT_ID).build()`.
   * Добавлен классификатор ошибок `googleErrorCode(GetCredentialException e)` (`canceled` vs `no_credentials` vs `failed`).
   * В `web/game.html` вызовы защищены через `finally { onFail(c); }` для разблокировки UI при сбоях и отменах.
   * Добавлен тест-сьют `tests/google-native.test.cjs`.
   * **Подтверждено в GitHub Actions CI ([Run #41029927573](https://github.com/crownfall90-dot/TileTopia/actions/runs/41029927573)):** тесты `exit code 0`, оффлайн сборка `assembleStagingDebug` `exit code 0`.
2. **TASK-002 (Надёжность сессий и защита токенов):**
   * В `web/game.html` добавлен генератор `startGoogle.reqId` — отбрасывает устаревшие и вытесненные ответы от ОС.
   * Добавлена очистка `window.onGoogleToken` и `window.onGoogleError` после завершения или закрытия диалога (`#accNo`).
   * В `finishGoogle` добавлена дедупликация токенов (повторные токены в течение 10с безопасно отсекаются с `onFail('duplicate')`).
   * Кнопка `accGoogle` блокируется при клике (`disabled = true`) и разблокируется через `onFail`.
   * Добавлен тестовый сьют `tests/account-reliability.test.cjs`.
   * **Всего в проекте 46 тестов — все 100% зелёные!**
   * **Подтверждено в GitHub Actions CI ([Run #41031352448](https://github.com/crownfall90-dot/TileTopia/actions/runs/41031352448)):** `verify in 1m35s`, exit code 0.
3. **Исправлен синтаксис YAML в `.github/workflows/google-click-fix.yml`** (устранены ошибки отступов heredoc).

---

## 3. Новые инструменты и архитектурные решения

Владелец проекта утвердил стратегию развития, зафиксированную в коде:

### А. Двухконтурная среда (Staging → Production):
1. **Тестовая среда (Staging):**
   * Тестовый APK собирается как Pre-release / артефакт без оповещения публичных игроков.
   * Закрытая тестовая веб-версия защищена PIN-кодом тестера (по умолчанию `2026` в `localStorage`).
2. **Кнопка выкатки в Production (`.github/workflows/promote-production.yml`):**
   * Единый workflow в 1 клик собирает боевой APK и AAB, публикует GitHub Release `vNNN`, обновляет `latest.json`, деплоит веб-версию на GitHub Pages и отправляет FCM push-уведомление игрокам.

### Б. Автоматические бэкапы базы данных:
* Скрипт `scripts/backup-db.py` выгружает дампы веток `/profiles`, `/leaders`, `/fcodes`, `/presence` из Firebase Realtime DB.
* Workflow `.github/workflows/backup-database.yml` запускается по расписанию каждую ночь в 03:00 UTC и сохраняет 90-дневные защищённые артефакты.

### В. Панель управления основателя (`tools/founder-admin.html`):
* Локальный дашборд владельца: мониторинг онлайна в реальном времени, запуск промоушена Staging → Prod одной кнопкой, ручной бэкап базы, управление PIN-кодом тестеров и отправка push-новостей.

### Г. Долгосрочный переход на Vite + Модульный npm-стек:
* Согласован отказ от чистого Zero-Dependency монолита (5000 строк `game.html`).
* Запланирована декомпозиция на модули в `src/` (`auth`, `engine`, `net`, `ui`, `audio`, `state`) с использованием готовых npm-библиотек (GSAP для анимаций, Howler для звука, Zustand для стейта) и компиляцией через **Vite** в единый бандл для Android WebView `assets/` и Web.
* В репозиторий добавлен конфиг локальной модели основателя `tools/Modelfile.puzzlegrad` (Qwen 2.5 Coder 7B под GTX 1660 SUPER).

---

## 4. Чек-лист для твоего ревью

Когда ты подключаешься:
1. `git pull origin dev/stage2-account-network-20261029`.
2. Запусти тесты: `node --test tests/*.test.cjs` (должно быть 46/46 passed).
3. Проверь diff коммитов:
   - `MainActivity.java` — `GetSignInWithGoogleOption` и классификатор `googleErrorCode`.
   - `web/game.html` — `startGoogle.reqId`, дедупликация токенов, `accNo` очистка.
   - `tests/google-native.test.cjs` и `tests/account-reliability.test.cjs`.
   - `.github/workflows/promote-production.yml` и `.github/workflows/backup-database.yml`.
   - `tools/founder-admin.html`.
4. Заполни свой вердикт в `docs/coordination/HANDOFF.md` в секции `## От Claude → Antigravity`.
5. Закоммить и запушь своё ревью.

---

## 7. Продуктовый контекст (с 31.10.2026)

Для любого нового агента: сначала `docs/product/README.md` (видение, режимы и настройки, удержание, очередь задач), затем `docs/design/STYLE.md` и раздел «ПЕРЕДАЧА НОВОМУ АГЕНТУ» в `docs/coordination/HANDOFF.md`. Текущая версия — 1.0.257; релизы — только по команде владельца.
