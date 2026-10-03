// Writes and signs the marked prayer book like a player would (book and quill -> signed book).
const { connect, sleep, inv } = require('../../java/lib');
const name = process.argv[2] || 'QABotfin', tag = process.argv[3] || 'writebook';
(async () => {
  const bot = connect({ name, tag });
  bot.once('spawn', async () => {
    await sleep(14000);
    const it = bot.inventory.items().find(i => i.name === 'writable_book');
    if (!it) { console.log('NOITEM writable_book', JSON.stringify(inv(bot))); bot.quit(); setTimeout(() => process.exit(1), 1000); return; }
    await bot.equip(it, 'hand'); await sleep(500);
    const slot = bot.inventory.slots.findIndex(s => s && s.name === 'writable_book');
    let err = null;
    try { await bot.signBook(slot, ['Lord, hear my prayer. Amen.'], name, 'My Prayer'); } catch (e) { err = e.message; }
    await sleep(1500);
    console.log('BOOK', JSON.stringify({ slot, err, inv: inv(bot).map(i => `${i.n}x${i.c}`).join(',') }));
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 90000);
})();
