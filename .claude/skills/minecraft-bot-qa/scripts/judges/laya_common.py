"""Optional Laya second opinion shared by the judges.

Laya (convaiinnovations/laya) is a small open decision model. It only adds a second opinion on top of the
deterministic checks, so every judge still works when Laya is not installed or is switched off:
  - pass --no-laya, or set NO_LAYA=1, to skip it on purpose
  - if `pip install laya` was not done, the judge prints a notice and runs the deterministic checks only
"""
import os
import sys
import warnings

warnings.filterwarnings("ignore")


class Second:
    """Wraps laya.decide(); returns None for every question when Laya is unavailable."""

    def __init__(self):
        self.agent = None
        self.laya = None
        self.status = "off"
        if "--no-laya" in sys.argv or os.environ.get("NO_LAYA") == "1":
            self.status = "off (requested)"
            return
        try:
            import laya  # noqa: WPS433

            self.laya = laya
            self.agent = laya.load("convaiinnovations/laya", subfolder="typed-decisions")
            self.status = "ready"
        except Exception as exc:  # missing package, offline first run, no disk space, ...
            self.status = "unavailable (" + type(exc).__name__ + "): deterministic checks only"

    @property
    def ready(self):
        return self.agent is not None

    def decide(self, prompt, options, field):
        """Ask a multiple-choice question. `options` is a tuple of allowed answers; returns one of them or None."""
        if not self.ready:
            return None
        from typing import Literal

        from pydantic import create_model

        schema = create_model("Answer", **{field: (Literal[options], ...)})
        result = self.laya.decide(self.agent, prompt, schema=schema, return_details=True)
        return result.values[field]


def args_without_flags():
    return [a for a in sys.argv[1:] if not a.startswith("--")]
