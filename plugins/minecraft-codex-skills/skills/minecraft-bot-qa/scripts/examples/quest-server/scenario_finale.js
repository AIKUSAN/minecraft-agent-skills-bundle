// Finale in ONE session: get/sign prayer book, offer it at the incense altar, return to Aaron, Angel quiz (one wrong answer first), Leave.
const QAP = require('../../paths');
const { connect, sleep, inv, setupNav, walkTo } = require('../../java/lib');
const { converse } = require('../../java/dialogue');
const { affirm } = require('../../java/strategies');
const { Vec3 } = require('vec3');
const name = process.argv[2] || 'QABotfin2', tag = process.argv[3] || 'finale';
const ALT = { x: -4231, y: 65, z: 3027 }; // objective target for tabernacle_objective_offerbook
const stack = bot => bot.inventory.items().map(i => `${i.name}x${i.count}`).join(',');
(async () => {
  const bot = connect({ name, tag }); setupNav(bot); const out = { steps: [] };
  const rec = (label, d) => { out.steps.push({ label, ...d }); bot.qa.log('finale-' + label, d); console.log('STEP', label, JSON.stringify(d).slice(0, 600)); };
  bot.once('spawn', async () => {
    try {
      await sleep(15000);
      if (bot.currentWindow) { try { bot.closeWindow(bot.currentWindow); } catch (e) {} await sleep(500); }
      rec('start', { inv: stack(bot), pos: bot.entity.position });
      // 1. book
      let book = bot.inventory.items().find(i => i.name === 'writable_book' || i.name === 'written_book');
      if (!book) { const r = await converse(bot, 'Aaron', f => (f.isOptions ? affirm(f) : 'continue'), { maxSteps: 30 }); await sleep(2500); rec('aaron-for-book', { ok: r.ok, steps: r.steps.length, inv: stack(bot) }); book = bot.inventory.items().find(i => i.name === 'writable_book'); }
      // 2. write + sign
      if (book && book.name === 'writable_book') {
        try { await bot.signBook(book.slot, ['Lord, thank You for this pilgrimage. Amen.'], bot.username, 'Prayer'); await sleep(2000); rec('sign-book', { ok: true, inv: stack(bot) }); }
        catch (e) { rec('sign-book', { ok: false, err: String(e).slice(0, 200), inv: stack(bot) }); }
      }
      // 3. offer at altar
      const held = bot.inventory.items().find(i => i.name === 'written_book') || bot.inventory.items().find(i => i.name === 'writable_book');
      if (held) {
        let ok = false; for (const [wp, rg] of [[[-4231,65,3068],1.5],[[-4231,65,3060],1.5],[[ALT.x,ALT.y,ALT.z],2.5]]) { for (let t = 0; t < 2; t++) { ok = await walkTo(bot, wp[0], wp[1], wp[2], rg, 70000); if (ok) break; await sleep(1500); } rec('walk-wp', { wp, ok, pos: bot.entity.position }); }
        await bot.equip(held, 'hand'); await sleep(500);
        let target = null, best = 9;
        for (let dx = -5; dx <= 5; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -5; dz <= 5; dz++) { const b = bot.blockAt(new Vec3(ALT.x + dx, ALT.y + dy, ALT.z + dz)); if (b && b.boundingBox === 'block' && bot.entity.position.distanceTo(b.position.offset(.5, .5, .5)) < 5) { const d = Math.hypot(dx, dy, dz); if (d < best) { best = d; target = b; } } }
        const before = stack(bot);
        if (target) { await bot.lookAt(target.position.offset(.5, .5, .5)); await bot.activateBlock(target); await sleep(4500); }
        rec('offer-book', { walked: ok, block: target && target.name, before, after: stack(bot), pos: bot.entity.position });
      } else rec('offer-book', { skipped: 'no book in inventory', inv: stack(bot) });
      // 4. Aaron after offering
      const ra = await converse(bot, 'Aaron', f => (f.isOptions ? affirm(f) : 'continue'), { maxSteps: 30 }); await sleep(2500);
      rec('aaron-after-offer', { ok: ra.ok, why: ra.why, steps: ra.steps.length, last: (ra.steps[ra.steps.length - 1] || {}).text, inv: stack(bot) });
      // 5. Angel
      let wrongDone = false; const trace = [];
      const pick = f => { if (!f.isOptions) return 'continue'; const o = f.options; const find = re => o.findIndex(t => re.test(t)); let i = -1, why = 'affirm';
        if (find(/golden lampstand/i) >= 0) { if (!wrongDone) { wrongDone = true; i = find(/golden lampstand/i); why = 'q1-wrong-first'; } else { i = find(/Ark of the Covenant/i); why = 'q1-correct'; } }
        else if (find(/Aaron's rod/i) >= 0) { i = find(/Aaron's rod/i); why = 'q2-correct'; }
        else if (find(/no other gods/i) >= 0) { i = find(/no other gods/i); why = 'q3-correct'; }
        if (i < 0) i = affirm(f); trace.push({ q: (f.text || '').slice(0, 80), picked: o[i], why }); return i; };
      const p0 = bot.entity.position.clone();
      const rg = await converse(bot, 'Angel', pick, { maxSteps: 70 }); await sleep(6000);
      rec('angel', { ok: rg.ok, why: rg.why, steps: rg.steps.length, trace, last: (rg.steps[rg.steps.length - 1] || {}).text, moved: Math.round(bot.entity.position.distanceTo(p0)), pos: bot.entity.position, inv: stack(bot) });
    } catch (e) { rec('fatal', { err: String(e && e.stack || e).slice(0, 500) }); }
    require('fs').writeFileSync(require('path').join(QAP.dir('results'), `finale-${tag}.json`), JSON.stringify(out, null, 1));
    console.log('LOG', bot.qa.file); bot.quit(); setTimeout(() => process.exit(0), 1500);
  });
  setTimeout(() => { console.log('timeout'); try { require('fs').writeFileSync(require('path').join(QAP.dir('results'), `finale-${tag}-partial.json`), JSON.stringify(out, null, 1)); } catch (e) {} process.exit(2); }, 900000);
})();
