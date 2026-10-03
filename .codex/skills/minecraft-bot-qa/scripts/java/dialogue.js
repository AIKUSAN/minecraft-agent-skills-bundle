// Deterministic driver for Typewriter Java dialogue (chat-frame UI, hotbar scroll + jump confirm).
const { sleep, rightClick, goToNpc } = require('./lib');

function parseFrame(raw) {
  if (!raw || !raw.startsWith('no-index')) return null;
  const body = raw.replace(/^no-index\n+/, '');
  const parts = body.split(/\n{4,}/);
  const ui = parts[parts.length - 1];
  const lines = ui.split('\n').map(s => s.replace(/\s+$/, ''));
  const joined = lines.join('\n');
  const optFooter = /\[ Scroll to change option and press key\.\w+ to select \]/.test(joined);
  const spokenFooter = (joined.match(/Press key\.\w+ to (continue|finish)/) || [])[0] || null;
  if (optFooter) {
    const options = []; let selected = -1;
    for (const l of lines) {
      let m = l.match(/^\s*>> \[ (.*) \]\s*$/); if (m) { selected = options.length; options.push(m[1]); continue; }
      m = l.match(/^\s{2,}\[ (.*) \]\s*$/); if (m && !/Scroll to change/.test(m[1])) options.push(m[1]);
    }
    const sl = lines.find(l => /^\s*[^\[\]>]{1,40}:(\s|$)/.test(l));
    let speaker = null, text = '';
    if (sl) {
      const i = lines.indexOf(sl); const m = sl.match(/^\s*(.+?):\s?(.*)$/); speaker = m[1].trim(); text = m[2];
      for (let k = i + 1; k < lines.length; k++) { const l = lines[k]; if (/^\s*(>>)?\s*\[ /.test(l)) break; text += (l.trim() ? ' ' + l.trim() : '\n'); }
    }
    return { kind: 'options', speaker, text: text.trim(), options, selected, footer: 'options', isOptions: true, ui: ui.trim() };
  }
  if (spokenFooter) {
    const hl = lines.find(l => /^\s*\[ .+ \]\s*$/.test(l));
    const speaker = hl ? hl.match(/\[ (.+) \]/)[1] : null;
    const hi = hl ? lines.indexOf(hl) : -1;
    const textLines = [];
    for (let k = hi + 1; k < lines.length; k++) { if (/Press key\./.test(lines[k])) break; if (lines[k].trim()) textLines.push(lines[k].trim()); }
    return { kind: 'spoken', speaker, text: textLines.join(' '), options: [], selected: -1, footer: spokenFooter, isOptions: false, ui: ui.trim() };
  }
  return { kind: 'other', speaker: null, text: ui.trim().slice(0, 200), options: [], selected: -1, footer: null, isOptions: false, ui: ui.trim() };
}

class DialogueWatcher {
  constructor(bot) {
    this.bot = bot; this.last = null; this.lastAt = 0; this.frames = 0; this.seq = 0;
    bot.on('messagestr', raw => { const f = parseFrame(raw); if (!f) return; this.last = f; this.lastAt = Date.now(); this.frames++; this.seq++; });
  }
  // wait until typing animation settles: no UI-text change for quietMs
  async settle({ timeout = 20000, quietMs = 900, needOptionsOrFooter = true } = {}) {
    const t0 = Date.now(); let prev = null, prevAt = Date.now();
    while (Date.now() - t0 < timeout) {
      const f = this.last;
      if (f) {
        const sig = f.ui;
        if (sig !== prev) { prev = sig; prevAt = Date.now(); }
        else if (Date.now() - prevAt >= quietMs && (!needOptionsOrFooter || f.kind === 'options' || f.kind === 'spoken')) return f;
      }
      await sleep(120);
    }
    return null;
  }
}

function pressJump(bot) { return (async () => { bot.setControlState('jump', true); await sleep(140); bot.setControlState('jump', false); })(); }

async function scrollTo(bot, watcher, target) {
  for (let tries = 0; tries < 12; tries++) {
    const f = watcher.last; if (!f || !f.isOptions) return false;
    if (f.selected === target) return true;
    const cur = bot.quickBarSlot ?? 0;
    const dir = target > f.selected ? 1 : -1;
    const before = watcher.seq;
    bot.setQuickBarSlot(((cur + dir) % 9 + 9) % 9);
    for (let w = 0; w < 15 && watcher.seq === before; w++) await sleep(100);
    await sleep(120);
  }
  return watcher.last && watcher.last.selected === target;
}

// strategy: (frame, stepIdx) -> index | 'continue' | 'stop'
async function converse(bot, npcName, strategy, { maxSteps = 40, openTimeout = 12000, label = '' } = {}) {
  const watcher = bot._dlg || (bot._dlg = new DialogueWatcher(bot));
  const nav = await goToNpc(bot, npcName);
  const { findNpcEntity } = require('./lib');
  const ent = nav.entity || findNpcEntity(bot, npcName);
  if (!ent) { bot.qa.log('dialogue-error', { npcName, why: 'npc entity not found' }); return { ok: false, why: 'npc-not-found', steps: [] }; }
  watcher.last = null;
  await rightClick(bot, ent, 'both');
  const steps = [];
  for (let s = 0; s < maxSteps; s++) {
    const f = await watcher.settle({ timeout: s === 0 ? openTimeout : 9000 });
    if (!f) { bot.qa.log('dialogue-end', { npcName, step: s, why: s === 0 ? 'no-dialogue-opened' : 'ui-gone' }); return { ok: s > 0, why: s === 0 ? 'no-dialogue' : 'ended', steps }; }
    bot.qa.log('dialogue-frame', { npcName, step: s, speaker: f.speaker, text: f.text, options: f.options, selected: f.selected, footer: f.footer });
    const pick = strategy(f, s);
    steps.push({ speaker: f.speaker, text: f.text, options: f.options, pick });
    if (pick === 'stop') return { ok: true, why: 'stopped', steps };
    const frameSeq = watcher.seq;
    if (f.isOptions) {
      const idx = typeof pick === 'number' ? pick : 0;
      const ok = await scrollTo(bot, watcher, idx);
      if (!ok) { bot.qa.log('dialogue-error', { npcName, step: s, why: 'scroll-failed', wanted: idx }); return { ok: false, why: 'scroll-failed', steps }; }
    }
    watcher.last = null;
    await pressJump(bot);
    // wait for the next UI or for it to disappear
    await sleep(900);
  }
  return { ok: true, why: 'max-steps', steps };
}
module.exports = { parseFrame, DialogueWatcher, converse, scrollTo, pressJump };
