# `.claude` Compatibility Mirror

This directory is a compatibility mirror of the canonical skills tree at:

- `.agents/skills/`
- `.agents/agents/` (subagent definitions in `.claude/agents/`)

Do not edit mirror files directly. Edit canonical skills first, then sync:

```bash
bash ./scripts/sync-skills-layout.sh sync
npm run audit:skills
npm run check:routing
```

Index entrypoint:

- `.claude/skills/README.md`
