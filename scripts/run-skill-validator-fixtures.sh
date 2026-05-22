#!/usr/bin/env bash
set -euo pipefail

PASS='[PASS]'
FAIL='[FAIL]'

expect_path() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    echo "$FAIL missing fixture path: $path" >&2
    exit 1
  fi
}

run_and_capture() {
  local output_file
  output_file="$(mktemp)"
  if "$@" >"$output_file" 2>&1; then
    cat "$output_file"
    rm -f "$output_file"
    return 0
  else
    local status=$?
    cat "$output_file"
    rm -f "$output_file"
    return "$status"
  fi
}

expect_pass() {
  local name="$1"
  shift
  if run_and_capture "$@"; then
    echo "$PASS $name"
  else
    echo "$FAIL $name (expected pass)" >&2
    exit 1
  fi
}

expect_pass_contains() {
  local name="$1"
  local pattern="$2"
  shift
  shift

  local output_file
  output_file="$(mktemp)"
  if "$@" >"$output_file" 2>&1; then
    if grep -Fq "$pattern" "$output_file"; then
      cat "$output_file"
      rm -f "$output_file"
      echo "$PASS $name"
    else
      cat "$output_file"
      rm -f "$output_file"
      echo "$FAIL $name (missing expected output: $pattern)" >&2
      exit 1
    fi
  else
    cat "$output_file"
    rm -f "$output_file"
    echo "$FAIL $name (expected pass)" >&2
    exit 1
  fi
}

expect_fail_contains() {
  local name="$1"
  local pattern="$2"
  shift
  shift

  local output_file
  output_file="$(mktemp)"
  if "$@" >"$output_file" 2>&1; then
    cat "$output_file"
    rm -f "$output_file"
    echo "$FAIL $name (expected failure)" >&2
    exit 1
  elif grep -Fq "$pattern" "$output_file"; then
    cat "$output_file"
    rm -f "$output_file"
    echo "$PASS $name"
  else
    cat "$output_file"
    rm -f "$output_file"
    echo "$FAIL $name (missing expected output: $pattern)" >&2
    exit 1
  fi
}

expect_temp_skill_pass() {
  local name="$1"
  local skill_dir="$2"
  local temp_dir

  temp_dir="$(mktemp -d)"
  cp -R "$skill_dir"/. "$temp_dir"

  if (cd "$temp_dir" && ./scripts/validate-workflow-snippets.sh --root .); then
    rm -rf "$temp_dir"
    echo "$PASS $name"
  else
    local status=$?
    rm -rf "$temp_dir"
    echo "$FAIL $name (expected pass)" >&2
    exit "$status"
  fi
}

prepare_server_admin_fixture() {
  local src="$1"
  local dst="$2"

  python3 - "$src" "$dst" <<'PY'
from pathlib import Path
import shutil
import sys
import zipfile

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

if dst.exists():
    shutil.rmtree(dst)

ignore = shutil.ignore_patterns("plugins-src")
shutil.copytree(src, dst, ignore=ignore)

plugins_src = src / "plugins-src"
plugins_dir = dst / "plugins"
plugins_dir.mkdir(exist_ok=True)

if plugins_src.exists():
    for plugin_dir in sorted(plugins_src.iterdir()):
        if not plugin_dir.is_dir():
            continue
        jar_path = plugins_dir / f"{plugin_dir.name}.jar"
        with zipfile.ZipFile(jar_path, "w", zipfile.ZIP_DEFLATED) as jar:
            for file_path in sorted(plugin_dir.rglob("*")):
                if file_path.is_file():
                    jar.write(file_path, file_path.relative_to(plugin_dir).as_posix())
PY
}

zip_server_admin_fixture() {
  local src="$1"
  local dst="$2"

  python3 - "$src" "$dst" <<'PY'
from pathlib import Path
import sys
import zipfile

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as archive:
    for file_path in sorted(src.rglob("*")):
        if file_path.is_file():
            archive.write(file_path, file_path.relative_to(src).as_posix())
PY
}

echo "=== Running Skill Validator Fixtures ==="

