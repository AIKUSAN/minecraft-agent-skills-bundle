# Delegation Brief and Return Format

A subagent starts with no memory of the conversation. Give it everything it needs in one brief, and ask for the fixed return format so results are easy to merge.

## Brief template

```text
Outcome: one sentence describing what must be true when you are done.
Skills: the skill names this subagent should load.
Context: Minecraft version, platform (Java, Bedrock or both), server software, paths, and anything already decided.
Inputs: files, reports or earlier subagent results to use. Paste the relevant parts.
Limits: what not to touch. Say whether live or destructive changes are approved (default: not approved, propose only).
Done when: the checks that prove the outcome (a clean startup log, a passing test, a bot playthrough).
Return: use the return format below.
```

## Return format

```text
Status: done | blocked | needs-other-skill
Summary: up to five lines.
Changed: files edited or created, and commands run, with results.
Proposed: changes that still need approval, each with its rollback.
Risks: anything that could break and how you would notice.
Handoff: if needs-other-skill, name the skill and say what it needs from this result.
```

## Rules for the subagent

- Stay inside the loaded skills. If the task needs another skill, return `needs-other-skill` instead of guessing.
- Do not start other subagents.
- Do not run production or destructive actions without approval in the brief. Take a backup first when approval is given.
- Report failures as they are. Do not mark `done` when a check did not pass.
