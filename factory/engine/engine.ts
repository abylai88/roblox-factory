import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Roblox Factory supports exactly one engine: Roblox (Luau + Rojo).
 * Other engines are recognised only so we can explain clearly why they are
 * blocked, instead of silently scaffolding the wrong kind of project.
 */
export type EngineKind = "roblox" | "web" | "unity" | "unknown";

export interface EngineInfo {
  kind: EngineKind;
  stack?: string;
  supported: boolean;
  reason: string;
}

export const ROBLOX_STACK = "Roblox (Luau + Rojo + Selene + StyLua)";

const UNSUPPORTED_HINT =
  "Roblox Factory builds Roblox experiences only (Luau + Rojo). " +
  "Browser/Phaser games live in the original ai-factory repo.";

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function roblox(reason: string): EngineInfo {
  return { kind: "roblox", stack: ROBLOX_STACK, supported: true, reason };
}

const WEB_KEYWORDS = ["phaser", "html5", "browser game", "yandex games", "poki", "crazygames"];
const UNITY_KEYWORDS = ["unity", "gameobject", "c#", "csharp", "unreal", "godot"];

/**
 * Classify the target engine for a NEW game goal. The engine is decided from
 * the goal (and/or an explicit --engine override) BEFORE a workspace exists.
 * Anything that is not explicitly another engine is treated as Roblox.
 */
export function classifyGoal(goal: string, explicit?: string): EngineInfo {
  const g = (goal ?? "").toLowerCase();

  if (explicit) {
    const e = explicit.toLowerCase();
    if (e === "roblox" || e === "luau" || e === "rojo") {
      return roblox(`Explicit engine requested: ${explicit}`);
    }
    if (e === "web" || e === "html5" || e === "browser" || e === "phaser") {
      return { kind: "web", supported: false, reason: `Web engine requested. ${UNSUPPORTED_HINT}` };
    }
    if (e === "unity") {
      return { kind: "unity", supported: false, reason: `Unity requested. ${UNSUPPORTED_HINT}` };
    }
    return { kind: "unknown", supported: false, reason: `Unknown engine requested: ${explicit}` };
  }

  if (g.trim().length === 0) {
    return { kind: "unknown", supported: false, reason: "Empty goal — cannot plan a game." };
  }

  if (UNITY_KEYWORDS.some((k) => g.includes(k))) {
    return { kind: "unity", supported: false, reason: `Goal mentions another engine. ${UNSUPPORTED_HINT}` };
  }

  if (WEB_KEYWORDS.some((k) => g.includes(k))) {
    return { kind: "web", supported: false, reason: `Goal targets browser platforms. ${UNSUPPORTED_HINT}` };
  }

  return roblox("Default engine for Roblox Factory.");
}

/**
 * Detect the engine of an EXISTING project on disk (used when --project
 * points at an already-initialized workspace).
 */
export async function detectEngine(projectDir: string): Promise<EngineInfo> {
  if (await pathExists(path.join(projectDir, "default.project.json"))) {
    return roblox("Rojo project detected (default.project.json).");
  }

  let entries: string[] = [];
  try {
    entries = await fs.readdir(projectDir);
  } catch {
    return {
      kind: "unknown",
      supported: false,
      reason: `Project directory does not exist: ${projectDir}`
    };
  }

  if (entries.some((e) => e.endsWith(".project.json"))) {
    return roblox("Rojo project file detected.");
  }

  if (entries.some((e) => /\.rbxlx?$/i.test(e))) {
    return {
      kind: "roblox",
      stack: ROBLOX_STACK,
      supported: false,
      reason:
        "Only a binary/XML place file was found. Agents work on files, so convert it " +
        "to a Rojo project first (e.g. `rojo syncback`), then rerun."
    };
  }

  if (await pathExists(path.join(projectDir, "ProjectSettings/ProjectVersion.txt"))) {
    return { kind: "unity", supported: false, reason: `Unity project detected. ${UNSUPPORTED_HINT}` };
  }

  if (await pathExists(path.join(projectDir, "package.json"))) {
    return { kind: "web", supported: false, reason: `Node/web project detected. ${UNSUPPORTED_HINT}` };
  }

  return {
    kind: "unknown",
    supported: false,
    reason: `No recognizable project structure at ${projectDir}.`
  };
}
