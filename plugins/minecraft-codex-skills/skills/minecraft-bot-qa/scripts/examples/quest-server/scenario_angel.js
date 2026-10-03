// Angel quiz: one wrong answer first (must loop back to question 1), then the three correct answers, then Leave. Deterministic.
const { connect, sleep, inv, setupNav, walkTo } = require('../../java/lib');
const { converse } = require('../../java/dialogue');
const { affirm } = require('../../java/strategies');
const name = process.argv[2] || 'LOPQAfin', tag = process.argv[3] || 'angel';
(async () => {
  const bot = connect({ name, tag }); setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(16000);
    let q1wrongDone = false; const trace = [];
    const pick = f => {
      if (!f.isOptions) return 'continue';
      const o = f.options; const find = re => o.findIndex(t => re.test(t));
      let i = -1, why = 'affirm';
      if (find(/golden lampstand/i) >= 0) { if (!q1wrongDone) { q1wrongDone = true; i = find(/golden lampstand/i); why = 'q1-wrong-first'; } else { i = find(/Ark of the Covenant/i); why = 'q1-correct'; } }
      else if (find(/Aaron's rod/i) >= 0) { i = find(/Aaron's rod/i); why = 'q2-correct'; }
      else if (find(/no other gods/i) >= 0) { i = find(/no other gods/i); why = 'q3-correct'; }
      if (i < 0) i = affirm(f);
      trace.push({ q: (f.text || '').slice(0, 70), picked: o[i], why }); return i;
    };
    for (const [x, y, z, r, t] of [[-4231, 65, 3068, 1.5, 60000], [-4231, 65, 3060, 1.5, 40000], [-4231, 65, 3030, 2, 60000], [-4230.5, 65, 3012, 2, 60000]]) { const ok = await walkTo(bot, x, y, z, r, t); bot.qa.log('angel-walk', { x, z, ok, pos: bot.entity.position }); }
    const p0 = bot.entity.position.clone(); const before = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
    let res; try { res = await converse(bot, 'Angel', pick, { maxSteps: 60 }); } catch (e) { res = { ok: false, why: 'exception: ' + e.message, steps: [] }; }
    await sleep(6000);
    const out = { ok: res.ok, why: res.why, steps: res.steps.length, lastSpoken: (res.steps[res.steps.length - 1] || {}).text, trace, moved: Math.round(bot.entity.position.distanceTo(p0)), pos: bot.entity.position, before, after: inv(bot).map(i => `${i.n}x${i.c}`).join(',') };
    bot.qa.log('angel-result', out); console.log('ROW', JSON.stringify(out)); console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 420000);
})();
