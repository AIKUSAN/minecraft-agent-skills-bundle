#!/usr/bin/env python3
"""Conservative Java resource-pack to Bedrock resource-pack converter."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path


TEXTURE_DIR_MAP = {
    "block": "textures/blocks",
    "item": "textures/items",
    "entity": "textures/entity",
    "environment": "textures/environment",
    "gui": "textures/gui",
    "map": "textures/map",
    "misc": "textures/misc",
    "painting": "textures/painting",
    "particle": "textures/particle",
}

TEXTURE_RENAMES = {
    "block/beehive_end": "blocks/beehive_top",
    "block/honeycomb_block": "blocks/honeycomb",
    "block/honey_block_bottom": "blocks/honey_bottom",
    "block/honey_block_side": "blocks/honey_side",
    "block/honey_block_top": "blocks/honey_top",
    "block/iron_block": "blocks/block_iron",
    "block/wither_rose": "blocks/flower_wither_rose",
}

UNSUPPORTED_PATTERNS = (
    ("models", "Java model JSON needs Bedrock geometry or item texture mapping"),
    ("blockstates", "Java blockstate JSON has no direct Bedrock resource-pack equivalent"),
    ("optifine", "OptiFine assets require manual Bedrock replacement"),
    ("shaders", "Java shader overrides require manual Bedrock review"),
    ("sounds", "Java sounds require Bedrock sound_definitions.json review"),
    ("font", "Java font providers require Bedrock text/font review"),
    ("lang", "Java language files require Bedrock texts layout review"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a simple Java resource pack into a Bedrock resource pack."
    )
    parser.add_argument("--input", required=True, help="Java resource pack directory or zip")
    parser.add_argument("--output", required=True, help="Output directory or .mcpack path")
    parser.add_argument("--pack-name", default=None, help="Bedrock pack display name")
    parser.add_argument("--description", default="Converted Java resource pack")
    parser.add_argument("--strict", action="store_true", help="Fail if unsupported assets are found")
    parser.add_argument("--report", default=None, help="Path to write conversion report JSON")
    parser.add_argument(
        "--converter",
        choices=("auto", "thunder", "je2be", "builtin"),
        default="auto",
        help="Converter mode to use",
    )
    parser.add_argument("--thunder-jar", default=os.environ.get("THUNDER_JAR"))
    parser.add_argument("--je2be-bin", default=os.environ.get("JE2BE_BIN"))
    return parser.parse_args()


def extract_input(input_path: Path, temp_dir: Path) -> Path:
    if input_path.is_dir():
        return input_path
    if not input_path.is_file():
        raise SystemExit(f"input path does not exist: {input_path}")
    if input_path.suffix.lower() != ".zip":
        raise SystemExit("input must be a directory or .zip Java resource pack")
    with zipfile.ZipFile(input_path) as pack_zip:
        pack_zip.extractall(temp_dir)
    if (temp_dir / "pack.mcmeta").exists():
        return temp_dir
    children = [p for p in temp_dir.iterdir() if p.is_dir()]
    for child in children:
        if (child / "pack.mcmeta").exists():
            return child
    return temp_dir


def load_pack_metadata(source: Path) -> dict:
    pack_mcmeta = source / "pack.mcmeta"
    if not pack_mcmeta.exists():
        raise SystemExit("missing pack.mcmeta in Java resource pack")
    try:
        return json.loads(pack_mcmeta.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise SystemExit(f"invalid pack.mcmeta JSON: {error}") from error


def manifest(pack_name: str, description: str) -> dict:
    return {
        "format_version": 2,
        "header": {
            "name": pack_name,
            "description": description,
            "uuid": str(uuid.uuid4()),
            "version": [1, 0, 0],
            "min_engine_version": [1, 21, 0],
        },
        "modules": [
            {
                "type": "resources",
                "uuid": str(uuid.uuid4()),
                "version": [1, 0, 0],
            }
        ],
    }


def bedrock_texture_target(namespace: str, relative_texture: Path) -> Path | None:
    if not relative_texture.suffix.lower() == ".png":
        return None
    logical = relative_texture.with_suffix("").as_posix()
    renamed = TEXTURE_RENAMES.get(logical)
    if renamed:
        return Path("textures") / (renamed + ".png")

    category = relative_texture.parts[0] if relative_texture.parts else ""
    mapped_dir = TEXTURE_DIR_MAP.get(category)
    if not mapped_dir:
        return None

    remaining = Path(*relative_texture.parts[1:]) if len(relative_texture.parts) > 1 else Path(relative_texture.name)
    if namespace != "minecraft":
        remaining = Path(namespace) / remaining
    return Path(mapped_dir) / remaining


def detect_unsupported(source: Path) -> list[dict]:
    unsupported: list[dict] = []
    assets = source / "assets"
    if not assets.exists():
        return [{"path": "assets", "reason": "Java resource pack has no assets directory"}]

    for path in assets.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(source).as_posix()
        parts = path.relative_to(assets).parts
        category = parts[2] if len(parts) >= 3 else ""
        reason = None
        for pattern, pattern_reason in UNSUPPORTED_PATTERNS:
            if category == pattern or f"/{pattern}/" in rel:
                reason = pattern_reason
                break
        if rel.endswith(".png.mcmeta"):
            reason = "Java animation metadata requires Bedrock flipbook review"
        if rel.endswith("sounds.json"):
            reason = "Java sounds.json requires Bedrock sound_definitions.json review"
        if reason:
            unsupported.append({"path": rel, "reason": reason})
    return unsupported


def copy_builtin_assets(source: Path, dest: Path) -> tuple[list[dict], list[str]]:
    copied: list[dict] = []
    warnings: list[str] = []
    assets = source / "assets"
    if not assets.exists():
        return copied, ["no assets directory found"]

    for namespace_dir in assets.iterdir():
        if not namespace_dir.is_dir():
            continue
        textures_dir = namespace_dir / "textures"
        if not textures_dir.exists():
            continue
        for texture in textures_dir.rglob("*.png"):
            rel_texture = texture.relative_to(textures_dir)
            target_rel = bedrock_texture_target(namespace_dir.name, rel_texture)
            if target_rel is None:
                warnings.append(f"skipped unsupported texture path: {texture.relative_to(source).as_posix()}")
                continue
            target = dest / target_rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(texture, target)
            copied.append(
                {
                    "source": texture.relative_to(source).as_posix(),
                    "target": target.relative_to(dest).as_posix(),
                }
            )
    return copied, warnings


def write_pack(source: Path, output: Path, pack_name: str, description: str, strict: bool) -> tuple[dict, int]:
    metadata = load_pack_metadata(source)
    output_is_mcpack = output.suffix.lower() == ".mcpack"
    work_parent = Path(tempfile.mkdtemp(prefix="bedrock-pack-")) if output_is_mcpack else output
    pack_dir = work_parent / "pack" if output_is_mcpack else output

    if pack_dir.exists():
        shutil.rmtree(pack_dir)
    pack_dir.mkdir(parents=True)

    copied, warnings = copy_builtin_assets(source, pack_dir)
    unsupported = detect_unsupported(source)

    if (source / "pack.png").exists():
        shutil.copy2(source / "pack.png", pack_dir / "pack_icon.png")
        copied.append({"source": "pack.png", "target": "pack_icon.png"})

    report = {
        "converter": "builtin",
        "status": "failed" if strict and unsupported else "completed",
        "input": str(source),
        "output": str(output),
        "pack_name": pack_name,
        "java_pack_metadata": metadata.get("pack", {}),
        "copied_assets": copied,
        "unsupported_assets": unsupported,
        "warnings": warnings,
    }

    if strict and unsupported:
        shutil.rmtree(pack_dir)
        if output_is_mcpack:
            shutil.rmtree(work_parent)
        return report, 2

    (pack_dir / "manifest.json").write_text(
        json.dumps(manifest(pack_name, description), indent=2) + "\n",
        encoding="utf-8",
    )

    if output_is_mcpack:
        output.parent.mkdir(parents=True, exist_ok=True)
        if output.exists():
            output.unlink()
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as out_zip:
            for file_path in sorted(pack_dir.rglob("*")):
                if file_path.is_file():
                    out_zip.write(file_path, file_path.relative_to(pack_dir).as_posix())
        shutil.rmtree(work_parent)

    return report, 0


def run_external(args: argparse.Namespace, input_path: Path, output: Path) -> tuple[dict, int] | None:
    if args.converter in ("auto", "thunder") and args.thunder_jar:
        jar = Path(args.thunder_jar)
        if jar.exists():
            command = ["java", "-jar", str(jar), "nogui", "--input", str(input_path)]
            result = subprocess.run(command, text=True, capture_output=True, check=False)
            return {
                "converter": "thunder",
                "status": "completed" if result.returncode == 0 else "failed",
                "command": command,
                "output": str(output),
                "stdout": result.stdout,
                "stderr": result.stderr,
            }, result.returncode
        if args.converter == "thunder":
            raise SystemExit(f"Thunder jar not found: {jar}")

    if args.converter in ("auto", "je2be") and args.je2be_bin:
        binary = Path(args.je2be_bin)
        if binary.exists():
            command = [str(binary), "convert", str(input_path), str(output)]
            result = subprocess.run(command, text=True, capture_output=True, check=False)
            return {
                "converter": "je2be",
                "status": "completed" if result.returncode == 0 else "failed",
                "command": command,
                "output": str(output),
                "stdout": result.stdout,
                "stderr": result.stderr,
            }, result.returncode
        if args.converter == "je2be":
            raise SystemExit(f"JE2BE binary not found: {binary}")

    if args.converter in ("thunder", "je2be"):
        raise SystemExit(f"{args.converter} converter path was not provided")
    return None


def write_report(report: dict, report_path: str | None) -> None:
    text = json.dumps(report, indent=2) + "\n"
    if report_path:
        path = Path(report_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    print(text, end="")


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output = Path(args.output).resolve()
    pack_name = args.pack_name or input_path.stem

    external = run_external(args, input_path, output)
    if external is not None:
        report, status = external
        write_report(report, args.report)
        return status

    with tempfile.TemporaryDirectory(prefix="java-pack-") as temp:
        source = extract_input(input_path, Path(temp))
        report, status = write_pack(source, output, pack_name, args.description, args.strict)
        write_report(report, args.report)
        return status


if __name__ == "__main__":
    sys.exit(main())