expect_path "tests/fixtures/validators/datapack/valid"
expect_path "tests/fixtures/validators/datapack/legacy-pack-metadata"
expect_path "tests/fixtures/validators/datapack/invalid"
expect_pass "datapack valid" \
  ./.agents/skills/minecraft-datapack/scripts/validate-datapack.sh \
  --root tests/fixtures/validators/datapack/valid
expect_pass "datapack legacy pack metadata" \
  ./.agents/skills/minecraft-datapack/scripts/validate-datapack.sh \
  --root tests/fixtures/validators/datapack/legacy-pack-metadata
expect_fail_contains "datapack invalid" "legacy path detected" \
  ./.agents/skills/minecraft-datapack/scripts/validate-datapack.sh \
  --root tests/fixtures/validators/datapack/invalid

expect_path "tests/fixtures/validators/resource-pack/valid"
expect_path "tests/fixtures/validators/resource-pack/legacy-pack-metadata"
expect_path "tests/fixtures/validators/resource-pack/invalid"
expect_pass "resource-pack valid" \
  ./.agents/skills/minecraft-resource-pack/scripts/validate-resource-pack.sh \
  --root tests/fixtures/validators/resource-pack/valid
expect_pass "resource-pack legacy pack metadata" \
  ./.agents/skills/minecraft-resource-pack/scripts/validate-resource-pack.sh \
  --root tests/fixtures/validators/resource-pack/legacy-pack-metadata
expect_fail_contains "resource-pack invalid" "missing texture" \
  ./.agents/skills/minecraft-resource-pack/scripts/validate-resource-pack.sh \
  --root tests/fixtures/validators/resource-pack/invalid

expect_path "tests/fixtures/validators/resource-pack-conversion/valid-java-pack"
expect_path "tests/fixtures/validators/resource-pack-conversion/invalid-missing-mcmeta"
expect_path "tests/fixtures/validators/resource-pack-conversion/unsupported-java-pack"
conversion_tmp="$(mktemp -d)"
expect_pass "resource-pack conversion builtin" \
  python3 ./.agents/skills/minecraft-resource-pack-conversion/scripts/convert-java-pack-to-bedrock.py \
  --input tests/fixtures/validators/resource-pack-conversion/valid-java-pack \
  --output "$conversion_tmp/valid.mcpack" \
  --pack-name "Tiny Bedrock Pack" \
  --description "Converted fixture pack" \
  --report "$conversion_tmp/report.json" \
  --converter builtin
python3 - "$conversion_tmp/valid.mcpack" "$conversion_tmp/report.json" <<'PY'
import json
import sys
import zipfile

pack_path = sys.argv[1]
report_path = sys.argv[2]

with zipfile.ZipFile(pack_path) as pack:
    names = set(pack.namelist())

required = {
    "manifest.json",
    "textures/blocks/stone.png",
    "textures/items/diamond.png",
    "pack_icon.png",
}
missing = sorted(required - names)
if missing:
    print(f"[FAIL] resource-pack conversion output missing: {missing}", file=sys.stderr)
    sys.exit(1)

with open(report_path, encoding="utf-8") as report_file:
    report = json.load(report_file)

if report["status"] != "completed":
    print("[FAIL] resource-pack conversion report did not complete", file=sys.stderr)
    sys.exit(1)
if len(report["copied_assets"]) < 3:
    print("[FAIL] resource-pack conversion copied too few assets", file=sys.stderr)
    sys.exit(1)

print("[PASS] resource-pack conversion output contents")
PY
rm -rf "$conversion_tmp"
expect_fail_contains "resource-pack conversion missing metadata" "missing pack.mcmeta" \
  python3 ./.agents/skills/minecraft-resource-pack-conversion/scripts/convert-java-pack-to-bedrock.py \
  --input tests/fixtures/validators/resource-pack-conversion/invalid-missing-mcmeta \
  --output /tmp/missing.mcpack \
  --converter builtin
expect_fail_contains "resource-pack conversion strict unsupported" '"status": "failed"' \
  python3 ./.agents/skills/minecraft-resource-pack-conversion/scripts/convert-java-pack-to-bedrock.py \
  --input tests/fixtures/validators/resource-pack-conversion/unsupported-java-pack \
  --output /tmp/unsupported.mcpack \
  --strict \
  --converter builtin

