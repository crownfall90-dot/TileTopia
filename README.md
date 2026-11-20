<p align="center"><img src="store/icon-512.png" width="112" alt="Иконка Tiletopia"></p>
<h1 align="center">Tiletopia</h1>
<p align="center">Настольная стратегия, где города, дороги и реки растут из плиток.</p>

<p align="center">
  <a href="https://crownfall90-dot.github.io/TileTopia/"><b>Играть в браузере</b></a> ·
  <a href="https://github.com/crownfall90-dot/TileTopia/releases/latest/download/Tiletopia.apk"><b>Скачать APK</b></a> ·
  <a href="https://github.com/crownfall90-dot/TileTopia/releases/latest"><b>Последний релиз</b></a>
</p>

<p align="center">
  <a href="https://github.com/crownfall90-dot/TileTopia/actions/workflows/android-compile.yml"><img src="https://github.com/crownfall90-dot/TileTopia/actions/workflows/android-compile.yml/badge.svg?branch=main" alt="Проверка Android-сборки"></a>
  <a href="https://github.com/crownfall90-dot/TileTopia/releases/latest"><img src="https://img.shields.io/github/v/release/crownfall90-dot/TileTopia?color=success&label=Release" alt="Версия Tiletopia"></a>
</p>

<p align="center">
  <img src="store/screenshots/1-menu.png" width="190" alt="Главное меню">
  <img src="store/screenshots/2-game.png" width="190" alt="Игровое поле">
  <img src="store/screenshots/4-setup.png" width="190" alt="Настройка партии">
  <img src="store/screenshots/5-results.png" width="190" alt="Итоги партии">
</p>

## Как играть

Выбирайте плитку, продолжайте дороги и реки, достраивайте города и решайте, какие объекты занять фишками. Квадратное поле «Классики» и шестиугольные плитки «Классики 2.0» дают разные варианты хода.

- Тренируйтесь с ботами трёх уровней сложности или играйте по очереди на одном устройстве.
- Приглашайте друзей по коду комнаты или ищите соперников в рейтинговой игре.
- Выполняйте задания, открывайте фигурки, рамки и баннеры профиля.
- Продолжайте сохранённую локальную партию после перерыва.

## Где играть

- **Android** — скачайте APK из [последнего релиза](https://github.com/crownfall90-dot/TileTopia/releases/latest).
- **Телефоны, планшеты и компьютеры** — откройте [веб-версию](https://crownfall90-dot.github.io/TileTopia/). На совместимых браузерах её можно добавить на домашний экран.
- За правилами игры и вопросами об установке обращайтесь к [справке Tiletopia](https://crownfall90-dot.github.io/TileTopia/about.html). Идею или ошибку можно отправить из меню «Настройки → Написать разработчику».

[Политика конфиденциальности](https://crownfall90-dot.github.io/TileTopia/privacy.html) · [Удаление аккаунта и данных](https://crownfall90-dot.github.io/TileTopia/delete-account.html) · [English](https://crownfall90-dot.github.io/TileTopia/about-en.html)

© 2026 Crownfall. Все права защищены. Подробные условия приведены в [LICENSE](LICENSE). Об уязвимостях сообщайте через [приватный канал](SECURITY.md).


<details>
<summary><b>Раздел для разработчиков и участников команды</b></summary>

Рабочий репозиторий проекта **Tiletopia**.

Перед началом работы ознакомьтесь с [docs/product/README.md](docs/product/README.md) (видение, механики, сезонные локации, аудит) и [docs/coordination/HANDOFF.md](docs/coordination/HANDOFF.md).

- **Архитектура:** `web/game.html` + `src/` (модули собираются через Vite в `build/bundle/pg.js`), `app/` — нативная Android-оболочка (Gradle / Java), `scripts/` — пайплайн сборки, `tests/` — модульные тесты (`node --test tests/*.test.cjs`).
- **Сборка веб-модулей:** `npm run build`.
- **Запуск тестов:** `npm test`.
- **Развитие движка:** [архитектура и решение по Rust/WebAssembly](docs/ENGINEERING-ROADMAP.md).
- **Google Play:** [материалы и подготовка рынков](docs/product/PLAY-RELEASE.md).
- **Ключи и подпись:** [docs/SIGNING-KEY-ROTATION.md](docs/SIGNING-KEY-ROTATION.md); регламент безопасности репозитория — [docs/REPO-SECURITY.md](docs/REPO-SECURITY.md).
</details>
