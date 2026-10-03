// Walk to an NPC, interact once, log dialogue + any packets for N seconds. No progression shortcuts.
const { connect, sleep, inv, setupNav, goToNpc, rightClick } = require('./lib');
const name = process.argv[2] || 'QAexp1', npc = process.argv[3] || 'Example Guide', secs = parseInt(process.argv[4] || '25', 10);
(async () => {
  const bot = connect({ name, tag: 'explore-' + npc.replace(/\s/g, '') });
  setupNav(bot);
  bot.once('spawn', async () => {
    await sleep(17000); // let the first-join tutorial/presentation finish naturally
    const r = await goToNpc(bot, npc);
    bot.qa.log('arrived', { ok: r.ok, pos: bot.entity.position, npcFound: !!r.entity, npcId: r.entity && r.entity.id, npcName: r.entity && (r.entity.username || r.entity.name) });
    if (r.entity) { await rightClick(bot, r.entity, process.argv[5] || 'both'); }
    await sleep(secs * 1000);
    bot.qa.log('inventory', { items: inv(bot) });
    console.log('LOG', bot.qa.file);
    bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 120000);
})();
