// Mock Bedrock server used ONLY to test the bot tooling (no Minecraft world, no Geyser). It serves your menu YAML
// as Floodgate-style simple forms and answers button presses the way CommandPanels would ([open], [msg], [console], [close]).
// This is a tool test, not product QA: run real QA against a dev server.
// Env: MOCK_PORT (19199), MENU_COMMAND (/menu), MOCK_ROOT (panel opened by the command; default main_menu or the first panel),
//      MOCK_VARS (JSON of %placeholder% values), MOCK_BREAK=1 (leave placeholders unresolved to prove the judge catches them),
//      MOCK_DROP_FORM=<button label> (never answer that press)
const bedrock = require('bedrock-protocol');
const { load } = require('./bedrock_expected');
const { raknetBackend } = require('./bedrock_lib');
const panels = load();
const PORT = +(process.env.MOCK_PORT || 19199);
const BREAK = process.env.MOCK_BREAK === '1';
const DROP = process.env.MOCK_DROP_FORM || '';
const COMMAND = (process.env.MENU_COMMAND || '/menu').replace(/^\//, '');
const ROOT = process.env.MOCK_ROOT || (panels.main_menu ? 'main_menu' : Object.keys(panels)[0]);
if (!panels[ROOT]) { console.error('MOCK: no panel found for root "' + ROOT + '". Check PANEL_DIR.'); process.exit(2); }

let extra = {}; try { extra = JSON.parse(process.env.MOCK_VARS || '{}'); } catch (e) { console.error('MOCK_VARS is not valid JSON'); }
const vars = { player_name: '.BedrockQA', ...extra };
const resolve = t => String(t).replace(/%([A-Za-z_]+)%/g, (m, k) => (!BREAK && vars[k] != null ? vars[k] : m));
const formJson = key => { const p = panels[key]; return JSON.stringify({ type: 'form', title: p.title, content: resolve(p.content), buttons: p.buttons.map(b => ({ text: b.name })) }); };

const server = bedrock.createServer({ host: '127.0.0.1', port: PORT, offline: true, maxPlayers: 4, raknetBackend: raknetBackend(), motd: { motd: 'Bedrock mock' } });
console.log('MOCK listening', PORT, BREAK ? '(placeholders left unresolved)' : '');
server.on('connect', client => {
  let nextId = 1; const open = {}; // form_id -> panel key
  const send = key => { if (!panels[key]) return; const id = nextId++; open[id] = key; client.queue('modal_form_request', { form_id: id, data: formJson(key) }); };
  const say = message => client.queue('text', { needs_translation: false, category: 'message_only', type: 'raw', message, xuid: '', platform_chat_id: '', has_filtered_message: false });
  client.on('join', () => console.log('MOCK join', client.profile && client.profile.name));
  client.on('command_request', p => { if (p.command.replace(/^\//, '').split(' ')[0] === COMMAND) send(ROOT); });
  client.on('modal_form_response', p => {
    const key = open[p.form_id]; if (!key || !p.has_response_data) return;
    const idx = parseInt(String(p.data).trim(), 10); const btn = panels[key].buttons[idx];
    if (!btn) return;
    console.log('MOCK press', key, idx, btn.name);
    if (DROP && btn.name === DROP) return; // simulate a dead button
    for (const c of btn.actions) {
      const m = /^\[(\w+)\]\s*(.*)$/.exec(c); if (!m) continue; const [, tag, arg] = m;
      if (tag === 'open') send(arg.trim());
      else if (tag === 'msg') say(resolve(arg).replace(/&./g, ''));
      else if (tag === 'console') say('(mock) ran: ' + resolve(arg));
    }
  });
});
