// Offer marked items at the altar by normal play: walk near, hold item, right-click a block within the rule radius.
const { connect, sleep, inv, setupNav, walkTo } = require('../../java/lib');
const { Vec3 } = require('vec3');
const name = process.argv[2] || 'LOPQAs1';
const tag = process.argv[3] || 'altar';
const items = (process.argv[4] || 'wheat,beef,mutton').split(',');
const C = process.argv[5] ? { x: +process.argv[5], y: +process.argv[6], z: +process.argv[7] } : { x: -4231, y: 77, z: 3126 };
const RAD = +(process.argv[8] || 2);
(async () => {
  const bot = connect({ name, tag });
  setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(14000);
    if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(500); }
    bot.qa.log('altar-start', { pos: bot.entity.position, inv: inv(bot) });
    if (C.z < 3066) { await walkTo(bot, -4231, 65, 3068, 1.5, 60000); await walkTo(bot, -4231, 65, 3060, 1.5, 40000); }
    const ok = await walkTo(bot, C.x, C.y, C.z, 2.5, 90000);
    bot.qa.log('altar-walk', { ok, pos: bot.entity.position });
    console.log('WALK', ok, bot.entity.position.toString());
    const bl = bot.blockAt(new Vec3(C.x, C.y - 1, C.z)) || bot.blockAt(new Vec3(C.x, C.y, C.z));
    for (const it of items) {
      const stack = bot.inventory.items().find(i => i.name === it || i.name === it.replace('waterBucket','water_bucket'));
      if (!stack) { console.log('NOITEM', it); continue; }
      await bot.equip(stack, 'hand'); await sleep(500); bot.qa.log('altar-hand', { held: bot.heldItem && bot.heldItem.name });
      // click nearest solid block within 2 of center
      let target = null, best = 9;
      for (let dx = -RAD; dx <= RAD; dx++) for (let dy = -RAD; dy <= RAD; dy++) for (let dz = -RAD; dz <= RAD; dz++) {
        const b = bot.blockAt(new Vec3(C.x + dx, C.y + dy, C.z + dz));
        if (b && b.boundingBox === 'block' && bot.entity.position.distanceTo(b.position.offset(.5, .5, .5)) < 5) { const d = Math.hypot(dx, dy, dz); if (d < best) { best = d; target = b; } }
      }
      const before = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
      if (!target) { console.log('NOBLOCK'); bot.qa.log('altar-error', { why: 'no block', it }); continue; }
      try { await bot.lookAt(target.position.offset(.5, .5, .5)); await bot.activateBlock(target); } catch (e) { bot.qa.log('altar-error', { it, e: e.message }); }
      await sleep(3500);
      const after = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
      const row = { item: it, block: target.name, at: target.position, before, after };
      bot.qa.log('altar-result', row); console.log('ALTAR', JSON.stringify(row));
    }
    console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 240000);
})();
