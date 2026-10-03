// Output locations shared by every bot script. Nothing is written inside the skill folder.
// Set QA_OUT_DIR to choose where logs, results and sign-in caches go (default: ./.bot-qa in the current directory).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.QA_OUT_DIR || path.join(process.cwd(), '.bot-qa'));

function dir(...parts) {
  const d = path.join(ROOT, ...parts);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

module.exports = { ROOT, dir };
