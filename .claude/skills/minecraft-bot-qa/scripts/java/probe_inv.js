const { connect, sleep } = require('./lib');
(async () => {
  const bot = connect({ name: process.argv[2], tag: 'probe-inv' });
  bot.once('spawn', async () => {
    await sleep(12000);
    for (const it of bot.inventory.items()) console.log('ITEM', it.name, it.count, JSON.stringify(it.components || it.nbt || {}).slice(0, 600));
    bot.quit(); setTimeout(() => process.exit(0), 800);
  });
  setTimeout(() => process.exit(2), 40000);
})();
