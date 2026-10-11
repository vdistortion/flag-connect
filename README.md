# FlagConnect

Проект включает Telegram Mini App, Telegram-бота и общий пакет `@flag-connect/flag-domain` с данными стран и логикой викторины.

## Установка

```bash
npm install
```

При установке создаётся `bot/.env` из шаблона:

```dotenv
TELEGRAM_BOT_TOKEN=токен_бота
MINIAPP_URL=обязательный_HTTPS-адрес
```

## Mini App

```bash
npm start
```

## Сайт

```bash
npm run web:dev
```

## Сборка

```bash
npm run build
```

Команда собирает общий Angular-пакет и оба приложения.

## Telegram-бот

```bash
npm run bot:dev
```

Сборка и production-запуск:

```bash
npm run bot:build
npm run bot:start
```

## Общий пакет

`projects/shared` содержит общие страницы, UI и сервисы для сайта и Mini App. `packages/flag-domain` содержит каталог стран, типы и общую логику вопросов для Angular-приложений и бота.

Проверки:

```bash
npm test
npm run test:domain
```
