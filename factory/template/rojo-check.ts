import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Static checks for a Rojo project that need no Roblox tooling:
 *   1. default.project.json parses and every "$path" exists;
 *   2. every `require(...)` in a .luau/.lua file resolves to a real module file
 *      through the Rojo mapping (game:GetService aliases, script.Parent chains
 *      and local aliases are followed).
 *
 * This complements — not replaces — `rojo build`, `selene` and `stylua`,
 * which the agents run on the developer's machine.
 */

export interface RojoIssue {
  file: string;
  line?: number;
  message: string;
}

interface Mount {
  instancePath: string[];
  fsPath: string;
}

const SCRIPT_SUFFIXES = [".server.luau", ".client.luau", ".server.lua", ".client.lua", ".luau", ".lua"];
const MODULE_SUFFIXES = [".luau", ".lua"];

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function collectMounts(node: Record<string, unknown>, instancePath: string[], root: string, out: Mount[]): void {
  const p = node["$path"];
  if (typeof p === "string") {
    out.push({ instancePath, fsPath: path.resolve(root, p) });
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || typeof child !== "object" || child === null) continue;
    collectMounts(child as Record<string, unknown>, [...instancePath, key], root, out);
  }
}

async function listScripts(dir: string): Promise<string[]> {
  const result: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...(await listScripts(full)));
    else if (SCRIPT_SUFFIXES.some((s) => e.name.endsWith(s))) result.push(full);
  }
  return result;
}

function instanceName(file: string): string {
  const base = path.basename(file);
  const suffix = SCRIPT_SUFFIXES.find((s) => base.endsWith(s)) ?? "";
  return base.slice(0, base.length - suffix.length);
}

/** Instance path of a script file, derived from the mount that contains it. */
function instancePathOf(file: string, mounts: Mount[]): string[] | null {
  for (const m of mounts) {
    const rel = path.relative(m.fsPath, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    const parts = rel.split(path.sep);
    const name = instanceName(parts.pop() as string);
    return name === "init" ? [...m.instancePath, ...parts] : [...m.instancePath, ...parts, name];
  }
  return null;
}

/** Map an instance path back to a module file on disk, if any. */
async function resolveModule(instancePath: string[], mounts: Mount[]): Promise<string | null> {
  for (const m of mounts) {
    const n = m.instancePath.length;
    if (instancePath.length < n || m.instancePath.some((seg, i) => seg !== instancePath[i])) continue;
    const rest = instancePath.slice(n);
    const base = path.join(m.fsPath, ...rest);
    for (const s of MODULE_SUFFIXES) {
      if (rest.length > 0 && (await exists(base + s))) return base + s;
      if (await exists(path.join(base, "init" + s))) return path.join(base, "init" + s);
    }
  }
  return null;
}

const SERVICE_ALIAS = /^local\s+(\w+)\s*=\s*game:GetService\(\s*"(\w+)"\s*\)/;
const PATH_ALIAS = /^local\s+(\w+)\s*=\s*((?:script|\w+)(?:\.\w+)*)\s*$/;
const REQUIRE = /require\(\s*([\w.]+)\s*\)/g;

function expand(expr: string, aliases: Map<string, string[]>, self: string[]): string[] | null {
  const [head, ...rest] = expr.split(".");
  let base: string[];
  if (head === "script") base = self;
  else if (aliases.has(head)) base = aliases.get(head) as string[];
  else return null;

  const out = [...base];
  for (const seg of rest) {
    if (seg === "Parent") {
      if (out.length === 0) return null;
      out.pop();
    } else {
      out.push(seg);
    }
  }
  return out;
}

export async function checkRojoProject(projectDir: string): Promise<RojoIssue[]> {
  const issues: RojoIssue[] = [];
  const projectFile = path.join(projectDir, "default.project.json");

  let project: { tree?: Record<string, unknown> };
  try {
    project = JSON.parse(await fs.readFile(projectFile, "utf8"));
  } catch (error) {
    return [{ file: projectFile, message: `Cannot read project file: ${(error as Error).message}` }];
  }
  if (!project.tree) {
    return [{ file: projectFile, message: 'Missing "tree"' }];
  }

  const mounts: Mount[] = [];
  collectMounts(project.tree, [], projectDir, mounts);
  for (const m of mounts) {
    if (!(await exists(m.fsPath))) {
      issues.push({ file: projectFile, message: `$path does not exist: ${path.relative(projectDir, m.fsPath)}` });
    }
  }

  for (const m of mounts) {
    for (const file of await listScripts(m.fsPath)) {
      const self = instancePathOf(file, mounts) ?? [];
      const aliases = new Map<string, string[]>();
      const lines = (await fs.readFile(file, "utf8")).split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("--")) continue;

        const svc = SERVICE_ALIAS.exec(line);
        if (svc) {
          aliases.set(svc[1], [svc[2]]);
          continue;
        }
        const alias = PATH_ALIAS.exec(line);
        if (alias) {
          const resolved = expand(alias[2], aliases, self);
          if (resolved) aliases.set(alias[1], resolved);
        }

        for (const match of line.matchAll(REQUIRE)) {
          const target = expand(match[1], aliases, self);
          const rel = path.relative(projectDir, file);
          if (!target) {
            issues.push({ file: rel, line: i + 1, message: `Cannot follow require(${match[1]})` });
          } else if (!(await resolveModule(target, mounts))) {
            issues.push({ file: rel, line: i + 1, message: `require(${match[1]}) → ${target.join(".")} not found` });
          }
        }
      }
    }
  }

  return issues;
}
