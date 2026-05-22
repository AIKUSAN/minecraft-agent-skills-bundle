#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const ROOT = process.cwd();
const PLUGIN_NAME = "minecraft-codex-skills";
const PACKAGE_JSON = path.join(ROOT, "package.json");
const PACKAGE_LOCK = path.join(ROOT, "package-lock.json");
const PLUGIN_ROOT = path.join(ROOT, "plugins", PLUGIN_NAME);
const CODEX_MANIFEST = path.join(PLUGIN_ROOT, ".codex-plugin", "plugin.json");
const CLAUDE_MANIFEST = path.join(PLUGIN_ROOT, ".claude-plugin", "plugin.json");
const PLUGIN_README = path.join(PLUGIN_ROOT, "README.md");
const PLUGIN_SKILLS = path.join(PLUGIN_ROOT, "skills");
const MARKETPLACE = path.join(ROOT, ".agents", "plugins", "marketplace.json");
const REPOSITORY_METADATA = path.join(ROOT, ".github", "repository.json");

const errors = [];

function addError(file, message) {
  errors.push(`${path.relative(ROOT, file).replaceAll(path.sep, "/")}: ${message}`);
}

function readJson(file) {
  if (!fs.existsSync(file)) {
    addError(file, "missing required JSON file");
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    addError(file, `invalid JSON: ${error.message}`);
    return null;
  }
}

function readText(file) {
  if (!fs.existsSync(file)) {
    addError(file, "missing required text file");
    return null;
  }

  return fs.readFileSync(file, "utf8");
}

function isHttpsUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

const pkg = readJson(PACKAGE_JSON);
const packageLock = readJson(PACKAGE_LOCK);
const codexManifest = readJson(CODEX_MANIFEST);
const claudeManifest = readJson(CLAUDE_MANIFEST);
const marketplace = readJson(MARKETPLACE);
const repositoryMetadata = readJson(REPOSITORY_METADATA);
const pluginReadme = readText(PLUGIN_README);

if (!fs.existsSync(PLUGIN_ROOT)) addError(PLUGIN_ROOT, "plugin root directory is missing");
if (!fs.existsSync(PLUGIN_SKILLS)) addError(PLUGIN_SKILLS, "plugin skills directory is missing");

const releaseVersion = pkg?.version;
if (!releaseVersion) {
  addError(PACKAGE_JSON, "missing top-level `version` used as the plugin bundle release source of truth");
}

if (packageLock) {
  if (packageLock.version !== releaseVersion) {
    addError(PACKAGE_LOCK, `expected top-level version \`${releaseVersion}\``);
  }

  const rootPackageVersion = packageLock.packages?.[""]?.version;
  if (rootPackageVersion !== releaseVersion) {
    addError(PACKAGE_LOCK, `expected root package version \`${releaseVersion}\``);
  }
}

if (codexManifest) {
  if (codexManifest.name !== PLUGIN_NAME) addError(CODEX_MANIFEST, `expected name \`${PLUGIN_NAME}\``);
  if (codexManifest.version !== releaseVersion) addError(CODEX_MANIFEST, `expected version \`${releaseVersion}\``);
  if (codexManifest.skills !== "./skills/") addError(CODEX_MANIFEST, "expected `skills` to be `./skills/`");
  if (!String(codexManifest.description ?? "").includes("image-generation workflows on Codex")) {
    addError(CODEX_MANIFEST, "expected description to clarify that built-in image generation is on Codex");
  }

  if (!isHttpsUrl(codexManifest.homepage)) addError(CODEX_MANIFEST, "expected `homepage` to be an https URL");
  if (!isHttpsUrl(codexManifest.repository)) addError(CODEX_MANIFEST, "expected `repository` to be an https URL");
  if (!Array.isArray(codexManifest.keywords) || codexManifest.keywords.length < 5) {
    addError(CODEX_MANIFEST, "expected a non-trivial `keywords` array for discovery metadata");
  }

  const iface = codexManifest.interface;
  if (!iface || typeof iface !== "object") {
    addError(CODEX_MANIFEST, "missing `interface` metadata object");
  } else {
    for (const field of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
      if (typeof iface[field] !== "string" || iface[field].trim() === "") {
        addError(CODEX_MANIFEST, `expected interface.${field} to be a non-empty string`);
      }
    }
    if (!iface.shortDescription.includes("image-generation workflows on Codex")) {
      addError(CODEX_MANIFEST, "expected interface.shortDescription to clarify Codex image-generation support");
    }
    if (!iface.longDescription.includes("image-generation workflows")) {
      addError(CODEX_MANIFEST, "expected interface.longDescription to mention image-generation workflow support");
    }

    if (!Array.isArray(iface.capabilities) || iface.capabilities.length === 0) {
      addError(CODEX_MANIFEST, "expected interface.capabilities to be a non-empty array");
    }
    if (!Array.isArray(iface.defaultPrompt) || iface.defaultPrompt.length === 0) {
      addError(CODEX_MANIFEST, "expected interface.defaultPrompt to be a non-empty array");
    }
    if (!isHttpsUrl(iface.websiteURL)) addError(CODEX_MANIFEST, "expected interface.websiteURL to be an https URL");
    if (!isHttpsUrl(iface.privacyPolicyURL)) addError(CODEX_MANIFEST, "expected interface.privacyPolicyURL to be an https URL");
    if (!isHttpsUrl(iface.termsOfServiceURL)) addError(CODEX_MANIFEST, "expected interface.termsOfServiceURL to be an https URL");
  }
}

