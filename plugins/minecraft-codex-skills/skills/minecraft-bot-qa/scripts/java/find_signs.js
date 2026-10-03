// Read-only: list sign block entities (with text) from a region folder. Usage: node find_signs.js <regionDir> [filterRegex]
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const nbt = require('prismarine-nbt');
const dir = process.argv[2], re = process.argv[3] ? new RegExp(process.argv[3], 'i') : null;
const txt = v => { try { const j = JSON.parse(v); if (typeof j === 'string') return j; const parts = [j.text || '', ...(j.extra || []).map(e => typeof e === 'string' ? e : e.text || '')]; return parts.join(''); } catch (e) { return String(v).replace(/^"|"$/g, ''); } };
(async () => {
  for (const f of fs.readdirSync(dir).filter(n => /\.mca$/.test(n))) {
    const buf = fs.readFileSync(path.join(dir, f));
    for (let i = 0; i < 1024; i++) {
      const off = buf.readUIntBE(i * 4, 3) * 4096; if (!off) continue;
      const len = buf.readUInt32BE(off), ct = buf[off + 4]; const data = buf.subarray(off + 5, off + 4 + len);
      let raw; try { raw = ct === 2 ? zlib.inflateSync(data) : ct === 1 ? zlib.gunzipSync(data) : data; } catch (e) { continue; }
      let parsed; try { parsed = (await nbt.parse(raw)).parsed; } catch (e) { continue; }
      const root = nbt.simplify(parsed); const bes = root.block_entities || (root.Level && root.Level.TileEntities) || [];
      for (const be of bes) {
        if (!/sign/i.test(String(be.id))) continue;
        const front = be.front_text && be.front_text.messages ? be.front_text.messages.map(txt) : [], back = be.back_text && be.back_text.messages ? be.back_text.messages.map(txt) : [];
        const line = `${f} (${be.x},${be.y},${be.z}) ${be.id} FRONT[${front.join(' | ')}] BACK[${back.filter(Boolean).join(' | ')}]`;
        if (!re || re.test(line)) console.log(line);
      }
    }
  }
})();
