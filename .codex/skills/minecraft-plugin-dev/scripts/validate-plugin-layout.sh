#!/usr/bin/env bash
set -euo pipefail

PASS='[PASS]'
WARN='[WARN]'
FAIL='[FAIL]'

ROOT='.'
STRICT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      ROOT="${2:-}"
      shift 2
      ;;
    --strict)
      STRICT=1
      shift
      ;;
    --help|-h)
      cat <<'USAGE'
Usage: validate-plugin-layout.sh [--root <path>] [--strict]

Checks Paper/Bukkit plugin layout:
- required plugin.yml keys (name, version, main, api-version)
- main class path exists and extends JavaPlugin
- warns on /reload anti-pattern usage
USAGE
      exit 0
      ;;
    *)
      echo "$FAIL unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$ROOT" ]]; then
  echo "$FAIL root path does not exist: $ROOT"
  exit 1
fi

FAILURES=0
WARNINGS=0
CURRENT_EXAMPLE_API_PATCH=11

pass() { echo "$PASS $*"; }
warn() { echo "$WARN $*"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo "$FAIL $*"; FAILURES=$((FAILURES + 1)); }

validate_api_version() {
  local value="$1"

  if [[ "$value" =~ ^1\.21$ ]]; then
    return 0
  fi

  if [[ "$value" =~ ^1\.21\.([1-9][0-9]*)$ ]]; then
    return 0
  fi

  return 1
}

extract_api_version_patch() {
  local value="$1"
  if [[ "$value" =~ ^1\.21\.([1-9][0-9]*)$ ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

warn_if_newer_than_example_api_version() {
  local value="$1"
  local patch=""

  patch="$(extract_api_version_patch "$value" || true)"
  if [[ -n "$patch" ]] && (( patch > CURRENT_EXAMPLE_API_PATCH )); then
    warn "plugin.yml api-version is newer than the repo's documented Paper example patch (1.21.${CURRENT_EXAMPLE_API_PATCH}); verify it against the current Paper release line"
  fi
}

trim() {
  local s="$1"
  s="${s//$'\r'/}"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  s="${s#\"}"
  s="${s%\"}"
  s="${s#\'}"
  s="${s%\'}"
  echo "$s"
}

extract_yaml_key() {
  local file="$1"
  local key="$2"
  awk -F':' -v key="$key" '$1 ~ "^"key"[[:space:]]*$" {sub(/^[^:]*:[[:space:]]*/, "", $0); print; exit}' "$file"
}

echo "=== Plugin Layout Validator ==="

PLUGIN_YML=""
if [[ -f "$ROOT/src/main/resources/plugin.yml" ]]; then
  PLUGIN_YML="$ROOT/src/main/resources/plugin.yml"
elif [[ -f "$ROOT/plugin.yml" ]]; then
  PLUGIN_YML="$ROOT/plugin.yml"
else
  fail "missing plugin.yml (expected src/main/resources/plugin.yml)"
fi

if [[ -n "$PLUGIN_YML" ]]; then
  pass "found plugin.yml: ${PLUGIN_YML#$ROOT/}"

  name_val="$(trim "$(extract_yaml_key "$PLUGIN_YML" "name" || true)")"
  version_val="$(trim "$(extract_yaml_key "$PLUGIN_YML" "version" || true)")"
  main_val="$(trim "$(extract_yaml_key "$PLUGIN_YML" "main" || true)")"
  api_val="$(trim "$(extract_yaml_key "$PLUGIN_YML" "api-version" || true)")"

  [[ -n "$name_val" ]] && pass "plugin.yml has name" || fail "plugin.yml missing key: name"
  [[ -n "$version_val" ]] && pass "plugin.yml has version" || fail "plugin.yml missing key: version"
  [[ -n "$main_val" ]] && pass "plugin.yml has main" || fail "plugin.yml missing key: main"

  if [[ -z "$api_val" ]]; then
    fail "plugin.yml missing key: api-version"
  elif validate_api_version "$api_val"; then
    pass "plugin.yml api-version is within the documented 1.21.x skill scope: $api_val"
    warn_if_newer_than_example_api_version "$api_val"
  elif [[ "$api_val" =~ ^1\.21\.0[0-9]*$ ]]; then
    fail "plugin.yml api-version patch must be a positive integer without leading zeroes: $api_val"
  elif [[ "$api_val" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
    fail "plugin.yml api-version is outside the documented 1.21.x skill scope: $api_val"
  else
    fail "plugin.yml api-version has invalid format: $api_val"
  fi

  if [[ -n "$main_val" ]]; then
    class_path="${main_val//.//}"
    java_file="$ROOT/src/main/java/$class_path.java"
    kotlin_file="$ROOT/src/main/kotlin/$class_path.kt"

    if [[ -f "$java_file" ]]; then
      pass "main class file exists: ${java_file#$ROOT/}"
      if grep -qE 'extends[[:space:]]+JavaPlugin' "$java_file"; then
        pass "main class extends JavaPlugin"
      else
        fail "main class does not extend JavaPlugin: ${java_file#$ROOT/}"
      fi
    elif [[ -f "$kotlin_file" ]]; then
      pass "main class file exists: ${kotlin_file#$ROOT/}"
      if grep -qE ':[[:space:]]*JavaPlugin\(\)' "$kotlin_file"; then
        pass "main Kotlin class extends JavaPlugin"
      else
        fail "main Kotlin class does not extend JavaPlugin: ${kotlin_file#$ROOT/}"
      fi
    else
      fail "main class file not found for '$main_val'"
    fi
  fi
fi

echo "Checking /reload anti-pattern..."
if [[ -d "$ROOT/src" ]]; then
  if grep -rqE '/reload|\breload\b' "$ROOT/src" 2>/dev/null; then
    warn "detected reload usage in source (prefer restart or plugin manager alternatives)"
  else
    pass "no obvious /reload anti-pattern detected"
  fi
else
  warn "src/ directory not found; skipped reload scan"
fi

echo ""
if [[ "$FAILURES" -gt 0 ]]; then
  echo "$FAIL plugin layout validation failed with $FAILURES error(s) and $WARNINGS warning(s)"
  exit 1
fi

if [[ "$STRICT" -eq 1 && "$WARNINGS" -gt 0 ]]; then
  echo "$FAIL plugin layout strict mode failed on $WARNINGS warning(s)"
  exit 1
fi

echo "$PASS plugin layout validation passed with $WARNINGS warning(s)"
