#!/usr/bin/env bash
set -euo pipefail

CANONICAL_DIR=".agents/skills"
CANONICAL_INDEX="$CANONICAL_DIR/README.md"
MIRROR_DIRS=(".codex/skills" ".claude/skills" "plugins/minecraft-codex-skills/skills")
AGENTS_DIR=".agents/agents"
AGENT_MIRROR_DIRS=(".claude/agents" "plugins/minecraft-codex-skills/agents")
MODE="${1:-sync}"

if [[ ! -d "$CANONICAL_DIR" ]]; then
  echo "[FAIL] Missing canonical directory: $CANONICAL_DIR" >&2
  exit 1
fi

if [[ ! -f "$CANONICAL_INDEX" ]]; then
  echo "[FAIL] Missing canonical skills index: $CANONICAL_INDEX" >&2
  exit 1
fi

FAILED=0

case "$MODE" in
  sync)
    for MIRROR_DIR in "${MIRROR_DIRS[@]}"; do
      mkdir -p "$MIRROR_DIR"
      rsync -a --delete "$CANONICAL_DIR/" "$MIRROR_DIR/"
      if [[ ! -f "$MIRROR_DIR/README.md" ]]; then
        echo "[FAIL] Mirror sync missing skills index: $MIRROR_DIR/README.md" >&2
        FAILED=1
        continue
      fi
      echo "[PASS] Synced $CANONICAL_DIR -> $MIRROR_DIR"
    done
    if [[ -d "$AGENTS_DIR" ]]; then
      for MIRROR_DIR in "${AGENT_MIRROR_DIRS[@]}"; do
        mkdir -p "$MIRROR_DIR"
        rsync -a --delete "$AGENTS_DIR/" "$MIRROR_DIR/"
        echo "[PASS] Synced $AGENTS_DIR -> $MIRROR_DIR"
      done
    fi
    if [[ "$FAILED" -ne 0 ]]; then
      exit 1
    fi
    ;;
  check)
    for MIRROR_DIR in "${MIRROR_DIRS[@]}"; do
      if [[ ! -d "$MIRROR_DIR" ]]; then
        echo "[FAIL] Mirror directory missing: $MIRROR_DIR" >&2
        FAILED=1
        continue
      fi
      if [[ ! -f "$MIRROR_DIR/README.md" ]]; then
        echo "[FAIL] Mirror skills index missing: $MIRROR_DIR/README.md" >&2
        FAILED=1
        continue
      fi
      DIFF_OUTPUT="$(rsync -rlpcni --delete "$CANONICAL_DIR/" "$MIRROR_DIR/")"
      if [[ -n "$DIFF_OUTPUT" ]]; then
        echo "[FAIL] Mirror drift detected between $CANONICAL_DIR and $MIRROR_DIR" >&2
        echo "$DIFF_OUTPUT" >&2
        FAILED=1
      else
        echo "[PASS] $CANONICAL_DIR and $MIRROR_DIR are in sync"
      fi
    done
    if [[ -d "$AGENTS_DIR" ]]; then
      for MIRROR_DIR in "${AGENT_MIRROR_DIRS[@]}"; do
        if [[ ! -d "$MIRROR_DIR" ]]; then
          echo "[FAIL] Agent mirror directory missing: $MIRROR_DIR" >&2
          FAILED=1
          continue
        fi
        DIFF_OUTPUT="$(rsync -rlpcni --delete "$AGENTS_DIR/" "$MIRROR_DIR/")"
        if [[ -n "$DIFF_OUTPUT" ]]; then
          echo "[FAIL] Agent mirror drift detected between $AGENTS_DIR and $MIRROR_DIR" >&2
          echo "$DIFF_OUTPUT" >&2
          FAILED=1
        else
          echo "[PASS] $AGENTS_DIR and $MIRROR_DIR are in sync"
        fi
      done
    fi
    if [[ "$FAILED" -ne 0 ]]; then
      exit 1
    fi
    echo "[PASS] Canonical and all mirror trees are in sync"
    ;;
  *)
    echo "Usage: $0 [sync|check]" >&2
    exit 1
    ;;
esac
