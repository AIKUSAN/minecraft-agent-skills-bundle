# Minecraft Skills Index

This index lists all Minecraft skills in this repository.
Canonical source files live under `.agents/skills/`, and this README is mirrored
to compatibility trees.
All skill content targets Minecraft `1.21.x`.

Use this index as a quick router before opening individual `SKILL.md` files.
Some skills also include local `references/` and `scripts/` support assets; the
table below is a router, not an exhaustive layout listing.

## Skill Catalog

| Skill | Primary use cases | Choose this instead when |
|---|---|---|
| `minecraft-task-router` | Requests that need more than one skill or an unclear platform: classify, break ties, order the work, delegate to specialist subagents, merge results | One skill clearly fits (load it directly) |
| `minecraft-modding` | Build NeoForge or Fabric mods (blocks, items, entities, GUIs, datagen) | You need a single shared codebase for both loaders (`minecraft-multiloader`) |
| `minecraft-multiloader` | Architectury projects that ship both NeoForge and Fabric from one repo | You only need one loader (`minecraft-modding`) |
| `minecraft-plugin-dev` | Write Paper/Bukkit/Spigot plugins in Java 21 | You need server operations or deployment guidance (`minecraft-server-admin`) |
| `minecraft-datapack` | Vanilla datapacks: functions, advancements, recipes, loot tables | You only need command chains/NBT/scoreboards (`minecraft-commands-scripting`) |
| `minecraft-commands-scripting` | Command-block/chat/RCON command systems, `/execute`, scoreboards, NBT paths | You need full datapack systems (`minecraft-datapack`) |
| `minecraft-world-generation` | Worldgen JSON/code: biomes, dimensions, structures, features | You need building operations with WorldEdit (`minecraft-worldedit-ops`) |
| `minecraft-resource-pack` | Textures, models, sounds, fonts, shaders, pack metadata | You need gameplay logic or server operations (pick a development/admin skill) |
| `minecraft-resource-pack-conversion` | Convert Java resource packs into Bedrock `.mcpack` outputs and report unsupported assets | You need to create or edit a Java resource pack directly (`minecraft-resource-pack`) |
| `minecraft-imagegen` | Generate pack icons, promo art, thumbnails, concept textures, and UI mockups | You need deterministic pack structure, model JSON, sounds, or shader files (`minecraft-resource-pack`) |
| `minecraft-testing` | JUnit, MockBukkit, NeoForge/Fabric GameTests, CI test wiring | You need release pipelines and publishing (`minecraft-ci-release`) |
| `minecraft-bot-qa` | Java and Bedrock bot playthroughs of a live dev server: join, NPC dialogue, menu clicks, structured logs, judge reports (deterministic first, optional Laya second opinion), offline self-test | You need unit tests or GameTests (`minecraft-testing`) or release pipelines (`minecraft-ci-release`) |
| `minecraft-ci-release` | GitHub Actions, release automation, Modrinth/CurseForge publishing | You need local implementation details of mod/plugin features (pick a dev skill) |
| `minecraft-server-admin` | Java server/plugin orchestration: Paper/Purpur/Folia/Velocity setup, plugin sourcing, archetypes, folder/zip analysis, tuning, backups, proxies, troubleshooting | You need command-heavy map editing (`minecraft-worldedit-ops`) or EssentialsX policy (`minecraft-essentials-ops`) |
| `minecraft-bedrock-server-admin` | Bedrock Dedicated Server install/update, access files, packs, worlds, backups, and incidents | You need Java server operations (`minecraft-server-admin`) |
| `minecraft-bedrock-addon-dev` | Bedrock resource/behavior packs, Script API, manifests, packaging, and BDS deployment notes | You need Java plugins or mods (`minecraft-plugin-dev` or `minecraft-modding`) |
| `minecraft-permissions-admin` | LuckPerms groups, tracks, contexts, inheritance, temporary grants, audits, and rollback | You need EssentialsX-only command policy (`minecraft-essentials-ops`) |
| `minecraft-crossplay-ops` | Geyser/Floodgate operations for Bedrock clients joining Java servers | You need pure BDS operations (`minecraft-bedrock-server-admin`) |
| `minecraft-worldedit-ops` | Safe WorldEdit operations: selections, clipboards, schematics, brushes, rollback workflows | You need plugin coding (`minecraft-plugin-dev`) |
| `minecraft-essentials-ops` | EssentialsX operations: homes/warps/kits, moderation, economy, permission patterns | You need generic platform operations not tied to EssentialsX (`minecraft-server-admin`) |

