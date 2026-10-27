import path from "node:path";
import { runGoal } from "../pipeline/pipeline-runner.js";
import { DryRunExecutor } from "../pipeline/dry-run.js";
import { PipelineType, selectPipeline } from "../pipeline/pipeline.js";
import { classifyGoal, detectEngine } from "../engine/engine.js";
import {
  TemplateManager,
  resolveWorkspaceDir
} from "../setup/project-setup.js";

function parseArgs(argv: string[]): {
  command: string;
  goal: string;
  project?: string;
  dryRun: boolean;
  failTest: number;
  engine?: string;
  pipeline?: PipelineType;
  force: boolean;
  fromStep?: string;
} {
  const args = [...argv];
  const command = args.shift() ?? "";

  const positional: string[] = [];
  let project: string | undefined;
  let dryRun = false;
  let failTest = 0;
  let engine: string | undefined;
  let pipeline: PipelineType | undefined;
  let force = false;
  let fromStep: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--project") {
      project = args[++i];
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--engine") {
      engine = args[++i];
    } else if (a === "--pipeline") {
      const val = args[++i]?.toLowerCase();
      if (val === "game" || val === "update" || val === "engineering") {
        pipeline = val;
      }
    } else if (a === "--from-step") {
      fromStep = args[++i];
    } else if (a === "--force") {
      force = true;
    } else if (a === "--fail-test") {
      const n = Number(args[++i]);
      failTest = Number.isFinite(n) ? n : 0;
    } else if (a.startsWith("--")) {
      // ignore unknown flags
    } else {
      positional.push(a);
    }
  }

  return {
    command,
    goal: positional.join(" ").trim(),
    project,
    dryRun,
    failTest,
    engine,
    pipeline,
    force,
    fromStep
  };
}

function printUsage(): void {
  console.log(`
🏭 ROBLOX FACTORY — AI agent team for Roblox games

Usage:

  npx tsx factory/orchestrator/index.ts new "Goal" [options]
  npm start -- new "Goal" [options]

Options:

  --project <dir>    Project directory (default: ./projects/<slug> or env AI_FACTORY_PROJECT)
  --engine <name>    Engine: roblox (the only supported engine; default)
  --pipeline <type>  Pipeline: game | update | engineering
                     (default: "game" for a new workspace, otherwise auto-detected)
  --from-step <id>   Resume pipeline from this step, skipping all earlier steps.
                     Validates the step ID exists in the selected pipeline.
  --dry-run          Show ENGINE / STACK / TEMPLATE / WORKSPACE, do NOT scaffold or run agents
  --force            Replace a non-empty existing workspace during setup (DESTROYS content)
  --fail-test <N>    (dry-run) Make the TEST step fail the first N times to
                     exercise the TEST -> BUGFIX -> TEST loop

Behavior:
  If --project points to an existing initialized workspace (all template markers
  present), setup is SKIPPED and the factory CONTINUES the pipeline directly.
  Template files are never overwritten unless --force is used.

Pipeline types:
  game          New Roblox game (market → competitor → idea → director → ... → release)
  update        Live-game update: one feature / event / balance change
  engineering   Technical task: bugfix, refactor, tooling

Examples:

  npm start -- new "Pizza Tycoon" --dry-run
  npm start -- new "Pizza Tycoon"
  npm start -- new "Добавить хэллоуин-ивент" --project projects/pizza-tycoon --pipeline update
  npm start -- new "Fix DataStore errors" --project projects/pizza-tycoon --pipeline engineering
  npm start -- new "Pizza Tycoon" --project projects/pizza-tycoon --pipeline game --from-step implementation
`);
}

