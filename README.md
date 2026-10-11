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

Сборка:

```bash
npm run build
```

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

`packages/flag-domain` содержит каталог стран, типы и общую функцию создания вопроса для бота и Mini App.

Проверка пакета:

```bash
npm run test:domain
```
