/**
 * Pipeline types:
 *   game         — new Roblox experience, from research to first public release
 *   update       — live game: one feature / balance / content update
 *   engineering  — technical task: refactor, bugfix, tooling
 */
export type PipelineType = "game" | "update" | "engineering";

export interface PipelineStep {
  id: string;
  title: string;
  role: string;
  agent: string;
  description: string;
}

export interface Pipeline {
  id: string;
  name: string;
  goal: string;
  type: PipelineType;
  steps: PipelineStep[];
}

const ROBLOX_CHECKS =
  "Проверки: `rojo build default.project.json -o game.rbxlx`, `selene src`, `stylua --check src`.";

/**
 * Full Roblox game pipeline — from market research to a playable first release.
 *
 * market → competitor → idea → director → gameplay → design → architect →
 * implementation → content → monetization → test → review → build → release
 */
export function createFullGamePipeline(goal: string): Pipeline {
  return {
    id: `game-prod-${Date.now()}`,
    name: "Roblox Game Pipeline",
    goal,
    type: "game",

    steps: [
      {
        id: "market",
        title: "Market analysis",
        role: "research",
        agent: "market",
        description:
          "Проанализируй нишу на Roblox: жанр, возраст аудитории, сессии, конкуренцию в Discover/Charts, типичную монетизацию (game passes, dev products, rewarded video, подписки). Опирайся только на проверяемые данные, отмечай неуверенные оценки."
      },
      {
        id: "competitor",
        title: "Competitor analysis",
        role: "research",
        agent: "competitor",
        description:
          "Разбери 3–5 похожих Roblox-игр: core loop, соц-механики, что продают и за сколько Robux, как удерживают (daily rewards, ребёрты, ивенты), слабые места, которые можно сделать лучше."
      },
      {
        id: "idea",
        title: "Game concept",
        role: "game",
        agent: "idea",
        description:
          "Предложи концепт Roblox-игры: USP (чем отличается от клонов), core loop на 30 секунд и на 30 минут, соц-механика, причина вернуться завтра, что можно продавать без pay-to-win."
      },
      {
        id: "director",
        title: "Game design document",
        role: "game",
        agent: "director",
        description:
          "Напиши GDD для Roblox: видение, механики, прогрессия, экономика валют, мультиплеер и соц-петли, онбординг первых 60 секунд, UX-экраны, MVP vs пост-релиз."
      },
      {
        id: "gameplay",
        title: "Gameplay mechanics design",
        role: "game",
        agent: "gameplay",
        description:
          "Детально проработай механики: управление на ПК/мобиле/геймпаде, тюнинг чисел, feedback и juice (звуки, частицы, tween), кривая сложности, что считается на сервере, а что на клиенте."
      },
      {
        id: "design",
        title: "Technical design",
        role: "designer",
        agent: "designer",
        description:
          "Разложи GDD на инкременты: какие Luau-модули в src/server, src/client, src/shared создать или изменить, какие RemoteEvents нужны, критерии приёмки каждого инкремента. Код не изменяй."
      },
      {
        id: "architect",
        title: "Technical architecture",
        role: "engineering",
        agent: "architect",
        description:
          "Спроектируй архитектуру на базе шаблона roblox-starter: сервисы, схема данных игрока (DataService), протокол Remotes с серверной валидацией, конфиги в shared/Config. Определи риски (эксплойты, потеря данных, лимиты DataStore)."
      },
      {
        id: "implementation",
        title: "Implement game",
        role: "engineering",
        agent: "programmer",
        description:
          `Реализуй игру на Luau по архитектурному плану, расширяя шаблон, а не переписывая его. Сервер — источник истины, клиент только отображает и шлёт намерения. ${ROBLOX_CHECKS}`
      },
      {
        id: "content",
        title: "Create game content",
        role: "game",
        agent: "content",
        description:
          "Заполни data-driven конфиги в src/shared: уровни, предметы, цены во внутриигровой валюте, награды, тексты интерфейса. Никаких магических чисел в коде."
      },
      {
        id: "monetization",
        title: "Monetization design",
        role: "game",
        agent: "monetization",
        description:
          "Спроектируй монетизацию: game passes, dev products, rewarded video, при необходимости подписки и private servers. Цены в Robux, место показа в UX, KPI (конверсия, ARPDAU). Пропиши ID-заглушки в Config.Monetization."
      },
      {
        id: "test",
        title: "Test implementation",
        role: "qa",
        agent: "tester",
        description:
          `Проверь результат: ${ROBLOX_CHECKS} Пройди код на типичные эксплойты (доверие клиенту, отсутствие rate limit), утечки соединений, ошибки сохранения. Если подключён Studio MCP — запусти плейтест и прочитай Output. Код не исправляй.`
      },
      {
        id: "review",
        title: "Review final result",
        role: "reviewer",
        agent: "reviewer",
        description:
          "Независимо оцени итог: соответствие GDD, безопасность серверной логики, сохранность данных, соответствие правилам Roblox (без азартных механик за Robux, без обманных покупок). Вердикт: release / release-with-fixes / block."
      },
      {
        id: "build",
        title: "Build place file",
        role: "engineering",
        agent: "builder",
        description:
          `Собери place-файл и убедись, что всё проходит. ${ROBLOX_CHECKS} Исправляй только проблемы сборки и линтера.`
      },
      {
        id: "release",
        title: "Prepare release",
        role: "reviewer",
        agent: "reviewer",
        description:
          "Подготовь релизный отчёт: что готово, чек-лист ручных шагов в Studio (опубликовать place, создать game passes и dev products, вписать их ID в Config, включить API Services, настроить иконку и превью), риски и план первого апдейта."
      }
    ]
  };
}

