// Reads CommandPanels-style menu YAML (the source of truth) and returns the expected form structure.
// Env: PANEL_DIR (folder of .yml files, default ../samples/panels), PANEL_FILES (optional comma list of file names without .yml)
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const DEFAULT_DIR = path.join(__dirname, '..', 'samples', 'panels');

function load(dir = process.env.PANEL_DIR || DEFAULT_DIR) {
  const wanted = process.env.PANEL_FILES ? process.env.PANEL_FILES.split(',').map(s => s.trim()).filter(Boolean) : null;
  const panels = {};
  if (!fs.existsSync(dir)) throw new Error('PANEL_DIR not found: ' + dir);
  for (const file of fs.readdirSync(dir).sort()) {
    if (!/\.ya?ml$/i.test(file)) continue;
    const key = file.replace(/\.ya?ml$/i, '');
    if (wanted && !wanted.includes(key)) continue;
    const y = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!y || !y.layout || !y.items) continue; // not a panel file
    const order = Object.keys(y.layout).sort((a, b) => +a - +b).flatMap(k => y.layout[k]);
    const buttons = order.map(id => ({ id, name: y.items[id].name, actions: (y.items[id].actions && y.items[id].actions.commands) || [] }));
    panels[key] = { title: y.title, content: y.subtitle || '', buttons };
  }
  return panels;
}
module.exports = { load };
if (require.main === module) { const p = load(); for (const [k, v] of Object.entries(p)) console.log(k, '|', v.title, '|', v.buttons.map(b => b.name).join(' / ')); }
