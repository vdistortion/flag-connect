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

В боте доступны `/flags` (угадать страну по флагу) и `/country` (угадать флаг по стране).

Сборка и production-запуск:

```bash
npm run bot:build
npm run bot:start
```

## Развёртывание на VPS

Используется общий Caddy из [`vps-infra`](https://github.com/vdistortion/vps-infra); конфигурация проекта находится в `deploy/`. Направь DNS-записи `A` (и `AAAA`, если IPv6 настроен) для `flag-connect.zvalentin.com` и `miniapp.flag-connect.zvalentin.com` на VPS.

На VPS должны быть установлены Docker Compose и общий Caddy из [`vps-infra/caddy`](https://github.com/vdistortion/vps-infra/tree/main/caddy); DNS-записи обоих доменов должны указывать на этот VPS. Пользователь `VPS_USER` должен иметь доступ к Docker.

В GitHub Actions добавь secrets:

- `VPS_HOST`, `VPS_USER` — адрес и пользователь VPS;
- `VPS_SSH_PRIVATE_KEY` — приватный SSH-ключ; соответствующий публичный ключ добавь в `authorized_keys` пользователя VPS;
- `VPS_SSH_KNOWN_HOSTS` — проверенный host key VPS;
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота;
- `MINIAPP_URL` — `https://miniapp.flag-connect.zvalentin.com`.

Workflow **Deploy to VPS** создаёт `~/projects`, клонирует репозиторий в `~/projects/flag-connect` или обновляет существующую `main`, передаёт runtime-настройки в защищённый `deploy/.env` и пересобирает контейнеры. При переписывании GitHub-истории workflow обновит чистый checkout; если на VPS есть незакоммиченные изменения, он остановится, не затирая их. Не редактируй файлы проекта вручную на VPS. Вручную заполнять `.env` на VPS не нужно. Последовательная сборка повторно использует Angular build stage; Caddy автоматически настраивает HTTPS для сайта и Mini App, бот работает через polling без публичных портов.

## Общий пакет

`projects/shared` содержит общие страницы, UI и сервисы для сайта и Mini App. `packages/flag-domain` содержит каталог стран, типы и общую логику вопросов для Angular-приложений и бота.

Проверки:

```bash
npm test
npm run test:domain
```
