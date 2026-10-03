# minecraft-codex-skills plugin

`minecraft-codex-skills` is the installable plugin wrapper for the original
`minecraft-agent-skills-bundle` repository. It packages the same Minecraft
agent skills for Codex and Claude Code while preserving the plugin ID used by
existing local marketplace installs.

This plugin is part of a standalone owner-managed project. It is not a fork, and
it is not affiliated with, endorsed by, sponsored by, or approved by Mojang
Studios, Microsoft, or the official Minecraft project.

## Layout

```text
plugins/minecraft-codex-skills/
├── .codex-plugin/plugin.json
├── .claude-plugin/plugin.json
├── README.md
└── skills/
```

## Skill groups

| Work area | Skills |
|---|---|
| Java server administration | `minecraft-server-admin`, `minecraft-permissions-admin`, `minecraft-essentials-ops`, `minecraft-worldedit-ops` |
| Bedrock operations | `minecraft-bedrock-server-admin`, `minecraft-crossplay-ops` |
| Server and mod development | `minecraft-plugin-dev`, `minecraft-modding`, `minecraft-multiloader`, `minecraft-bedrock-addon-dev` |
| Vanilla and content systems | `minecraft-datapack`, `minecraft-commands-scripting`, `minecraft-world-generation` |
| Resource packs and conversion | `minecraft-resource-pack`, `minecraft-resource-pack-conversion`, `minecraft-imagegen` |
| Quality and release | `minecraft-testing`, `minecraft-bot-qa`, `minecraft-ci-release` |
| Multi-skill requests | `minecraft-task-router` |

## Subagents

Claude Code loads five specialist subagents from this plugin's `agents/`
folder: `minecraft-java-ops`, `minecraft-bedrock-ops`, `minecraft-code-dev`,
`minecraft-content-author`, and `minecraft-qa-release`. `minecraft-task-router`
runs in the main thread and hands each part of a multi-skill request to the
right one. Subagents never start other subagents. Codex and other hosts without
subagents follow the same plan one skill at a time.

`minecraft-imagegen` is host-conditional. Codex supports image generation
directly; other hosts should only route that skill when an equivalent image tool
is available.

## Codex local install

1. Keep this plugin under `plugins/minecraft-codex-skills/` in the same
   repository that contains `.agents/plugins/marketplace.json`.
2. Start Codex from the repository root.
3. Open `/plugins` and install `minecraft-codex-skills` from the repo marketplace.
4. Confirm the installed plugin shows the bundled Minecraft skills.
5. Reinstall or restart Codex if a local plugin edit does not appear
   immediately. Codex loads local marketplace installs from
   `~/.codex/plugins/cache/<marketplace>/<plugin>/local/`.

## Claude Code local install

```bash
claude --plugin-dir ./plugins/minecraft-codex-skills
```

Claude Code loads the skills and the five subagents from this plugin. Plugin skills
appear with the plugin name as a prefix, such as
`minecraft-codex-skills:minecraft-task-router`.

## Development model

- Do not edit `plugins/minecraft-codex-skills/skills/` or `plugins/minecraft-codex-skills/agents/` directly.
- Edit canonical skills in `.agents/skills/` and subagents in `.agents/agents/`.
- Run `bash ./scripts/sync-skills-layout.sh sync` from the repository root to
  refresh `.codex/skills/`, `.claude/skills/`, `.claude/agents/`, and this plugin mirror.
- Run `npm run check:plugin-bundle` after manifest, marketplace, or plugin README
  edits.

## Compatibility

| Surface | Baseline |
|---|---|
| Minecraft scope | Java Edition and Bedrock Edition `1.21.x` |
| Java examples | Java 21 |
| Codex install path | Local marketplace via `.agents/plugins/marketplace.json` |
| Claude Code install path | `claude --plugin-dir ./plugins/minecraft-codex-skills` |
| Plugin ID | `minecraft-codex-skills` |

## Manifest notes

The Codex manifest carries the richer install-surface metadata for local
marketplace discovery. The Claude manifest keeps shared package metadata while
this README and the mirrored `skills/` tree carry the catalog, routing, and
compatibility guidance.

## Troubleshooting

- If mirrored skills are stale, run `bash ./scripts/sync-skills-layout.sh sync`.
- If Codex does not show plugin changes, reinstall the local plugin or restart
  Codex.
- If plugin validation fails, run `npm run check:plugin-bundle` from the
  repository root.
- On Windows, run repository shell scripts from WSL or Git Bash so `bash`, `jq`,
  and `rsync` are available on `PATH`.
