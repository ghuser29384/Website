import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = "data/site-origin.json";
const checkOnly = process.argv.includes("--check");
const excludedPaths = new Set([configPath]);
const textExtensions = new Set([
  ".css",
  ".csv",
  ".geojson",
  ".graphql",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsonld",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".txt",
  ".webmanifest",
  ".xml",
  ".yaml",
  ".yml",
]);
const textBasenames = new Set([
  ".gitignore",
  ".nojekyll",
  "CNAME",
  "LICENSE",
  "README",
  "_headers",
  "_redirects",
]);

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(absolute(relativePath), "utf8"));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hostPattern(host) {
  return new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(host)}(?![A-Za-z0-9-])`, "g");
}

function escapedHost(host, slashDepth) {
  return host.replaceAll(".", `${"\\".repeat(slashDepth)}.`);
}

function replacementRules(host, canonicalHost) {
  return [
    {
      representation: "plain",
      pattern: hostPattern(host),
      replacement: canonicalHost,
    },
    ...[1, 2].map((slashDepth) => {
      const source = escapedHost(host, slashDepth);
      return {
        representation: `regex-escaped-${slashDepth}`,
        pattern: new RegExp(escapeRegExp(source), "g"),
        replacement: escapedHost(canonicalHost, slashDepth),
      };
    }),
  ];
}

function isTextCandidate(relativePath) {
  if (excludedPaths.has(relativePath)) {
    return false;
  }

  const basename = path.basename(relativePath);
  return textBasenames.has(basename) || textExtensions.has(path.extname(relativePath).toLowerCase());
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean)
    .sort();
}

function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error(`${configPath} must contain an object`);
  }

  for (const field of ["canonical_origin", "canonical_host", "cname_path"]) {
    if (!config[field] || typeof config[field] !== "string") {
      throw new Error(`${configPath} must include non-empty ${field}`);
    }
  }

  if (!Array.isArray(config.legacy_hosts) || config.legacy_hosts.length === 0) {
    throw new Error(`${configPath} must include at least one legacy host`);
  }

  const canonicalUrl = new URL(config.canonical_origin);
  if (canonicalUrl.protocol !== "https:" || canonicalUrl.pathname !== "/" || canonicalUrl.search || canonicalUrl.hash) {
    throw new Error("canonical_origin must be an HTTPS origin without a path, query, or fragment");
  }
  if (canonicalUrl.hostname !== config.canonical_host) {
    throw new Error("canonical_origin hostname must equal canonical_host");
  }
  if (config.canonical_origin.endsWith("/")) {
    throw new Error("canonical_origin must not include a trailing slash");
  }

  const legacyHosts = new Set();
  for (const host of config.legacy_hosts) {
    if (!host || typeof host !== "string" || host === config.canonical_host) {
      throw new Error(`Invalid legacy host: ${String(host)}`);
    }
    if (legacyHosts.has(host)) {
      throw new Error(`Duplicate legacy host: ${host}`);
    }
    legacyHosts.add(host);
  }

  if (!existsSync(absolute(config.cname_path))) {
    throw new Error(`Configured CNAME file does not exist: ${config.cname_path}`);
  }
  const cname = readFileSync(absolute(config.cname_path), "utf8").trim();
  if (cname !== config.canonical_host) {
    throw new Error(`${config.cname_path} declares ${cname || "an empty host"}; expected ${config.canonical_host}`);
  }
}

function countMatches(value, pattern) {
  pattern.lastIndex = 0;
  return [...value.matchAll(pattern)].length;
}

const config = readJson(configPath);
validateConfig(config);
const rules = config.legacy_hosts.flatMap((host) =>
  replacementRules(host, config.canonical_host).map((rule) => ({ host, ...rule })),
);
const violations = [];
const changes = [];
let replacedOccurrences = 0;

for (const relativePath of trackedFiles()) {
  if (!isTextCandidate(relativePath)) {
    continue;
  }

  const filePath = absolute(relativePath);
  const original = readFileSync(filePath, "utf8");
  let next = original;
  let fileOccurrences = 0;

  for (const { host, representation, pattern, replacement } of rules) {
    const count = countMatches(next, pattern);
    if (!count) {
      continue;
    }

    fileOccurrences += count;
    violations.push({ relativePath, host, representation, count });
    if (!checkOnly) {
      pattern.lastIndex = 0;
      next = next.replace(pattern, replacement);
    }
  }

  if (!checkOnly && next !== original) {
    writeFileSync(filePath, next, "utf8");
    changes.push({ relativePath, count: fileOccurrences });
    replacedOccurrences += fileOccurrences;
  }
}

if (checkOnly && violations.length > 0) {
  const details = violations
    .map(
      ({ relativePath, host, representation, count }) =>
        `${relativePath}: ${count} ${representation} occurrence${count === 1 ? "" : "s"} of ${host}`,
    )
    .join("\n");
  throw new Error(`Legacy PainMap production hosts remain outside ${configPath}:\n${details}`);
}

if (!checkOnly) {
  const remaining = [];
  for (const relativePath of trackedFiles()) {
    if (!isTextCandidate(relativePath)) {
      continue;
    }
    const value = readFileSync(absolute(relativePath), "utf8");
    for (const { host, representation, pattern } of rules) {
      const count = countMatches(value, pattern);
      if (count) {
        remaining.push(
          `${relativePath}: ${count} ${representation} occurrence${count === 1 ? "" : "s"} of ${host}`,
        );
      }
    }
  }
  if (remaining.length > 0) {
    throw new Error(`Site-origin synchronization left legacy hosts behind:\n${remaining.join("\n")}`);
  }
}

console.log(
  checkOnly
    ? `Verified canonical production host ${config.canonical_host} across tracked public text files, including escaped validator forms.`
    : `Synchronized ${changes.length} tracked files and ${replacedOccurrences} legacy-host occurrences to ${config.canonical_host}, including escaped validator forms.`,
);
