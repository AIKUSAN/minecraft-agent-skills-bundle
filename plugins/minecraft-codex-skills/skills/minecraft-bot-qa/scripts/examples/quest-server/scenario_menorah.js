// Light the menorah by normal play: enter fly1 (Aaron-unlocked flight), rise to the menorah, right-click a block with the lamp oil.
const { connect, sleep, inv, setupNav, walkTo } = require('../../java/lib');
const { Vec3 } = require('vec3');
const name = process.argv[2] || 'QABots1', tag = process.argv[3] || 'menorah';
const C = new Vec3(-4239, 81, 3041), RAD = 5;
(async () => {
  const bot = connect({ name, tag }); setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(14000);
    const out = {};
    out.walkGate = await walkTo(bot, -4231, 65, 3068, 1.5, 60000); out.walkIn = out.walkGate && await walkTo(bot, -4231, 65, 3057, 1.5, 40000);
    out.posIn = bot.entity.position.toString();
    bot.qa.log('menorah-prefly', out); console.log('PREFLY', JSON.stringify(out)); if (!out.walkIn) { bot.quit(); setTimeout(() => process.exit(3), 1000); return; }
    bot.creative.startFlying();
    // find an air cell near the center to hover in
    let spot = null;
    for (const [dx, dy, dz] of [[0,0,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[2,0,0],[-2,0,0],[0,0,2],[0,0,-2]]) {
      const p = C.offset(dx, dy, dz); const b = bot.blockAt(p), b2 = bot.blockAt(p.offset(0, 1, 0));
      if (b && b2 && b.name === 'air' && b2.name === 'air') { spot = p.offset(.5, 0, .5); break; }
    }
    out.spot = spot && spot.toString();
    if (spot) { await bot.creative.flyTo(spot); await sleep(1500); }
    out.posFly = bot.entity.position.toString();
    const stack = bot.inventory.items().find(i => i.name === 'potion');
    if (stack) { await bot.equip(stack, 'hand'); await sleep(300); }
    let target = null, best = 99;
    for (let dx = -RAD; dx <= RAD; dx++) for (let dy = -RAD; dy <= RAD; dy++) for (let dz = -RAD; dz <= RAD; dz++) {
      const p = C.offset(dx, dy, dz); const b = bot.blockAt(p);
      if (b && b.boundingBox === 'block' && Math.hypot(dx, dy, dz) <= RAD) { const d = bot.entity.position.distanceTo(p.offset(.5, .5, .5)); if (d < best && d < 5.5) { best = d; target = b; } }
    }
    const before = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
    if (target) { try { await bot.lookAt(target.position.offset(.5, .5, .5)); await bot.activateBlock(target); } catch (e) { out.err = e.message; } }
    await sleep(4000);
    out.target = target && `${target.name}@${target.position}`; out.before = before; out.after = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
    bot.qa.log('menorah-result', out); console.log('MENORAH', JSON.stringify(out)); console.log('LOG', bot.qa.file);
    bot.creative.stopFlying(); bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 240000);
})();
