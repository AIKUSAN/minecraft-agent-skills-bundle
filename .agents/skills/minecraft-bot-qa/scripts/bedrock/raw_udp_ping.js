// Raw RakNet "unconnected ping" over UDP (no library). Prints whether any reply came back, never the address.
const dgram = require('dgram');
const host = process.env.BEDROCK_HOST, port = +(process.env.BEDROCK_PORT || 19132);
const magic = Buffer.from('00ffff00fefefefefdfdfdfd12345678', 'hex');
const t = Buffer.alloc(8); t.writeBigInt64BE(BigInt(Date.now()));
const pkt = Buffer.concat([Buffer.from([0x01]), t, magic, Buffer.alloc(8)]);
const s = dgram.createSocket('udp4'); let got = false;
s.on('message', m => { got = true; console.log('RAW reply id=0x' + m[0].toString(16), 'len=' + m.length, 'text=' + m.slice(35).toString('utf8').replace(/[\x00-\x1f]/g, '|').slice(0, 160)); });
s.on('error', e => console.log('RAW socket error', e.code));
for (let i = 0; i < 4; i++) setTimeout(() => s.send(pkt, port, host), i * 1500);
setTimeout(() => { if (!got) console.log('RAW no reply after 4 pings'); s.close(); process.exit(got ? 0 : 2); }, 9000);
