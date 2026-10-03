const { connect, sleep, setupNav, walkTo } = require('./lib');
const { Vec3 } = require('vec3');
const [name, cx, cy, cz, R] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +(process.argv[6] || 8)];
(async () => {
  const bot = connect({ name, tag: 'probe-area' }); setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(14000);
    await walkTo(bot, cx, 65, cz + 25, 3, 30000);
    const counts = {}; const interesting = [];
    for (let dx = -R; dx <= R; dx++) for (let dy = -R - 12; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
      const b = bot.blockAt(new Vec3(cx + dx, cy + dy, cz + dz)); if (!b || b.name === 'air') continue;
      const k = b.name; counts[k] = (counts[k] || 0) + 1;
      if (/candle|torch|lantern|fire|lamp|campfire|brazier|chain|end_rod|lever|button|sign|barrier|lectern|ladder|iron_bars|gold|copper/.test(k)) interesting.push(`${k}@${b.position.x},${b.position.y},${b.position.z}`);
    }
    console.log('COUNTS', JSON.stringify(counts));
    console.log('INTERESTING', interesting.slice(0, 80).join(' '));
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 120000);
})();
