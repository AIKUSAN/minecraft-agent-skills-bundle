# minecraft-codex-skills plugin

This plugin packages the repository's mirrored 18-skill Minecraft skill tree for both
Codex and Claude Code. The `minecraft-imagegen` skill is host-conditional and
depends on the host exposing an image-generation tool; Codex supports that
directly today.

## Layout

```text
plugins/minecraft-codex-skills/
├── .codex-plugin/plugin.json
├── .claude-plugin/plugin.json
└── skills/
```

## Skill groups

- Java development: `minecraft-modding`, `minecraft-multiloader`, `minecraft-plugin-dev`, `minecraft-testing`, `minecraft-ci-release`
- Bedrock development: `minecraft-bedrock-addon-dev`
- Content and assets: `minecraft-datapack`, `minecraft-commands-scripting`, `minecraft-world-generation`, `minecraft-resource-pack`, `minecraft-resource-pack-conversion`, `minecraft-imagegen`
- Operations: `minecraft-server-admin` for Java server/plugin orchestration, `minecraft-bedrock-server-admin`, `minecraft-permissions-admin`, `minecraft-worldedit-ops`, `minecraft-essentials-ops`, `minecraft-crossplay-ops`

## Development model

- Do not edit `skills/` directly in this plugin.
- Edit `.agents/skills/` in the repo root.
- Maintain `.agents/skills/README.md` as the canonical skill index.
- Run `./scripts/sync-skills-layout.sh sync` to refresh `.codex/skills/`,
  `.claude/skills/`, and this plugin bundle (including mirrored `skills/README.md`).

## Compatibility

| Surface | Baseline |
|---|---|
| Minecraft scope | `1.21.x` across the bundled skills |
| Java examples | Java `21` for Java-based Paper/mod snippets |
| Bedrock examples | Bedrock Dedicated Server and add-ons on the `1.21.x` line |
| Codex install path | Local marketplace via `.agents/plugins/marketplace.json` |
| Claude Code install path | `claude --plugin-dir ./plugins/minecraft-codex-skills` |
| Image generation workflow | Requires a host with built-in image generation; Codex supports this directly through `minecraft-imagegen` |

## Choosing install mode

- Use the plugin when you want one install surface that keeps skill metadata and mirrored structure bundled together.
- Use raw skills (`.agents/`, `.codex/`, or `.claude/`) when you want to copy only the skills tree into another project without the plugin wrapper.

## Codex local install

1. Keep this plugin under `plugins/minecraft-codex-skills/` in the same repo that
    contains `.agents/plugins/marketplace.json`.
2. Start Codex from the repo root.
3. Open `/plugins` and install `minecraft-codex-skills` from the repo marketplace.
4. If a local plugin change does not appear immediately, reinstall or restart Codex.
   Codex loads local marketplace installs from `~/.codex/plugins/cache/<marketplace>/<plugin>/local/`.

## Claude Code local install

```bash
claude --plugin-dir ./plugins/minecraft-codex-skills
```

## Troubleshooting

- If a local plugin edit does not appear in Codex, reinstall the plugin or restart Codex so it refreshes the cached local copy under `~/.codex/plugins/cache/`.
- If `skills/` looks stale, sync from the canonical tree again before debugging manifests: `bash ./scripts/sync-skills-layout.sh sync`.
- If plugin validation fails, run `node ./scripts/validate-plugin-bundle.mjs` from the repo root to catch manifest or README drift.
- On Windows, run the repo shell scripts from Git Bash or WSL so `bash`, `jq`, and `rsync` are available on `PATH`.

## Manifest Notes

The Codex manifest carries the richer install-surface metadata because current
Codex plugin docs document interface fields there. The Claude manifest intentionally
keeps the shared cross-tool package metadata only, while the mirrored `skills/`
tree and this README carry the detailed catalog and compatibility guidance.
