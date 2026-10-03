const { connect, sleep, setupNav, walkTo } = require('./lib');
const { Vec3 } = require('vec3');
const [name, x0, x1, z0, z1, y] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], +process.argv[7]];
(async () => {
  const bot = connect({ name, tag: 'probe-map' }); setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(14000);
    await walkTo(bot, -4238, 65, 3090, 3, 40000);
    console.log('POS', bot.entity.position.toString());
    const sym = b => !b ? '?' : b.name === 'air' ? '.' : /door/.test(b.name) ? 'D' : /gate/.test(b.name) ? 'G' : /barrier/.test(b.name) ? 'B' : /carpet/.test(b.name) ? 'c' : /sign/.test(b.name) ? 's' : /slab|stairs/.test(b.name) ? '=' : b.boundingBox === 'block' ? '#' : '~';
    for (const yy of [y, y + 1]) {
      console.log('Y', yy, 'x from', x0, 'to', x1);
      for (let z = z0; z <= z1; z++) { let row = ''; for (let x = x0; x <= x1; x++) row += sym(bot.blockAt(new Vec3(x, yy, z))); console.log(String(z), row); }
    }
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 100000);
})();
