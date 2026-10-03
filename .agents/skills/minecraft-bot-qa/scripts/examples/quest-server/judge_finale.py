"""Deterministic finale assertions (ground truth) + Laya second opinion."""
import json, sys, warnings
warnings.filterwarnings("ignore")
from typing import Literal
from pydantic import BaseModel
class StepVerdict(BaseModel):
    outcome: Literal["pass", "fail"]
d = json.load(open(sys.argv[1])); S = {s["label"]: s for s in d["steps"]}
tr = S["angel"]["trace"]; why = [t["why"] for t in tr]
A = [
 (S["aaron-for-book"].get("inv") == "writable_bookx1", "Aaron grants the writable prayer book"),
 (S["sign-book"].get("inv") == "written_bookx1", "book signs to written_book"),
 (S["offer-book"].get("before") == "written_bookx1" and S["offer-book"].get("after") == "", "signed book consumed at the incense altar"),
 ("Holy of Holies" in (S["aaron-after-offer"].get("last") or ""), "Aaron points to the Holy of Holies after the offer"),
 (S["angel"].get("ok") is True and S["angel"].get("steps") == 19, "Angel dialogue completes (19 steps)"),
 ("q1-wrong-first" in why and "q1-correct" in why and "q2-correct" in why and "q3-correct" in why, "wrong answer retried, then Q1-Q3 correct"),
 (abs(S["angel"]["pos"]["x"] + 4254) < 3 and abs(S["angel"]["pos"]["z"] - 3184) < 3, "player ends at the Tabernacle entrance (-4254, 3184)"),
]
import laya
agent = laya.load("convaiinnovations/laya", subfolder="typed-decisions")
obs = "; ".join(m + (" -> OK" if c else " -> FAILED") for c, m in A)
lv = laya.decide(agent, f"QA of the final quest sequence. Expected outcomes and observed results: {obs}. Did the sequence pass?", schema=StepVerdict, return_details=True).values["outcome"]
det = all(c for c, _ in A)
print("deterministic:", "PASS" if det else "FAIL", "| laya:", lv)
for c, m in A: print(" ", "ok " if c else "BAD", m)
json.dump({"deterministic": det, "laya": lv, "assertions": [{"ok": c, "what": m} for c, m in A]}, open("judge_finale_report.json", "w"), indent=1)
