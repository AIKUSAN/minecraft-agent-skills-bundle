// Early story: Moses opening -> Wheat Farmer -> Livestock Farmer. Logs per-NPC dialogue and inventory deltas.
const { connect, sleep, inv, setupNav } = require('../../java/lib');
const { converse } = require('../../java/dialogue');
const { affirm } = require('../../java/strategies');
const name = process.argv[2] || 'LOPQAe1';
const tag = process.argv[3] || 'early';
const npcs = (process.argv[4] || 'Moses,Wheat Farmer,Livestock Farmer').split(',');
(async () => {
  const bot = connect({ name, tag });
  setupNav(bot);
  const report = [];
  bot.once('spawn', async () => {
    await sleep(16000);
    for (const npc of npcs) {
      const before = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
      const r = await converse(bot, npc, (f) => (f.isOptions ? affirm(f) : 'continue'), { maxSteps: 25 });
      await sleep(2500);
      const after = inv(bot).map(i => `${i.n}x${i.c}[${i.d}]`).join(',');
      report.push({ npc, ok: r.ok, why: r.why, steps: r.steps.length, picks: r.steps.filter(s => s.options.length).map(s => s.options[s.pick] ), inventoryBefore: before, inventoryAfter: after });
      bot.qa.log('npc-result', report[report.length - 1]);
    }
    console.log('REPORT', JSON.stringify(report, null, 1));
    console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); console.log('REPORT', JSON.stringify(report)); process.exit(2); }, 240000);
})();
