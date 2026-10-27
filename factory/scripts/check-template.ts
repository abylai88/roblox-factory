#!/usr/bin/env tsx
/**
 * Static check of a Rojo project (default: the embedded roblox-starter template).
 * Usage: npm run check:template [-- <project-dir>]
 */
import path from "node:path";
import { checkRojoProject } from "../template/rojo-check.js";

const target = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, "../../templates/roblox-starter"));
const issues = await checkRojoProject(target);

if (issues.length === 0) {
  console.log(`✅ ${target}: Rojo mapping and all require() targets OK`);
} else {
  for (const i of issues) console.log(`❌ ${i.file}${i.line ? ":" + i.line : ""} — ${i.message}`);
  process.exitCode = 1;
}
