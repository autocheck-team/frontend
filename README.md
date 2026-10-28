# AutoCheck frontend

[![CI](https://github.com/autocheck-team/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/autocheck-team/frontend/actions/workflows/ci.yml)

React-приложение платформы для автоматической проверки программных решений. Настроены маршрутизация, общая UI-основа, OIDC через Keycloak и клиент REST API. Вход и регистрация используют hosted-страницы Keycloak; каталог и страница задания загружают данные из backend API.

## Требования

- Node.js 24.x (совпадает с версией в CI).
- npm 10 или новее.

## Запуск

Из корня репозитория frontend:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Dev-сервер будет доступен по адресу <http://localhost:5173>. Для типизации, линтинга и production-сборки:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Тесты выполняются Vitest; CI вызывает их через существующую команду `npm test --if-present`.

## Переменные окружения

Локальные значения можно взять из `.env.example`:

| Переменная | Назначение | Локальное значение |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Базовый URL REST API | `http://localhost:8080` |
| `VITE_OIDC_URL` | URL Keycloak | `http://localhost:8180` |
| `VITE_OIDC_REALM` | Realm | `autocheck` |
| `VITE_OIDC_CLIENT_ID` | Публичный клиент браузера | `autocheck-web` |

`VITE_*` значения доступны клиентской сборке. Хранить в них секреты, client secret или токены нельзя.

## Инфраструктура и API

Frontend запускается отдельно от инфраструктуры. В `../infra/README.md` описан запуск общего стека командой `make up` из каталога `infra`; если используется локальный исходник backend, документация указывает `make up-local`. Эти команды запускают Compose-сервисы, включая PostgreSQL, SeaweedFS, Keycloak, миграции и backend API.

REST API доступен на `http://localhost:8080`, OpenAPI — `GET /openapi.yaml`. Контракты находятся в `../backend/api/openapi/autocheck.swagger.yaml` и `../backend/api/autocheck/v1/`. API-клиент передаёт Bearer-токен, если он предоставлен, и преобразует сетевые/HTTP-ошибки в `ApiError`.

OIDC использует realm `autocheck` и публичный клиент `autocheck-web` с Authorization Code + PKCE S256. Значения совпадают с `../infra/deploy/keycloak/autocheck-realm.json`; redirect URI и web origin настроены для `http://localhost:5173`. Роли и права проверяет backend.

## Ограничения каркаса

- `/login` и `/register` передают управление hosted-страницам Keycloak; пароли не вводятся в frontend.
- Выбор регистрации — только пользовательский сценарий. Новые аккаунты получают `student`; роль `author` может выдать администратор.
- `/forgot-password` направляет на hosted-страницу Keycloak, где пользователь выбирает сброс пароля. Локальный realm не содержит SMTP-настроек, поэтому письмо для сброса не доставляется до настройки почтового сервера.
- `/problems` показывает доступные задания с backend-пагинацией и авторским фильтром `onlyMine`; текстовый поиск ограничен уже загруженной страницей, так как server-side search отсутствует в API.
- `/problems/:problemId` показывает условие, лимиты, названия доступных языков и открытые готовые тесты; файлы примеров доступны по временным ссылкам backend.
- Worker backend пока не выполняет проверку решений; frontend не показывает фиктивные результаты.
- В backend-контрактах не обнаружен SSE API.
- Без параметров OIDC публичная стартовая страница остаётся доступна; защищённые разделы сообщают, что авторизация не настроена.

## Внесение изменений

Ветка от `main` → PR → зелёный CI → squash merge. Прямые пуши в `main` запрещены. Подробнее: [CONTRIBUTING](https://github.com/autocheck-team/.github/blob/main/CONTRIBUTING.md).
