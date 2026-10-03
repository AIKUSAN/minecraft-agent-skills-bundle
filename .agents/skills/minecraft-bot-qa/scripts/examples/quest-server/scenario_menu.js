// Returning player: rejoin, observe welcome-back title + menu, open /tabernacle, click each safe entry, log windows.
const { connect, sleep, inv } = require('../../java/lib');
const name = process.argv[2] || 'QABote1', tag = process.argv[3] || 'menu';
(async () => {
  const bot = connect({ name, tag });
  const wins = [];
  bot.on('windowOpen', w => wins.push({ title: JSON.stringify(w.title), type: w.type, items: w.slots.filter(Boolean).map(s => s.displayName + (s.nbt ? '' : '')) }));
  bot.once('spawn', async () => {
    await sleep(14000);
    bot.qa.log('after-join-wait', { windows: wins.length });
    bot.chat('/tabernacle'); await sleep(3000);
    const w = bot.currentWindow;
    bot.qa.log('menu-state', { open: !!w, title: w && JSON.stringify(w.title), slots: w && w.slots.map((s, i) => s ? { i, n: s.name, d: s.displayName } : null).filter(Boolean) });
    console.log('WINS', JSON.stringify(wins, null, 1));
    console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 90000);
})();
