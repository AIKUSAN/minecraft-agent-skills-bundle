// Click-through of the Java CommandPanels GUIs. Usage: node scenario_gui.js <bot> <tag> [--destructive]
const { connect, sleep, inv } = require('../../java/lib');
const name = process.argv[2], tag = process.argv[3] || 'gui', destructive = process.argv.includes('--destructive');
const strip = s => String(s).replace(/no-index\n+/g, '').replace(/\n{3,}/g, '\n').trim();
const titleText = t => { try { const j = typeof t === 'string' ? JSON.parse(t) : t; const f = x => !x ? '' : typeof x === 'string' ? x : (x.text || '') + (x.extra || []).map(f).join('') + (x.value ? f(x.value) : ''); return JSON.stringify(j).match(/"text":"([^"]+)"/g)?.map(m => m.slice(8, -1)).join('') || ''; } catch (e) { return String(t); } };
(async () => {
  const bot = connect({ name, tag });
  const events = []; let marks = 0;
  bot.on('messagestr', m => { const s = strip(m); if (s && !/^LOPQA\w+ (joined|left)/.test(s)) events.push({ k: 'chat', v: s.slice(-220) }); });
  bot.on('windowOpen', w => events.push({ k: 'open', v: titleText(w.title), type: w.type, id: w.id }));
  bot.on('windowClose', w => events.push({ k: 'close' }));
  const results = [];
  async function closeAll() { if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(500); } }
  async function openTab() { await closeAll(); events.length = 0; bot.chat('/tabernacle'); for (let i = 0; i < 30 && !bot.currentWindow; i++) await sleep(100); await sleep(400); return bot.currentWindow; }
  async function click(path, slot, label) {
    // path: array of [slot] clicks leading to the target panel, starting from /tabernacle
    let w = await openTab(); if (!w) { results.push({ label, slot, outcome: 'panel-did-not-open' }); return; }
    for (const s of path) { events.length = 0; await bot.clickWindow(s, 0, 0).catch(() => {}); await sleep(1500); w = bot.currentWindow; if (!w) { results.push({ label, slot, outcome: 'navigation-closed-early' }); return; } }
    const title = titleText(w.title); const item = w.slots[slot]; const pos0 = bot.entity.position.clone();
    events.length = 0;
    await bot.clickWindow(slot, 0, 0).catch(e => events.push({ k: 'err', v: e.message }));
    await sleep(2200);
    const w2 = bot.currentWindow;
    const r = { label, panel: title, slot, item: item ? item.name : null, windowAfter: w2 ? titleText(w2.title) : 'closed', moved: Math.round(bot.entity.position.distanceTo(pos0)), events: events.filter(e => e.k !== 'close').slice(0, 4) };
    results.push(r); console.log('CLICK', JSON.stringify(r));
  }
  bot.once('spawn', async () => {
    await sleep(15000);
    await closeAll();
    // main panel
    for (const [slot, label] of [[10, 'continue_story'], [12, 'progress'], [14, 'reset_story'], [16, 'return_spawn'], [20, 'help'], [22, 'guide_me'], [24, 'exit'], [0, 'background']]) await click([], slot, 'main/' + label);
    // progress panel
    for (const [slot, label] of [[10, 'tutorial'], [12, 'chapter'], [14, 'current_objective'], [16, 'completed_count'], [19, 'offerwheat'], [29, 'lightmenorah'], [48, 'back'], [49, 'guide_me'], [50, 'exit']]) await click([12], slot, 'progress/' + label);
    // help panel
    for (const [slot, label] of [[10, 'interaction_help'], [12, 'progress_help'], [14, 'replay_tutorial'], [16, 'back'], [22, 'exit']]) await click([20], slot, 'help/' + label);
    // reset confirm
    await click([14], 15, 'reset_confirm/cancel');
    if (destructive) await click([14], 11, 'reset_confirm/confirm');
    console.log('DONE'); bot.qa.log('gui-results', results); console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 420000);
})();
