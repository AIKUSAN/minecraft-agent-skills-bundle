// Bedrock QA helpers (bedrock-protocol). Deterministic, no model in the loop.
// Env: BEDROCK_HOST, BEDROCK_PORT, BEDROCK_AUTH (offline|microsoft), BEDROCK_VERSION, BEDROCK_WAIT (spawn|join), BEDROCK_FORM_NL (1 = append \n to form answers), BEDROCK_RAKNET
const QAP = require('../paths');
const bedrock = require('bedrock-protocol');
const fs = require('fs');
const path = require('path');

// Prefer the native RakNet build; fall back to the pure-JS one when it is not built (no compiler needed). Override with BEDROCK_RAKNET.
function raknetBackend() {
  if (process.env.BEDROCK_RAKNET) return process.env.BEDROCK_RAKNET;
  try { require('raknet-native'); return 'raknet-native'; } catch (e) { return 'jsp-raknet'; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s == null ? '' : s).replace(/§./g, '').replace(/\r/g, '').trim();

function textOf(p) {
  const m = p.message == null ? '' : p.message;
  if (/^json/.test(p.type)) { try { const j = JSON.parse(m); return strip(JSON.stringify(j.rawtext ? j.rawtext.map(r => r.text || r.translate || '').join('') : j)); } catch (e) { return strip(m); } }
  if (p.parameters && p.parameters.length) return strip(m + ' ' + p.parameters.join(' '));
  return strip(m);
}

function connectBedrock({ name, tag = 'run', host, port, auth, version }) {
  host = host || process.env.BEDROCK_HOST || '127.0.0.1';
  port = +(port || process.env.BEDROCK_PORT || 19132);
  auth = auth || process.env.BEDROCK_AUTH || 'offline';
  version = version || process.env.BEDROCK_VERSION || undefined;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = QAP.dir('logs');
  const file = path.join(dir, `${stamp}-bedrock-${name}-${tag}.jsonl`);
  const out = fs.createWriteStream(file, { flags: 'a' });
  const t0 = Date.now();
  const log = (type, data) => out.write(JSON.stringify({ t: Date.now() - t0, type, ...data }) + '\n');
  const opts = { host, port, username: name, offline: auth !== 'microsoft', conLog: (...a) => log('conlog', { m: a.join(' ').slice(0, 300) }), skipPing: !!process.env.BEDROCK_SKIP_PING, raknetBackend: raknetBackend() };
  if (version) opts.version = version;
  if (auth === 'microsoft') {
    opts.profilesFolder = QAP.dir('auth-cache-bedrock');
    opts.onMsaCode = d => fs.writeFileSync(path.join(dir, 'msa-code-bedrock.txt'), JSON.stringify({ code: d.user_code, url: d.verification_uri, expires: d.expires_in }));
  }
  const client = bedrock.createClient(opts);
  const b = { client, log, file, t0, forms: [], texts: [], outputs: [], joined: false, spawned: false, ended: false, nextFormId: 0 };
  client.on('join', () => { b.joined = true; log('join', {}); });
  client.on('spawn', () => { b.spawned = true; log('spawn', {}); });
  client.on('text', p => { const t = textOf(p); if (!t) return; b.texts.push({ at: Date.now(), type: p.type, text: t }); log('text', { ttype: p.type, text: t }); });
  client.on('command_output', p => { b.outputs.push({ at: Date.now(), p }); log('command_output', { t: JSON.stringify(p.output || p).slice(0, 300) }); });
  client.on('modal_form_request', p => { let data = null; try { data = JSON.parse(p.data); } catch (e) {} b.forms.push({ at: Date.now(), id: p.form_id, data, raw: p.data }); log('form', { id: p.form_id, title: data && data.title, type: data && data.type, buttons: data && data.buttons ? data.buttons.map(x => x.text) : undefined }); });
  client.on('set_title', p => log('title', { p: JSON.stringify(p).slice(0, 200) }));
  client.on('disconnect', p => { b.ended = true; log('disconnect', { reason: JSON.stringify(p).slice(0, 300) }); });
  client.on('kick', p => log('kick', { reason: JSON.stringify(p).slice(0, 300) }));
  client.on('error', e => log('error', { msg: String(e && e.message || e).slice(0, 300) }));
  client.on('close', () => { b.ended = true; log('close', {}); out.end(); });
  return b;
}

async function waitFor(fn, ms, step = 100) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(step); } return !!fn(); }

function runCommand(b, command) {
  const { randomUUID } = require('crypto');
  b.client.queue('command_request', { command, origin: { type: 'player', uuid: randomUUID(), request_id: '', player_entity_id: 0n }, internal: false, version: 'latest' });
  b.log('command', { command });
}

// Simple form answers are the button index; modal forms answer true/false. Closing sends a cancel.
function answerForm(b, form, idx) {
  const nl = process.env.BEDROCK_FORM_NL === '1' ? '\n' : '';
  const isModal = form.data && form.data.type === 'modal';
  const data = isModal ? (idx === 0 ? 'true' : 'false') + nl : String(idx) + nl;
  b.client.queue('modal_form_response', { form_id: form.id, has_response_data: true, data, has_cancel_reason: false });
  b.log('answer', { id: form.id, idx });
}
function closeForm(b, form) {
  b.client.queue('modal_form_response', { form_id: form.id, has_response_data: false, has_cancel_reason: true, cancel_reason: 'closed' });
  b.log('close-form', { id: form.id });
}

module.exports = { raknetBackend, connectBedrock, sleep, waitFor, runCommand, answerForm, closeForm, strip };
