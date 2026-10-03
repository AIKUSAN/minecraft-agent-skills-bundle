# Routing Recipes

Each recipe lists the order of work and which subagent takes each step. Rows with the same order number can run in parallel.

## New Java network with Bedrock support

| Order | Subagent | Task |
|---|---|---|
| 1 | `minecraft-java-ops` | Analyze any existing folder, choose server software, plan the proxy and backups |
| 2 | `minecraft-bedrock-ops` | Place Geyser and Floodgate, pick the authentication mode, open the UDP port |
| 2 | `minecraft-java-ops` | Permission groups and the prefix policy for Floodgate players |
| 3 | `minecraft-qa-release` | Bot playthrough from a Java bot and a Bedrock bot on the staging server |

## Java resource pack that Bedrock players also need

| Order | Subagent | Task |
|---|---|---|
| 1 | `minecraft-content-author` | Finish the Java pack (`minecraft-resource-pack`), then convert it (`minecraft-resource-pack-conversion`) |
| 2 | `minecraft-bedrock-ops` | Deliver the converted pack through Geyser and test with a Bedrock client |

## New plugin feature with tests and a release

| Order | Subagent | Task |
|---|---|---|
| 1 | `minecraft-code-dev` | Write the feature |
| 2 | `minecraft-qa-release` | Tests (`minecraft-testing`), CI and publishing (`minecraft-ci-release`) |
| 3 | `minecraft-qa-release` | Bot playthrough on a dev server before release (`minecraft-bot-qa`) |

## Custom dimension with a command-driven build

| Order | Subagent | Task |
|---|---|---|
| 1 | `minecraft-content-author` | Dimension and biome JSON (`minecraft-world-generation`), wiring in the datapack (`minecraft-datapack`) |
| 2 | `minecraft-java-ops` | Build or reset areas with WorldEdit, staff permissions |

## Server cleanup after an incident

| Order | Subagent | Task |
|---|---|---|
| 1 | `minecraft-java-ops` | Read-only analysis and backup |
| 2 | `minecraft-java-ops` | Permission audit and EssentialsX config review, as separate briefs |
| 3 | `minecraft-java-ops` | Staged fixes and a startup-log check |
| 4 | `minecraft-qa-release` | Bot playthrough to confirm players can join and use menus |
