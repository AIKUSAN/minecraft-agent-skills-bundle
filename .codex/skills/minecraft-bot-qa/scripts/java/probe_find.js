const { connect, sleep, setupNav } = require('./lib');
const name = process.argv[2], pat = new RegExp(process.argv[3]);
(async () => {
  const bot = connect({ name, tag: 'probe-find' }); setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(14000);
    const ps = bot.findBlocks({ matching: b => b && pat.test(b.name), maxDistance: 128, count: 40 });
    console.log('POS', bot.entity.position.toString()); console.log('FOUND', ps.map(p => p.toString()).join(' '));
    console.log('ENT', Object.values(bot.entities).filter(e => e.type !== 'other' || e.username).slice(0, 0).length);
    bot.quit(); setTimeout(() => process.exit(0), 800);
  });
  setTimeout(() => process.exit(2), 60000);
})();
