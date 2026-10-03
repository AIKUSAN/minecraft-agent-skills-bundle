#!/usr/bin/env node
// Verifies that every skill is reachable through the router skill, the subagent roster
// and the role routing in the skills index, and that agent mirrors match the canonical copy.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const SKILLS = path.join(ROOT, ".agents", "skills");
const AGENTS = path.join(ROOT, ".agents", "agents");
const ROUTER = "minecraft-task-router";
const AGENT_MIRRORS = [".claude/agents", "plugins/minecraft-codex-skills/agents"];
const FORBIDDEN_AGENT_FIELDS = ["permissionMode", "hooks", "mcpServers", "initialPrompt"];

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);
const read = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const hash = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const skillNames = fs.readdirSync(SKILLS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(SKILLS, d.name, "SKILL.md")))
  .map((d) => d.name)
  .sort();
const routed = skillNames.filter((n) => n !== ROUTER);

// 1. Router skill lists every skill and every agent.
const routerFile = path.join(SKILLS, ROUTER, "SKILL.md");
if (!fs.existsSync(routerFile)) {
  fail(`.agents/skills/${ROUTER}`, "router skill is missing");
}
const routerText = fs.existsSync(routerFile) ? read(routerFile) : "";
for (const n of routed) {
  if (!routerText.includes(`\`${n}\``)) fail(`.agents/skills/${ROUTER}/SKILL.md`, `does not route to \`${n}\``);
}

// 2. Agent roster: valid frontmatter, existing skills, each skill owned by exactly one agent.
const agentFiles = fs.existsSync(AGENTS)
  ? fs.readdirSync(AGENTS).filter((f) => f.endsWith(".md")).sort()
  : [];
if (agentFiles.length === 0) fail(".agents/agents", "no subagent definitions found");

const owner = new Map();
for (const f of agentFiles) {
  const file = `.agents/agents/${f}`;
  const text = read(path.join(AGENTS, f));
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) { fail(file, "missing YAML frontmatter"); continue; }
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  if (!name) fail(file, "frontmatter missing `name`");
  else if (name !== f.replace(/\.md$/, "")) fail(file, `name \`${name}\` does not match file name`);
  if (!/^description:\s*\S/m.test(fm[1])) fail(file, "frontmatter missing `description`");
  for (const field of FORBIDDEN_AGENT_FIELDS) {
    if (new RegExp(`^${field}:`, "m").test(fm[1])) fail(file, `field \`${field}\` is ignored in plugin agents`);
  }
  if (name && !routerText.includes(`\`${name}\``)) fail(`.agents/skills/${ROUTER}/SKILL.md`, `does not list subagent \`${name}\``);

  const listed = [...text.matchAll(/^- `(minecraft-[a-z-]+)`$/gm)].map((m) => m[1]);
  if (listed.length === 0) fail(file, "lists no skills");
  for (const s of listed) {
    if (!skillNames.includes(s)) fail(file, `references unknown skill \`${s}\``);
    else if (owner.has(s)) fail(file, `skill \`${s}\` is also owned by ${owner.get(s)}`);
    else owner.set(s, name);
  }
  if (/Do not start other subagents/.test(text) === false) fail(file, "must forbid nested subagents");
}
for (const n of routed) {
  if (!owner.has(n)) fail(".agents/agents", `skill \`${n}\` is not owned by any subagent`);
}

// 3. Role routing in the skills index covers every skill.
const indexFile = path.join(SKILLS, "README.md");
const role = read(indexFile).match(/## Role Routing([\s\S]*?)(\n## |\s*$)/)?.[1] ?? "";
if (!role) fail(".agents/skills/README.md", "missing `## Role Routing` section");
for (const n of routed) {
  if (!role.includes(`\`${n}\``)) fail(".agents/skills/README.md", `Role Routing does not mention \`${n}\``);
}

// 4. Agent mirrors match the canonical copy.
for (const m of AGENT_MIRRORS) {
  const dir = path.join(ROOT, m);
  if (!fs.existsSync(dir)) { fail(m, "agent mirror directory is missing"); continue; }
  const mirrorFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  for (const f of agentFiles) {
    if (!mirrorFiles.includes(f)) fail(`${m}/${f}`, "missing from mirror");
    else if (hash(path.join(AGENTS, f)) !== hash(path.join(dir, f))) fail(`${m}/${f}`, "content drift from .agents/agents");
  }
  for (const f of mirrorFiles) if (!agentFiles.includes(f)) fail(`${m}/${f}`, "not in .agents/agents");
}

if (errors.length > 0) {
  console.error("Routing check failed:\n");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Routing check passed: ${routed.length} skills, ${agentFiles.length} subagents, ${AGENT_MIRRORS.length} mirrors`);
