# Java Bots Reference

The Java kit uses [Mineflayer](https://github.com/PrismarineJS/mineflayer) with `mineflayer-pathfinder`. Scripts live
in `scripts/java/`. Every script is deterministic: no model decides what the bot does.

## Core Helpers (`lib.js`)

| Export | What it does |
|---|---|
| `connect({ name, host, port, tag })` | Creates the bot, opens a JSON-lines log, and records chat, spawn, health, windows, kicks, titles and form-like packets |
| `sleep(ms)` | Promise delay |
| `inv(bot)` | Inventory as a plain list |
| `setupNav(bot)`, `walkTo(bot, x, y, z, range, timeoutMs)` | Pathfinding without digging |
| `goToNpc(bot, name)`, `findNpcEntity(bot, name)` | Walk to an NPC and find its entity by spawn point |
| `rightClick(bot, entity, mode)` | Sends the same interact packets a vanilla client sends (`at` then plain) |

Environment: `QA_HOST`, `QA_PORT` (default `127.0.0.1:25565`), `QA_AUTH` (`offline` or `microsoft`), `QA_VERSION`
(optional; leave unset to auto-detect), `QA_NPCS` (path to an NPC JSON), `QA_OUT_DIR`.

With `QA_AUTH=microsoft` the device code is written to `logs/msa-code.txt` under `QA_OUT_DIR` and tokens are cached
in `auth-cache/`. Delete that folder when you are done.

## NPC Files

NPCs made from packets (fake players) have no fixed entity id, so the kit finds them by distance to their spawn
point. List them once:

```json
{
  "Example Guide": [0, 64, 0],
  "Example Merchant": [10, 64, 5]
}
```

Run with `QA_NPCS=./my-npcs.json`.

## Dialogue Driver (`dialogue.js`)

Drives Typewriter-style chat dialogue: the plugin draws a text frame in chat, you scroll the hotbar to change the
option and jump to confirm. `converse` reads each frame, picks an option through `strategies.js`, and logs the
speaker, text and chosen option. `strategies.js` prefers progressing answers ("ready", "help", "yes") and avoids dead
ends ("later", "goodbye") with plain regular expressions. Edit the two patterns for your story.

If your dialogue plugin draws something different, copy `dialogue.js` and replace `parseFrame`; the rest of the flow
stays the same.

## Probes (read-only)

| Script | Use |
|---|---|
| `auth_only.js` | Prove the sign-in works, then quit |
| `probe.js <name>` | Join, log everything for a while, print the inventory |
| `probe_inv.js <name>` | Print the inventory |
| `probe_sign.js <name> <tag>` | Read a nearby sign |
| `probe_find.js <name> <regex>` | Find blocks or entities by pattern |
| `probe_area.js`, `probe_col.js`, `probe_map.js` | Scan an area, a column, or a map slice |
| `probe_gui_text.js <name>` | Read the text of an open chest GUI |
| `explore_npc.js <name> <npc> <seconds>` | Walk to an NPC, interact once, log everything |
| `find_signs.js <regionDir> [regex]` | List sign text from region files without joining |

## Building A Scenario

```js
const { connect, sleep, setupNav, goToNpc, rightClick } = require('./lib');

const bot = connect({ name: 'MyJavaTester', tag: 'guide' });
setupNav(bot);
bot.once('spawn', async () => {
  const { entity } = await goToNpc(bot, 'Example Guide');
  if (entity) await rightClick(bot, entity);
  await sleep(5000);
  bot.quit();
  setTimeout(() => process.exit(0), 1000);
});
```

Log events with `bot.qa.log('type', { ... })`. Write a results JSON for the judges, then judge it. The worked example
shows full scenarios: [quest-server-example.md](quest-server-example.md).

## Chest GUI Click-Through

Open the menu command, read `bot.currentWindow`, click each slot with `bot.clickWindow(slot, 0, 0)`, and record what
changed: a new window title, new chat lines, or movement. Mark decorative tiles as "must stay inert" and real buttons
as "must respond". The example scripts `scenario_gui.js` and `gui_dev.js` do this; their expectations are specific to
one server, so copy the loop and write your own expectations.
