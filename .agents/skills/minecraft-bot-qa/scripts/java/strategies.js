// Deterministic, player-like option policy (no model). Prefer progressing answers; avoid "explore/later" dead ends.
const AVOID = /explore|later|not yet|not now|goodbye|\bbye\b|leave|no thanks|never mind/i;
const PREFER = /ready|will help|help|yes|sure|what must|what do|bring|take|accept|offer|give|continue|begin|start|understand|okay|let'?s/i;
function affirm(f) {
  const o = f.options;
  let i = o.findIndex(t => PREFER.test(t) && !AVOID.test(t));
  if (i < 0) i = o.findIndex(t => !AVOID.test(t));
  return i < 0 ? 0 : i;
}
module.exports = { affirm };
