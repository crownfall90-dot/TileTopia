# Проверки Tiletopia

Полный набор использует Chromium. Выполните из корня репозитория:

```sh
npm ci
npx playwright install chromium
npm run build
npm test
```

В pull request к `main` эти же проверки запускает GitHub Actions.

## Жизненный цикл партии

`node --test tests/lifecycle.test.cjs` — автономные регрессии Node 20 без сети, Firebase, npm-зависимостей и ключей.

Chromium smoke: создать offline wrapper во временной копии без `app/google-services.json`, затем выполнить `python tests/lifecycle.browser.py /path/to/app/src/main/assets/index.html`. Требуется Playwright; скрипт отказывается от Firebase-enabled HTML и блокирует все внешние запросы. Test hook внедряется только в строку HTML в памяти, не в приложение.

Эти проверки не заменяют Android/WebView, реальный телефон, два Firebase-клиента и проверку обрыва связи.
