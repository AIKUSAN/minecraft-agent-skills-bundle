# Dev Server Workflow

How to run bot QA safely and repeatably against a development copy of your server.

## Ground Rules

- Test on a dev server that mirrors production. Production stays untouched until the owner explicitly approves a rollout.
- Use throwaway accounts for bots. A Bedrock bot joining through Floodgate gets the Floodgate prefix (for example `.Name`), so it has its own quest state, separate from any Java account.
- Keep one written list of what is verified by bots and what still needs a person (see below).

## Before A Run

1. Take a locked backup of the dev server and wait for it to finish. If your panel (for example Pterodactyl) has a backup API, script it so every release candidate gets one.
2. Confirm the bot account has the permissions the menus check (for example a `menu` permission node) and is allowed through any whitelist.
3. Confirm the Geyser UDP port is open with `bedrock_ping.js` before starting a Bedrock bot.
4. Decide what the bot may change: quest state, inventory, location. Write down how to reset it.

## During A Run

- Run one bot per account. A second login with the same name kicks the first ("already logged in"). Kick the old session before restarting a bot.
- Pace menu opens. CommandPanels throttles rapid panel opens; the Bedrock click-through waits `BEDROCK_PANEL_GAP_MS` between them.
- Sending console commands from the host (for example `/tp`, `/give`, permission changes) to keep a bot moving is fine on dev. Many hosts expose this through a client API: post to the server's command endpoint and expect `204` on success.
- Keep tool calls short on remote links. Long single calls can time out.

## After A Run

- Read the judge output and the raw JSON-lines logs. A passing judge means the checks passed, not that the experience is perfect.
- Reset the bot's quest state if the next run needs a clean start.
- Delete the sign-in token cache (`auth-cache*`) when you are done with the account.
- Record the result with the date, the backup you tested against, and the caveats below.

## What Bots Cannot Confirm

Say these out loud in every report instead of implying they were checked:

- Holograms, particles, maps, images and other visuals (the bot sees data, not pixels).
- Flight, cutscenes and camera effects on a real Bedrock client. A bot can be kicked for flight packets that a real client sends correctly.
- Real book and sign UI rendering. Bot checks read block data, not what a hanging sign looks like on screen.
- Anything that depends on hardware, touch controls or console clients.

A short manual pass by a person on a real Java client and a real Bedrock client closes those gaps.

## Release Gate Suggestion

1. Self-test passes (`check-bot-setup.mjs --selftest`).
2. Bedrock and Java click-throughs pass on the dev server.
3. Full quest playthrough completes on both editions.
4. A person checks the manual-only list above.
5. A locked backup exists for the exact state that passed.
6. Rollback was rehearsed at least once.
