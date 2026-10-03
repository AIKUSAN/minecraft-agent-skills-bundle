"""Deterministic assertions (ground truth) + Laya second-opinion on NPC text quality and step outcomes."""
import json, sys, re, warnings
warnings.filterwarnings("ignore")
from typing import Literal
from pydantic import BaseModel

def rows(step):
    out = []
    for l in step["lines"]:
        k, _, rest = l.partition(" ")
        try: out.append((k, json.loads(rest)))
        except Exception: out.append((k, rest))
    return out

def inv_has(s, name, count=None):
    items = [x for x in (s or "").split(",") if x]
    n = sum(1 for x in items if x.startswith(name + "x"))
    return n >= (count or 1)

def check(label, rs):
    rowsN = [r for k, r in rs if k == "ROW"]
    alt = [r for k, r in rs if k == "ALTAR"]
    def last(npc): return next((r for r in reversed(rowsN) if r["npc"] == npc), None)
    A = []
    def ok(c, msg): A.append((bool(c), msg))
    if label == "moses-wheat-livestock":
        m, w, l = last("Moses"), last("Wheat Farmer"), last("Livestock Farmer")
        ok(m and m["steps"] >= 3 and "wheat, beef, and mutton" in m["lastSpoken"], "Moses opening completes through the three-item request")
        ok(w and inv_has(w["inventoryAfter"], "wheat"), "Wheat Farmer grants wheat")
        ok(l and inv_has(l["inventoryAfter"], "beef") and inv_has(l["inventoryAfter"], "mutton"), "Livestock Farmer grants beef and mutton")
    elif label == "altar-offerings":
        ok(len(alt) == 3 and all(a["after"].count(a["item"]) == 0 or a["before"] != a["after"] for a in alt) and alt[-1]["after"] == "", "wheat, beef, mutton each consumed at the altar")
    elif label == "moses-bucket-welldigger":
        m, w = last("Moses"), last("Well Digger")
        ok(m and inv_has(m["inventoryAfter"], "bucket"), "Moses grants the bucket")
        ok(w and "water_bucket" in w["inventoryAfter"], "Well Digger exchanges bucket for water bucket")
    elif label == "basin-water":
        ok(alt and alt[-1]["after"] == "" and alt[-1]["before"] != "", "water bucket consumed at the basin")
    elif label == "aaron-1":
        a = last("Aaron"); ok(a and "Right click on me again" in a["lastSpoken"], "Aaron laver dialogue completes")
    elif label == "aaron-2-lampoil":
        a = last("Aaron"); ok(a and inv_has(a["inventoryAfter"], "potion"), "Aaron grants lamp oil")
    elif label == "menorah-fly":
        mm = [r for k, r in rs if k == "MENORAH"]
        ok(mm and mm[-1]["before"] == "potionx1" and mm[-1]["after"] == "", "lamp oil consumed at menorah after flight")
    elif label == "aaron-3-bread-task":
        a = last("Aaron"); ok(a and any("bread" in p for p in a["picks"]), "Aaron lampstand dialogue reaches bread task")
    elif label == "aaron-4-q4-teleport":
        a = last("Aaron"); ok(a and a["moved"] > 50 and "bread" in a["lastSpoken"], "Aaron q4 teleport executed (moved >50 blocks)")
    elif label == "wheat-3x":
        w = last("Wheat Farmer"); ok(w and w["inventoryAfter"].count("wheat") == 3, "Wheat Farmer grants three separate wheat stacks")
    elif label == "craft-bread":
        c = [r for k, r in rs if k == "CRAFT"]; ok(c and c[-1].get("afterCraft") == "breadx1", "marked bread crafted from the three wheat")
    elif label == "offer-showbread":
        ok(alt and alt[-1]["after"] == "" and alt[-1]["before"] == "breadx1", "showbread consumed at the table")
    elif label == "wheat-tent-teleport":
        w = last("Wheat Farmer"); ok(w and w["moved"] > 50, "Wheat Farmer tent teleport executed")
    elif label == "aaron-5-book":
        a = last("Aaron"); ok(a and "writable_book" in a["inventoryAfter"], "Aaron grants writable book")
    return A

class Verdict(BaseModel):
    text_quality: Literal["normal", "broken"]
class StepVerdict(BaseModel):
    outcome: Literal["pass", "fail"]

def main(paths):
    import laya
    agent = laya.load("convaiinnovations/laya", subfolder="typed-decisions")
    report = {}
    for p in paths:
        d = json.load(open(p)); var = d["variant"]; report[var] = []
        for st in d["steps"]:
            rs = rows(st); A = check(st["label"], rs)
            texts = [r["lastSpoken"] for k, r in rs if k == "ROW" and r.get("lastSpoken")]
            tq = []
            for t in texts:
                v = laya.decide(agent, f"A game NPC dialogue line shown to the player. Is the text normal readable prose, or broken (unresolved placeholders, null/undefined, stack traces)?\nLine: {t}", schema=Verdict, return_details=True)
                tq.append({"text": t[:90], "laya": v.values["text_quality"]})
            obs = "; ".join(m + (" -> OK" if c else " -> FAILED") for c, m in A) or "no assertions"
            lv = laya.decide(agent, f"QA step '{st['label']}'. Expected outcomes and observed results: {obs}. Did the step pass?", schema=StepVerdict, return_details=True).values["outcome"]
            det = all(c for c, _ in A) and bool(A) and st["status"] == 0
            report[var].append({"step": st["label"], "deterministic": "pass" if det else "FAIL", "laya_step": lv, "laya_text_flags": [x for x in tq if x["laya"] == "broken"], "assertions": [{"ok": c, "what": m} for c, m in A], "secs": st["secs"]})
    json.dump(report, open("judge_report.json", "w"), indent=1)
    for var, steps in report.items():
        print("==", var)
        for s in steps: print(f"{s['deterministic']:5} laya={s['laya_step']:5} flags={len(s['laya_text_flags'])} {s['step']}")
main(sys.argv[1:])
