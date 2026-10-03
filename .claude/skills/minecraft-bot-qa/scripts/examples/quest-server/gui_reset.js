const { connect, sleep, inv } = require('../../java/lib');
const name = process.argv[2];
const strip = s => String(s).replace(/no-index\n+/g, '').replace(/\n{3,}/g, '\n').trim();
(async () => {
  const bot = connect({ name, tag: 'gui-reset' }); const chats = [];
  bot.on('messagestr', m => { const s = strip(m); if (s && !/joined the game|^Welcome/.test(s)) chats.push(s.slice(-170)); });
  const open = async () => { if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(500); } bot.chat('/tabernacle'); for (let i = 0; i < 30 && !bot.currentWindow; i++) await sleep(100); await sleep(600); };
  bot.once('spawn', async () => {
    await sleep(15000);
    const invBefore = inv(bot).map(i => `${i.n}x${i.c}`).join(',');
    await open(); await bot.clickWindow(14, 0, 0); await sleep(1800); chats.length = 0;
    await bot.clickWindow(11, 0, 0); await sleep(6000);
    console.log('RESET', JSON.stringify({ invBefore, invAfter: inv(bot).map(i => `${i.n}x${i.c}`).join(','), windowOpen: !!bot.currentWindow, chats }));
    chats.length = 0; await open(); await bot.clickWindow(12, 0, 0); await sleep(1800);
    const w = bot.currentWindow; const lore = w ? w.slots.filter(Boolean).filter(s => s.name === 'gold_ingot').map(s => JSON.stringify(s.components || []).match(/"value":"(\d\/\d)[^"]*"/)?.[1]) : null;
    console.log('AFTER', JSON.stringify({ steps: lore, chats }));
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 120000);
})();