if (claudeManifest) {
  if (claudeManifest.name !== PLUGIN_NAME) addError(CLAUDE_MANIFEST, `expected name \`${PLUGIN_NAME}\``);
  if (claudeManifest.version !== releaseVersion) addError(CLAUDE_MANIFEST, `expected version \`${releaseVersion}\``);
  if (!String(claudeManifest.description ?? "").includes("Codex-first and host-conditional")) {
    addError(CLAUDE_MANIFEST, "expected description to clarify that image-generation workflows are Codex-first and host-conditional");
  }
  if (!isHttpsUrl(claudeManifest.homepage)) addError(CLAUDE_MANIFEST, "expected `homepage` to be an https URL");
  if (!isHttpsUrl(claudeManifest.repository)) addError(CLAUDE_MANIFEST, "expected `repository` to be an https URL");
}

if (repositoryMetadata) {
  if (typeof repositoryMetadata.description !== "string" || repositoryMetadata.description.trim() === "") {
    addError(REPOSITORY_METADATA, "expected description to be a non-empty string");
  } else if (!repositoryMetadata.description.includes("Codex-first image-generation workflows")) {
    addError(REPOSITORY_METADATA, "expected description to clarify that image-generation workflows are Codex-first");
  }
}

if (marketplace) {
  const pluginEntry = Array.isArray(marketplace.plugins)
    ? marketplace.plugins.find((entry) => entry?.name === PLUGIN_NAME)
    : null;

  if (!pluginEntry) {
    addError(MARKETPLACE, `missing plugin entry for \`${PLUGIN_NAME}\``);
  } else {
    if (pluginEntry.source?.source !== "local") addError(MARKETPLACE, "expected plugin source.source to be `local`");
    if (pluginEntry.source?.path !== "./plugins/minecraft-codex-skills") {
      addError(MARKETPLACE, "expected plugin source.path to be `./plugins/minecraft-codex-skills`");
    }
    if (pluginEntry.policy?.installation !== "AVAILABLE") {
      addError(MARKETPLACE, "expected plugin policy.installation to be `AVAILABLE`");
    }
    if (pluginEntry.policy?.authentication !== "ON_INSTALL") {
      addError(MARKETPLACE, "expected plugin policy.authentication to be `ON_INSTALL`");
    }
  }
}

if (pluginReadme) {
  const requiredReadmeSnippets = [
    "plugins/minecraft-codex-skills/",
    ".agents/plugins/marketplace.json",
    "## Skill groups",
    "minecraft-imagegen",
    "## Compatibility",
    "host-conditional",
    "Open `/plugins` and install `minecraft-codex-skills` from the repo marketplace.",
    "## Troubleshooting",
    "claude --plugin-dir ./plugins/minecraft-codex-skills",
    "~/.codex/plugins/cache/",
    "Codex manifest carries the richer install-surface metadata",
  ];

  for (const snippet of requiredReadmeSnippets) {
    if (!pluginReadme.includes(snippet)) {
      addError(PLUGIN_README, `missing required install guidance snippet: ${snippet}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Plugin bundle validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Plugin bundle validation passed");
