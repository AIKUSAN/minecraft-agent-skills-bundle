# Worked Example: A Bible-Themed Quest Server

This example server is a Bible-themed Minecraft server for Java and Bedrock players. Its
Tabernacle pilgrimage is a quest told through Typewriter NPC dialogue and CommandPanels menus, with a Bedrock form
version of every menu. These scripts tested it end to end on a development server.

They live in `scripts/examples/quest-server/`. They depend on that server's world, NPCs and coordinates, so they
will not run against another server as they are. Read them to see how the core kit is composed, then copy the
pattern.

## What The Quest Needs From A Bot

| Quest step | Bot behavior | Script |
|---|---|---|
| NPC conversations | Walk to each NPC, right-click, answer with a progressing strategy | `scenario_story.js`, `scenario_early.js`, `step_moses.js` |
| Offerings at the altar and basin | Hold the item, right-click the correct block inside the allowed radius | `scenario_altar.js` |
| Lighting the menorah | Enter the unlocked flight mode, rise, right-click with lamp oil | `scenario_menorah.js` |
| Baking the bread | Craft at the table from granted wheat, then offer it on the show-bread table | `scenario_bread.js` |
| Prayer book | Write a book and quill, sign it, hand it in | `write_book.js`, `write_book_raw.js` |
| Final quiz | One wrong answer first (must loop to question 1), then the three correct answers | `scenario_angel.js`, `scenario_finale.js` |
| Menus | Open the menu command and click every safe tile, expecting decorative tiles to stay inert | `scenario_menu.js`, `scenario_gui.js`, `gui_dev.js` |
| Reset and spawn | Reset quest state safely, click "Return to Spawn" after an operator moves the bot | `gui_reset.js`, `spawn_click.js`, `spawn_click2.js` |
| Ordered flow | Run the scenarios in quest order and collect each step's result | `run_flow.js` |
| Bulk setup | Build image walls through chat commands | `if_build.js` |

`run_flow.js` shows the pattern for long quests: one short script per step, each writing its own result, with a
runner that executes them in order and records pass or fail per step. Short steps are easy to rerun after a fix.

## Judges

| Script | Judges |
|---|---|
| `judge.py` | Per-step results of the story flow |
| `judge_finale.py` | The finale sequence |
| `judge_gui.py` | Every menu click, with plain-language wording rules (no internal plugin names in player text) |

These import Laya directly, so install it first (`python -m pip install -r ./scripts/requirements.txt`). For your own
server, start from `scripts/judges/judge_bedrock.py`, which also runs without Laya.

## Lessons From This Run

- Bots catch behavior that reading the files does not show. A "Return to Spawn" action that left the player in place was found by clicking it after an operator moved the bot away.
- The bot also produced false alarms. Wording that looked like a typo was often a hanging sign clipping text on Bedrock, and a kick for flying was a bot limitation. Always confirm with block data or a real client before changing content.
- Run the same scenarios on Java and Bedrock. Separate accounts have separate quest state, so reset between runs.
- Keep a list of what only a person can verify (visuals, flight, book UI on a real Bedrock client) and put it in the report.

## Running Order Used On The Dev Server

1. Locked backup of the dev server.
2. Reachability check, then sign-in test for each edition.
3. Menu click-through on Java, then Bedrock. Judge both.
4. Full quest on Java, then Bedrock, resetting quest state between them.
5. Fixes, rerun of the affected steps only.
6. Final locked backup of the passing state.
7. A short manual pass on real clients for the items bots cannot confirm.
