# FlagConnect

Проект включает Telegram Mini App, Telegram-бота и общий пакет `@flag-connect/flag-domain` с данными стран и логикой викторины.

## Установка

```bash
npm install
```

При установке создаётся `apps/bot/.env` из шаблона:

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

Workflow **Deploy to VPS** создаёт `~/projects`, клонирует репозиторий в `~/projects/flag-connect` или обновляет существующую `main`, передаёт Telegram-настройки в защищённый `deploy/.env.bot` и пересобирает контейнеры. При переписывании GitHub-истории workflow обновит чистый checkout; если на VPS есть незакоммиченные изменения, он остановится, не затирая их. Не редактируй файлы проекта вручную на VPS. Последовательная сборка повторно использует Angular build stage; Caddy автоматически настраивает HTTPS для сайта и Mini App, бот работает через polling без публичных портов.

### Флаги в Garage

Картинки хранятся в bucket `flag-connect-assets` общего Garage. Для первой настройки на VPS создай bucket и отдельный **read-only** ключ:

```bash
docker exec garage /garage bucket create flag-connect-assets
docker exec garage /garage key create flag-connect-assets-read
docker exec garage /garage bucket allow flag-connect-assets --key flag-connect-assets-read --read
```

Сохрани показанные `Key ID` и `Secret key` в `~/projects/flag-connect/deploy/.env.garage`:

```dotenv
RCLONE_CONFIG_GARAGE_TYPE=s3
RCLONE_CONFIG_GARAGE_PROVIDER=Other
RCLONE_CONFIG_GARAGE_ACCESS_KEY_ID=...
RCLONE_CONFIG_GARAGE_SECRET_ACCESS_KEY=...
RCLONE_CONFIG_GARAGE_ENDPOINT=http://garage:3900
RCLONE_CONFIG_GARAGE_REGION=garage
RCLONE_CONFIG_GARAGE_FORCE_PATH_STYLE=true
```

Ограничь доступ к файлу: `chmod 600 ~/projects/flag-connect/deploy/.env.garage`. Он не коммитится и не передаётся в GitHub Actions. Actions запускает Rclone для синхронизации bucket в Docker volume. Сайт и Mini App берут флаги из `/images/flags/`; бот в режиме `/flags` — индивидуальные WebP до 440 px из `/images/flags/bot/`, добавляя к URL SHA-256 версии содержимого для обхода клиентского кэша. В режиме угадывания бот композитит по два пронумерованных флага в изображение без отдельных подписей, повторяет вопрос перед общей группой кнопок и кэширует composites в отдельном Docker volume, раздаваемом по `/images/generated/`.

## Общий пакет

`projects/shared` содержит общие страницы, UI и сервисы для сайта и Mini App. `packages/flag-domain` содержит каталог стран, типы и общую логику вопросов для Angular-приложений и бота.

В режиме `/country` варианты идут парными изображениями; если число вариантов нечётное, последняя пара содержит один флаг и пустую вторую панель. При настройке бота «Без вариантов» `/flags` показывает флаг и предлагает раскрыть название страны, а `/country` показывает страну и по нажатию «Показать ответ» присылает один исходный bot-флаг без композиции.

Проверки:

```bash
npm test
npm run test:domain
```
