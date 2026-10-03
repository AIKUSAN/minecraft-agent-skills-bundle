# Bedrock Bots Reference

The Bedrock kit uses [bedrock-protocol](https://github.com/PrismarineJS/bedrock-protocol) and joins through
Geyser (with Floodgate for Bedrock identities). Scripts live in `scripts/bedrock/`.

## Files

| File | Purpose |
|---|---|
| `bedrock_lib.js` | `connectBedrock`, `runCommand`, `answerForm`, `closeForm`, `waitFor`, JSON-lines event log, RakNet backend fallback |
| `bedrock_expected.js` | Reads CommandPanels-style YAML into the expected form structure |
| `bedrock_gui.js` | Presses every button of every form, depth-first, and writes a results JSON |
| `bedrock_mock_server.js` | Mock server that serves your YAML as forms, for testing the tools only |
| `bedrock_ping.js`, `raw_udp_ping.js` | Reachability checks for the Geyser UDP port |
| `bedrock_quest.js`, `bedrock_quest_ext.js` | Quest bot with control API, crafting and container support |
| `quest_dashboard.html`, `qh.ps1` | Live timeline page and PowerShell shortcuts for the control API |

## Environment

| Variable | Meaning | Default |
|---|---|---|
| `BEDROCK_HOST`, `BEDROCK_PORT` | Geyser address | `127.0.0.1`, `19132` |
| `BEDROCK_AUTH` | `microsoft` or `offline` | `offline` |
| `BEDROCK_VERSION` | Pin the client version if Geyser lags | auto-detect |
| `BEDROCK_WAIT` | `spawn` or `join` (use `join` for the mock server) | `spawn` |
| `BEDROCK_FORM_NL` | `1` appends a newline to form answers | off |
| `BEDROCK_RAKNET` | `raknet-native`, `jsp-raknet` or `raknet-node` | native if built, else pure JS |
| `MENU_COMMAND` | Command that opens the root menu | `/menu` |
| `MENU_DESTRUCTIVE` | Regex of buttons that are never pressed | reset, delete, wipe, erase, purge |
| `MENU_LATE` | Regex of buttons pressed last | replay, exit, leave, quit |
| `PANEL_DIR`, `PANEL_FILES` | Menu YAML folder and optional file list | bundled samples |
| `BEDROCK_PANEL_GAP_MS` | Pause between panel opens | `5000` |
| `QA_OUT_DIR` | Where logs, results and token caches go | `./.bot-qa` |

## Signing In With Microsoft

1. Start the bot with `BEDROCK_AUTH=microsoft`.
2. The bot writes a device code and link to `logs/msa-code-bedrock.txt`. Share the code with the account owner.
3. The owner opens the link, enters the code, and approves. The bot continues.
4. Tokens are cached in `auth-cache-bedrock/`. Reuse them for later runs, and delete the folder when you are done.

The account is a separate identity from any Java account. With Floodgate it appears on the Java side with a prefix such
as `.Name`. That prefix is a deliberate marker for Bedrock players, not a bug. Use the prefixed name in permissions and
quest-reset commands.

## Menu Click-Through

```bash
export PANEL_DIR=./path/to/your/panels
node ./scripts/bedrock/bedrock_gui.js MyBedrockTester RUN1
```

For each form the bot records title, content and buttons, then presses every button, recording the next form and any
chat lines. A button that matches `MENU_DESTRUCTIVE` is listed but skipped. If CommandPanels says you are opening
panels too quickly, the bot retries once; raise `BEDROCK_PANEL_GAP_MS` if it keeps happening.

A panel file needs `title`, `layout` and `items`. Buttons come from `layout` in row order:

```yaml
title: Server Menu
subtitle: Welcome, %player_name%.
layout:
  0: [rules, close]
items:
  rules:
    name: Server Rules
    actions:
      commands:
        - "[open] rules_menu"
  close:
    name: Close
    actions:
      commands:
        - "[close]"
```

## Quest Bot Control API

`bedrock_quest.js` listens on `127.0.0.1:8777` (`CTRL_PORT` changes it).

| Route | Meaning |
|---|---|
| `GET /do?c=<verb args>` | Run one verb, a JSON object, or a JSON array of verbs in order |
| `GET /state` | Position, held item, inventory, last form, entity count |
| `GET /events` | Server-sent event stream |
| `GET /` | Live timeline dashboard |

Verbs: `sleep`, `state`, `nearby`, `hotbar`, `click`, `block`, `air`, `form`, `cmd`, `say`, `book`, `since`, `fly`,
`flags`, `itemmode`, `raw`, `invraw`, `recipes`, `signs`, `ir`. Examples:

```bash
curl "http://127.0.0.1:8777/do?c=nearby%208"
curl "http://127.0.0.1:8777/do?c=hotbar%20n=2"
curl "http://127.0.0.1:8777/do?c=click%20q=Guide"
curl "http://127.0.0.1:8777/do?c=block%20x=10%20y=64%20z=5%20face=1"
curl "http://127.0.0.1:8777/do?c=form%20i=0"
```

`click` finds an entity by name or id and sends an interact packet. `block` right-clicks a block face with the held
item. `form` answers the last form by button index, or closes it. `book` edits and optionally signs a book.

## Protocol Lessons

Hard-won facts from driving a real Geyser server with a bot. They are specific to the versions noted; re-check after upgrades.

- **Send movement input.** Geyser ignores block clicks unless the client keeps sending `player_auth_input`. The quest bot sends it every 200 ms. Faster than about 5 Hz gets the bot kicked for sending too many packets.
- **Re-encode held items.** Echoing an item back verbatim produces an "Illegal packet" error about the stack id. Rebuild the item for `mob_equipment`; `itemmode` toggles the encoding variant if a version needs the other one.
- **Block clicks have a distance check; entity clicks do not.** An `item_use_on_entity` interact works from any range, so verify the player-reachable distance yourself when it matters.
- **Signs arrive inside the chunk payload.** `block_entity_data` does not carry sign text, so to read signs you must parse chunks or read region files (`java/find_signs.js` reads Java region files read-only).
- **Hanging signs clip text on Bedrock.** Words can look compressed or cut off even when the stored text is right. Check the block data before calling it a typo.
- **Crafting at a table** takes several steps: move the ingredients into the `crafting_input` slots, send a `craft_recipe` request using the recipe network id from `crafting_data`, then take the result from the `creative_output` slot. Recipe and item ids change between versions; read them from `crafting_data` and `item_registry`.
- **Flight and cutscenes** may kick a bot ("Flying is not enabled") even when real clients work. Flag such steps for a manual check on a real client.
- **Teleport helpers differ.** Essentials `/tp` adjusts to a safe ground position; vanilla `minecraft:tp` can leave the bot hovering.
- **One login per name.** "Already logged in" means the previous session is still on the server. Kick it, then restart the bot.

## Mock Server

```bash
export MOCK_PORT=19199
export PANEL_DIR=./path/to/your/panels
node ./scripts/bedrock/bedrock_mock_server.js
```

Use `MOCK_VARS` (JSON) to supply `%placeholder%` values, `MOCK_BREAK=1` to leave them unresolved and prove the judge
catches it, and `MOCK_DROP_FORM=<button label>` to make one button dead. The mock has no world and no Geyser, so it
tests the tools, not your server.
