// Story walker: repeatedly visit NPCs in order, affirm everything, log inventory/position deltas, stop when a full round yields no progress.
const { connect, sleep, inv, setupNav } = require('../../java/lib');
const { converse } = require('../../java/dialogue');
const { affirm } = require('../../java/strategies');
const name = process.argv[2] || 'LOPQAs1';
const tag = process.argv[3] || 'story';
const order = (process.argv[4] || 'Moses,Wheat Farmer,Livestock Farmer,Well Digger,Moses,Aholiab,Aaron,Angel').split(',');
const rounds = parseInt(process.argv[5] || '2', 10);
(async () => {
  const bot = connect({ name, tag });
  setupNav(bot);
  const report = [];
  bot.once('spawn', async () => {
    await sleep(16000);
    for (let r = 0; r < rounds; r++) for (const npc of order) {
      const before = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
      const p0 = bot.entity.position.clone();
      let res;
      try { res = await converse(bot, npc, (f) => (f.isOptions ? affirm(f) : 'continue'), { maxSteps: 30 }); }
      catch (e) { res = { ok: false, why: 'exception: ' + e.message, steps: [] }; }
      await sleep(2500);
      const after = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
      const p1 = bot.entity.position;
      const row = { round: r, npc, ok: res.ok, why: res.why, steps: res.steps.length, lastSpoken: (res.steps[res.steps.length-1]||{}).text, picks: res.steps.filter(s => s.options.length).map(s => s.options[s.pick]), inventoryBefore: before, inventoryAfter: after, moved: Math.round(p0.distanceTo(p1)) };
      report.push(row); bot.qa.log('npc-result', row);
      console.log('ROW', JSON.stringify(row));
    }
    console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 600000);
})();
