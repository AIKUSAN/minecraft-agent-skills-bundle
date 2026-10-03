// Shared QA helpers: connect, structured event log, safe quit. Deterministic; no model in the loop.
// Env: QA_HOST, QA_PORT (default 127.0.0.1:25565), QA_AUTH (offline|microsoft), QA_VERSION (optional), QA_NPCS, QA_OUT_DIR
const QAP = require('../paths');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');

function connect({ name, host = '127.0.0.1', port = 25565, tag = 'run' }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(QAP.dir('logs'), `${stamp}-${name}-${tag}.jsonl`);
  const out = fs.createWriteStream(file, { flags: 'a' });
  const t0 = Date.now();
  const log = (type, data) => out.write(JSON.stringify({ t: Date.now() - t0, type, ...data }) + '\n');
  host = process.env.QA_HOST || host; port = +(process.env.QA_PORT || port);
  const opts = { host, port, username: name, auth: process.env.QA_AUTH || 'offline', hideErrors: false };
  if (process.env.QA_VERSION) opts.version = process.env.QA_VERSION; // omit to let mineflayer detect the server version
  if (opts.auth === 'microsoft') { opts.profilesFolder = QAP.dir('auth-cache'); opts.onMsaCode = d => fs.writeFileSync(path.join(QAP.dir('logs'), 'msa-code.txt'), JSON.stringify({ code: d.user_code, url: d.verification_uri, expires_in: d.expires_in })); }
  const bot = mineflayer.createBot(opts);
  bot.qa = { log, file, t0 };
  bot.on('messagestr', (m, pos) => log('chat', { pos, text: m }));
  bot.on('spawn', () => log('spawn', { pos: bot.entity.position, gm: bot.game.gameMode }));
  bot.on('health', () => log('health', { hp: bot.health, food: bot.food }));
  bot.on('death', () => log('death', {}));
  bot.on('kicked', r => log('kicked', { reason: String(r) }));
  bot.on('error', e => log('error', { msg: String(e) }));
  bot.on('end', r => { log('end', { reason: String(r) }); out.end(); });
  bot.on('windowOpen', w => log('windowOpen', { title: JSON.stringify(w.title), type: w.type, slots: w.slots.filter(Boolean).map(s => ({ n: s.name, c: s.count, d: s.displayName })) }));
  bot.on('windowClose', () => log('windowClose', {}));
  bot.on('forcedMove', () => log('forcedMove', { pos: bot.entity.position }));
  const seenPk = new Set();
  bot._client.on('packet', (d, meta) => {
    if (/title|action_bar|subtitle|boss_bar|set_title/.test(meta.name)) log('pkt:' + meta.name, { d: JSON.stringify(d).slice(0, 400) });
    else if (!seenPk.has(meta.name) && /form|custom_payload|open_screen|open_window/.test(meta.name)) { seenPk.add(meta.name); log('pkt-first:' + meta.name, {}); }
  });
  return bot;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function inv(bot) { return bot.inventory.items().map(i => ({ n: i.name, c: i.count, d: i.displayName, slot: i.slot })); }
module.exports = { connect, sleep, inv };

// ---- navigation + NPC helpers ----
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
// NPC spawn points: { "Name": [x, y, z] }. Point QA_NPCS at your own file; see npcs.example.json.
const NPCS = (() => { const f = process.env.QA_NPCS || path.join(__dirname, 'npcs.example.json'); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return {}; } })();
function setupNav(bot) {
  bot.loadPlugin(pathfinder);   // attaches on login; movements are configured lazily in walkTo
}
async function walkTo(bot, x, y, z, range = 2, timeoutMs = 45000) {
  if (!bot._qaMv) { const mv = new Movements(bot); mv.canDig = false; mv.allowSprinting = true; bot.pathfinder.setMovements(mv); bot._qaMv = true; }
  const goal = new goals.GoalNear(x, y, z, range);
  const t = Date.now();
  bot.pathfinder.setGoal(goal);
  while (Date.now() - t < timeoutMs) {
    const d = bot.entity.position.distanceTo({ x, y: bot.entity.position.y, z });
    if (Math.hypot(bot.entity.position.x - x, bot.entity.position.z - z) <= range + 0.6) { bot.pathfinder.setGoal(null); return true; }
    await sleep(250);
  }
  bot.pathfinder.setGoal(null);
  return false;
}
// NPCs are packet-spawned fake players: match by proximity to the page-defined spawn point.
function findNpcEntity(bot, name) {
  const [x, y, z] = NPCS[name];
  let best = null, bd = 1e9;
  for (const e of Object.values(bot.entities)) {
    if (e === bot.entity || !e.position) continue;
    const d = Math.hypot(e.position.x - x, e.position.z - z) + Math.abs(e.position.y - y) * 0.5;
    if (d < bd) { bd = d; best = e; }
  }
  return bd < 3 ? best : null;
}
async function goToNpc(bot, name) {
  const [x, y, z] = NPCS[name];
  const ok = await walkTo(bot, x, y, z, 2.5);
  await sleep(600);
  return { ok, entity: findNpcEntity(bot, name) };
}
module.exports.setupNav = setupNav; module.exports.walkTo = walkTo; module.exports.goToNpc = goToNpc; module.exports.findNpcEntity = findNpcEntity; module.exports.NPCS = NPCS;

// Real vanilla clients send INTERACT_AT (hit offset) followed by INTERACT on a right-click.
const { Vec3 } = require('vec3');
async function rightClick(bot, entity, mode = 'both') {
  await bot.lookAt(entity.position.offset(0, 1.0, 0), true);
  const sneaking = bot.getControlState('sneak');
  const rel = new Vec3(0, 1.0, 0);
  if (mode === 'both' || mode === 'at') bot._client.write('use_entity', { target: entity.id, mouse: 2, x: rel.x, y: rel.y, z: rel.z, sneaking, hand: 0, location: rel });
  if (mode === 'both' || mode === 'plain') bot._client.write('use_entity', { target: entity.id, mouse: 0, sneaking, hand: 0, location: new Vec3(0, 0, 0) });
  bot.qa.log('rightClick', { mode, entityId: entity.id });
}
module.exports.rightClick = rightClick;
