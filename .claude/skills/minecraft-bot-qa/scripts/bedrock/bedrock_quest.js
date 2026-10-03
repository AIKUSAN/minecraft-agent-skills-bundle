// Bedrock quest bot: thin protocol client + local control API + live timeline dashboard.
// Env: BEDROCK_HOST/PORT/AUTH (see bedrock_lib.js), BOT_NAME, CTRL_PORT (default 8777)
// Control: GET /do?c=<verb args | JSON | JSON array>, GET /state, GET /events (SSE), GET / (dashboard)
const QAP = require('../paths');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { connectBedrock, sleep, runCommand, answerForm, closeForm, strip } = require('./bedrock_lib');

const NAME = process.env.BOT_NAME || 'QuestBot';
const PORT = +(process.env.CTRL_PORT || 8777);
const b = connectBedrock({ name: NAME, tag: 'quest' });
const c = b.client;
const J = (o, n) => JSON.stringify(o, (k, v) => typeof v === 'bigint' ? Number(v) : v, n);

const S = { connected: false, spawned: false, me: { rid: null, uid: null, pos: null }, ents: new Map(), uid2rid: new Map(), items: {}, inv: [], hotbar: 0, feed: [], pk: {}, answered: new Set(), lastForm: null };
const clients = new Set();
let seq = 0;
function emit(type, data) {
  const ev = { n: ++seq, t: Date.now() - b.t0, type, ...data };
  S.feed.push(ev); if (S.feed.length > 1500) S.feed.shift();
  b.log('q-' + type, data);
  const line = 'data: ' + J(ev) + '\n\n';
  for (const r of clients) { try { r.write(line); } catch (e) {} }
  return ev;
}
const num = v => (v == null ? null : Number(v));
const vec = p => p && typeof p.x === 'number' ? { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) } : null;
const itemName = it => it && it.network_id ? (S.items[it.network_id] || ('id' + it.network_id)) : null;
const invView = () => S.inv.map((it, i) => it && it.network_id ? { slot: i, name: itemName(it), count: it.count } : null).filter(Boolean);
const dist = p => { const m = S.me.pos; return m && p ? +Math.hypot(m.x - p.x, m.y - p.y, m.z - p.z).toFixed(2) : null; };

c.on('packet', (d) => { const n = d && d.data && d.data.name; if (n) S.pk[n] = (S.pk[n] || 0) + 1; });
c.on('join', () => { S.connected = true; emit('join', {}); });
c.on('spawn', () => { S.spawned = true; emit('spawn', {}); });
c.on('start_game', p => {
  S.me.rid = num(p.runtime_entity_id); S.me.uid = num(p.entity_id); S.me.pos = vec(p.player_position);
  for (const s of (p.itemstates || [])) S.items[s.runtime_id] = s.name;
  emit('start_game', { rid: S.me.rid, pos: S.me.pos, gamemode: p.player_gamemode, dim: p.dimension, items: Object.keys(S.items).length });
});
c.on('add_player', p => {
  const e = { kind: 'player', name: strip(p.username), pos: vec(p.position), rid: num(p.runtime_id), uid: num(p.unique_id) };
  S.ents.set(e.rid, e); S.uid2rid.set(e.uid, e.rid); emit('add_player', { name: e.name, rid: e.rid, pos: e.pos });
});
c.on('add_entity', p => {
  let name = null; for (const m of (p.metadata || [])) if (m.key === 'name' || m.key === 'nametag') name = strip(m.value);
  const e = { kind: 'entity', type: p.entity_type, name, pos: vec(p.position), rid: num(p.runtime_id), uid: num(p.unique_id) };
  S.ents.set(e.rid, e); S.uid2rid.set(e.uid, e.rid); emit('add_entity', { type: e.type, name, rid: e.rid, pos: e.pos });
});
c.on('set_entity_data', p => {
  const e = S.ents.get(num(p.runtime_entity_id)); if (!e) return;
  for (const m of (p.metadata || [])) if (m.key === 'name' || m.key === 'nametag') { e.name = strip(m.value); }
});
c.on('remove_entity', p => { const rid = S.uid2rid.get(num(p.entity_id_self)); if (rid != null) { S.ents.delete(rid); } });
c.on('move_entity', p => { const e = S.ents.get(num(p.runtime_entity_id)); const pos = vec(p.position || p.pos); if (e && pos) e.pos = pos; });
c.on('move_player', p => {
  const rid = num(p.runtime_id), pos = vec(p.position);
  if (rid === S.me.rid) { S.me.pos = pos; emit('me_move', { pos, mode: p.mode }); } else { const e = S.ents.get(rid); if (e && pos) e.pos = pos; }
});
c.on('inventory_content', p => { if (p.window_id === 'inventory' || p.window_id === 0) { S.inv = p.input || []; emit('inventory', { items: invView() }); } });
c.on('inventory_slot', p => { if (p.window_id === 'inventory' || p.window_id === 0) { S.inv[p.slot] = p.item; emit('slot', { slot: p.slot, name: itemName(p.item), count: p.item && p.item.count }); } });
c.on('text', p => { const m = p.message == null ? '' : p.message; let t = strip(m); if (p.parameters && p.parameters.length) t += ' ' + p.parameters.map(strip).join(' '); if (t) emit('chat', { ttype: p.type, text: t }); });
c.on('set_title', p => emit('title', { ttype: p.type, text: strip(p.text) }));
c.on('toast_request', p => emit('toast', { title: strip(p.title), message: strip(p.message) }));
c.on('modal_form_request', p => {
  let data = null; try { data = JSON.parse(p.data); } catch (e) {}
  const f = { id: p.form_id, ftype: data && data.type, title: strip(data && data.title), content: strip(data && (data.content || '')), buttons: data && data.buttons ? data.buttons.map(x => strip(x.text)) : [], b1: data && data.button1, b2: data && data.button2 };
  S.lastForm = f; emit('form', f);
});
c.on('disconnect', p => { S.connected = false; emit('disconnect', { reason: J(p).slice(0, 200) }); });
c.on('close', () => { S.connected = false; emit('close', {}); });
c.on('error', e => emit('error', { msg: String(e && e.message || e).slice(0, 200) }));

