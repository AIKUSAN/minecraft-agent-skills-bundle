const { connect, sleep } = require('./lib');
const bot = connect({ name: 'qa-bot', tag: 'auth' });
bot.once('spawn', async () => { await sleep(3000); console.log('AUTH-OK ' + bot.username); bot.quit(); setTimeout(() => process.exit(0), 1000); });
setTimeout(() => { console.log('timeout'); process.exit(2); }, 600000);
