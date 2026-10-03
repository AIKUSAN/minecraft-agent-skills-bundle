// Click "Return to Spawn" (slot 16) after the operator has moved the bot away from spawn.
// Sync: bot writes logs/sync-ready-<name>, waits for logs/sync-go-<name>, then clicks.
const QAP = require('../../paths');
const fs = require('fs'), path = require('path');
const { connect, sleep } = require('../../java/lib');
const name = process.argv[2], tag = process.argv[3] || 'spawn-click2';
const strip = s => String(s).replace(/no-index\n+/g, '').replace(/\n{3,}/g, '\n').trim();
const ready = path.join(QAP.dir('logs'), `sync-ready-${name}`), go = path.join(QAP.dir('logs'), `sync-go-${name}`);
(async () => {
  const bot = connect({ name, tag }); const chats = [];
  bot.on('messagestr', m => { const s = strip(m); if (s && !/joined the game|^Welcome/.test(s)) chats.push(s.slice(-160)); });
  bot.once('spawn', async () => {
    await sleep(15000);
    if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(500); }
    fs.writeFileSync(ready, 'ready');
    for (let i = 0; i < 120 && !fs.existsSync(go); i++) await sleep(500);
    await sleep(2500); // let the operator teleport settle
    const p0 = bot.entity.position.clone();
    chats.length = 0; bot.chat('/tabernacle');
    for (let i = 0; i < 30 && !bot.currentWindow; i++) await sleep(100); await sleep(500);
    const opened = !!bot.currentWindow;
    await bot.clickWindow(16, 0, 0); await sleep(4000);
    const p1 = bot.entity.position.clone();
    console.log('SPAWNCLICK2', JSON.stringify({ opened, from: p0.toString(), to: p1.toString(), moved: Math.round(p0.distanceTo(p1)), windowStillOpen: !!bot.currentWindow, chats }));
    bot.quit(); setTimeout(() => process.exit(0), 1000);
  });
  setTimeout(() => process.exit(2), 150000);
})();