expect_path "tests/fixtures/validators/server-admin-analyzer/paper-survival"
expect_path "tests/fixtures/validators/server-admin-analyzer/lobby-proxy"
expect_path "tests/fixtures/validators/server-admin-analyzer/minigame-missing-dep"
expect_path "tests/fixtures/validators/server-admin-analyzer/suspicious"
server_admin_tmp="$(mktemp -d)"
prepare_server_admin_fixture \
  tests/fixtures/validators/server-admin-analyzer/paper-survival \
  "$server_admin_tmp/paper-survival"
expect_pass "server-admin analyzer paper survival folder" \
  python3 ./.agents/skills/minecraft-server-admin/scripts/analyze-java-server.py \
  --input "$server_admin_tmp/paper-survival" \
  --output "$server_admin_tmp/paper-survival.json" \
  --format json \
  --target-version 1.21.11 \
  --server-type auto
python3 - "$server_admin_tmp/paper-survival.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as report_file:
    report = json.load(report_file)

plugins = {plugin["name"] for plugin in report["plugins"]}
required_plugins = {"EssentialsX", "LuckPerms", "Vault", "WorldEdit"}
missing_plugins = required_plugins - plugins
if missing_plugins:
    print(f"[FAIL] server-admin analyzer missing plugins: {sorted(missing_plugins)}", file=sys.stderr)
    sys.exit(1)

if report["detected_server_type"] != "paper":
    print("[FAIL] server-admin analyzer did not detect paper server", file=sys.stderr)
    sys.exit(1)
if "server.properties" not in report["configs"]:
    print("[FAIL] server-admin analyzer did not report server.properties", file=sys.stderr)
    sys.exit(1)
if not report["worlds"] or not report["backups"]:
    print("[FAIL] server-admin analyzer did not report worlds and backups", file=sys.stderr)
    sys.exit(1)
if not report["recommendations"]:
    print("[FAIL] server-admin analyzer did not emit recommendations", file=sys.stderr)
    sys.exit(1)

print("[PASS] server-admin analyzer paper survival report contents")
PY
zip_server_admin_fixture "$server_admin_tmp/paper-survival" "$server_admin_tmp/paper-survival.zip"
expect_pass "server-admin analyzer paper survival zip" \
  python3 ./.agents/skills/minecraft-server-admin/scripts/analyze-java-server.py \
  --input "$server_admin_tmp/paper-survival.zip" \
  --output "$server_admin_tmp/paper-survival-zip.json" \
  --format json \
  --target-version 1.21.11 \
  --server-type auto
python3 - "$server_admin_tmp/paper-survival.json" "$server_admin_tmp/paper-survival-zip.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as folder_file:
    folder_report = json.load(folder_file)
with open(sys.argv[2], encoding="utf-8") as zip_file:
    zip_report = json.load(zip_file)

folder_plugins = sorted(plugin["name"] for plugin in folder_report["plugins"])
zip_plugins = sorted(plugin["name"] for plugin in zip_report["plugins"])
if folder_plugins != zip_plugins:
    print("[FAIL] server-admin analyzer zip/folder plugin mismatch", file=sys.stderr)
    sys.exit(1)
if folder_report["detected_server_type"] != zip_report["detected_server_type"]:
    print("[FAIL] server-admin analyzer zip/folder server type mismatch", file=sys.stderr)
    sys.exit(1)

print("[PASS] server-admin analyzer zip/folder equivalence")
PY
prepare_server_admin_fixture \
  tests/fixtures/validators/server-admin-analyzer/lobby-proxy \
  "$server_admin_tmp/lobby-proxy"
expect_pass "server-admin analyzer velocity lobby" \
  python3 ./.agents/skills/minecraft-server-admin/scripts/analyze-java-server.py \
  --input "$server_admin_tmp/lobby-proxy" \
  --output "$server_admin_tmp/lobby-proxy.md" \
  --format md \
  --target-version 1.21.11 \
  --server-type auto
