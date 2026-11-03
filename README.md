<p align="center"><img src="store/icon-512.png" width="112" alt="Tiletopia"></p>

<h1 align="center">Tiletopia</h1>

<p align="center"><b>Стройте города, дороги и крепости из общей стопки карт-пазлов.</b><br>
Короткие партии на 8–30 минут: с ботами, на одном телефоне, онлайн на кубки и в комнатах с друзьями.</p>

<p align="center">
  <a href="https://crownfall90-dot.github.io/play/"><b>▶ Играть в браузере</b></a> ·
  <a href="https://github.com/crownfall90-dot/play/releases/latest/download/Tiletopia.apk"><b>⬇ Скачать для Android</b></a> ·
  <a href="docs/privacy-policy.md">Политика конфиденциальности</a>
</p>

<p align="center"><img src="store/screenshots/1-menu.png" width="200" alt="Главное меню"> <img src="store/screenshots/2-game.png" width="200" alt="Партия"> <img src="store/screenshots/5-results.png" width="200" alt="Итоги"></p>

## Об игре
- **Партия за 8–30 минут.** «Быстрая» — 30 карт, «Классика» — 50, «Большая» — 100.
- **Онлайн на кубки**: быстрый поиск соперников, рейтинг, карта соперника видна ещё до его хода.
- **С друзьями**: комната по коду или приглашение в один тап.
- **С ботами трёх уровней** и **на одном телефоне** — без интернета.
- **Подсказки-тренер**: сколько очков даст город или дорога и что осталось достроить.
- **Профиль на всех устройствах**: телефон, приложение и браузер — один прогресс.

## Установка
- **Android:** скачайте [Tiletopia.apk](https://github.com/crownfall90-dot/play/releases/latest/download/Tiletopia.apk) и откройте файл. Приложение обновляется само.
- **iPhone и компьютер:** откройте [веб-версию](https://crownfall90-dot.github.io/play/) и добавьте на главный экран.

## Поддержка
Нашли ошибку или есть идея — «Настройки → Написать разработчику» в игре. Уязвимости безопасности — по правилам в [SECURITY.md](SECURITY.md).

## Права
© 2026 Crownfall. Все права защищены. Код, графика, звуки и тексты игры — собственность автора; копирование, распространение и использование в своих проектах без письменного разрешения запрещены. Подробно — [LICENSE](LICENSE).

---

<details>
<summary>Для разработчиков проекта</summary>

Это рабочий репозиторий команды Tiletopia. Начните с [docs/product/README.md](docs/product/README.md) (видение, режимы, удержание, очередь задач, аудит), затем [docs/coordination/HANDOFF.md](docs/coordination/HANDOFF.md).

- `web/game.html` + `src/` — игра (модули собираются Vite в `build/bundle/pg.js`), `app/` — Android-оболочка, `scripts/` — сборка и обслуживание, `tests/` — тесты (`npm run build && node --test tests/*.test.cjs`).
- Выпуск — только по команде владельца через «Promote to Production»; заметки для игроков — `release-notes.md`.
- Подпись приложения — [docs/SIGNING-KEY-ROTATION.md](docs/SIGNING-KEY-ROTATION.md); безопасность репозитория — [docs/REPO-SECURITY.md](docs/REPO-SECURITY.md).
</details>
