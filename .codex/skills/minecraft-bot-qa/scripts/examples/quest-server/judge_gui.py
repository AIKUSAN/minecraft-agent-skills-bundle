"""Deterministic GUI assertions + Laya second opinion on every panel click (DEV GUI test)."""
import json, sys, re, warnings
warnings.filterwarnings("ignore")
from typing import Literal
from pydantic import BaseModel

class Text(BaseModel):
    quality: Literal["normal", "broken"]
class Step(BaseModel):
    outcome: Literal["pass", "fail"]

def assertions(r):
    A = []
    def ok(c, m): A.append((bool(c), m))
    chats = r.get("chats", [])
    joined = " ".join(chats)
    if r["expect"] == "respond":
        ok(r.get("responded"), "tile responds (chat, window change, or movement)")
    else:
        ok(not r.get("chats") and not r.get("opened"), "decorative tile stays inert")
    ok(not re.search(r"typewriter|claude", joined, re.I), "no internal plugin or tool names in player text")
    ok(not re.search(r"%[a-z_]+%|\bnull\b|undefined|exception", joined, re.I), "no unresolved placeholders or errors in player text")
    l = r["label"]
    if l == "main/continue_story":
        ok("Objective:" in joined and "Next:" in joined, "Continue shows the current objective and next action")
        ok("/tabernacle" not in joined, "Continue no longer points back to /tabernacle")
    if l == "main/return_spawn":
        ok("Returned to the Tabernacle entrance" in joined, "Return to Spawn confirms in chat")
    if l == "help/replay_tutorial":
        ok(len(chats) >= 3 and "save automatically" in joined, "Replay Tutorial prints the three tips, plain wording")
    if l == "help/interaction_help": ok("NPC Interaction" in joined, "Help NPC Interaction text shown")
    if l == "help/progress_help": ok("Saving" in joined, "Help Saving text shown")
    return A

def main(path):
    import laya
    agent = laya.load("convaiinnovations/laya", subfolder="typed-decisions")
    d = json.load(open(path)); rep = []
    for r in d["results"]:
        A = assertions(r)
        flags = []
        for c in r.get("chats", []):
            v = laya.decide(agent, f"A chat line shown to a player after clicking a menu tile in a game. Is it normal readable text, or broken (unresolved placeholders, null/undefined, stack traces, internal tool names)?\nLine: {c}", schema=Text, return_details=True)
            if v.values["quality"] == "broken": flags.append(c[:90])
        obs = "; ".join(m + (" -> OK" if c else " -> FAILED") for c, m in A)
        lv = laya.decide(agent, f"QA step '{r['label']}'. Expected outcomes and observed results: {obs}. Did the step pass?", schema=Step, return_details=True).values["outcome"]
        det = all(c for c, _ in A)
        rep.append({"step": r["label"], "deterministic": "pass" if det else "FAIL", "laya": lv, "laya_text_flags": flags, "failed": [m for c, m in A if not c]})
    json.dump(rep, open(path.replace(".json", "-judge.json"), "w"), indent=1)
    for s in rep: print(f"{s['deterministic']:5} laya={s['laya']:5} flags={len(s['laya_text_flags'])} {s['step']} {s['failed'] or ''}")
    print("TOTAL", sum(s['deterministic'] == 'pass' for s in rep), "/", len(rep))
main(sys.argv[1])
