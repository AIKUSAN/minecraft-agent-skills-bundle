// Craft bread from the three granted wheat at the tabernacle crafting table, then offer it at the show-bread table.
const { connect, sleep, inv, setupNav, walkTo } = require('../../java/lib');
const { Vec3 } = require('vec3');
const name = process.argv[2] || 'LOPQAs1', tag = process.argv[3] || 'bread';
const C = new Vec3(-4224, 71, 3044);
(async () => {
  const bot = connect({ name, tag }); setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(14000);
    if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(500); }
    const out = { start: inv(bot).map(i => `${i.n}x${i.c}`).join(','), pos: bot.entity.position.toString() };
    // locate a crafting table nearby the show-bread site
    const tables = bot.findBlocks({ matching: b => b && b.name === 'crafting_table', maxDistance: 128, count: 40 });
    out.tables = tables.map(p => p.toString()).slice(0,6);
    out.fromWhere = bot.entity.position.toString();
    console.log('PRE', JSON.stringify(out));
    bot.qa.log('bread-pre', out);
    if (tables.length) {
      const t = bot.blockAt(tables.sort((a, b) => a.distanceTo(new Vec3(-4215,65,3225)) - b.distanceTo(new Vec3(-4215,65,3225)))[0]);
      out.table = `${t.position}`;
      await walkTo(bot, t.position.x, t.position.y, t.position.z, 2, 40000);
      out.walkedTo = bot.entity.position.toString();
      for (let attempt = 1; attempt <= 6; attempt++) {
        if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(500); }
        const recipes = bot.recipesFor(bot.registry.itemsByName.bread.id, null, 1, t);
        out.recipes = recipes.length;
        if (recipes.length) { try { await bot.craft(recipes[0], 1, t); } catch (e) { out.craftErr = e.message; } }
        await sleep(2500);
        out.afterCraft = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
        out.attempts = attempt;
        if (out.afterCraft === 'breadx1') break;
      }
    }
    if (tables.length && out.afterCraft !== 'breadx1') {
      // Fallback: craft by hand like a player: place 3 wheat in the top row, shift-click the bread result.
      try {
        const t2 = bot.blockAt(tables.sort((a, b) => a.distanceTo(bot.entity.position) - b.distanceTo(bot.entity.position))[0]);
        for (let round = 1; round <= 3 && out.afterCraft !== 'breadx1'; round++) {
          if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(600); }
          const win = await bot.openBlock(bot.blockAt(new Vec3(...out.table.replace(/[()]/g, '').split(',').map(Number))));
          await sleep(900);
          for (let g = 1; g <= 3; g++) {
            const src = win.slots.findIndex((sl, i) => i >= 10 && sl && sl.name === 'wheat');
            if (src < 0) break;
            await bot.clickWindow(src, 0, 0); await sleep(350);
            await bot.clickWindow(g, 0, 0); await sleep(450);
          }
          await sleep(1200);
          out.manualResult = win.slots[0] ? `${win.slots[0].name}x${win.slots[0].count}` : 'none';
          if (win.slots[0]) { await bot.clickWindow(0, 0, 1); await sleep(900); }
          try { bot.closeWindow(win); } catch (e) {} await sleep(1200);
          out.afterCraft = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
          out.manualRound = round;
        }
      } catch (e) { out.manualErr = e.message; }
    }
    console.log('CRAFT', JSON.stringify(out)); bot.qa.log('bread-craft', out);
    console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 240000);
})();
