const { connect, sleep, inv } = require('../../java/lib');
const name = process.argv[2] || 'LOPQAfin';
(async () => {
  const bot = connect({ name, tag: 'writebook-raw' });
  bot.once('spawn', async () => {
    await sleep(14000);
    const it = bot.inventory.items().find(i => i.name === 'writable_book'); if (!it) { console.log('NOITEM'); process.exit(1); }
    await bot.equip(it, 'hand'); await sleep(1500); bot.setQuickBarSlot(0); await sleep(1500);
    console.log('HELD', bot.heldItem && bot.heldItem.name, 'quickBarSlot', bot.quickBarSlot);
    bot._client.write('edit_book', { hand: 0, pages: ['Lord, hear my prayer. Amen.'], title: 'My Prayer' });
    await sleep(5000);
    const slots = bot.inventory.slots.map((s, i) => s && (s.name.includes('book')) ? i + ':' + s.name : null).filter(Boolean);
    console.log('AFTER', JSON.stringify(slots));
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 60000);
})();
