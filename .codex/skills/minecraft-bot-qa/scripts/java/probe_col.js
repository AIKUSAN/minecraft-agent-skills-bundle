const { connect, sleep, setupNav, walkTo } = require('./lib');
const { Vec3 } = require('vec3');
const name = process.argv[2]; const cx = +process.argv[3], cz = +process.argv[4];
(async () => {
  const bot = connect({ name, tag: 'probe-col' }); setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(14000);
    console.log('POS', bot.entity.position.toString(), 'gm', bot.game.gameMode);
    await walkTo(bot, cx, 65, cz + 25, 3, 30000);
    console.log('POS2', bot.entity.position.toString());
    for (const [dx, dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {
      const out = [];
      for (let y = 60; y <= 92; y++) { const b = bot.blockAt(new Vec3(cx + dx, y, cz + dz)); if (b && b.name !== 'air') out.push(`${y}:${b.name}`); }
      console.log('COL', dx, dz, out.join(' '));
    }
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 120000);
})();
