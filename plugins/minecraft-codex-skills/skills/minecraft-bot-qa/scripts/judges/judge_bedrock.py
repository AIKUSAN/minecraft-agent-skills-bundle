"""Bedrock menu judge: deterministic assertions (ground truth) plus an optional Laya second opinion.

Usage: python judges/judge_bedrock.py <results/bedrock-TAG.json> [--no-laya]
Env:   MIN_PRESSED (minimum buttons that must have been pressed, default 1)
Exit code 0 = deterministic PASS, 1 = deterministic FAIL. Laya never overrides a deterministic failure.
"""
import json
import os
import re
import sys

from laya_common import Second, args_without_flags

BAD = [
    (re.compile(r"%[A-Za-z_]+%"), "unresolved %placeholder%"),
    (re.compile(r"\b(null|undefined|NaN)\b", re.I), "null/undefined"),
    (re.compile(r"Traceback|Exception|at [\w.$]+\(.+\.java"), "stack trace"),
]
WARN = [(re.compile(r"\\n"), "literal backslash-n in text (line break not converted?)")]


def panel_by_title_and_buttons(expected, title, buttons):
    for k, p in expected.items():
        if p["title"] == title and [b["name"] for b in p["buttons"]] == buttons:
            return k, p
    for k, p in expected.items():
        if p["title"] == title:
            return k, p
    return None, None


def main(path):
    d = json.load(open(path, encoding="utf-8"))
    exp = d["expected"]
    destructive = re.compile(d.get("destructive") or r"^(confirm )?(reset|delete|wipe|erase|purge)\b", re.I)
    min_pressed = int(os.environ.get("MIN_PRESSED", "1"))
    checks, warns, forms, texts = [], [], [], []

    def ok(cond, msg):
        checks.append((bool(cond), msg))

    ok(d.get("joined"), "bot joined the server as a Bedrock player")
    issues = d.get("issues") or []
    ok(not issues, "no harness issues" + (" (" + "; ".join(issues)[:120] + ")" if issues else ""))

    cur = {}  # path -> (panel key, panel)
    for s in d["steps"]:
        if s.get("kind") != "form":
            continue
        k, p = panel_by_title_and_buttons(exp, s["title"], s["buttons"])
        ok(p is not None, "form '" + s["title"] + "' is a known panel")
        if p:
            cur[tuple(s["path"])] = (k, p)
            ok(s["buttons"] == [b["name"] for b in p["buttons"]], k + ": buttons match the YAML exactly (" + str(len(s["buttons"])) + ")")
            forms.append((k, s))
            texts.append(("title", s["title"]))
            texts.append(("content", s["content"]))

    pressed = 0
    for s in d["steps"]:
        if s.get("kind") != "press":
            continue
        pk = cur.get(tuple(s["path"]))
        if not pk:
            continue
        key, p = pk
        btn = p["buttons"][s["index"]]
        if s.get("skipped"):
            ok(destructive.search(btn["name"]), key + ": only destructive buttons are skipped ('" + btn["name"] + "')")
            continue
        if s.get("error"):
            ok(False, key + ": '" + s["label"] + "' press failed (" + s["error"] + ")")
            continue
        pressed += 1
        acts = list(btn["actions"])
        opens = [re.sub(r"^\[open\]\s*", "", a).strip() for a in acts if a.startswith("[open]")]
        msgs = [a for a in acts if a.startswith("[msg]")]
        if opens:
            tgt = exp.get(opens[0])
            ok(s.get("newForm") and tgt and s["newForm"] == tgt["title"], key + ": '" + s["label"] + "' opens '" + (tgt["title"] if tgt else opens[0]) + "' (got " + str(s.get("newForm")) + ")")
        elif msgs:
            ok(len(s.get("texts") or []) > 0, key + ": '" + s["label"] + "' shows its chat message")
        elif not any(a.startswith("[close]") for a in acts):
            if not (s.get("texts") or s.get("newForm")):
                warns.append(key + ": '" + s["label"] + "' gave no visible feedback (console-only button)")
        for t in s.get("texts") or []:
            texts.append(("chat", t))
    ok(pressed >= min_pressed, "pressed " + str(pressed) + " buttons across all forms (expected at least " + str(min_pressed) + ")")

    for kind, t in texts:
        for rx, why in BAD:
            if rx.search(t):
                ok(False, kind + " text has " + why + ": " + t[:80])
        for rx, why in WARN:
            if rx.search(t):
                warns.append(kind + ": " + why + ": " + t[:70])
    det = all(c for c, _ in checks)

    second = Second()
    flags, verdicts = [], []
    if second.ready:
        for kind, t in texts:
            if not t.strip():
                continue
            v = second.decide("A game menu " + kind + " line shown to the player. Is the text normal readable prose, or broken (unresolved placeholders, null/undefined, stack traces)?\nLine: " + t, ("normal", "broken"), "text_quality")
            if v == "broken":
                flags.append((kind, t[:80]))
        for k, s in forms:
            rel = [(c, m) for c, m in checks if k in m or m.startswith(("content text", "chat text", "title text"))]
            obs = "; ".join(m + (" -> OK" if c else " -> FAILED") for c, m in rel) or "no assertions"
            verdicts.append((k, second.decide("QA of a Bedrock menu form '" + k + "'. Expected outcomes and observed results: " + obs + ". Did the form pass?", ("pass", "fail"), "outcome")))

    print("== Bedrock judge:", path)
    for c, m in checks:
        if not c:
            print("  FAIL", m)
    for w in warns:
        print("  warn", w)
    for k, v in verdicts:
        print("  laya form " + k + ": " + str(v))
    for f in flags:
        print("  laya text flag", f)
    print("laya:", second.status)
    summary = "deterministic: " + ("PASS" if det else "FAIL") + " (" + str(sum(1 for c, _ in checks if c)) + "/" + str(len(checks)) + " checks)"
    if second.ready:
        summary += " | laya forms: " + str(sum(1 for _, v in verdicts if v == "pass")) + "/" + str(len(verdicts)) + " pass, text flags: " + str(len(flags))
    print(summary + " | warnings: " + str(len(warns)))
    out = path.replace(".json", "-judge.json")
    json.dump({"deterministic": det, "checks": [{"ok": c, "what": m} for c, m in checks], "warnings": warns, "laya_status": second.status, "laya_forms": verdicts, "laya_text_flags": flags}, open(out, "w", encoding="utf-8"), indent=1)
    sys.exit(0 if det else 1)


if __name__ == "__main__":
    args = args_without_flags()
    if not args:
        sys.exit(__doc__)
    main(args[0])