expect_pass_contains "server-admin analyzer velocity markdown" "Detected server type: \`velocity\`" \
  grep -F "Detected server type: \`velocity\`" "$server_admin_tmp/lobby-proxy.md"
prepare_server_admin_fixture \
  tests/fixtures/validators/server-admin-analyzer/minigame-missing-dep \
  "$server_admin_tmp/minigame-missing-dep"
expect_pass "server-admin analyzer missing dependency fixture" \
  python3 ./.agents/skills/minecraft-server-admin/scripts/analyze-java-server.py \
  --input "$server_admin_tmp/minigame-missing-dep" \
  --output "$server_admin_tmp/minigame-missing-dep.json" \
  --format json \
  --target-version 1.21.11 \
  --server-type auto
python3 - "$server_admin_tmp/minigame-missing-dep.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as report_file:
    report = json.load(report_file)

warnings = "\n".join(report["warnings"])
if "ArenaGame declares missing dependency: WorldEdit" not in warnings:
    print("[FAIL] server-admin analyzer did not warn about missing WorldEdit", file=sys.stderr)
    sys.exit(1)
if "ArenaGame declares missing dependency: Vault" not in warnings:
    print("[FAIL] server-admin analyzer did not warn about missing Vault", file=sys.stderr)
    sys.exit(1)

print("[PASS] server-admin analyzer missing dependency warnings")
PY
prepare_server_admin_fixture \
  tests/fixtures/validators/server-admin-analyzer/suspicious \
  "$server_admin_tmp/suspicious"
expect_pass "server-admin analyzer suspicious jar fixture" \
  python3 ./.agents/skills/minecraft-server-admin/scripts/analyze-java-server.py \
  --input "$server_admin_tmp/suspicious" \
  --output "$server_admin_tmp/suspicious.json" \
  --format json \
  --target-version 1.21.11 \
  --server-type paper
python3 - "$server_admin_tmp/suspicious.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as report_file:
    report = json.load(report_file)

warnings = "\n".join(report["warnings"])
plugins = report["plugins"]
if not plugins or not plugins[0]["manual_review"]:
    print("[FAIL] server-admin analyzer did not flag suspicious jar", file=sys.stderr)
    sys.exit(1)
if "requires manual review" not in warnings:
    print("[FAIL] server-admin analyzer did not emit manual review warning", file=sys.stderr)
    sys.exit(1)

print("[PASS] server-admin analyzer suspicious jar warning")
PY
expect_fail_contains "server-admin analyzer missing input" "input path does not exist" \
  python3 ./.agents/skills/minecraft-server-admin/scripts/analyze-java-server.py \
  --input "$server_admin_tmp/does-not-exist" \
  --output "$server_admin_tmp/missing.json" \
  --format json
rm -rf "$server_admin_tmp"

expect_path "tests/fixtures/validators/ci-release/valid/SKILL.md"
expect_path "tests/fixtures/validators/ci-release/invalid/SKILL.md"
expect_path "tests/fixtures/validators/ci-release/invalid-yaml/SKILL.md"
expect_path "tests/fixtures/validators/ci-release/indented-workflow/SKILL.md"
expect_path "tests/fixtures/validators/ci-release/multiline-flow/SKILL.md"
expect_path "tests/fixtures/validators/ci-release/non-workflow-yaml/SKILL.md"
expect_path "tests/fixtures/validators/ci-release/warn-only/SKILL.md"
expect_pass "ci-release valid" \
  ./.agents/skills/minecraft-ci-release/scripts/validate-workflow-snippets.sh \
  --root tests/fixtures/validators/ci-release/valid
expect_pass "ci-release multiline flow yaml" \
  ./.agents/skills/minecraft-ci-release/scripts/validate-workflow-snippets.sh \
  --root tests/fixtures/validators/ci-release/multiline-flow
expect_fail_contains "ci-release invalid" 'missing top-level `jobs:`' \
  ./.agents/skills/minecraft-ci-release/scripts/validate-workflow-snippets.sh \
  --root tests/fixtures/validators/ci-release/invalid
