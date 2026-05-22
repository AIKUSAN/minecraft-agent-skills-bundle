# Java Server Archetype Patterns

Use these patterns when the user asks to build or reorganize a Minecraft Java server. They are starting points; confirm the target player count, Minecraft version, server type, budget, moderation model, and gameplay goals before finalizing a stack.

## Lobby or Hub

Use for a network entrypoint, queue, cosmetics, portals, NPCs, and announcements.

Recommended shape:

- Velocity proxy in front of one or more Paper lobby backends
- minimal gameplay plugins; keep the lobby fast and replaceable
- LuckPerms network groups and per-server contexts
- maintenance/queue plugin if the network needs controlled rollout windows
- portal, NPC, selector, or menu plugin for routing players
- strict world protection and disabled destructive gameplay
- resource-pack delivery only after crossplay/client compatibility is checked

Validation:

- join through Velocity only
- confirm UUID/skin/profile forwarding
- confirm backend ports are firewalled
- test fallback when a game backend is offline
- verify lobby restart does not trap connected players

## Survival or SMP

Use for persistent community survival, economy, claims, homes, and moderation.

Candidate plugin families:

- LuckPerms for roles and staff permissions
- EssentialsX for homes, warps, kits, economy-adjacent commands, and moderation
- Vault or the economy bridge required by selected economy plugins
- Spark for profiling
- CoreProtect-style rollback/audit logging
- claims or region protection
- chunk pregeneration and world-border tooling
- backup automation with off-host retention
- optional map, chat, sleep, and moderation plugins based on community policy

Operational notes:

- Keep gameplay-changing plugins small until baseline TPS/MSPT is known.
- Pre-generate new survival worlds before public launch.
- Document reset policy, rollback policy, banned-item policy, and staff escalation.
- Route detailed LuckPerms policy to `minecraft-permissions-admin`.
- Route detailed EssentialsX configuration to `minecraft-essentials-ops`.

## Creative or Build Server

Use for freebuild, plots, schematics, team builds, and staff-assisted construction.

Candidate plugin families:

- LuckPerms with builder, trusted-builder, architect, and staff contexts
- WorldEdit and region protection with strict permission scoping
- plot or claim system appropriate for the community size
- schematic storage and review workflow
- anti-grief audit/rollback tooling
- creative inventory restrictions if needed

Operational notes:

- Route in-world WorldEdit workflows to `minecraft-worldedit-ops`.
- Keep large paste operations staged or staff-gated.
- Back up schematics and plot worlds separately from general server config.
- Test memory pressure during large WorldEdit operations, not only during idle joins.

## Minigame Backend

Use for arena games, kit games, parkour, party games, and short-session gameplay.

Recommended shape:

- separate Paper backend per minigame family behind Velocity
- thin lobby/hub routing to game backends
- arena reset workflow using world copies, schematic restore, or plugin-supported reset
- scoreboard/tab/queue/reward plugins selected around the exact game mode
- minimal global plugin set; avoid installing SMP convenience plugins unless needed
- fast restart and automated health checks

Operational notes:

- Treat each minigame as disposable infrastructure.
- Keep arenas and player data backed up separately.
- Load test match start, match end, reset, rewards, reconnects, and crash recovery.
- Watch for missing dependencies in arena/game plugins; many depend on economy, hologram, scoreboard, or world-management libraries.

## Proxy Network

Use when one server process is no longer enough or the player experience needs separate backend roles.

Recommended shape:

- Velocity as the public entrypoint
- Paper/Purpur/Folia backend servers on private ports
- `online-mode=true` on Velocity
- modern forwarding with the same forwarding secret on every backend
- shared LuckPerms storage or synchronized permission workflow
- common maintenance, messaging, and monitoring policy

Operational notes:

- Do not expose backend ports to the public internet.
- Verify player identity, UUIDs, skins, permissions, and chat flow through the proxy.
- Keep backend names stable so plugin contexts and routing rules do not break.
- Route Geyser/Floodgate or Bedrock client access to `minecraft-crossplay-ops`.

## Staging or Test Server

Use for plugin updates, server jar updates, config migrations, and recovery drills.

Recommended shape:

- same Java version, server jar family, and plugin set as production
- copied production configs with secrets rotated or removed
- small copy of representative worlds or sanitized world snapshots
- allowlist enabled
- no public DNS or public backend port exposure
- scripted restore from a known backup

Validation:

- boot after every plugin update
- review logs before player testing
- run smoke checks for joins, permissions, economy, teleportation, persistence, world saves, and proxy routing
- verify rollback before production rollout

## Cross-Archetype Rules

- Start with the minimum plugin set that satisfies the server role.
- Prefer one plugin per responsibility unless a clear integration boundary exists.
- Check compatibility before download and again during startup-log review.
- Snapshot jar and config state before every production change.
- Document manual-download resources so future maintainers can reproduce the install legally.