/**
 * Live-game update pipeline — one feature, balance change or content drop for
 * a game that is already running. Short loop, no market research.
 */
export function createGameUpdatePipeline(goal: string): Pipeline {
  return {
    id: `update-${Date.now()}`,
    name: "Roblox Update Pipeline",
    goal,
    type: "update",

    steps: [
      {
        id: "research",
        title: "Study the current game",
        role: "research",
        agent: "researcher",
        description:
          "Изучи текущий Rojo-проект: сервисы, схему данных игрока, Remotes, конфиги. Пойми, какие части затронет апдейт и что может сломаться. Ничего не изменяй."
      },
      {
        id: "design",
        title: "Design the update",
        role: "designer",
        agent: "designer",
        description:
          "Спроектируй апдейт: изменения в файлах, миграция данных игрока (если меняется схема — только добавлять поля с дефолтами), критерии приёмки, что объявить игрокам. Код не изменяй."
      },
      {
        id: "implementation",
        title: "Implement the update",
        role: "engineering",
        agent: "programmer",
        description:
          `Реализуй апдейт минимальными изменениями. Не ломай сохранения существующих игроков. ${ROBLOX_CHECKS}`
      },
      {
        id: "test",
        title: "Test the update",
        role: "qa",
        agent: "tester",
        description:
          `Проверь апдейт: ${ROBLOX_CHECKS} Проверь совместимость со старыми сохранениями и серверную валидацию новых Remotes. Код не исправляй.`
      },
      {
        id: "review",
        title: "Review the update",
        role: "reviewer",
        agent: "reviewer",
        description:
          "Независимо оцени апдейт: соответствие цели, регрессии, безопасность, миграция данных. Не изменяй код."
      },
      {
        id: "build",
        title: "Build place file",
        role: "engineering",
        agent: "builder",
        description:
          `Собери place-файл. ${ROBLOX_CHECKS} Исправляй только проблемы сборки.`
      },
      {
        id: "release",
        title: "Prepare update notes",
        role: "reviewer",
        agent: "reviewer",
        description:
          "Оформи итог: список изменений для игроков (update log), ручные шаги в Studio, что отслеживать в аналитике после выхода апдейта."
      }
    ]
  };
}

/** @deprecated kept for backwards compatibility — use createGameUpdatePipeline. */
export const createGameImprovementPipeline = createGameUpdatePipeline;

/**
 * Engineering pipeline — technical tasks, bugfixes, refactoring.
 */
export function createEngineeringPipeline(goal: string): Pipeline {
  return {
    id: `eng-${Date.now()}`,
    name: "Engineering Pipeline",
    goal,
    type: "engineering",

    steps: [
      {
        id: "research",
        title: "Research and diagnose",
        role: "research",
        agent: "researcher",
        description:
          "Изучи проект, архитектуру и flow. Найди подтверждённые проблемы и их причины. Ничего не изменяй."
      },
      {
        id: "design",
        title: "Design solution",
        role: "designer",
        agent: "designer",
        description:
          "На основе цели и результатов Researcher разработай конкретное техническое решение. Код не изменяй."
      },
      {
        id: "implementation",
        title: "Implement solution",
        role: "engineering",
        agent: "builder",
        description:
          `Реализуй согласованное решение. Не делай unrelated changes. ${ROBLOX_CHECKS}`
      },
      {
        id: "test",
        title: "Test implementation",
        role: "qa",
        agent: "tester",
        description:
          `Проверь результат: ${ROBLOX_CHECKS} Ищи регрессии. Не исправляй код.`
      },
      {
        id: "review",
        title: "Review result",
        role: "reviewer",
        agent: "reviewer",
        description:
          "Независимо оцени итог. Проверь соответствие цели, качество, проверки. Не изменяй код."
      },
      {
        id: "build",
        title: "Build place file",
        role: "engineering",
        agent: "builder",
        description: `Собери place-файл. ${ROBLOX_CHECKS}`
      },
      {
        id: "release",
        title: "Prepare release",
        role: "reviewer",
        agent: "reviewer",
        description: "Проверь финальное состояние и оформи отчёт."
      }
    ]
  };
}

const NEW_WORDS =
  /(?:^|[^\p{L}])(new|create|make|build|develop|start|новая|новую|новый|начать|создать|сделать|разработать)(?=$|[^\p{L}])/iu;
const GAME_WORDS =
  /(game|игр|obby|обби|tycoon|тайкун|simulator|симулятор|tower defense|roleplay|rp|horror|хоррор|survival|выживание)/iu;
const BUG_WORDS =
  /(?:^|[^\p{L}])(fix|bug|error|crash|repair|patch|исправ|ошибк|баг|краш|чинить|починить)/iu;
const ENGINEERING_WORDS =
  /(?:^|[^\p{L}])(refactor|рефактор|lint|selene|stylua|rojo|wally|tooling|config|ci)(?=$|[^\p{L}])/iu;

/**
 * Select the pipeline from an explicit type or from the goal text.
 * An explicit type always wins, so runGoal() reproduces the caller's choice.
 */
export function selectPipeline(goal: string, pipelineType?: PipelineType): Pipeline {
  if (pipelineType === "engineering") return createEngineeringPipeline(goal);
  if (pipelineType === "update") return createGameUpdatePipeline(goal);
  if (pipelineType === "game") return createFullGamePipeline(goal);

  const text = goal ?? "";

  if (BUG_WORDS.test(text) || ENGINEERING_WORDS.test(text)) {
    return createEngineeringPipeline(goal);
  }

  if (NEW_WORDS.test(text) && GAME_WORDS.test(text)) {
    return createFullGamePipeline(goal);
  }

  // Everything else is a change to a live game. The orchestrator forces
  // "game" when the workspace does not exist yet.
  return createGameUpdatePipeline(goal);
}