async function main(): Promise<void> {
  const { command, goal, project, dryRun, failTest, engine, pipeline, force, fromStep } =
    parseArgs(process.argv.slice(2));

  if (!command || !goal) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const baseDir = path.resolve(
    process.env.AI_FACTORY_HOME ?? process.cwd()
  );

  // Engine is decided BEFORE any project exists: explicit --engine wins,
  // otherwise classify from the goal.
  const explicitEngine = engine ? classifyGoal(goal, engine) : undefined;
  const goalEngine = explicitEngine ?? classifyGoal(goal);


  console.log(`
╔══════════════════════════════════════╗
║        🏭 ROBLOX FACTORY             ║
║     AI agent team for Roblox         ║
╚══════════════════════════════════════╝
`);

  console.log("🎯 GOAL:", goal);
  console.log(dryRun ? "🧪 MODE: DRY-RUN (no real agents)" : "🧠 MODE: LIVE");

  const projectDir =
    project ??
    process.env.AI_FACTORY_PROJECT ??
    resolveWorkspaceDir(baseDir, goal);

  console.log("📁 PROJECT:", projectDir);
  console.log(`⚙️  ENGINE: ${goalEngine.kind}${goalEngine.stack ? " — " + goalEngine.stack : ""}`);
  console.log(`ℹ️  ENGINE NOTE: ${goalEngine.reason}`);

  // Only Roblox is supported — never create a dummy project for anything else.
  if (goalEngine.kind !== "roblox" || !goalEngine.supported) {
    console.log("\n🛑 ENGINE not supported → BLOCKED before project setup.");
    console.log("   No project workspace was created.");
    process.exitCode = 1;
    return;
  }

  const setup = new TemplateManager(baseDir);
  const template = await setup.templateFor(goalEngine);

  if (!template) {
    console.log("\n🛑 Template templates/roblox-starter not found. Run from the repo root or set AI_FACTORY_HOME.");
    process.exitCode = 1;
    return;
  }

  const workspaceDir =
    project ?? process.env.AI_FACTORY_PROJECT ?? resolveWorkspaceDir(baseDir, goal);

  // Pipeline: explicit --pipeline wins. A workspace that does not exist yet can
  // only start with the full "game" pipeline; otherwise auto-detect from goal.
  const workspaceReady = await setup.isInitializedWorkspace(workspaceDir, template);
  const pipelineDef = selectPipeline(goal, pipeline ?? (workspaceReady ? undefined : "game"));
  console.log("📋 PIPELINE:", pipelineDef.name, `(${pipelineDef.type})`);

  console.log("🛠  STACK:", template.stack);
  console.log(`🗂  TEMPLATE: templates/${template.id}`);
  console.log(`🏠 WORKSPACE: ${workspaceDir}`);

  // DRY-RUN: report the plan, do NOT scaffold, do NOT run agents.
  if (dryRun) {
    console.log(
      workspaceReady
        ? "\n🧪 DRY-RUN: EXISTING workspace detected — would RESUME (skip template copy)."
        : "\n🧪 DRY-RUN: would scaffold workspace and run the pipeline."
    );
    const executor = new DryRunExecutor({ failTest, log: true });
    await runGoal(
      goal,
      baseDir,
      workspaceDir,
      {
        executor,
        maxFixIterations: 5,
        engine: goalEngine.kind,
        stack: template.stack,
        template: template.id,
        workspace: workspaceDir,
        pipelineType: pipelineDef.type,
        fromStep
      }
    );
    return;
  }

  // LIVE SETUP: copy embedded template into the isolated workspace.
  console.log("\n📦 SETTING UP PROJECT WORKSPACE ...");
  let setupResult;
  try {
    setupResult = await setup.copyTemplate(template, workspaceDir, { force });
  } catch (error) {
    console.error("\n❌ PROJECT SETUP FAILED (workspace preserved):");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  if (setupResult.resumed) {
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║   EXISTING WORKSPACE DETECTED        ║");
    console.log("╚══════════════════════════════════════╝");
    console.log(`   📁 ${workspaceDir}`);
    console.log("   ⏭️  SETUP: SKIPPED (already initialized)");
    console.log(
      `   🤖 AGENTS: ${
        setupResult.agentsDeployed.length
          ? `VERIFIED (${setupResult.agentsDeployed.join(", ")})`
          : "NONE DEPLOYED"
      }${
        setupResult.agentsFailed.length
          ? ` (failed: ${setupResult.agentsFailed.join(", ")})`
          : ""
      }`
    );
    console.log("   🚀 CONTINUING PIPELINE ...\n");
  } else {
    console.log(`   ✅ Template "${template.id}" rooted at ${workspaceDir}`);
    console.log(`   📄 Copied: ${setupResult.copied.length} files`);
    console.log(`   ⏭️  Skipped: ${setupResult.skipped.join(", ") || "none"}`);
    console.log(
      `   🤖 Agents deployed: ${
        setupResult.agentsDeployed.join(", ") || "none"
      }${
        setupResult.agentsFailed.length
          ? ` (failed: ${setupResult.agentsFailed.join(", ")})`
          : ""
      }`
    );
  }

  const verify = await setup.verifyWorkspace(workspaceDir, template);
  if (!verify.complete) {
    console.log("\n⚠️  Workspace setup incomplete — missing markers:");
    console.log(`   ${verify.missing.join(", ")}`);
  } else {
    console.log(
      "   ✅ Markers present: " +
        verify.found.join(", ")
    );
  }

  console.log("\n🚀 Starting pipeline ...\n");

  await runGoal(
    goal,
    baseDir,
    workspaceDir,
    {
      ...(dryRun ? { maxFixIterations: 5 } : {}),
      engine: goalEngine.kind,
      stack: template.stack,
      template: template.id,
      workspace: workspaceDir,
      pipelineType: pipelineDef.type,
      fromStep
    }
  );
}

main().catch(error => {
  console.error("\n❌ FACTORY ERROR:");
  console.error(error);
  process.exitCode = 1;
});
