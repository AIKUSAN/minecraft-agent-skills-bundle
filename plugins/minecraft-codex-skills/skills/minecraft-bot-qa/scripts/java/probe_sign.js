const { connect, sleep } = require('./lib');
const name = process.argv[2], tag = process.argv[3] || 'psign';
(async () => {
  const bot = connect({ name, tag });
  bot.on('message', m => { const t = m.toString().trim(); if (t) console.log('MSG', t.slice(0,160)); });
  bot.once('spawn', async () => {
    await sleep(14000);
    if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(500); }
    const st = () => bot.inventory.slots.map((s, i) => s ? `${i}:${s.name}x${s.count}` : null).filter(Boolean).join(',');
    console.log('INV0', st());
    const b = bot.inventory.items().find(i => i.name === 'writable_book');
    if (!b) { console.log('NOBOOK'); bot.quit(); setTimeout(() => process.exit(1), 800); return; }
    bot.inventory.on('updateSlot', (s, o, n) => console.log('SLOT', s, o && o.name, '->', n && n.name));
    try { await bot.writeBook(b.slot, ['Lord, thank You. Amen.'], bot.username, 'Prayer', true); console.log('WROTE'); } catch (e) { console.log('ERR', String(e).slice(0, 200)); }
    for (let i = 0; i < 4; i++) { await sleep(1500); console.log('INV', st()); }
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 90000);
})();
