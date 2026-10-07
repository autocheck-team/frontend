# frontend

[![CI](https://github.com/autocheck-team/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/autocheck-team/frontend/actions/workflows/ci.yml)

Веб-интерфейс системы автоматической проверки решений: каталог заданий, редактор кода,
результаты проверки, кабинет автора заданий.

- **Стек:** React + TypeScript (Vite)
- **Архитектура системы:** [infra/docs/architecture.md](https://github.com/autocheck-team/infra/blob/main/docs/architecture.md)
- **Задачи:** [GitHub Project](https://github.com/orgs/autocheck-team/projects)

> Каркас приложения ещё не создан (задача HPRPR-23). CI начнёт собирать проект,
> как только в корне появится `package.json`: ожидаются скрипты `lint` и `build`,
> `test` по желанию.

## Бэкенд для разработки

API поднимается из репозитория [infra](https://github.com/autocheck-team/infra), Go ставить не нужно:

```sh
git clone git@github.com:autocheck-team/infra.git
cd infra && make up      # API на http://localhost:8080
```

## Как вносить изменения

Ветка от `main` → PR → зелёный CI → squash merge. Прямые пуши в `main` запрещены.
Подробнее: [CONTRIBUTING](https://github.com/autocheck-team/.github/blob/main/CONTRIBUTING.md).
