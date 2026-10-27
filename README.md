# Roblox Factory

Команда AI-агентов (OpenCode) для создания и развития игр на Roblox.
Ядро взято из [ai-factory](https://github.com/abylai88/ai-factory): оркестратор, pipeline-runner, task-runner, роутер бесплатных моделей и система прав агентов. Движок, агенты и шаблон переделаны под Roblox (Luau + Rojo).

Идея не в массовом автовыпуске, а в небольшом числе игр, которые постоянно улучшаются. Решения принимаешь ты, работу делают агенты.

## Что внутри

```
agents/opencode/        14 агентов: market, competitor, idea, director, gameplay, designer,
                        architect, programmer, content, monetization, researcher,
                        builder, tester, reviewer
agents/orchestrator.md  правила главного оркестратора
factory/                ядро (TypeScript)
  engine/               движок Roblox: определяет Rojo-проект, блокирует web/unity
  pipeline/             три pipeline: game, update, engineering
  permissions/          что каждому агенту можно запускать (rojo, selene, stylua…)
  setup/                создание проекта из шаблона + раздача агентов в .opencode/agents
  template/rojo-check   статическая проверка Rojo-проекта без Roblox-инструментов
templates/roblox-starter/  шаблон игры, с которого начинается каждый проект
```

### Шаблон `roblox-starter`

Играбельная заготовка, которую агенты расширяют, а не пишут с нуля:

- **DataService** — сохранения в DataStore: повторы, автосейв, сохранение при выходе и при выключении сервера. Если загрузка не удалась, данные не перезаписываются.
- **CurrencyService** — монеты, лидерборд, каждое изменение пишется в аналитику.
- **MonetizationService** — game passes и developer products. Покупка зачисляется ровно один раз и сохраняется до подтверждения Roblox.
- **DailyRewardService** — ежедневная награда с серией.
- **Analytics / Onboarding** — экономика и воронка первой сессии в Creator Dashboard.
- **GameplayService** — пример цикла «тап → монеты». Его заменяет настоящая механика.
- **RateLimiter** и серверная валидация всех Remotes.
- Простой HUD, который работает на телефоне и ПК.

## Установка (WSL / Ubuntu)

```bash
git clone https://github.com/abylai88/roblox-factory.git
cd roblox-factory
npm install

# инструменты Roblox (нужны агентам для проверок)
curl -sSf https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.sh | bash
cd templates/roblox-starter && rokit install && cd ../..
```

Roblox Studio работает в Windows, поэтому Rojo-плагин ставится туда же: плагин Rojo из Creator Store или `rojo plugin install`, запущенный в Windows, а не в WSL. `rojo serve` можно запускать в WSL: Studio подключается к нему через `localhost`.

## Использование

```bash
# посмотреть план без запуска агентов
npm start -- new "Пицца тайкун с друзьями" --dry-run

# новая игра: полный pipeline от анализа рынка до релиза
npm start -- new "Пицца тайкун с друзьями"

# апдейт живой игры
npm start -- new "Добавить хэллоуин-ивент" --project projects/пицца-тайкун-с-друзьями --pipeline update

# техническая задача
npm start -- new "Исправить ошибку сохранения" --project projects/пицца-тайкун-с-друзьями --pipeline engineering

# продолжить с нужного шага
npm start -- new "Пицца тайкун" --project projects/пицца-тайкун --pipeline game --from-step implementation
```

Правила выбора pipeline:
- `--pipeline` всегда главнее;
- если проекта ещё нет, запускается `game`;
- иначе по тексту цели: «исправить / баг / ошибка» → `engineering`, остальное → `update`.

Играть и проверять в Studio:

```bash
cd projects/<игра>
rojo serve          # в Studio: плагин Rojo → Connect
```

## Что делаешь ты, а не агенты

1. Выбираешь, какую игру делать, и утверждаешь GDD.
2. Публикуешь place из Studio.
3. Создаёшь game passes и developer products в Creator Dashboard и вписываешь ID в `src/shared/Config.luau`.
4. Включаешь Game Settings → Security → *Studio Access to API Services*.
5. Решаешь, что выпускать и сколько тратить на рекламу.

Каждый финальный отчёт агентов заканчивается списком этих ручных шагов.

## Проверки

```bash
npm test                 # тесты ядра (vitest)
npm run typecheck
npm run check:template   # Rojo-маппинг и все require() шаблона
npm run agents:regenerate   # после изменения прав в permissions/ — обновить агентов
```

Внутри игры агенты сами запускают `rojo build`, `selene src` и `stylua --check src`.

## Модели

Агенты по умолчанию работают на бесплатных моделях OpenCode (`factory/model-router/router.ts`), платные провайдеры в проектах отключены (`opencode.json`).