expect_fail_contains "ci-release invalid yaml" "is not valid YAML" \
  ./.agents/skills/minecraft-ci-release/scripts/validate-workflow-snippets.sh \
  --root tests/fixtures/validators/ci-release/invalid-yaml
expect_fail_contains "ci-release indented workflow" 'missing top-level `jobs:`' \
  ./.agents/skills/minecraft-ci-release/scripts/validate-workflow-snippets.sh \
  --root tests/fixtures/validators/ci-release/indented-workflow
expect_pass "ci-release non-workflow yaml" \
  ./.agents/skills/minecraft-ci-release/scripts/validate-workflow-snippets.sh \
  --root tests/fixtures/validators/ci-release/non-workflow-yaml
expect_fail_contains "ci-release strict warnings" "strict mode failed" \
  ./.agents/skills/minecraft-ci-release/scripts/validate-workflow-snippets.sh \
  --root tests/fixtures/validators/ci-release/warn-only \
  --strict
expect_temp_skill_pass "ci-release standalone installed mirror" \
  ./.codex/skills/minecraft-ci-release

expect_path "tests/fixtures/validators/plugin-dev/valid"
expect_path "tests/fixtures/validators/plugin-dev/valid-newer-api-version"
expect_path "tests/fixtures/validators/plugin-dev/invalid"
expect_path "tests/fixtures/validators/plugin-dev/invalid-api-version"
expect_path "tests/fixtures/validators/plugin-dev/invalid-api-version-zero-patch"
expect_pass "plugin-dev valid" \
  ./.agents/skills/minecraft-plugin-dev/scripts/validate-plugin-layout.sh \
  --root tests/fixtures/validators/plugin-dev/valid
expect_pass_contains "plugin-dev valid newer api-version warns" "newer than the repo's documented Paper example patch" \
  ./.agents/skills/minecraft-plugin-dev/scripts/validate-plugin-layout.sh \
  --root tests/fixtures/validators/plugin-dev/valid-newer-api-version
expect_fail_contains "plugin-dev invalid" "api-version has invalid format" \
  ./.agents/skills/minecraft-plugin-dev/scripts/validate-plugin-layout.sh \
  --root tests/fixtures/validators/plugin-dev/invalid
expect_fail_contains "plugin-dev invalid api-version range" "api-version is outside the documented 1.21.x skill scope" \
  ./.agents/skills/minecraft-plugin-dev/scripts/validate-plugin-layout.sh \
  --root tests/fixtures/validators/plugin-dev/invalid-api-version
expect_fail_contains "plugin-dev invalid api-version zero patch" "patch must be a positive integer without leading zeroes" \
  ./.agents/skills/minecraft-plugin-dev/scripts/validate-plugin-layout.sh \
  --root tests/fixtures/validators/plugin-dev/invalid-api-version-zero-patch

imagegen_workspace="$(mktemp -d)"
imagegen_install_root="$(mktemp -d)"
imagegen_skill_dir="$imagegen_install_root/local/skills/minecraft-imagegen"
mkdir -p "$imagegen_skill_dir"
cp -R ./.agents/skills/minecraft-imagegen/. "$imagegen_skill_dir"
if (
  cd "$imagegen_skill_dir"
  CODEX_WORKSPACE_ROOT="$imagegen_workspace" bash ./scripts/scaffold-asset-brief.sh --type pack-icon --name smoke-test
); then
  if [[ -f "$imagegen_workspace/smoke-test-asset-brief.md" ]]; then
    echo "$PASS imagegen scaffold workspace inference"
  else
    echo "$FAIL imagegen scaffold workspace inference (brief missing from inferred workspace)" >&2
    rm -rf "$imagegen_workspace" "$imagegen_install_root"
    exit 1
  fi
else
  rm -rf "$imagegen_workspace" "$imagegen_install_root"
  echo "$FAIL imagegen scaffold workspace inference (expected pass)" >&2
  exit 1
fi
rm -rf "$imagegen_workspace" "$imagegen_install_root"

