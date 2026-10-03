# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Added `minecraft-task-router`, a skill that classifies multi-skill requests, applies tie-breaker rules between overlapping skills, orders work with safety gates, and delegates to subagents with a fixed brief and return format.
- Added five specialist subagents in `.agents/agents/` (`minecraft-java-ops`, `minecraft-bedrock-ops`, `minecraft-code-dev`, `minecraft-content-author`, `minecraft-qa-release`), mirrored to `.claude/agents/` and the plugin's `agents/` folder.
- Added `npm run check:routing`, which checks that every skill is in the router, owned by exactly one subagent, covered by role routing, and that the agent mirrors match.
- Added `minecraft-bot-qa`, a skill for QA playthroughs of a live dev server with Java (Mineflayer) and Bedrock (bedrock-protocol through Geyser and Floodgate) bots.
- Added structured bot logging, NPC dialogue and menu walkers, a Bedrock mock server, sample panel configs, and a worked example from a real quest server.
- Added a judge layer where deterministic assertions decide the exit code and the Laya model (`convaiinnovations/laya`) gives an optional second opinion. Laya can be switched off with `--no-laya` or `NO_LAYA=1`.
- Added an offline self-test and a static setup check, `check-bot-setup.mjs`, plus `npm run check:bot-kit`.

### Changed

- Fixed role routing in the skills index: multiloader, commands-scripting, world-generation and imagegen were missing from every role. Added a Content Author role and a route for work that spans roles.
- Added the missing reverse "Do not use when" pointers between overlapping skills (server-admin and bedrock-server-admin, plugin-dev and bedrock-addon-dev, datapack and world-generation, testing and bot-qa, and others).
- Replaced "skills are independent, no cross-skill dependencies" with a clear rule: skills never read each other's files, and handoffs go through the router and subagents.
- `minecraft-server-admin` now says when to delegate to a subagent and when not to (inside a subagent it returns a handoff note instead).
- Sync script now mirrors the agent definitions as well as the skills.

## [1.0.0] - 2026-05-22

### Added

- Published the original `minecraft-agent-skills-bundle` repository as a standalone 18-skill Minecraft agent bundle.
- Added five advanced Minecraft administration and development skills: `minecraft-bedrock-server-admin`, `minecraft-bedrock-addon-dev`, `minecraft-resource-pack-conversion`, `minecraft-crossplay-ops`, and `minecraft-permissions-admin`.
- Added Java server admin marketplace and archetype references plus a read-only server folder/zip analyzer for plugin inventory, dependency warnings, proxy hints, backups, worlds, and suspicious jar review.
- Added a conservative Java-to-Bedrock resource-pack conversion helper that creates `.mcpack` outputs, writes Bedrock `manifest.json`, copies simple texture assets, and reports unsupported Java-only assets.
- Added role-routing guidance for Minecraft Administrator and Minecraft Server Developer workflows across Java, Bedrock, permissions, crossplay, server development, and pack conversion tasks.
- Added original README branding assets: Agent Console banner, square icon, and polished How It Works workflow diagram.

### Changed

- Established `1.0.0` as the first public version for this original standalone bundle.
- Rebranded public repository metadata, install links, README copy, and plugin docs for `AIKUSAN/minecraft-agent-skills-bundle` while preserving the `minecraft-codex-skills` plugin identifier.
- Rewrote the root README and plugin README around the standalone, not-a-fork project identity, practical install paths, supported host apps, and skill routing groups.
- Enhanced `minecraft-server-admin` as the Java server and plugin orchestrator for Paper, Purpur, Folia, Velocity, plugin marketplaces, server archetypes, compatibility planning, and existing server analysis.
- Expanded the bundle and plugin metadata from 13 to 18 skills, with Java and Bedrock coverage in README, AGENTS guidance, plugin docs, and repository metadata.
- Refreshed validation fixtures and docs for resource-pack conversion, server analysis, plugin layout checks, version drift checks, markdown linting, community files, workflow pinning, and plugin bundle validation.

### Validation

- `bash ./scripts/sync-skills-layout.sh check`
- `npm run check`
