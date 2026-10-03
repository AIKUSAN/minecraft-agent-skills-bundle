# Laya Judge Reference

## What Laya Is Here

[Laya](https://huggingface.co/convaiinnovations/laya) is a small open decision model from Convai Innovations
(Apache-2.0). It answers fixed-choice questions ("pass or fail", "normal or broken") with a typed schema. The
judges use it as a **second opinion** after plain assertions have already run.

Rules the judges follow:

1. Deterministic assertions are the ground truth. They decide the exit code.
2. Laya only adds a verdict beside them. It never turns a failed assertion into a pass.
3. If Laya is missing, switched off, or cannot load, the judge says so and carries on with assertions only.

## Install

```bash
python -m pip install -r ./scripts/requirements.txt
```

The first run downloads the model from Hugging Face (`convaiinnovations/laya`, subfolder `typed-decisions`) and
caches it. Laya depends on PyTorch, so expect a large first install. Python 3.10 or newer.

Skip Laya for a run with `--no-laya` or `NO_LAYA=1`.

## Run The Bedrock Menu Judge

```bash
python ./scripts/judges/judge_bedrock.py ./qa-output/results/bedrock-RUN1.json
```

The input is the JSON written by `scripts/bedrock/bedrock_gui.js`. The judge also writes
`bedrock-RUN1-judge.json` next to it:

```json
{
  "deterministic": true,
  "checks": [{ "ok": true, "what": "bot joined the server as a Bedrock player" }],
  "warnings": [],
  "laya_status": "ready",
  "laya_forms": [["main_menu", "pass"]],
  "laya_text_flags": []
}
```

Deterministic checks the Bedrock judge makes:

| Check | Fails when |
|---|---|
| Bot joined | the bot never joined or spawned |
| No harness issues | the run recorded a timeout, a client error, or a form it could not reopen |
| Known panels | a form title is not in your YAML |
| Buttons match | a form's buttons differ from the YAML, in order |
| Opens the right form | an `[open]` button leads somewhere else, or nowhere |
| Chat feedback | a `[msg]` button shows nothing |
| Bad text | player text has `%placeholders%`, `null`, `undefined`, or a stack trace |
| Minimum pressed | fewer than `MIN_PRESSED` buttons were pressed (default 1) |
| Destructive skipped | a skipped button does not match the destructive pattern |

Console-only buttons that show nothing produce a warning, not a failure.

## Write Your Own Judge

Import the shared helper, run your assertions first, then ask Laya only for what plain code cannot decide:

```python
from laya_common import Second

second = Second()  # prints nothing; second.status explains why it is off
verdict = second.decide(
    "A game menu line shown to the player. Is it normal readable prose, or broken?\nLine: Welcome back, Sam.",
    ("normal", "broken"),
    "text_quality",
)
print(second.status, verdict)  # verdict is None when Laya is not available
```

Keep prompts short and give Laya the observed facts, not the whole log. Put anything that must be exact
(button names, counts, ordering) in assertions.

## Honest Limits

- Laya judges wording and short summaries. It cannot see the game, so it cannot confirm visuals.
- A small model can be wrong in both directions. Treat a Laya disagreement as a prompt to look, not as proof.
- Never gate a release on Laya alone.

Seen in practice, on the bundled self-test menus: Laya flagged the plain title "Server Menu" as broken, and it passed
a form whose text still contained an unresolved `%player_name%` placeholder. The plain assertion caught the placeholder
and failed the run. That is exactly why assertions decide and Laya only advises.