imagegen_workspace="$(mktemp -d)"
imagegen_install_root="$(mktemp -d)"
imagegen_skill_dir="$imagegen_install_root/local/skills/minecraft-imagegen"
mkdir -p "$imagegen_skill_dir"
cp -R ./.agents/skills/minecraft-imagegen/. "$imagegen_skill_dir"
if (
  cd "$imagegen_skill_dir"
  CODEX_WORKSPACE_ROOT="$imagegen_workspace" bash ./scripts/scaffold-asset-brief.sh --type release-banner --name relative-out --out docs/briefs
); then
  if [[ -f "$imagegen_workspace/docs/briefs/relative-out-asset-brief.md" ]]; then
    if [[ -f "$imagegen_skill_dir/docs/briefs/relative-out-asset-brief.md" ]]; then
      echo "$FAIL imagegen scaffold relative --out resolution (brief was written into installed skill dir)" >&2
      rm -rf "$imagegen_workspace" "$imagegen_install_root"
      exit 1
    fi
    echo "$PASS imagegen scaffold relative --out resolution"
  else
    echo "$FAIL imagegen scaffold relative --out resolution (brief missing from workspace-relative output dir)" >&2
    rm -rf "$imagegen_workspace" "$imagegen_install_root"
    exit 1
  fi
else
  rm -rf "$imagegen_workspace" "$imagegen_install_root"
  echo "$FAIL imagegen scaffold relative --out resolution (expected pass)" >&2
  exit 1
fi
rm -rf "$imagegen_workspace" "$imagegen_install_root"

imagegen_home="$(mktemp -d)"
imagegen_skill_dir="$imagegen_home/.codex/skills/minecraft-imagegen"
mkdir -p "$imagegen_skill_dir"
cp -R ./.agents/skills/minecraft-imagegen/. "$imagegen_skill_dir"
imagegen_output="$(mktemp)"
if (
  cd "$imagegen_skill_dir"
  unset OLDPWD CODEX_WORKSPACE_ROOT
  HOME="$imagegen_home" bash ./scripts/scaffold-asset-brief.sh --type pack-icon --name raw-install
) >"$imagegen_output" 2>&1; then
  cat "$imagegen_output"
  rm -f "$imagegen_output"
  rm -rf "$imagegen_home"
  echo "$FAIL imagegen scaffold raw ~/.codex install requires explicit workspace (expected failure)" >&2
  exit 1
elif grep -Fq "Could not infer a project workspace for the asset brief." "$imagegen_output"; then
  cat "$imagegen_output"
  rm -f "$imagegen_output"
  rm -rf "$imagegen_home"
  echo "$PASS imagegen scaffold raw ~/.codex install requires explicit workspace"
else
  cat "$imagegen_output"
  rm -f "$imagegen_output"
  rm -rf "$imagegen_home"
  echo "$FAIL imagegen scaffold raw ~/.codex install requires explicit workspace (missing expected output)" >&2
  exit 1
fi

imagegen_home="$(mktemp -d)"
imagegen_skill_dir="$imagegen_home/.claude/skills/minecraft-imagegen"
mkdir -p "$imagegen_skill_dir"
cp -R ./.agents/skills/minecraft-imagegen/. "$imagegen_skill_dir"
imagegen_output="$(mktemp)"
if (
  cd "$imagegen_skill_dir"
  unset OLDPWD CODEX_WORKSPACE_ROOT
  HOME="$imagegen_home" bash ./scripts/scaffold-asset-brief.sh --type pack-icon --name raw-install
) >"$imagegen_output" 2>&1; then
  cat "$imagegen_output"
  rm -f "$imagegen_output"
  rm -rf "$imagegen_home"
  echo "$FAIL imagegen scaffold raw ~/.claude install requires explicit workspace (expected failure)" >&2
  exit 1
elif grep -Fq "Could not infer a project workspace for the asset brief." "$imagegen_output"; then
  cat "$imagegen_output"
  rm -f "$imagegen_output"
  rm -rf "$imagegen_home"
  echo "$PASS imagegen scaffold raw ~/.claude install requires explicit workspace"
else
  cat "$imagegen_output"
  rm -f "$imagegen_output"
  rm -rf "$imagegen_home"
  echo "$FAIL imagegen scaffold raw ~/.claude install requires explicit workspace (missing expected output)" >&2
  exit 1
