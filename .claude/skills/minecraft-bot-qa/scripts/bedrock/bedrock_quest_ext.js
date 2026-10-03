// Extension loaded by bedrock_quest.js: crafting/container support. Exposes verbs through the shared acts table.
module.exports = function (c, S, acts, emit, J, itemName, held) {
  c.on('item_registry', p => { for (const s of (p.itemstates || [])) S.items[s.runtime_id] = s.name; emit('item_registry', { items: Object.keys(S.items).length }); });
  c.on('crafting_data', p => {
    S.recipes = S.recipes || [];
    const bread = Object.entries(S.items).find(([, n]) => n === 'minecraft:bread');
    S.breadId = bread ? +bread[0] : null;
    for (const r of [...(p.shaped_recipes || []), ...(p.shapeless_recipes || [])]) {
      const o = r.recipe || r; const outs = o.output || o.outputs || [];
      if (S.breadId != null && outs.some && outs.some(it => it && it.network_id === S.breadId)) { S.recipes.push(J(o).slice(0, 1500)); S.breadRecipe = o; }
    }
    emit('crafting_data', { total: (p.shaped_recipes || []).length, breadId: S.breadId, found: !!S.breadRecipe, recipe: S.breadRecipe ? J(S.breadRecipe).slice(0, 700) : null });
  });
  c.on('container_open', p => { S.win = { id: p.window_id, type: p.window_type, pos: p.coordinates }; emit('container_open', { id: p.window_id, type: p.window_type, pos: p.coordinates }); });
  c.on('container_close', p => { emit('container_close', { id: p.window_id }); });
  c.on('item_stack_response', p => emit('stack_response', { r: J(p).slice(0, 700) }));
  c.on('inventory_content', p => { if (p.window_id !== 'inventory' && p.window_id !== 0) emit('win_content', { win: p.window_id, items: (p.input || []).map((it, i) => it && it.network_id ? i + ':' + itemName(it) + 'x' + it.count + '#' + it.stack_id : null).filter(Boolean) }); });
  acts.ir = async (a) => { // raw item_stack_request: a.json = array of requests
    const reqs = JSON.parse(a.json || a.t); c.write('item_stack_request', { requests: reqs }); emit('act', { a: 'ir', n: reqs.length }); return { sent: reqs.length };
  };
  S.signs = S.signs || {};
  c.on('block_entity_data', p => {
    try {
      S.beTypes = S.beTypes || {}; const id0 = p.nbt && p.nbt.value && p.nbt.value.id && p.nbt.value.id.value; S.beTypes[id0] = (S.beTypes[id0] || 0) + 1; if (!S.beSample) S.beSample = {}; if (!S.beSample[id0]) S.beSample[id0] = J(p.nbt).slice(0, 900);
      const v = p.nbt && p.nbt.value; if (!v) return;
      const grab = o => { const tx = o && o.value && o.value.Text; return tx ? String(tx.value).replace(/§./g, '') : null; };
      const front = grab(v.FrontText), back = grab(v.BackText), legacy = v.Text ? String(v.Text.value).replace(/§./g, '') : null;
      const t = front || legacy; if (t) S.signs[p.position.x + ',' + p.position.y + ',' + p.position.z] = { front: t, back };
    } catch (e) {}
  });
  acts.signs = async (a) => { const cx = +(a.x || S.me.pos.x), cz = +(a.z || S.me.pos.z), r = +(a.r || 60); return Object.entries(S.signs).filter(([k]) => { const [x, , z] = k.split(',').map(Number); return Math.hypot(x - cx, z - cz) <= r; }).map(([k, v]) => ({ at: k, front: v.front })); };  acts.betypes = async () => ({ types: S.beTypes, sample: S.beSample });
  acts.recipes = async () => ({ breadId: S.breadId, recipe: S.breadRecipe ? JSON.parse(J(S.breadRecipe)) : null, win: S.win });
  acts.invraw = async () => S.inv.map((it, i) => it && it.network_id ? { slot: i, name: itemName(it), count: it.count, stack: it.stack_id } : null).filter(Boolean);
};
