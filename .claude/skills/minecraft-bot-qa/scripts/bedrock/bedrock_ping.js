// Reachability check: RakNet ping of the Geyser UDP port. Prints MOTD/version/players only (never the address).
const bedrock = require('bedrock-protocol');
const host = process.env.BEDROCK_HOST, port = +(process.env.BEDROCK_PORT || 19132);
const t = setTimeout(() => { console.log('PING timeout: no reply from the Geyser UDP port (closed, wrong port, or blocked)'); process.exit(2); }, 12000);
bedrock.ping({ host, port, raknetBackend: require('./bedrock_lib').raknetBackend() }).then(r => { clearTimeout(t); console.log('PING ok', JSON.stringify({ motd: r.motd, levelName: r.levelName, version: r.version, protocol: r.protocol, players: r.playersOnline + '/' + r.playersMax, gamemode: r.gamemode })); process.exit(0); }).catch(e => { clearTimeout(t); console.log('PING error', String(e && e.message || e).slice(0, 200)); process.exit(1); });