fi

expect_path "tests/fixtures/validators/testing/valid"
expect_path "tests/fixtures/validators/testing/invalid"
expect_pass "testing valid" \
  ./.agents/skills/minecraft-testing/scripts/validate-test-layout.sh \
  --root tests/fixtures/validators/testing/valid
expect_fail_contains "testing invalid" "MockBukkit tests detected but build file is missing MockBukkit dependency" \
  ./.agents/skills/minecraft-testing/scripts/validate-test-layout.sh \
  --root tests/fixtures/validators/testing/invalid

expect_path "tests/fixtures/validators/multiloader/valid"
expect_path "tests/fixtures/validators/multiloader/invalid"
expect_pass "multiloader valid" \
  ./.agents/skills/minecraft-multiloader/scripts/check-version-sanity.sh \
  --root tests/fixtures/validators/multiloader/valid
expect_fail_contains "multiloader invalid" "enabled_platforms must include fabric and neoforge" \
  ./.agents/skills/minecraft-multiloader/scripts/check-version-sanity.sh \
  --root tests/fixtures/validators/multiloader/invalid

expect_path "tests/fixtures/validators/worldgen/valid"
expect_path "tests/fixtures/validators/worldgen/invalid"
expect_path "tests/fixtures/validators/worldgen/dimensions-only"
expect_path "tests/fixtures/validators/worldgen/empty"
expect_path "tests/fixtures/validators/worldgen/external-dimension-refs-with-tags"
expect_path "tests/fixtures/validators/worldgen/external-dimension-settings"
expect_path "tests/fixtures/validators/worldgen/invalid-dimension-json"
expect_path "tests/fixtures/validators/worldgen/invalid-dimension-refs"
expect_path "tests/fixtures/validators/worldgen/invalid-external-local-dimension-refs"
expect_path "tests/fixtures/validators/worldgen/invalid-tag-layout"
expect_path "tests/fixtures/validators/worldgen/legacy"
expect_path "tests/fixtures/validators/worldgen/nested-paths"
expect_path "tests/fixtures/validators/worldgen/invalid-tags"
expect_path "tests/fixtures/validators/worldgen/tags-only"
expect_pass "worldgen valid" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/valid
expect_fail_contains "worldgen invalid" "placed_feature references missing configured_feature" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid
expect_pass "worldgen dimensions only" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/dimensions-only
expect_pass "worldgen dimensions only strict" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/dimensions-only \
  --strict
expect_pass "worldgen external dimension settings strict" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/external-dimension-settings \
  --strict
expect_pass "worldgen external dimension refs with tags strict" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/external-dimension-refs-with-tags \
  --strict
expect_fail_contains "worldgen invalid dimension refs type" "dimension references missing dimension_type" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid-dimension-refs
expect_fail_contains "worldgen invalid dimension refs noise" "dimension references missing noise_settings" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid-dimension-refs
expect_fail_contains "worldgen invalid external local dimension refs type" "dimension references missing dimension_type: minecraft:custom_missing" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid-external-local-dimension-refs
expect_fail_contains "worldgen invalid external local dimension refs noise" "dimension references missing noise_settings: minecraft:custom_missing_noise" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid-external-local-dimension-refs
expect_fail_contains "worldgen invalid dimension json summary" "worldgen validation failed" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid-dimension-json
expect_pass "worldgen nested paths" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/nested-paths
expect_fail_contains "worldgen invalid tags" "invalid JSON" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid-tags
expect_fail_contains "worldgen invalid tag layout" "invalid worldgen tag path" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/invalid-tag-layout
expect_fail_contains "worldgen empty" "no supported worldgen JSON files found" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/empty
expect_pass "worldgen tags only" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/tags-only
expect_pass "worldgen tags only strict" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/tags-only \
  --strict
expect_fail_contains "worldgen legacy path" "legacy path detected" \
  ./.agents/skills/minecraft-world-generation/scripts/validate-worldgen-json.sh \
  --root tests/fixtures/validators/worldgen/legacy

echo "$PASS all validator fixture checks completed"
