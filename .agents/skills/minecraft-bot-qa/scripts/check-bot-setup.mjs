#!/usr/bin/env node
// Setup check and offline self-test for the bot QA tools. No dependencies of its own.
//   node check-bot-setup.mjs              check Node, packages, script syntax, relative requires, Python and Laya
//   node check-bot-setup.mjs --static     only syntax and relative requires (no npm install or Python needed; used by CI)
//   node check-bot-setup.mjs --selftest   also run the Bedrock bot against the bundled mock server and judge the result
//   node check-bot-setup.mjs --selftest --with-laya   include the Laya second opinion (downloads the model on first run)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const STATIC = args.has("--static");
let failures = 0;
const pass = (m) => console.log(`[PASS] ${m}`);
const warn = (m) => console.log(`[WARN] ${m}`);
const fail = (m) => { failures += 1; console.log(`[FAIL] ${m}`); };

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// 1. Node version
const major = Number(process.versions.node.split(".")[0]);
if (major < 20) fail(`Node ${process.versions.node} is too old; install Node 20 or newer`);
else if (major < 24) warn(`Node ${process.versions.node}: the Java bots work, but the Bedrock bots need Node 24 or newer (bedrock-protocol 3.60)`);
else pass(`Node ${process.versions.node}`);

// 2. npm packages
if (!STATIC) {
const pkg = JSON.parse(fs.readFileSync(path.join(HERE, "package.json"), "utf8"));
const missing = [];
for (const name of Object.keys(pkg.dependencies)) {
  let found = false;
  for (let dir = HERE; !found; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "node_modules", name, "package.json"))) found = true;
    if (path.dirname(dir) === dir) break;
  }
  if (!found) missing.push(name);
}
missing.length === 0 ? pass(`npm packages installed (${Object.keys(pkg.dependencies).length})`) : fail(`missing npm packages: ${missing.join(", ")}. Run: npm install (inside this scripts folder)`);
}

// 3. syntax of every script
const jsFiles = walk(HERE).filter((f) => f.endsWith(".js"));
let syntaxBad = 0;
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) { syntaxBad += 1; fail(`syntax error in ${path.relative(HERE, f)}: ${(r.stderr || "").split("\n")[0]}`); }
}
if (syntaxBad === 0) pass(`${jsFiles.length} scripts parse cleanly`);

// 4. relative require() targets exist
let badRequire = 0;
for (const f of jsFiles) {
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(/require\('(\.{1,2}\/[^']+)'\)/g)) {
    const base = path.resolve(path.dirname(f), m[1]);
    if (!["", ".js", ".json"].some((ext) => fs.existsSync(base + ext))) { badRequire += 1; fail(`${path.relative(HERE, f)} requires missing file ${m[1]}`); }
  }
}
if (badRequire === 0) pass("all relative requires resolve");

// 5. Python and Laya (optional)
function findPython() {
  for (const cmd of ["python3", "python", "py"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return cmd;
  }
  return null;
}
const py = STATIC ? null : findPython();
if (STATIC) {
  // static mode: no Python or Laya checks
} else if (!py) {
  warn("Python 3 not found. The judges need it (python.org). Bots still run without it.");
} else {
  pass(`Python available (${py})`);
  const r = spawnSync(py, ["-c", "import laya"], { encoding: "utf8" });
  r.status === 0 ? pass("Laya installed (second opinion enabled)") : warn("Laya not installed. Judges run deterministic checks only. Optional: pip install -r requirements.txt");
}

// 6. Offline self-test: bot -> mock server -> judge
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on("error", reject);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function run(cmd, cmdArgs, env, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn(cmd, cmdArgs, { cwd: HERE, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { out += d; });
    const t = setTimeout(() => p.kill(), timeoutMs);
    p.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
  });
}

async function scenario(label, mockEnv, expectJudgeExit, expectText, py, outDir, withLaya) {
  const port = await freePort();
  const mock = spawn(process.execPath, [path.join(HERE, "bedrock", "bedrock_mock_server.js")], {
    cwd: HERE, env: { ...process.env, MOCK_PORT: String(port), QA_OUT_DIR: outDir, ...mockEnv }, stdio: ["ignore", "pipe", "pipe"],
  });
  let mockLog = "";
  mock.stdout.on("data", (d) => { mockLog += d; });
  mock.stderr.on("data", (d) => { mockLog += d; });
  await sleep(2500);
  const tag = label.replace(/\W+/g, "-");
  const bot = await run(process.execPath, [path.join(HERE, "bedrock", "bedrock_gui.js"), "SelfTestBot", tag], {
    BEDROCK_HOST: "127.0.0.1", BEDROCK_PORT: String(port), BEDROCK_AUTH: "offline", QA_OUT_DIR: outDir,
    BEDROCK_WAIT: "join", BEDROCK_SETTLE_MS: "500", BEDROCK_PANEL_GAP_MS: "250", BEDROCK_PRESS_WAIT_MS: "1500",
  }, 180000);
  mock.kill();
  const resultFile = path.join(outDir, "results", `bedrock-${tag}.json`);
  if (!fs.existsSync(resultFile)) { fail(`selftest "${label}": bot wrote no result file (exit ${bot.code}). Mock said: ${mockLog.split("\n").slice(-3).join(" | ")}`); return; }
  if (!py) { warn(`selftest "${label}": bot finished; skipped judge (no Python)`); return; }
  const judgeArgs = [path.join(HERE, "judges", "judge_bedrock.py"), resultFile];
  if (!withLaya) judgeArgs.push("--no-laya");
  const judge = await run(py, judgeArgs, {}, 900000);
  judge.code === expectJudgeExit && (!expectText || judge.out.includes(expectText))
    ? pass(`selftest "${label}": judge exit ${judge.code} as expected`)
    : fail(`selftest "${label}": judge exit ${judge.code}, expected ${expectJudgeExit}${expectText ? ` with "${expectText}"` : ""}\n${judge.out}`);
}

if (args.has("--selftest")) {
  if (failures > 0) {
    console.log("\nFix the failures above before running the self-test.");
  } else {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "bot-qa-selftest-"));
    console.log(`\nSelf-test output: ${outDir}`);
    await scenario("healthy menu", {}, 0, "", py, outDir, args.has("--with-laya"));
    await scenario("broken placeholder", { MOCK_BREAK: "1" }, 1, "unresolved %placeholder%", py, outDir, args.has("--with-laya"));
  }
}

console.log(failures === 0 ? "\nSetup OK" : `\n${failures} problem(s) found`);
process.exit(failures === 0 ? 0 : 1);
