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

На VPS один раз создай каталог и клонируй репозиторий:

```bash
sudo mkdir -p /srv/flag-connect
sudo chown "$USER" /srv/flag-connect
git clone https://github.com/vdistortion/flag-connect.git /srv/flag-connect
cd /srv/flag-connect
cp deploy/.env.example deploy/.env
```

Заполни `deploy/.env` значениями Telegram-бота, затем проверь, что Docker-сеть `caddy` создана по инструкции [`vps-infra/caddy`](../vps-infra/caddy/README.md), и запусти:

```bash
docker compose --parallel 1 -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up -d --no-build
```

Caddy автоматически настроит HTTPS и проксирование на сайт, Mini App и бота. Последовательная сборка позволяет повторно использовать Angular build stage для всех образов. Файл `deploy/.env` содержит секреты и не коммитится.

Для деплоя из GitHub Actions настрой secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY` и `VPS_SSH_KNOWN_HOSTS`. Workflow **Deploy to VPS** обновляет `/srv/flag-connect` из `main` и пересобирает контейнеры. В `VPS_SSH_KNOWN_HOSTS` добавь проверенный ключ хоста VPS, а SSH-публичный ключ добавь пользователю VPS в `authorized_keys`.

## Общий пакет

`projects/shared` содержит общие страницы, UI и сервисы для сайта и Mini App. `packages/flag-domain` содержит каталог стран, типы и общую логику вопросов для Angular-приложений и бота.

Проверки:

```bash
npm test
npm run test:domain
```
