const { connect, sleep } = require('../../java/lib');
const name = process.argv[2], tag = process.argv[3] || 'spawn-click';
const strip = s => String(s).replace(/no-index\n+/g, '').replace(/\n{3,}/g, '\n').trim();
(async () => {
  const bot = connect({ name, tag }); const chats = [];
  bot.on('messagestr', m => { const s = strip(m); if (s && !/joined the game|^Welcome/.test(s)) chats.push(s.slice(-160)); });
  bot.once('spawn', async () => {
    await sleep(15000);
    if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(500); }
    chats.length = 0; bot.chat('/tabernacle'); for (let i = 0; i < 30 && !bot.currentWindow; i++) await sleep(100); await sleep(500);
    const p0 = bot.entity.position.clone(); chats.length = 0;
    await bot.clickWindow(16, 0, 0); await sleep(5000);
    console.log('SPAWNCLICK', JSON.stringify({ moved: Math.round(bot.entity.position.distanceTo(p0)), from: p0.toString(), to: bot.entity.position.toString(), chats }));
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 90000);
})();
