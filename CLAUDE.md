# CLAUDE.md

@AGENTS.md

## Claude Code notes

Claude Code reads this file, not `AGENTS.md`, so the line above pulls in the shared repo guidance.

- Edit canonical files in `.agents/skills/` and `.agents/agents/` only. Run `bash ./scripts/sync-skills-layout.sh sync` afterwards, then `npm run check`. Never edit `.claude/skills/`, `.claude/agents/`, `.codex/skills/`, or the plugin mirrors by hand.
- Test the plugin locally with `claude --plugin-dir ./plugins/minecraft-codex-skills`. The plugin ships the skills and the five subagents.
- For a request that spans several skills, load `minecraft-task-router` first. It hands each part to a specialist subagent. Subagents never start other subagents.
- Bot QA (`minecraft-bot-qa`) runs against dev or staging servers only, with throwaway accounts. Never commit sign-in caches (`auth-cache*`), logs, or results.
