const { connect, sleep, inv, setupNav } = require('../../java/lib');
const { converse } = require('../../java/dialogue');
const name = process.argv[2] || 'LOPQAm1';
const pickArg = (process.argv[3] || '0').split(',').map(x => x === 'c' ? 'continue' : parseInt(x, 10));
(async () => {
  const bot = connect({ name, tag: 'moses-open' });
  setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(16000);
    let i = 0;
    const r = await converse(bot, 'Moses', (f, s) => (f.isOptions ? (typeof pickArg[i] === 'number' ? pickArg[i++] : (i++, 0)) : 'continue'), { maxSteps: 30 });
    bot.qa.log('result', { ok: r.ok, why: r.why, nSteps: r.steps.length });
    await sleep(2500);
    bot.qa.log('inventory', { items: inv(bot) });
    console.log('RESULT', JSON.stringify({ ok: r.ok, why: r.why, steps: r.steps.map(s => ({ sp: s.speaker, t: (s.text || '').slice(0, 90), opts: s.options, pick: s.pick })) }, null, 1));
    console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 170000);
})();
