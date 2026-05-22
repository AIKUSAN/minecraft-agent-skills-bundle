# Privacy

`minecraft-agent-skills-bundle` is a public repository of skills, docs, validators, and plugin metadata. The repository itself does not ship analytics, telemetry, or a hosted backend.

## What This Repo Does

- Provides Markdown skill files, shell validators, test fixtures, and plugin manifests
- Documents workflows for Codex and Claude Code
- Runs CI checks in GitHub Actions for repository quality

## What Maintainers Do Not Collect Through The Repo

- No built-in telemetry from the skill files
- No custom analytics endpoint
- No bundled service that uploads project contents on its own

## Third-Party Services

When you use these skills with Codex, Claude Code, GitHub, OpenAI APIs, or other hosted services, your data handling is governed by those platforms and the configuration you choose there. This repository does not override their privacy behavior.

## Credentials And Secrets

Do not commit secrets, API keys, tokens, or private server data into issues, pull requests, fixtures, or skill examples. Public repository history is permanent and should be treated as publicly readable.
