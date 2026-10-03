// ImageFrame wall builder bot (deterministic; Laya judges the log). Usage:
//   node if_build.js --host 127.0.0.1 --port 25571 --user QABotif1 --auth offline --tag rehearsal --mode rehearse
// mode=rehearse builds a throwaway wall (creative, op) and runs selection + create. mode=run reads walls.json.
const QAP = require('../../paths');
const mineflayer = require('mineflayer'); const fs = require('fs'); const path = require('path');
const a = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const host = a('host', '127.0.0.1'), port = +a('port', 25571), user = a('user', 'QABotif1'), auth = a('auth', 'offline'), tag = a('tag', 'if'), mode = a('mode', 'rehearse');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const file = path.join(QAP.dir('logs'), `${new Date().toISOString().replace(/[:.]/g, '-')}-${user}-${tag}.jsonl`);
const out = fs.createWriteStream(file, { flags: 'a' }); const t0 = Date.now();
const log = (type, d) => out.write(JSON.stringify({ t: Date.now() - t0, type, ...d }) + '\n');
const opts = { host, port, username: user, // for microsoft auth this is only the token-cache key
   version: '1.21.11', auth, hideErrors: false };
if (auth === 'microsoft') { opts.profilesFolder = QAP.dir('auth-cache'); opts.onMsaCode = d => { fs.writeFileSync(path.join(QAP.dir('logs'), 'msa-code.txt'), JSON.stringify({ code: d.user_code, url: d.verification_uri, expires_in: d.expires_in })); }; } // token cache only; device-code login, no passwords handled here
const bot = mineflayer.createBot(opts);
const chat = [];
bot.on('messagestr', m => { const s = String(m).replace(/\n+/g, ' ').trim(); if (s) { chat.push({ t: Date.now(), s }); log('chat', { text: s }); } });
bot.on('kicked', r => log('kicked', { reason: String(r) })); bot.on('error', e => log('error', { msg: String(e) }));
bot.on('end', r => { log('end', { reason: String(r) }); out.end(); });
async function cmd(c, wait = 600) { log('cmd', { c }); bot.chat(c); await sleep(wait); }
async function waitChat(re, ms = 20000, since = Date.now() - 50) { const t = Date.now(); while (Date.now() - t < ms) { const m = chat.find(x => x.t >= since && re.test(x.s)); if (m) return m.s; await sleep(150); } return null; }
async function ensureFly() {
  for (let i = 0; i < 25 && bot.game.gameMode !== 'creative'; i++) await sleep(200);
  try { bot.creative.startFlying(); bot.physics.gravity = 0; bot.entity.velocity.y = 0; } catch (e) { log('fly-error', { msg: String(e) }); }
}
const FV = { NORTH: [0, 0, -1], SOUTH: [0, 0, 1], EAST: [1, 0, 0], WEST: [-1, 0, 0] };
function frameAt(x, y, z) { return Object.values(bot.entities).find(e => /item_frame/.test(e.name || '') && Math.floor(e.position.x) === x && Math.floor(e.position.y) === y && Math.floor(e.position.z) === z); }
async function selectAndCreate(w) {
  // w: {name,url,x1,y1,z1,x2,y2,z2,standX,standY,standZ}
  const fv = FV[w.facing || 'SOUTH'];
  const near = (x, y, z) => ({ x: x + 0.5 + fv[0] * 3, y: y, z: z + 0.5 + fv[2] * 3 });
  async function goNear(x, y, z) { const p = near(x, y, z); await ensureFly(); await cmd(`/tp ${bot.username} ${p.x} ${p.y} ${p.z}`, 1200); for (let i = 0; i < 20 && bot.game.gameMode !== 'creative'; i++) await sleep(200);
    try { bot.creative.startFlying(); bot.physics.gravity = 0; bot.entity.velocity.y = 0; } catch (e) { log('fly-error', { msg: String(e) }); }
    await sleep(600); log('pos-after-tp', { pos: bot.entity.position, gm: bot.game.gameMode, target: p }); }
  await goNear(w.x1, w.y1, w.z1);
  const since = Date.now();
  await cmd('/imageframe select', 800);
  log('selection-start-reply', { reply: chat.filter(x => x.t >= since).map(x => x.s) });
  let f1 = frameAt(w.x1, w.y1, w.z1);
  for (let i = 0; i < 40 && !f1; i++) { await sleep(250); f1 = frameAt(w.x1, w.y1, w.z1); }
  let f2 = frameAt(w.x2, w.y2, w.z2);
  if (!f2) { log('f2-not-yet-visible', { note: 'corner 2 loads after the teleport to it' }); f2 = true; }
  log('frames-found', { f1: !!f1, f2: !!f2 });
  if (!f1 || !f2) return { ok: false, why: 'corner frame entity not found (chunk not loaded or no frame)' };
  async function click(f, label, re) {
    for (let i = 0; i < 4; i++) {
      const s0 = Date.now();
      try { await bot.lookAt(f.position, true); await sleep(300); await bot.activateEntity(f); } catch (e) { log('click-error', { label, msg: String(e) }); }
      const got = await waitChat(re, 2500, s0);
      log('click', { label, attempt: i, got, dist: bot.entity.position.distanceTo(f.position) });
      if (got) return true;
    }
    return false;
  }
  const c1 = await click(f1, 'corner1', /corner 1/i); await goNear(w.x2, w.y2, w.z2); f2 = frameAt(w.x2, w.y2, w.z2); for (let i = 0; i < 40 && !f2; i++) { await sleep(250); f2 = frameAt(w.x2, w.y2, w.z2); } if (!f2) { log('corner2-missing', {}); return { ok: false, why: 'corner 2 frame not visible' }; } const c2 = await click(f2, 'corner2', /corner 2|valid|selected|size|incorrect|invalid/i);
  log('corners', { c1, c2 });
  const sel = chat.filter(x => x.t >= since).map(x => x.s); log('selection-replies', { sel });
  const t1 = Date.now();
  await cmd(`/imageframe create ${w.name} ${w.url} selection nearest_color`, 500);
  const done = await waitChat(/has been created|error|unable|invalid|not enough|occupied|permission|failed|cannot|exist/i, 180000, t1);
  await sleep(2500);
  const replies = chat.filter(x => x.t >= t1).map(x => x.s); log('create-replies', { replies });
  return { ok: replies.some(s => /has been created/i.test(s)) && !replies.some(s => /error|unable|invalid|not enough|occupied|permission|failed|cannot/i.test(s)), replies };
}
bot.once('spawn', async () => {
  try {
    await sleep(8000); log('spawned', { pos: bot.entity.position, op: null });
    if (mode === 'select') {
      await cmd('/gamemode creative', 800);
      const r = await selectAndCreate({ name: a('name','rehearsal_judah2'), url: a('url'), x1: 0, y1: -50, z1: 11, x2: 2, y2: -60, z2: 11, facing: 'SOUTH' });
      log('result', r);
    }

    if (mode === 'run') {
      const rows = fs.readFileSync(a('plan'), 'utf8').trim().split(/\r?\n/); const hdr = rows.shift().split(',');
      const recs = rows.map(r => { const c = r.split(','); const o = {}; hdr.forEach((h, i) => o[h] = c[i]); return o; });
      const only = a('only') ? a('only').split(',').map(Number) : null; const base = a('urlbase');
      const prior = { pos: bot.entity.position.clone(), gm: bot.game.gameMode, name: bot.username }; log('prior-state', prior);
      fs.writeFileSync(path.join(QAP.dir('logs'), 'prior-state.json'), JSON.stringify({ name: prior.name, gm: prior.gm, pos: prior.pos }));
      fs.writeFileSync(path.join(QAP.dir('logs'), 'bot-ready.flag'), prior.name);
      for (let i = 0; i < 1200 && !fs.existsSync(path.join(QAP.dir('logs'), 'op-granted.flag')); i++) await sleep(500);
      if (!fs.existsSync(path.join(QAP.dir('logs'), 'op-granted.flag'))) throw new Error('no op flag');
      await cmd('/gamemode creative', 1200);
      const results = [];
      for (const r of recs) {
        const id = +r.legacyRecordId; if (only && !only.includes(id)) continue;
        const [x1, y1, z1] = r.corner1.split(' ').map(Number), [x2, y2, z2] = r.corner2.split(' ').map(Number);
        const res = await selectAndCreate({ name: r.imageFrameName, url: base + r.migrationAssetFile, x1, y1, z1, x2, y2, z2, facing: r.facing });
        log('record-result', { id, name: r.imageFrameName, ok: res.ok, replies: res.replies, why: res.why }); results.push({ id, ok: res.ok });
        if (!res.ok) { log('stop-on-failure', { id }); break; }
      }
      log('run-summary', { ok: results.filter(x => x.ok).length, total: results.length });
      await cmd(`/tp ${bot.username} ${prior.pos.x} ${prior.pos.y} ${prior.pos.z}`, 1500);
      await cmd(`/gamemode ${prior.gm}`, 1000);
    }
    if (mode === 'rehearse') {
      await cmd('/gamemode creative', 800);
      // 3 x 11 spruce wall at z=10 (x 0..2, y -60..-50); empty SOUTH frames on z=11
      await cmd('/fill 0 -60 10 2 -50 10 spruce_planks', 1500);
      for (let x = 0; x <= 2; x++) for (let y = -60; y <= -50; y++) { await cmd(`/summon item_frame ${x} ${y} 11 {Facing:3b}`, 120); }
      await sleep(1500);
      const r = await selectAndCreate({ name: 'rehearsal_judah', url: a('url'), x1: 0, y1: -50, z1: 11, x2: 2, y2: -60, z2: 11, facing: 'SOUTH' });
      log('result', r);
    }
  } catch (e) { log('fatal', { msg: String(e && e.stack || e) }); }
  await sleep(1500); bot.quit(); setTimeout(() => process.exit(0), 1500);
});
setTimeout(() => { log('timeout', {}); process.exit(2); }, 600000);
