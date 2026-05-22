# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
