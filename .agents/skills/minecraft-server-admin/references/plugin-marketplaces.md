# Java Plugin Marketplace Operations

Use this reference when selecting, downloading, installing, or updating Minecraft Java server plugins. The goal is a stable server, not the largest possible plugin list.

## Source Priority

Prefer sources that expose current platform compatibility, dependencies, release history, authorship, and file provenance:

1. Hangar/PaperMC for Paper, Velocity, Waterfall, and Folia-tagged plugin releases.
2. Modrinth for public projects with filterable game versions, categories/loaders, server-side metadata, license data, and version files.
3. GitHub Releases when the plugin project publishes signed or checksum-friendly release assets and links documentation from the repository.
4. Verified project websites that link back to the same author or organization named by a known marketplace listing.
5. SpigotMC and BukkitDev as valid ecosystem sources, with manual steps for paid, authenticated, or license-restricted downloads.

Avoid random mirrors, reposts, ad-shortener downloads, and files whose source cannot be tied back to a project maintainer.

## Modrinth Workflow

Use Modrinth search when the task calls for open-source or marketplace plugin discovery:

- Search projects by function and filter with facets such as `project_type`, `categories`, `versions`, `server_side`, and `open_source`.
- Prefer server-side projects with explicit support for the target Minecraft version.
- Read the project page and version metadata before selecting a file.
- Check dependencies and incompatibilities before downloading.
- Use public API downloads only when the matching version file is compatible with the requested Minecraft version and platform.
- Send an honest User-Agent when using the API from a script or automation.

Example search intent:

```text
Find Paper plugins for claims/protection on Minecraft 1.21.x, prefer server-side projects with recent releases, source links, and clear dependency notes.
```

## Hangar/PaperMC Workflow

Use Hangar for Paper and Velocity ecosystem plugins:

- Check the project platform: Paper, Velocity, Waterfall, or Folia support.
- Prefer stable or release channels unless the user explicitly accepts beta/snapshot risk.
- Check Minecraft version compatibility, dependency notes, and project documentation.
- Use the project page download button or documented API flows for public artifacts.
- Treat Folia tags as a starting signal, not final proof; still review the plugin's docs and recent issue history.

Hangar is especially useful for Paper ecosystem staples, Velocity proxy plugins, and projects that publish separate files per platform.

## GitHub Releases Workflow

Use GitHub Releases when the project itself publishes plugin jars:

- Confirm the repository is the official source linked by the plugin project.
- Prefer release assets ending in `.jar` for the matching platform; do not install source zips as plugins.
- Check release notes for target Minecraft version, Java version, dependencies, and breaking changes.
- Verify checksums/signatures when the project publishes them.
- If a project requires building from source, route code build details to `minecraft-plugin-dev` and keep server rollout here.

## SpigotMC and BukkitDev Workflow

Treat SpigotMC and BukkitDev as legitimate sources, but do not assume fully automated download:

- Paid resources, login-gated resources, anti-bot flows, and license-limited downloads require manual user action.
- Link the exact resource page and explain which file to download.
- Confirm whether the resource targets Bukkit, Spigot, Paper, Purpur, Folia, or Velocity.
- Check discussion/issues/reviews for recent compatibility warnings.
- Do not bypass authentication, payment, rate limits, or license controls.

## Compatibility Checklist

Before approving a plugin for install or update, check:

- target Minecraft version matches the server line, usually `1.21.x`
- server type matches the jar: Paper/Purpur/Folia/Velocity/Fabric/NeoForge
- Java runtime matches the plugin and server, usually Java 21 for this bundle
- hard dependencies are present and loaded first
- soft dependencies are understood when features depend on them
- duplicate plugin names are not installed
- Folia compatibility is documented before using Folia
- permissions plugin and economy bridge expectations are clear
- release date and issue history are recent enough for the server's risk tolerance
- license allows intended use and redistribution, if relevant
- checksum, signature, or release provenance is available when possible

## Install and Update Workflow

1. Inventory the current `plugins/` folder and generated plugin config folders.
2. Snapshot `plugins/`, `config/`, `server.properties`, proxy configs, and relevant worlds before changes.
3. Download only the selected compatible jar files.
4. Place plugin jars at the root of `plugins/`; Paper does not load plugin jars from nested subdirectories.
5. Start in staging or maintenance mode so plugins generate configs.
6. Review `logs/latest.log` for missing dependencies, invalid `plugin.yml`, ambiguous names, and API warnings.
7. Configure the generated files, then restart once more.
8. Smoke test joins, permissions, commands, economy, teleports, persistence, and rollback path.
9. Roll out to production during a maintenance window.

## Plugin Families

Use these families as prompts for discovery, not as unconditional install lists:

- permissions and role policy: LuckPerms
- profiling and diagnostics: Spark
- economy bridge: Vault or a modern replacement required by the selected economy plugin
- admin convenience: EssentialsX
- build/edit operations: WorldEdit, WorldGuard, schematic tooling
- grief protection and audit: claims/protection plugins, CoreProtect-style logging
- world management: chunk pregeneration, portals, maps, world borders
- moderation: chat control, reports, vanish, maintenance mode
- proxy/network: Velocity-compatible hub, queue, forwarding, and messaging plugins
- minigames: arena framework, scoreboard, queue, reset, and reward plugins chosen per game mode

Keep plugin sets lean. Every plugin adds update, compatibility, permission, and performance surface area.
