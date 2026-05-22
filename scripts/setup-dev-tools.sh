#!/usr/bin/env bash
set -euo pipefail

PASS='[PASS]'
WARN='[WARN]'
FAIL='[FAIL]'

echo "=== Setup Dev Tools ==="

OS="$(uname -s)"

need_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1
}

install_with_apt() {
  sudo apt-get update
  sudo apt-get install -y jq rsync nodejs npm
}

install_with_brew() {
  brew install jq rsync node
}

if need_cmd jq && need_cmd rsync && need_cmd node && need_cmd npm; then
  echo "$PASS Required tools already installed: jq, rsync, node, npm"
else
  echo "[INFO] Installing missing tools..."
  case "$OS" in
    Linux)
      if need_cmd apt-get; then
        install_with_apt
      else
        echo "$FAIL Unsupported Linux package manager. Install manually: jq rsync node npm"
        exit 1
      fi
      ;;
    Darwin)
      if need_cmd brew; then
        install_with_brew
      else
        echo "$FAIL Homebrew is required on macOS. Install brew, then rerun."
        exit 1
      fi
      ;;
    *)
      echo "$FAIL Unsupported OS: $OS"
      echo "$WARN Install manually: jq, rsync, node, npm"
      exit 1
      ;;
  esac
fi

for cmd in jq rsync node npm; do
  if need_cmd "$cmd"; then
    ver="$($cmd --version 2>/dev/null | head -n 1 || true)"
    echo "$PASS $cmd ${ver}"
  else
    echo "$FAIL Missing required command after setup: $cmd"
    exit 1
  fi
done

echo ""
echo "$PASS Dev tools are ready"