// ---- actions ----
const AIR = { network_id: 0, count: 0, metadata: 0, has_stack_id: false, block_runtime_id: 0, extra: { has_nbt: 'false', can_place_on: [], can_destroy: [] } };
function held(slot) {
  const it = S.inv[slot == null ? S.hotbar : slot];
  if (!it || !it.network_id) return AIR;
  const m = S.itemMode == null ? 2 : S.itemMode; if (m === 0) return it;
  const o = { ...it }; o.has_stack_id = m === 3 ? true : false; if (m === 3) o.stack_id = -1; else delete o.stack_id; if (m >= 2) o.extra = { has_nbt: 'false', can_place_on: [], can_destroy: [] }; return o;
}
const P3 = () => S.me.pos || { x: 0, y: 0, z: 0 };
function findEnt(q) {
  if (q == null) return null;
  if (/^\d+$/.test(String(q)) && S.ents.has(+q)) return S.ents.get(+q);
  const s = String(q).toLowerCase(); let best = null;
  for (const e of S.ents.values()) if (e.name && e.name.toLowerCase().includes(s) && (!best || (dist(e.pos) || 1e9) < (dist(best.pos) || 1e9))) best = e;
  return best;
}
const acts = {
  async sleep(a) { await sleep(+a.ms || +a[0] || 1000); return { slept: true }; },
  async state() { return state(); },
  async fly(a) { S.pendingFlags = ['start_flying']; return { flying: true }; },
  async flags(a) { S.pendingFlags = (a.t || String(a.f || '')).split(',').filter(Boolean); return { flags: S.pendingFlags }; },
  async itemmode(a) { S.itemMode = +(a.n != null ? a.n : a[0]); return { itemMode: S.itemMode }; },
  async raw(a) { return J(S.inv[+(a.n != null ? a.n : a[0]) || 0]); },
  async nearby(a) {
    const max = +(a.r || a[0] || 40);
    return [...S.ents.values()].filter(e => e.pos).map(e => ({ rid: e.rid, kind: e.kind, type: e.type, name: e.name, pos: e.pos, d: dist(e.pos) })).filter(e => e.d != null && e.d <= max).sort((x, y) => x.d - y.d).slice(0, 40);
  },
  async hotbar(a) {
    const n = +(a.n != null ? a.n : a[0]);
    c.write('mob_equipment', { runtime_entity_id: BigInt(S.me.rid), item: held(n), slot: n, selected_slot: n, window_id: 'inventory' });
    S.hotbar = n; emit('act', { a: 'hotbar', n, item: itemName(S.inv[n]) }); return { hotbar: n, item: itemName(S.inv[n]) };
  },
  async click(a) {
    const e = findEnt(a.q != null ? a.q : a[0]); if (!e) return { error: 'no entity match', q: a.q || a[0] };
    if (a.hb != null) await acts.hotbar({ n: a.hb });
    const d = dist(e.pos);
    c.write('inventory_transaction', { transaction: { legacy: { legacy_request_id: 0 }, transaction_type: 'item_use_on_entity', actions: [], transaction_data: { entity_runtime_id: BigInt(e.rid), action_type: 'interact', hotbar_slot: S.hotbar, held_item: held(), player_pos: P3(), click_pos: { x: 0, y: 1, z: 0 } } } });
    emit('act', { a: 'click', ent: e.name || e.type, rid: e.rid, dist: d }); return { clicked: e.name || e.type, rid: e.rid, dist: d };
  },
  async block(a) {
    const x = Math.floor(+a.x), y = Math.floor(+a.y), z = Math.floor(+a.z), face = +(a.face != null ? a.face : 1);
    const cp = { x: +(a.cx != null ? a.cx : 0.5), y: +(a.cy != null ? a.cy : 0.5), z: +(a.cz != null ? a.cz : 0.5) };
    if (a.hb != null) await acts.hotbar({ n: a.hb });
    c.write('inventory_transaction', { transaction: { legacy: { legacy_request_id: 0 }, transaction_type: 'item_use', actions: [], transaction_data: { action_type: 'click_block', trigger_type: 'player_input', block_position: { x, y, z }, face, hotbar_slot: S.hotbar, hand: 'main_hand', held_item: held(), player_pos: P3(), click_pos: cp, block_runtime_id: 0, client_prediction: 'success', client_cooldown_state: 'off' } } });
    emit('act', { a: 'block', x, y, z, face, item: itemName(S.inv[S.hotbar]) }); return { block: [x, y, z], face, item: itemName(S.inv[S.hotbar]) };
  },
  async air(a) {
    if (a.hb != null) await acts.hotbar({ n: a.hb });
    c.write('inventory_transaction', { transaction: { legacy: { legacy_request_id: 0 }, transaction_type: 'item_use', actions: [], transaction_data: { action_type: 'click_air', trigger_type: 'player_input', block_position: { x: 0, y: 0, z: 0 }, face: 255, hotbar_slot: S.hotbar, hand: 'main_hand', held_item: held(), player_pos: P3(), click_pos: { x: 0, y: 0, z: 0 }, block_runtime_id: 0, client_prediction: 'success', client_cooldown_state: 'off' } } });
    emit('act', { a: 'air', item: itemName(S.inv[S.hotbar]) }); return { air: true };
  },
  async form(a) {
    const f = S.lastForm; if (!f) return { error: 'no form' };
    const idx = a.i != null ? +a.i : +a[0];
    if (a.close || a[0] === 'close') { closeForm(b, { id: f.id }); emit('act', { a: 'form-close', id: f.id }); return { closed: f.id }; }
    answerForm(b, { id: f.id, data: { type: f.ftype } }, idx);
    emit('act', { a: 'form-answer', id: f.id, idx, label: f.buttons[idx] || (f.ftype === 'modal' ? (idx === 0 ? f.b1 : f.b2) : null) }); return { answered: f.id, idx };
  },
  async cmd(a) { const t = a.t || ''; runCommand(b, t.replace(/^\//, '')); emit('act', { a: 'cmd', t }); return { cmd: t }; },
  async say(a) {
    const m = a.t || (Array.isArray(a) ? a.join(' ') : '');
    c.write('text', { type: 'chat', needs_translation: false, source_name: c.username || NAME, xuid: '', platform_chat_id: '', filtered_message: '', message: m });
    emit('act', { a: 'say', m }); return { said: m };
  },
  async book(a) {
    const slot = +(a.slot != null ? a.slot : S.hotbar), pages = a.pages || [a.text || 'Amen'];
    for (let i = 0; i < pages.length; i++) c.write('book_edit', { inventory_slot: slot, type: i === 0 ? 'replace_page' : 'add_page', page_number: i, text: pages[i], photo_name: '' });
    if (a.title) c.write('book_edit', { inventory_slot: slot, type: 'sign', title: a.title, author: a.author || NAME, xuid: '' });
    emit('act', { a: 'book', slot, pages: pages.length, title: a.title }); return { book: slot };
  },
  async since(a) { const n = +(a.n != null ? a.n : a[0]) || 0; return S.feed.filter(e => e.n > n && e.type !== 'me_move'); },
};
require('./bedrock_quest_ext')(c, S, acts, emit, J, itemName, held);
function state() {
  return { connected: S.connected, spawned: S.spawned, pos: S.me.pos, hotbar: S.hotbar, heldItem: itemName(S.inv[S.hotbar]), inv: invView(), form: S.lastForm, ents: S.ents.size, pk: S.pk, lastSeq: seq };
}
function parseCmd(raw) {
  raw = String(raw || '').trim();
  if (raw[0] === '[' || raw[0] === '{') { const o = JSON.parse(raw); return Array.isArray(o) ? o : [o]; }
  const parts = raw.split(/\s+/); const verb = parts.shift(); const a = parts.slice(); a.forEach((p, i) => { const m = /^(\w+)=(.*)$/.exec(p); if (m) a[m[1]] = m[2]; });
  if (verb === 'cmd' || verb === 'say') a.t = parts.join(' ');
  return [{ c: verb, ...a, __a: a }];
}
async function runSteps(steps) {
  const res = []; const start = seq;
  for (const s of steps) {
    const verb = s.c; const fn = acts[verb]; const a = s.__a || s;
    if (!fn) { res.push({ c: verb, error: 'unknown verb' }); continue; }
    try { res.push({ c: verb, r: await fn(a) }); } catch (e) { res.push({ c: verb, error: String(e && e.message || e).slice(0, 300) }); emit('error', { msg: 'act ' + verb + ': ' + String(e && e.message || e).slice(0, 200) }); }
  }
  return { results: res, events: S.feed.filter(e => e.n > start && e.type !== 'me_move' && e.type !== 'act') };
}

// ---- http ----
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const send = (code, body, ct = 'application/json') => { res.writeHead(code, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' }); res.end(typeof body === 'string' ? body : J(body, 1)); };
  try {
    if (u.pathname === '/') return send(200, fs.readFileSync(path.join(__dirname, 'quest_dashboard.html'), 'utf8'), 'text/html; charset=utf-8');
    if (u.pathname === '/state') return send(200, state());
    if (u.pathname === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      for (const e of S.feed.slice(-400)) res.write('data: ' + J(e) + '\n\n');
      clients.add(res); req.on('close', () => clients.delete(res)); return;
    }
    if (u.pathname === '/do') return send(200, await runSteps(parseCmd(u.searchParams.get('c'))));
    send(404, { error: 'not found' });
  } catch (e) { send(500, { error: String(e && e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => { console.log('quest bot control on http://127.0.0.1:' + PORT); fs.writeFileSync(path.join(QAP.dir('logs'), 'quest-ready.txt'), String(PORT)); });
process.on('uncaughtException', e => emit('error', { msg: 'uncaught ' + String(e && e.message || e).slice(0, 200) }));

// ---- heartbeat: real clients stream player_auth_input; the server validates block clicks against this position ----
let tick = 0n; let aiErr = 0;
setInterval(() => {
  if (!S.spawned || !S.connected || !S.me.pos || process.env.NO_AUTH_INPUT) return;
  tick += 1n;
  try {
    c.write('player_auth_input', { pitch: 0, yaw: S.yaw || 0, position: S.me.pos, move_vector: { x: 0, z: 0 }, head_yaw: S.yaw || 0, input_data: S.pendingFlags || [], input_mode: 'mouse', play_mode: 'normal', interaction_model: 'classic', interact_rotation: { x: 0, z: 0 }, tick, delta: { x: 0, y: 0, z: 0 }, transaction: undefined, item_stack_request: undefined, block_action: undefined, vehicle_rotation: undefined, predicted_vehicle: undefined, analogue_move_vector: { x: 0, z: 0 }, camera_orientation: { x: 0, y: 0, z: 1 }, raw_move_vector: { x: 0, z: 0 } });
    S.pendingFlags = null;
  } catch (e) { if (aiErr++ < 3) emit('error', { msg: 'auth_input: ' + String(e && e.message || e).slice(0, 300) }); }
}, 200);
