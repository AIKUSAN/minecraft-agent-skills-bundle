#!/usr/bin/env python3
"""Inspect a Minecraft Java server directory or zip without executing plugins."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import zipfile


KNOWN_CONFIGS = (
    "server.properties",
    "bukkit.yml",
    "spigot.yml",
    "purpur.yml",
    "velocity.toml",
    "config/paper-global.yml",
    "config/paper-world-defaults.yml",
    "config/paper-global.yml.backup",
    "config/paper-world-defaults.yml.backup",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect a Minecraft Java server folder or zip and report plugins/configuration."
    )
    parser.add_argument("--input", required=True, help="Server directory or zip archive to inspect")
    parser.add_argument("--output", required=True, help="Report path to write")
    parser.add_argument("--format", choices=("json", "md"), default="json", help="Report format")
    parser.add_argument("--target-version", default="1.21.11", help="Target Minecraft version")
    parser.add_argument(
        "--server-type",
        choices=("paper", "purpur", "folia", "velocity", "auto"),
        default="auto",
        help="Expected server type or auto-detect",
    )
    return parser.parse_args()


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def strip_inline_comment(value: str) -> str:
    quote = None
    for index, char in enumerate(value):
        if char in ("'", '"'):
            quote = None if quote == char else char
        if char == "#" and quote is None:
            return value[:index].rstrip()
    return value.rstrip()


def parse_scalar(value: str):
    value = strip_inline_comment(value.strip())
    if not value:
        return ""
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    lower = value.lower()
    if lower == "true":
        return True
    if lower == "false":
        return False
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [parse_scalar(item.strip()) for item in inner.split(",")]
    return value


def parse_simple_yaml(text: str) -> dict:
    result: dict[str, object] = {}
    pending_key: str | None = None

    for raw_line in text.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue

        stripped = raw_line.strip()
        if pending_key and raw_line[:1].isspace() and stripped.startswith("- "):
            current = result.setdefault(pending_key, [])
            if isinstance(current, list):
                current.append(parse_scalar(stripped[2:].strip()))
            continue

        pending_key = None
        if ":" not in stripped:
            continue

        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue

        if value == "":
            result[key] = []
            pending_key = key
        else:
            result[key] = parse_scalar(value)

    return result


def as_list(value) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    return [str(value)]


def read_properties(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def is_zip_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() == ".zip"


def safe_extract(zip_path: Path, destination: Path) -> None:
    destination_resolved = destination.resolve()
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            member_path = (destination / member.filename).resolve()
            if os.path.commonpath([destination_resolved, member_path]) != str(destination_resolved):
                raise ValueError(f"refusing unsafe archive path: {member.filename}")
        archive.extractall(destination)


def select_archive_root(temp_dir: Path) -> Path:
    entries = [entry for entry in temp_dir.iterdir() if entry.name != "__MACOSX"]
    if len(entries) == 1 and entries[0].is_dir():
        return entries[0]
    return temp_dir


def detect_server_type(root: Path, requested: str) -> str:
    if requested != "auto":
        return requested
    if (root / "velocity.toml").exists():
        return "velocity"
    if (root / "purpur.yml").exists():
        return "purpur"
    if (root / "config" / "paper-global.yml").exists() or (root / "config" / "paper-world-defaults.yml").exists():
        return "paper"

    latest_log = root / "logs" / "latest.log"
    if latest_log.exists():
        text = latest_log.read_text(encoding="utf-8", errors="replace").lower()
        for candidate in ("folia", "purpur", "velocity", "paper"):
            if candidate in text:
                return candidate
    return "unknown"


def parse_plugin_metadata(jar_path: Path, root: Path) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    plugin = {
        "file": rel(jar_path, root),
        "jar_name": jar_path.name,
        "metadata_type": None,
        "name": jar_path.stem,
        "version": None,
        "main": None,
        "api_version": None,
        "dependencies": [],
        "soft_dependencies": [],
        "folia_supported": None,
        "manual_review": False,
    }

    try:
        with zipfile.ZipFile(jar_path) as archive:
            names = set(archive.namelist())
            if "plugin.yml" in names:
                metadata = parse_simple_yaml(
                    archive.read("plugin.yml").decode("utf-8", errors="replace")
                )
                plugin.update(
                    {
                        "metadata_type": "plugin.yml",
                        "name": str(metadata.get("name") or plugin["name"]),
                        "version": metadata.get("version"),
                        "main": metadata.get("main"),
                        "api_version": metadata.get("api-version"),
                        "dependencies": as_list(metadata.get("depend")),
                        "soft_dependencies": as_list(metadata.get("softdepend")),
                        "folia_supported": metadata.get("folia-supported"),
                    }
                )
            elif "paper-plugin.yml" in names:
                metadata = parse_simple_yaml(
                    archive.read("paper-plugin.yml").decode("utf-8", errors="replace")
                )
                plugin.update(
                    {
                        "metadata_type": "paper-plugin.yml",
                        "name": str(metadata.get("name") or plugin["name"]),
                        "version": metadata.get("version"),
                        "main": metadata.get("main"),
                        "api_version": metadata.get("api-version"),
                        "dependencies": as_list(metadata.get("depend")),
                        "soft_dependencies": as_list(metadata.get("softdepend")),
                        "folia_supported": metadata.get("folia-supported"),
                    }
                )
            elif "velocity-plugin.json" in names:
                metadata = json.loads(
                    archive.read("velocity-plugin.json").decode("utf-8", errors="replace")
                )
                dependencies = []
                for item in metadata.get("dependencies", []):
                    if isinstance(item, dict) and item.get("id"):
                        dependencies.append(str(item["id"]))
                    elif item:
                        dependencies.append(str(item))
                plugin.update(
                    {
                        "metadata_type": "velocity-plugin.json",
                        "name": str(metadata.get("name") or metadata.get("id") or plugin["name"]),
                        "version": metadata.get("version"),
                        "main": metadata.get("main"),
                        "dependencies": dependencies,
                    }
                )
            else:
                plugin["manual_review"] = True
                warnings.append(f"{plugin['file']} has no plugin.yml, paper-plugin.yml, or velocity-plugin.json")
    except (zipfile.BadZipFile, OSError, json.JSONDecodeError) as exc:
        plugin["manual_review"] = True
        warnings.append(f"{plugin['file']} could not be inspected as a plugin jar: {exc}")

    return plugin, warnings


def discover_worlds(root: Path) -> list[dict]:
    worlds = []
    for path in sorted(root.iterdir()):
        if not path.is_dir():
            continue
        if (path / "level.dat").exists() or path.name in {"world", "world_nether", "world_the_end"}:
            datapacks = []
            datapack_dir = path / "datapacks"
            if datapack_dir.is_dir():
                datapacks = sorted(child.name for child in datapack_dir.iterdir())
            worlds.append({"path": rel(path, root), "datapacks": datapacks})
    return worlds


def discover_backups(root: Path) -> list[str]:
    candidates = []
    for path in root.rglob("*"):
        if "__MACOSX" in path.parts:
            continue
        lower_name = path.name.lower()
        if path.is_dir() and lower_name in {"backup", "backups"}:
            candidates.append(rel(path, root))
        elif path.is_file() and (
            lower_name.endswith(".tar.gz")
            or lower_name.endswith(".tgz")
            or lower_name.endswith(".zip")
        ) and "backup" in "/".join(part.lower() for part in path.parts):
            candidates.append(rel(path, root))
    return sorted(set(candidates))


def discover_proxy_hints(root: Path) -> list[str]:
    hints = []
    if (root / "velocity.toml").exists():
        hints.append("velocity.toml present")
    if (root / "forwarding.secret").exists():
        hints.append("forwarding.secret present")
    properties = read_properties(root / "server.properties")
    if properties.get("online-mode", "").lower() == "false":
        hints.append("server.properties has online-mode=false")

    paper_global = root / "config" / "paper-global.yml"
    if paper_global.exists():
        text = paper_global.read_text(encoding="utf-8", errors="replace").lower()
        if "velocity" in text or "bungeecord" in text:
            hints.append("Paper proxy forwarding settings detected")
    return hints


def inspect_server(root: Path, args: argparse.Namespace, source_kind: str) -> dict:
    warnings: list[str] = []
    recommendations: list[str] = []

    server_type = detect_server_type(root, args.server_type)
    configs = [config for config in KNOWN_CONFIGS if (root / config).exists()]
    properties = read_properties(root / "server.properties")

    plugins_dir = root / "plugins"
    plugin_jars = sorted(plugins_dir.glob("*.jar")) if plugins_dir.is_dir() else []
    plugins = []
    for jar_path in plugin_jars:
        plugin, plugin_warnings = parse_plugin_metadata(jar_path, root)
        plugins.append(plugin)
        warnings.extend(plugin_warnings)

    plugin_names = {normalize_name(plugin["name"]) for plugin in plugins}
    plugin_config_folders = []
    if plugins_dir.is_dir():
        plugin_config_folders = sorted(
            rel(path, root) for path in plugins_dir.iterdir() if path.is_dir()
        )

    config_folder_names = {normalize_name(Path(path).name) for path in plugin_config_folders}
    seen: dict[str, list[str]] = {}
    for plugin in plugins:
        seen.setdefault(normalize_name(plugin["name"]), []).append(plugin["file"])

    for plugin_name, files in sorted(seen.items()):
        if plugin_name and len(files) > 1:
            warnings.append(f"duplicate plugin name detected across jars: {', '.join(files)}")

    for plugin in plugins:
        normalized = normalize_name(plugin["name"])
        if normalized and normalized not in config_folder_names:
            warnings.append(f"{plugin['name']} has no matching generated config folder under plugins/")

        for dependency in plugin["dependencies"]:
            dependency_key = normalize_name(dependency)
            if dependency_key and dependency_key not in plugin_names:
                warnings.append(f"{plugin['name']} declares missing dependency: {dependency}")

        api_version = plugin.get("api_version")
        if api_version:
            target_minor = ".".join(str(args.target_version).split(".")[:2])
            plugin_minor = ".".join(str(api_version).split(".")[:2])
            if plugin_minor and plugin_minor != target_minor:
                warnings.append(
                    f"{plugin['name']} api-version {api_version} should be reviewed for target {args.target_version}"
                )

        if server_type == "folia" and plugin.get("folia_supported") is not True:
            warnings.append(f"{plugin['name']} needs manual Folia compatibility review")

        if plugin.get("manual_review"):
            warnings.append(f"{plugin['file']} requires manual review before use")

    if not (root / "server.properties").exists() and server_type != "velocity":
        warnings.append("server.properties is missing")
    if plugins_dir.is_dir() and not plugin_jars:
        warnings.append("plugins/ exists but no plugin jars were found at its root")
    if not discover_backups(root):
        warnings.append("no backup folder or backup archive was detected")

    if not plugins:
        recommendations.append("Create a plugin inventory before adding new marketplace downloads.")
    else:
        recommendations.append("Review startup logs after staging any plugin or server jar change.")
    if warnings:
        recommendations.append("Resolve dependency, duplicate, suspicious jar, and configuration warnings before production rollout.")
    recommendations.append("Snapshot plugins, configs, and worlds before making changes.")

    logs = []
    latest_log = root / "logs" / "latest.log"
    if latest_log.exists():
        logs.append("logs/latest.log")

    return {
        "source": {"path": str(Path(args.input)), "kind": source_kind},
        "target_version": args.target_version,
        "detected_server_type": server_type,
        "configs": configs,
        "server_properties": properties,
        "plugins_dir_present": plugins_dir.is_dir(),
        "plugins": plugins,
        "plugin_config_folders": plugin_config_folders,
        "worlds": discover_worlds(root),
        "proxy_hints": discover_proxy_hints(root),
        "logs": logs,
        "backups": discover_backups(root),
        "warnings": sorted(set(warnings)),
        "recommendations": recommendations,
    }


def write_json(report: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_markdown(report: dict, output_path: Path) -> None:
    lines = [
        "# Minecraft Java Server Analysis",
        "",
        f"- Source: `{report['source']['path']}` ({report['source']['kind']})",
        f"- Target version: `{report['target_version']}`",
        f"- Detected server type: `{report['detected_server_type']}`",
        "",
        "## Configs",
    ]
    if report["configs"]:
        lines.extend(f"- `{item}`" for item in report["configs"])
    else:
        lines.append("- None detected")

    lines.extend(["", "## Plugins"])
    if report["plugins"]:
        for plugin in report["plugins"]:
            version = plugin["version"] if plugin["version"] is not None else "unknown"
            metadata_type = plugin["metadata_type"] or "no known metadata"
            lines.append(f"- `{plugin['name']}` `{version}` from `{plugin['file']}` ({metadata_type})")
            if plugin["dependencies"]:
                lines.append(f"  - Dependencies: {', '.join(plugin['dependencies'])}")
    else:
        lines.append("- No plugin jars detected")

    lines.extend(["", "## Worlds"])
    if report["worlds"]:
        for world in report["worlds"]:
            datapacks = ", ".join(world["datapacks"]) if world["datapacks"] else "none"
            lines.append(f"- `{world['path']}`; datapacks: {datapacks}")
    else:
        lines.append("- No worlds detected")

    for title, key in (
        ("Proxy Hints", "proxy_hints"),
        ("Logs", "logs"),
        ("Backups", "backups"),
        ("Warnings", "warnings"),
        ("Recommendations", "recommendations"),
    ):
        lines.extend(["", f"## {title}"])
        if report[key]:
            lines.extend(f"- {item}" for item in report[key])
        else:
            lines.append("- None")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"input path does not exist: {input_path}", file=sys.stderr)
        return 2

    temp_dir = None
    try:
        if input_path.is_dir():
            root = input_path
            source_kind = "directory"
        elif is_zip_file(input_path):
            temp_dir = Path(tempfile.mkdtemp(prefix="mc-server-analyze-"))
            safe_extract(input_path, temp_dir)
            root = select_archive_root(temp_dir)
            source_kind = "zip"
        else:
            print("input must be a server directory or .zip archive", file=sys.stderr)
            return 2

        report = inspect_server(root, args, source_kind)
        if args.format == "json":
            write_json(report, output_path)
        else:
            write_markdown(report, output_path)
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f"failed to analyze server: {exc}", file=sys.stderr)
        return 1
    finally:
        if temp_dir is not None:
            shutil.rmtree(temp_dir, ignore_errors=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
