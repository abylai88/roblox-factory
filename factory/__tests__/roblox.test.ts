import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyGoal, detectEngine } from "../engine/engine.js";
import { selectPipeline } from "../pipeline/pipeline.js";
import { TemplateManager, goalSlug } from "../setup/project-setup.js";
import { checkRojoProject } from "../template/rojo-check.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const TEMPLATE_DIR = path.join(REPO_ROOT, "templates", "roblox-starter");

describe("engine classification", () => {
  it("defaults any game goal to Roblox", () => {
    const e = classifyGoal("Pizza Tycoon с соседями");
    expect(e.kind).toBe("roblox");
    expect(e.supported).toBe(true);
  });

  it("accepts explicit --engine roblox", () => {
    expect(classifyGoal("anything", "roblox").supported).toBe(true);
  });

  it("blocks web and unity goals with a clear reason", () => {
    const web = classifyGoal("Phaser puzzle for Yandex Games");
    expect(web.kind).toBe("web");
    expect(web.supported).toBe(false);
    expect(classifyGoal("Unity runner").supported).toBe(false);
    expect(classifyGoal("x", "web").supported).toBe(false);
  });

  it("rejects an empty goal", () => {
    expect(classifyGoal("   ").supported).toBe(false);
  });

  it("detects the starter template as a Rojo project", async () => {
    const e = await detectEngine(TEMPLATE_DIR);
    expect(e.kind).toBe("roblox");
    expect(e.supported).toBe(true);
  });

  it("refuses a folder that only has a place file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rf-"));
    await fs.writeFile(path.join(dir, "game.rbxl"), "");
    const e = await detectEngine(dir);
    expect(e.supported).toBe(false);
    expect(e.reason).toContain("syncback");
  });
});

describe("pipeline selection", () => {
  it("explicit type always wins (runGoal reproduces the caller's choice)", () => {
    expect(selectPipeline("Исправить баг", "game").type).toBe("game");
    expect(selectPipeline("Создать новую игру", "update").type).toBe("update");
    expect(selectPipeline("anything", "engineering").type).toBe("engineering");
  });

  it("new game wording → full game pipeline", () => {
    expect(selectPipeline("Создать новую игру тайкун про пиццу").type).toBe("game");
    expect(selectPipeline("make a new obby game").type).toBe("game");
  });

  it("bug wording → engineering pipeline", () => {
    expect(selectPipeline("Исправить ошибку сохранения").type).toBe("engineering");
    expect(selectPipeline("fix DataStore crash").type).toBe("engineering");
  });

  it("feature wording on a live game → update pipeline", () => {
    expect(selectPipeline("Добавить хэллоуин-ивент").type).toBe("update");
  });

  it("game pipeline ends with build and release, and builds with rojo", () => {
    const p = selectPipeline("x", "game");
    const ids = p.steps.map((s) => s.id);
    expect(ids.slice(-2)).toEqual(["build", "release"]);
    expect(p.steps.find((s) => s.id === "implementation")?.description).toContain("rojo build");
  });

  it("no pipeline step mentions Phaser, webpack or Yandex", () => {
    for (const type of ["game", "update", "engineering"] as const) {
      for (const step of selectPipeline("x", type).steps) {
        expect(step.description).not.toMatch(/phaser|webpack|yandex/i);
      }
    }
  });
});

describe("roblox-starter template", () => {
  it("is found by the TemplateManager", async () => {
    const t = await new TemplateManager(REPO_ROOT).templateFor(classifyGoal("game"));
    expect(t?.id).toBe("roblox-starter");
    expect(t?.rootMarkers).toContain("default.project.json");
  });

  it("has every root marker on disk", async () => {
    const manager = new TemplateManager(REPO_ROOT);
    const t = await manager.templateFor(classifyGoal("game"));
    const v = await manager.verifyWorkspace(TEMPLATE_DIR, t!);
    expect(v.missing).toEqual([]);
  });

  it("passes the static Rojo check (all $path and require targets exist)", async () => {
    const issues = await checkRojoProject(TEMPLATE_DIR);
    expect(issues).toEqual([]);
  });

  it("only one script sets ProcessReceipt", async () => {
    const files: string[] = [];
    async function walk(dir: string) {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else if (e.name.endsWith(".luau")) files.push(full);
      }
    }
    await walk(path.join(TEMPLATE_DIR, "src"));
    const setters = [];
    for (const f of files) {
      if ((await fs.readFile(f, "utf8")).includes(".ProcessReceipt =")) setters.push(f);
    }
    expect(setters).toHaveLength(1);
  });
});

describe("static Rojo check catches real mistakes", () => {
  it("reports a require that points to a missing module", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rf-"));
    await fs.mkdir(path.join(dir, "src/shared"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "default.project.json"),
      JSON.stringify({ name: "t", tree: { $className: "DataModel", ReplicatedStorage: { Shared: { $path: "src/shared" } } } })
    );
    await fs.writeFile(
      path.join(dir, "src/shared/A.luau"),
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal B = require(ReplicatedStorage.Shared.B)\nreturn {}\n'
    );
    const issues = await checkRojoProject(dir);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("ReplicatedStorage.Shared.B");
  });

  it("reports a $path that does not exist", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rf-"));
    await fs.writeFile(
      path.join(dir, "default.project.json"),
      JSON.stringify({ name: "t", tree: { $className: "DataModel", ServerScriptService: { Server: { $path: "src/server" } } } })
    );
    const issues = await checkRojoProject(dir);
    expect(issues.some((i) => i.message.includes("src/server"))).toBe(true);
  });
});

describe("workspace slug", () => {
  it("keeps Cyrillic goals readable instead of collapsing to 'project'", () => {
    expect(goalSlug("Пицца Тайкун!")).toBe("пицца-тайкун");
  });

  it("caps very long goals", () => {
    expect(goalSlug("a ".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});
