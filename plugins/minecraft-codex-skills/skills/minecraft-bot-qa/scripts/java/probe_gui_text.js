const { connect, sleep } = require('./lib');
const name = process.argv[2];
const texts = o => { const out = []; (function w(x) { if (x == null) return; if (typeof x === 'string') return; if (Array.isArray(x)) return x.forEach(w); if (typeof x === 'object') { if (x.text && typeof x.text === 'object' && x.text.value !== undefined) out.push(String(x.text.value)); else if (typeof x.text === 'string') out.push(x.text); Object.values(x).forEach(w); } })(o); return out; };
const comp = (it, t) => { const c = (it.components || []).find(c => c.type === t); return c ? c.data : null; };
const dump = w => w.slots.map((it, i) => it && !/glass_pane/.test(it.name) ? { slot: i, item: it.name, name: texts(comp(it, 'custom_name') || comp(it, 'item_name')).join('').trim(), lore: texts(comp(it, 'lore')).join(' | ') } : null).filter(Boolean);
(async () => {
  const bot = connect({ name, tag: 'gui-text' });
  bot.once('spawn', async () => {
    await sleep(15000);
    if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(500); }
    bot.chat('/tabernacle'); for (let i = 0; i < 30 && !bot.currentWindow; i++) await sleep(100); await sleep(600);
    console.log('MAIN', JSON.stringify(dump(bot.currentWindow)));
    await bot.clickWindow(12, 0, 0); await sleep(1800);
    console.log('PROGRESS', JSON.stringify(dump(bot.currentWindow)));
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 90000);
})();
