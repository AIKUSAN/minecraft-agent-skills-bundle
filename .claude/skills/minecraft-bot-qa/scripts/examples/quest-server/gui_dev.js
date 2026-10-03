// DEV GUI click-through (Java CommandPanels). Deterministic; Laya judges the result file.
// Usage: QA_HOST=.. QA_PORT=.. QA_AUTH=microsoft node gui_dev.js <cacheKey> <tag>
const QAP = require('../../paths');
const { connect, sleep } = require('../../java/lib'); const fs = require('fs'), path = require('path');
const name = process.argv[2], tag = process.argv[3] || 'guidev';
const strip = s => String(s).replace(/no-index\n+/g, '').replace(/\n{3,}/g, '\n').trim();
const titleText = t => { try { return JSON.stringify(typeof t === 'string' ? JSON.parse(t) : t).match(/"text":"([^"]+)"/g)?.map(m => m.slice(8, -1)).join('') || ''; } catch (e) { return String(t); } };
const lore = it => { try { return JSON.stringify(it.components || it.nbt || '').slice(0, 700); } catch (e) { return ''; } };
(async () => {
  const bot = connect({ name, tag }); const events = []; const results = []; const dumps = {};
  bot.on('messagestr', m => { const s = strip(m); if (s) events.push({ k: 'chat', v: s.slice(-260) }); });
  bot.on('windowOpen', w => events.push({ k: 'open', v: titleText(w.title) }));
  bot.on('windowClose', () => events.push({ k: 'close' }));
  async function closeAll() { if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(500); } }
  async function openTab() { await closeAll(); events.length = 0; bot.chat('/tabernacle'); for (let i = 0; i < 40 && !bot.currentWindow; i++) await sleep(100); await sleep(600); return bot.currentWindow; }
  function dump(label, w) { if (dumps[label]) return; dumps[label] = { title: titleText(w.title), slots: w.slots.map((it, i) => it && i < w.inventoryStart ? { slot: i, n: it.name, d: it.displayName, lore: lore(it) } : null).filter(Boolean) }; }
  async function click(path_, slot, label, expect) {
    let w = await openTab(); if (!w) { results.push({ label, slot, expect, outcome: 'panel-did-not-open' }); return; }
    for (const s of path_) { events.length = 0; await bot.clickWindow(s, 0, 0).catch(() => {}); await sleep(1600); w = bot.currentWindow; if (!w) { results.push({ label, slot, expect, outcome: 'navigation-closed-early' }); return; } }
    dump(label.split('/')[0], w);
    const title = titleText(w.title), item = w.slots[slot], pos0 = bot.entity.position.clone(); events.length = 0;
    await bot.clickWindow(slot, 0, 0).catch(e => events.push({ k: 'err', v: e.message }));
    await sleep(2500);
    const w2 = bot.currentWindow, after = w2 ? titleText(w2.title) : 'closed';
    const evs = events.filter(e => e.k !== 'close').slice(0, 5);
    const chats = evs.filter(e => e.k === 'chat').map(e => e.v);
    const r = { label, expect, panel: title, slot, item: item ? item.displayName : null, windowAfter: after, moved: Math.round(bot.entity.position.distanceTo(pos0)), chats, opened: evs.filter(e => e.k === 'open').map(e => e.v) };
    r.responded = r.moved > 3 || chats.length > 0 || r.opened.length > 0 || after !== title; results.push(r); console.log('CLICK', JSON.stringify(r));
  }
  bot.once('spawn', async () => {
    await sleep(15000); await closeAll();
    const M = [[10, 'continue_story', 'respond'], [12, 'progress', 'respond'], [14, 'reset_story', 'respond'], [16, 'return_spawn', 'respond'], [20, 'help', 'respond'], [22, 'guide_me', 'respond'], [24, 'exit', 'respond'], [0, 'background', 'inert']];
    for (const [s, l, e] of M) await click([], s, 'main/' + l, e);
    for (const [s, l] of [[10, 'tutorial'], [12, 'chapter'], [14, 'current_objective'], [16, 'completed_count'], [19, 'offerwheat'], [29, 'lightmenorah'], [48, 'back'], [49, 'guide_me'], [50, 'exit']]) await click([12], s, 'progress/' + l, 'respond');
    for (const [s, l] of [[10, 'interaction_help'], [12, 'progress_help'], [14, 'replay_tutorial'], [16, 'back'], [22, 'exit']]) await click([20], s, 'help/' + l, 'respond');
    await click([14], 15, 'reset_confirm/cancel', 'respond');
    fs.writeFileSync(path.join(QAP.dir('results'), `gui-dev-${tag}.json`), JSON.stringify({ results, dumps }, null, 1));
    console.log('DONE'); bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); fs.writeFileSync(path.join(QAP.dir('results'), `gui-dev-${tag}-partial.json`), JSON.stringify({ results, dumps }, null, 1)); process.exit(2); }, 480000);
})();
