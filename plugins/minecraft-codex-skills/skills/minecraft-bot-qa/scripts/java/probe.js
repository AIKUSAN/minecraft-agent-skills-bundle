// Read-only observation: join, log everything for N seconds, print inventory, quit.
const { connect, sleep, inv } = require('./lib');
const name = process.argv[2] || 'QAprobe1';
const secs = parseInt(process.argv[3] || '40', 10);
(async () => {
  const bot = connect({ name, tag: 'probe' });
  bot.once('spawn', async () => {
    await sleep(secs * 1000);
    bot.qa.log('inventory', { items: inv(bot) });
    bot.qa.log('position', { pos: bot.entity.position, yaw: bot.entity.yaw });
    console.log('LOG', bot.qa.file);
    bot.quit();
    setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('no spawn within 60s'); process.exit(2); }, 60000);
})();
