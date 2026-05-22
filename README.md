# minecraft-agent-skills-bundle

[![Skills Audit](https://github.com/AIKUSAN/minecraft-agent-skills-bundle/actions/workflows/skills-audit.yml/badge.svg)](https://github.com/AIKUSAN/minecraft-agent-skills-bundle/actions/workflows/skills-audit.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/AIKUSAN/minecraft-agent-skills-bundle)](https://github.com/AIKUSAN/minecraft-agent-skills-bundle/releases/latest)
[![Minecraft](https://img.shields.io/badge/Minecraft-1.21.x-brightgreen)](https://www.minecraft.net/)

A public skills bundle of **18 AI agent skills** covering every major area
of Minecraft development — mods, plugins, datapacks, commands, testing, CI/CD,
world generation, resource packs, Bedrock add-ons, Java and Bedrock server
administration, permissions, crossplay operations, WorldEdit operations,
EssentialsX operations, Java-to-Bedrock pack conversion, and image generation
for pack art, texture concepts, thumbnails, and promo assets.

Use it either as raw skill folders for Codex or Claude Code, or as a dual-target
plugin bundle under `plugins/minecraft-codex-skills/` for plugin-based installs.
The `minecraft-imagegen` skill requires a host that exposes image generation;
Codex supports that directly, while other hosts should treat that skill as conditional.

The repository is branded as `minecraft-agent-skills-bundle`; the bundled plugin/package
identifier remains `minecraft-codex-skills` for marketplace and install compatibility.

This is an independent, community-maintained skills bundle. It is not affiliated
with, endorsed by, sponsored by, or approved by Mojang Studios, Microsoft, or the
official Minecraft project.

<!-- markdownlint-disable MD033 -->
<p align="center">
      <img src="docs/assets/minecraft-agent-skills-banner.png" alt="Minecraft Agent Skills Bundle — 18 Java and Bedrock skills for administration, development, packs, crossplay, and Codex workflows" width="100%"/>
</p>
<!-- markdownlint-enable MD033 -->

Use the raw-skill path if you want to copy `.agents/`, `.codex/`, or `.claude/`
directly into a project. Use the plugin path if you want to keep the repository
layout intact and load `plugins/minecraft-codex-skills/` through Codex's local
marketplace flow or Claude Code's `--plugin-dir` support.

---

## What is a Codex Skill?

Codex skills live in `.agents/skills/<skill-name>/` within a repository. Per the
official [Codex skills docs](https://developers.openai.com/codex/skills), skills
are the authoring format for reusable workflows, while plugins are the installable
distribution unit for reusable skills and app integrations. Each `SKILL.md` file
defines the skill's `name`, `description`, and detailed instructions. Codex selects
relevant skills automatically based on the description field and your task.

This repository keeps `.agents/skills/` as the canonical source of truth and
syncs exact mirrors to `.codex/skills/`, `.claude/skills/`, and the shared plugin
bundle at `plugins/minecraft-codex-skills/skills/`.
The routing index lives at `.agents/skills/README.md`.

---

## Skills in this Collection

|Skill|Directory|What it covers|
|---|---|---|
|**minecraft-modding**|`minecraft-modding/`|NeoForge + Fabric mod development — blocks, items, entities, events, data gen|
|**minecraft-plugin-dev**|`minecraft-plugin-dev/`|Paper/Bukkit server plugins — events, commands, schedulers, PDC, Adventure, Vault|
|**minecraft-datapack**|`minecraft-datapack/`|Vanilla datapacks — functions, advancements, recipes, loot tables, tags|
|**minecraft-commands-scripting**|`minecraft-commands-scripting/`|Vanilla commands, scoreboards, NBT paths, JSON text, RCON scripting|
|**minecraft-multiloader**|`minecraft-multiloader/`|Architectury multiloader — single codebase targeting NeoForge and Fabric|
|**minecraft-testing**|`minecraft-testing/`|JUnit 5, MockBukkit, NeoForge/Fabric GameTests, GitHub Actions CI|
|**minecraft-ci-release**|`minecraft-ci-release/`|GitHub Actions pipelines, Modrinth/CurseForge publishing, semantic versioning|
|**minecraft-world-generation**|`minecraft-world-generation/`|Custom biomes, dimensions, structures (datapacks + mods)|
|**minecraft-resource-pack**|`minecraft-resource-pack/`|Textures, block/item models, sounds, animations, OptiFine CIT, shaders|
|**minecraft-resource-pack-conversion**|`minecraft-resource-pack-conversion/`|Java-to-Bedrock pack conversion, `.mcpack` output, unsupported asset reports|
|**minecraft-imagegen**|`minecraft-imagegen/`|Pack icons, promo art, concept textures, thumbnails, server banners, UI mockups|
|**minecraft-server-admin**|`minecraft-server-admin/`|Java server/plugin orchestration, Paper/Purpur/Folia/Velocity setup, marketplace plugin sourcing, folder/zip analysis, tuning, backups|
|**minecraft-bedrock-server-admin**|`minecraft-bedrock-server-admin/`|Bedrock Dedicated Server setup, access files, packs, worlds, backups, incidents|
|**minecraft-bedrock-addon-dev**|`minecraft-bedrock-addon-dev/`|Bedrock resource/behavior packs, Script API, manifests, packaging, BDS deployment|
|**minecraft-permissions-admin**|`minecraft-permissions-admin/`|LuckPerms groups, tracks, contexts, temporary grants, audits, rollback|
|**minecraft-crossplay-ops**|`minecraft-crossplay-ops/`|Geyser/Floodgate crossplay operations, Bedrock client access, pack delivery|
|**minecraft-worldedit-ops**|`minecraft-worldedit-ops/`|WorldEdit ops playbooks: selections, masks, schematics, brushes, safe rollback|
|**minecraft-essentials-ops**|`minecraft-essentials-ops/`|EssentialsX ops: kits/warps/homes, economy, permissions, moderation workflows|

---

## Role Routing

- **Minecraft Administrator**: use `minecraft-server-admin`, `minecraft-bedrock-server-admin`, `minecraft-permissions-admin`, `minecraft-essentials-ops`, `minecraft-worldedit-ops`, and `minecraft-crossplay-ops` based on the platform and operational surface.
- **Minecraft Server Developer**: use `minecraft-plugin-dev`, `minecraft-modding`, `minecraft-datapack`, `minecraft-bedrock-addon-dev`, `minecraft-resource-pack`, `minecraft-resource-pack-conversion`, `minecraft-testing`, and `minecraft-ci-release` based on the deliverable.

---

## Asset Workflow Example

For image-heavy Minecraft tasks, the bundle now treats `minecraft-imagegen` as a
first-class skill instead of a thin add-on. It ships prompt-pattern references,
asset-specific recipes, and a small brief scaffold script so generated art can be
reviewed and handed off cleanly to `minecraft-resource-pack` when the final asset
needs pack wiring.

Example Codex prompt:

```bash
codex "Create two square pack icon concepts for a vanilla-faithful archaeology pack, save the preferred concept into the workspace, then outline the follow-up resource-pack steps."
```

---

## How It Works

<!-- markdownlint-disable MD033 -->
<p align="center">
      <img src="docs/assets/how-it-works.svg" alt="How It Works — choose raw skills or plugin install, load the 18-skill bundle into your agent, assign a task, and let the right skill activate; image generation is Codex-first" width="100%"/>
</p>
<!-- markdownlint-enable MD033 -->

---

## Installation

### Option A — Raw skills for Codex

```bash
REPO_URL="https://github.com/AIKUSAN/minecraft-agent-skills-bundle"
git clone "$REPO_URL" /tmp/mc-skills
cp -r /tmp/mc-skills/.agents .
```

Codex can read the canonical `.agents/skills/` tree directly. The `.codex/skills/`
mirror is kept byte-for-byte identical if you prefer that layout.

### Option B — Raw skills for Claude Code

```bash
REPO_URL="https://github.com/AIKUSAN/minecraft-agent-skills-bundle"
git clone "$REPO_URL" /tmp/mc-skills
cp -r /tmp/mc-skills/.claude .
```

### Option C — Dual-target plugin bundle

The repository now ships a plugin bundle that both Codex and Claude Code can load.
`minecraft-imagegen` remains conditional on the host exposing an image-generation
tool, so treat that skill as Codex-first unless the current host documents support:

```text
plugins/minecraft-codex-skills/
├── .codex-plugin/plugin.json
├── .claude-plugin/plugin.json
└── skills/
```

For Codex local marketplace installs:

1. Keep the repository layout intact so `.agents/plugins/marketplace.json` and `plugins/minecraft-codex-skills/` stay under the same repo root.
2. Start Codex from that repo root.
3. Open the plugins surface with `/plugins`.
4. Install `minecraft-codex-skills` from the repo marketplace discovered at `.agents/plugins/marketplace.json`.
5. If a local plugin change does not appear immediately, reinstall or restart Codex. Local marketplace installs are loaded from `~/.codex/plugins/cache/<marketplace>/<plugin>/local/`, not directly from the marketplace path.

For Claude Code local plugin testing:

```bash
claude --plugin-dir ./plugins/minecraft-codex-skills
```

### Option D — Git submodule

```bash
REPO_URL="https://github.com/AIKUSAN/minecraft-agent-skills-bundle"
git submodule add "$REPO_URL" .skills-src
cp -r .skills-src/.agents .
```

### Option E — Manual download

Download the latest release from
`https://github.com/AIKUSAN/minecraft-agent-skills-bundle/releases/latest`.

- Use `.agents/` or `.codex/` for Codex raw-skill installs.
- Use `.claude/` for Claude Code raw-skill installs.
- Use `plugins/minecraft-codex-skills/` for Claude Code plugin installs.
- For Codex plugin installs, keep the full release layout intact so `.agents/plugins/marketplace.json` and `plugins/minecraft-codex-skills/` remain together under the same repo root.

---

## Project Structure

Representative excerpt only: several other skills also ship `references/` or
`scripts/` support assets, but the tree below highlights the main install layout.

```text
your-project/
└── .agents/
    └── skills/
        ├── README.md
        ├── minecraft-modding/
        │   ├── SKILL.md
        │   ├── references/
        │   │   ├── neoforge-api.md
        │   │   ├── fabric-api.md
        │   │   └── common-patterns.md
        │   └── scripts/
        │       └── check-build.sh
        ├── minecraft-plugin-dev/
        │   ├── SKILL.md
        │   ├── references/
        │   │   └── runtime-patterns.md
        │   └── scripts/
        │       └── validate-plugin-layout.sh
        ├── minecraft-datapack/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── validate-datapack.sh
        ├── minecraft-commands-scripting/
        │   └── SKILL.md
        ├── minecraft-multiloader/
        │   └── SKILL.md
        ├── minecraft-testing/
        │   └── SKILL.md
        ├── minecraft-ci-release/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── validate-workflow-snippets.sh
        ├── minecraft-world-generation/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── validate-worldgen-json.sh
        ├── minecraft-resource-pack/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── validate-resource-pack.sh
        ├── minecraft-resource-pack-conversion/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── convert-java-pack-to-bedrock.py
        ├── minecraft-imagegen/
        │   ├── SKILL.md
        │   ├── references/
        │   │   ├── prompt-patterns.md
        │   │   └── asset-recipes.md
        │   └── scripts/
        │       └── scaffold-asset-brief.sh
        ├── minecraft-server-admin/
        │   ├── SKILL.md
        │   ├── references/
        │   │   ├── deployment-checklists.md
        │   │   ├── plugin-marketplaces.md
        │   │   └── server-archetypes.md
        │   └── scripts/
        │       └── analyze-java-server.py
        ├── minecraft-bedrock-server-admin/
        │   └── SKILL.md
        ├── minecraft-bedrock-addon-dev/
        │   └── SKILL.md
        ├── minecraft-permissions-admin/
        │   └── SKILL.md
        ├── minecraft-crossplay-ops/
        │   └── SKILL.md
        ├── minecraft-worldedit-ops/
        │   ├── SKILL.md
        │   └── references/
        │       └── safety-checklists.md
        └── minecraft-essentials-ops/
            ├── SKILL.md
            └── references/
                └── permissions-and-rollout-checklists.md

# Compatibility mirrors (same content, synced by script):
your-project/
├── .codex/
│   └── skills/
│       └── ... (mirrors .agents/skills)
└── .claude/
    └── skills/
        └── ... (mirrors .agents/skills)

# Dual-target plugin bundle (same skills, plugin manifests for both platforms):
your-project/
└── plugins/
      └── minecraft-codex-skills/
            ├── .codex-plugin/
            │   └── plugin.json
            ├── .claude-plugin/
            │   └── plugin.json
            └── skills/
                  └── ... (mirrors .agents/skills)
```

---

## Working On This Repo

Repo development tooling requires **Node 20+**. The copied skill directories do not
need the repo-root Node install.

The shell-based fixture scripts require **bash**, **jq**, and **rsync**. On Windows,
run those repo checks from WSL or Git Bash with those tools available on `PATH`.

```bash
# One-time: install/check local dev tools
bash ./scripts/setup-dev-tools.sh

# Install pinned repo tooling
npm ci

# Edit canonical skills only
$EDITOR .agents/skills/<skill>/SKILL.md

# Sync compatibility mirrors and plugin bundle
bash ./scripts/sync-skills-layout.sh sync

# Validate plugin manifests and marketplace metadata
node ./scripts/validate-plugin-bundle.mjs

# Run repository skill audit
node ./scripts/audit-skills.mjs

# Validate markdown/JSON/YAML doc snippets
node ./scripts/validate-doc-snippets.mjs

# Run validator fixture tests
bash ./scripts/run-skill-validator-fixtures.sh

# Run repo policy fixtures
bash ./scripts/test-repo-policy-fixtures.sh

# Validate GitHub community files
node ./scripts/check-github-community-files.mjs

# Run markdown lint from the pinned local dependency
npm run lint:md
```

---

## Usage with Codex CLI

```bash
# Install Codex CLI
npm install -g @openai/codex

# Mod development
codex "Add a custom ore block called Starstone that spawns in the deepslate layer \
      and gives 2-5 StarstoneGems when mined with iron pickaxe or better. NeoForge."

# Server plugin
codex "Create a Paper plugin that gives players a speed boost for 10 seconds \
      when they eat a golden apple, with a 60-second cooldown tracked in PDC."

# Datapack
codex "Write a datapack function that detects when a player kills 10 zombies \
      and gives them a custom advancement with a diamond reward."

# Server admin
codex "Generate a docker-compose.yml for a Paper 1.21.11 server with Aikar's \
      JVM flags, persistent volumes, and auto-restart on crash."

# Bedrock add-on development
codex "Create a Bedrock behavior pack with a Script API welcome message, \
      matching manifest.json files, and .mcaddon packaging steps."

# Java-to-Bedrock pack conversion
codex "Convert this Java resource pack into a Bedrock .mcpack, report any \
      unsupported Java-only assets, and explain the manual follow-up work."
```

The official Codex CLI docs still use npm for install and upgrade. Current Windows
support is experimental, so use a WSL2 workspace for the best Windows experience.

Codex reads the appropriate `SKILL.md` and picks up platform patterns, correct
API versions, JSON schemas, and build commands automatically.

If you prefer plugin installs in Codex, start Codex from the repository root,
open `/plugins`, and install `minecraft-codex-skills` from the repo marketplace
defined in `.agents/plugins/marketplace.json`.

---

## Usage with Claude Code Plugins

Use the bundled plugin for local testing or team distribution:

```bash
claude --plugin-dir ./plugins/minecraft-codex-skills
```

The plugin mirrors the same 18 skill folders under the `minecraft-codex-skills`
plugin namespace while keeping the shared `skills/` content synchronized with
the raw skill trees. `minecraft-imagegen` remains host-conditional and should be
treated as Codex-first unless the current host documents equivalent image-generation
support.

---

## Usage with Codex

1. Open [Codex](https://chatgpt.com/codex)
2. Connect your GitHub repository
3. Assign a task — Codex reads the skills from your repo automatically

---

## Supported Versions

|Platform|Version|Java|
|---|---|---|
|NeoForge|1.21.x examples centered on 21.11.x|21|
|Fabric|1.21.11 line (`fabric-api:0.116.10+1.21.1`)|21|
|Paper/Bukkit|1.21.x (`paper-api:1.21.11-R0.1-SNAPSHOT`)|21|
|Bedrock Dedicated Server|1.21.x|—|
|Bedrock add-ons / Script API|1.21.x|—|
|Vanilla datapack|1.21–1.21.11 (formats 48–94.1; `min_format` / `max_format` from 1.21.9+)|—|
|Resource pack|1.21–1.21.11 (formats 34–75.0; `min_format` / `max_format` from 1.21.9+)|—|

---

## Repo Notes

This repository is a small, owner-managed skills bundle rather than a broader contributor project.

If you need to inspect or update repo structure:

1. Edit canonical skill content in `.agents/skills/`
2. Keep `.codex/skills/`, `.claude/skills/`, and `plugins/minecraft-codex-skills/skills/` synchronized
3. Run `npm run check` before publishing repo-level changes

See [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md),
[SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md),
[TERMS.md](TERMS.md), and
[docs/skill-authoring-standard.md](docs/skill-authoring-standard.md) for the
repo-specific editing model.

---

## License

MIT — free to use, modify, and share. See [LICENSE](LICENSE).