## Role Routing

- Minecraft Administrator: use `minecraft-server-admin`, `minecraft-bedrock-server-admin`, `minecraft-permissions-admin`, `minecraft-essentials-ops`, `minecraft-worldedit-ops`, and `minecraft-crossplay-ops` based on the platform and tool involved.
- Minecraft Server Developer: use `minecraft-plugin-dev`, `minecraft-modding`, `minecraft-multiloader`, `minecraft-bedrock-addon-dev`, `minecraft-testing`, `minecraft-bot-qa`, and `minecraft-ci-release` based on the deliverable.
- Minecraft Content Author: use `minecraft-datapack`, `minecraft-commands-scripting`, `minecraft-world-generation`, `minecraft-resource-pack`, `minecraft-resource-pack-conversion`, and `minecraft-imagegen` based on the content type.
- Work that spans roles: start with `minecraft-task-router`. It sends each part to a specialist subagent (see Subagents below).

## Overlap Boundaries

- Use `minecraft-server-admin` for Java platform-level operations, plugin sourcing, server archetypes, folder/zip analysis, hosting, proxy, backups, and performance.
- Use `minecraft-bedrock-server-admin` for Bedrock Dedicated Server operations and `minecraft-bedrock-addon-dev` for Bedrock behavior/resource pack development.
- Use `minecraft-permissions-admin` for LuckPerms role policy; use `minecraft-essentials-ops` only when the workflow is EssentialsX-specific.
- Use `minecraft-crossplay-ops` for Geyser/Floodgate access and `minecraft-resource-pack-conversion` when Java packs need Bedrock client assets.
- Use `minecraft-worldedit-ops` for command-driven build/admin changes in-world.
- Use `minecraft-essentials-ops` for EssentialsX-specific commands, config, and permissions.
- Use `minecraft-plugin-dev` when the task is writing Java plugin code rather than operating existing plugins.
- Use `minecraft-imagegen` for raster art, thumbnails, pack icons, and concept textures; use `minecraft-resource-pack` when the task is final pack structure plus JSON/audio/shader implementation.
- For overlaps not listed here, `minecraft-task-router` has the ordered tie-breaker rules (platform first, writing versus operating, worldgen versus datapack, tests versus pipelines, and so on).
- `minecraft-imagegen` requires a host that exposes image generation; route it only when the current agent environment provides an equivalent image tool.

## Subagents

On hosts that support subagents (Claude Code does), `minecraft-task-router` runs in the main thread and hands work to five specialists defined in `.agents/agents/`. Each one loads only its own skills and never starts other subagents.

| Subagent | Skills |
|---|---|
| `minecraft-java-ops` | `minecraft-server-admin`, `minecraft-permissions-admin`, `minecraft-essentials-ops`, `minecraft-worldedit-ops` |
| `minecraft-bedrock-ops` | `minecraft-bedrock-server-admin`, `minecraft-crossplay-ops` |
| `minecraft-code-dev` | `minecraft-plugin-dev`, `minecraft-modding`, `minecraft-multiloader`, `minecraft-bedrock-addon-dev` |
| `minecraft-content-author` | `minecraft-datapack`, `minecraft-commands-scripting`, `minecraft-world-generation`, `minecraft-resource-pack`, `minecraft-resource-pack-conversion`, `minecraft-imagegen` |
| `minecraft-qa-release` | `minecraft-testing`, `minecraft-bot-qa`, `minecraft-ci-release` |

Hosts without subagents run the same plan one skill at a time.

## Sync Model

Edit only this canonical tree:

- `.agents/skills/`
- `.agents/agents/` (subagent definitions)

Then mirror to compatibility trees:

- `.codex/skills/`
- `.claude/skills/`
- `plugins/minecraft-codex-skills/skills/`
- `.claude/agents/` and `plugins/minecraft-codex-skills/agents/` (subagent definitions)

Commands:

```bash
bash ./scripts/sync-skills-layout.sh sync
npm run audit:skills
npm run check:routing
```
