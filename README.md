# hh-keywords

Локальное web-приложение для поиска вакансий через API HeadHunter, сохранения избранного и сбора агрегированных ключевиков для резюме.

## Запуск

```bash
npm i
npm run dev
```

Открыть: `http://localhost:3000`.

## Переменные окружения

Создайте `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Если переменная не задана, экспорт в Google Docs отключается и доступен fallback в `.md`.

## Google OAuth (кратко)

1. В Google Cloud Console создайте OAuth Client ID (Web application).
2. Добавьте Authorized JavaScript origins: `http://localhost:3000`.
3. Скопируйте Client ID в `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Реализованные страницы

- `/` — Search + List (показывает 10 вакансий, фильтры из HH dictionaries/areas, skip/favorite, "Следующие 10").
- `/favorites` — список избранных вакансий.
- `/summary` — сбор ключевых фраз, категоризация Tools/Hard/Soft, Key skills(HH), экспорт Google Docs/.md, ручные overrides.

## Реализованные API endpoint'ы

- `GET /api/hh/search` → proxy `GET https://api.hh.ru/vacancies`
- `GET /api/hh/vacancy/:id` → proxy `GET https://api.hh.ru/vacancies/:id`
- `GET /api/hh/areas` → proxy `GET https://api.hh.ru/areas`
- `GET /api/hh/dictionaries` → proxy `GET https://api.hh.ru/dictionaries`

Во всех proxy-запросах задаются `User-Agent` и `HH-User-Agent`.

## Тесты

```bash
npm test
```

Покрыто:
- HTML → text,
- извлечение ключевых фраз,
- категоризация Tools/Soft/Hard,
- дедупликация/агрегация частот.
