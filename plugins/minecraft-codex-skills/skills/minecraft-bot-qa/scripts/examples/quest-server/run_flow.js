// Ordered, deterministic play-through of the extension-relevant story flow. Usage: node run_flow.js <botName> <variantTag>
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const [bot, variant] = [process.argv[2], process.argv[3]];
const steps = [
  ['moses-wheat-livestock', 'scenario_story.js', [bot, `${variant}-f01`, 'Moses,Wheat Farmer,Livestock Farmer', '1']],
  ['altar-offerings',       'scenario_altar.js', [bot, `${variant}-f02`, 'wheat,beef,mutton']],
  ['moses-bucket-welldigger','scenario_story.js', [bot, `${variant}-f03`, 'Moses,Well Digger', '1']],
  ['basin-water',          'scenario_altar.js', [bot, `${variant}-f04`, 'water_bucket', '-4231', '71', '3093', '5']],
  ['aaron-1',              'scenario_story.js', [bot, `${variant}-f05`, 'Aaron', '1']],
  ['aaron-2-lampoil',      'scenario_story.js', [bot, `${variant}-f06`, 'Aaron', '1']],
  ['menorah-fly',          'scenario_menorah.js', [bot, `${variant}-f07`]],
  ['aaron-3-bread-task',   'scenario_story.js', [bot, `${variant}-f08`, 'Aaron', '1']],
  ['aaron-4-q4-teleport',  'scenario_story.js', [bot, `${variant}-f09`, 'Aaron', '1']],
  ['wheat-3x',             'scenario_story.js', [bot, `${variant}-f10`, 'Wheat Farmer', '1']],
  ['craft-bread',          'scenario_bread.js', [bot, `${variant}-f11`]],
  ['offer-showbread',      'scenario_altar.js', [bot, `${variant}-f12`, 'bread', '-4224', '71', '3044', '5']],
  ['wheat-tent-teleport',  'scenario_story.js', [bot, `${variant}-f13`, 'Wheat Farmer', '1']],
  ['aaron-5-book',         'scenario_story.js', [bot, `${variant}-f14`, 'Aaron', '1']],
];
const res = [];
const maxSteps = +(process.env.FLOW_MAX || steps.length);
for (const [label, script, args] of steps.slice(0, maxSteps)) {
  const t0 = Date.now();
  const r = spawnSync('node', [path.join(__dirname, script), ...args], { encoding: 'utf8', timeout: 240000 });
  const lines = (r.stdout || '').split('\n').filter(l => /^(ROW|ALTAR|MENORAH|CRAFT|WALK|NOITEM|NOBLOCK|PREFLY|timeout)/.test(l));
  res.push({ label, script, status: r.status, secs: Math.round((Date.now() - t0) / 1000), lines });
  fs.writeFileSync(path.join(QAP.dir('results'), `${variant}.json`), JSON.stringify({ bot, variant, steps: res }, null, 1));
  console.log('DONE', label, r.status, lines.length);
}
console.log('FLOW COMPLETE');
