// Bedrock GUI click-through. Joins as a Bedrock player, runs the menu command (MENU_COMMAND, default /menu), then presses every button of every form
// (depth-first, reopening the menu for each press) and records what comes back (next form and/or chat lines).
// Destructive buttons (MENU_DESTRUCTIVE regex) are listed but never pressed. Usage: node bedrock/bedrock_gui.js <name> <tag>
// Env: MENU_COMMAND, MENU_DESTRUCTIVE, MENU_LATE, BEDROCK_PANEL_GAP_MS, BEDROCK_SETTLE_MS, BEDROCK_PRESS_WAIT_MS (plus the bedrock_lib.js variables)
const QAP = require('../paths');
const fs = require('fs');
const path = require('path');
const { connectBedrock, sleep, waitFor, runCommand, answerForm, closeForm, strip } = require('./bedrock_lib');
const expected = require('./bedrock_expected').load();

const name = process.argv[2] || 'BedrockQA', tag = process.argv[3] || 'gui';
const MENU_COMMAND = process.env.MENU_COMMAND || '/menu';
const DESTRUCTIVE = new RegExp(process.env.MENU_DESTRUCTIVE || '^(confirm )?(reset|delete|wipe|erase|purge)\\b', 'i'); // never pressed
const LATE = new RegExp(process.env.MENU_LATE || 'replay|exit|leave|quit', 'i'); // pressed last (may start a cutscene or leave the flow)
// CommandPanels throttles rapid panel opens ("You're opening panels too quickly"). Pace every panel-opening action.
const GAP = +(process.env.BEDROCK_PANEL_GAP_MS || 5000); let lastOpen = 0;
const pace = async () => { const w = lastOpen + GAP - Date.now(); if (w > 0) await sleep(w); lastOpen = Date.now(); };

(async () => {
  const b = connectBedrock({ name, tag });
  const res = { name, tag, expected, destructive: DESTRUCTIVE.source, steps: [], issues: [] };
  let fin = false;
  const save = () => fs.writeFileSync(path.join(QAP.dir('results'), `bedrock-${tag}.json`), JSON.stringify(res, null, 1));
  const finish = (code) => { if (fin) return; fin = true; res.joined = b.joined; res.spawned = b.spawned; res.log = b.file; save(); try { b.client.close(); } catch (e) {} setTimeout(() => process.exit(code), 800); };
  setTimeout(() => { res.issues.push('global-timeout'); finish(2); }, 30 * 60 * 1000);
  b.client.on('error', e => { res.issues.push('client-error: ' + String(e && e.message || e).slice(0, 160)); });

  const need = process.env.BEDROCK_WAIT === 'join' ? () => b.joined : () => b.spawned;
  if (!await waitFor(need, process.env.BEDROCK_AUTH === 'microsoft' ? 12 * 60 * 1000 : 90000)) { res.issues.push(`never-${process.env.BEDROCK_WAIT === 'join' ? 'joined' : 'spawned'}`); return finish(3); }
  await sleep(+(process.env.BEDROCK_SETTLE_MS || 8000));

  let ptr = 0; // forms consumed so far
  const nextForm = async ms => { await waitFor(() => b.forms.length > ptr, ms); return b.forms.length > ptr ? b.forms[ptr++] : null; };
  const drain = () => { ptr = b.forms.length; };
  const parse = f => ({ title: strip(f.data && f.data.title), content: strip(f.data && f.data.content), type: f.data && f.data.type, buttons: ((f.data && (f.data.buttons || (f.data.button1 ? [{ text: f.data.button1 }, { text: f.data.button2 }] : []))) || []).map(x => strip(x.text)) });

  async function openPath(pathIdx) {
    drain(); await pace(); runCommand(b, MENU_COMMAND);
    let f = await nextForm(10000); if (!f) return null;
    for (const i of pathIdx) { await pace(); answerForm(b, f, i); f = await nextForm(8000); if (!f) return null; }
    return f;
  }

  const seen = new Set();
  async function explore(pathIdx) {
    const f = await openPath(pathIdx);
    if (!f) { res.steps.push({ path: pathIdx, error: 'form-not-reopened' }); res.issues.push(`could not reopen form at path [${pathIdx}]`); return; }
    const p = parse(f); const key = p.title + '|' + p.buttons.join(',');
    if (seen.has(key)) { res.steps.push({ path: pathIdx, title: p.title, revisit: true }); return; }
    seen.add(key);
    res.steps.push({ path: pathIdx, kind: 'form', ...p });
    save();
    const order = p.buttons.map((t, i) => i).sort((a, c) => (LATE.test(p.buttons[a]) ? 1 : 0) - (LATE.test(p.buttons[c]) ? 1 : 0) || a - c);
    for (const i of order) {
      const label = p.buttons[i];
      if (DESTRUCTIVE.test(label)) { res.steps.push({ path: pathIdx, kind: 'press', index: i, label, skipped: 'destructive' }); continue; }
      let g, nf, texts, t0, attempt = 0, throttled = false;
      for (; attempt < 2; attempt++) {
        g = await openPath(pathIdx);
        if (!g) break;
        t0 = Date.now(); const textStart = b.texts.length;
        await pace(); answerForm(b, g, i);
        nf = await nextForm(+(process.env.BEDROCK_PRESS_WAIT_MS || 4500));
        await sleep(600);
        texts = b.texts.slice(textStart).map(x => x.text);
        throttled = !nf && texts.some(x => /opening panels too quickly/i.test(x));
        if (throttled) continue; // harness pacing, retry once
        break;
      }
      if (!g) { res.steps.push({ path: pathIdx, kind: 'press', index: i, label, error: 'form-not-reopened' }); res.issues.push(`reopen failed before pressing "${label}"`); continue; }
      const np = nf ? parse(nf) : null;
      res.steps.push({ path: pathIdx, kind: 'press', index: i, label, newForm: np && np.title, newFormButtons: np && np.buttons, texts, retries: attempt, throttled, ms: Date.now() - t0 });
      save();
      if (np && !seen.has(np.title + '|' + np.buttons.join(','))) await explore(pathIdx.concat(i));
    }
  }

  try { await explore([]); } catch (e) { res.issues.push('exception: ' + String(e && e.stack || e).slice(0, 300)); }
  finish(res.issues.length ? 1 : 0);
})();
