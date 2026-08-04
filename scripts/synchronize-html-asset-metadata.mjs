import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const excludedDirectories = new Set([
  ".git",
  ".github",
  ".cache",
  "node_modules",
  "tmp",
  "_site",
]);

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(absolute(relativePath), "utf8"));
}

function hashFile(relativePath, algorithm, encoding) {
  if (!existsSync(absolute(relativePath))) {
    throw new Error(`Required public asset does not exist: ${relativePath}`);
  }
  return createHash(algorithm)
    .update(readFileSync(absolute(relativePath)))
    .digest(encoding);
}

function assetMetadata(relativePath) {
  return {
    version: hashFile(relativePath, "sha256", "hex").slice(0, 16),
    integrity: `sha384-${hashFile(relativePath, "sha384", "base64")}`,
  };
}

function listHtmlFiles(directory = root, output = []) {
  for (const entry of readdirSync(directory)) {
    if (excludedDirectories.has(entry)) {
      continue;
    }

    const filePath = path.join(directory, entry);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      listHtmlFiles(filePath, output);
    } else if (stats.isFile() && entry.toLowerCase().endsWith(".html")) {
      output.push(path.relative(root, filePath));
    }
  }
  return output.sort();
}

function removeTagLines(html, pattern) {
  return html.replace(pattern, "");
}

function insertAfterViewport(html, block, relativePath) {
  const viewport = /<meta\s+name="viewport"[^>]*>/i;
  if (!viewport.test(html)) {
    throw new Error(`${relativePath} cannot synchronize asset metadata without a viewport meta tag`);
  }
  return html.replace(viewport, (match) => `${match}\n    ${block}`);
}

function insertBeforeHeadEnd(html, block, relativePath) {
  if (!/<\/head>/i.test(html)) {
    throw new Error(`${relativePath} cannot synchronize metadata without a closing head tag`);
  }
  return html.replace(/<\/head>/i, `    ${block}\n  </head>`);
}

function hasMatch(html, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(html);
}

const siteOrigin = readJson("data/site-origin.json");
const routeManifest = readJson("data/routes.json");
if (!siteOrigin?.canonical_origin || !siteOrigin?.canonical_host) {
  throw new Error("data/site-origin.json must declare canonical_origin and canonical_host");
}
if (new URL(siteOrigin.canonical_origin).hostname !== siteOrigin.canonical_host) {
  throw new Error("Canonical origin and canonical host disagree");
}
if (!Array.isArray(routeManifest?.routes)) {
  throw new Error("data/routes.json must contain a routes array");
}

const routeFiles = new Set(routeManifest.routes.map((route) => route.file));
const styles = assetMetadata("styles.css");
const script = assetMetadata("script.js");
const compareScript = assetMetadata("compare.js");
const placesCoverageScript = assetMetadata("places-coverage.js");
const routeTableScript = assetMetadata("route-table-labels.js");
const socialCardUrl = `${siteOrigin.canonical_origin}/assets/social-card.svg`;

const stylesheetPreloadPattern = /^[ \t]*<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="style")(?=[^>]*\bhref="(?:\/|\.\.?\/)*styles\.css(?:\?[^\"]*)?")[^>]*>[ \t]*\r?\n?/gim;
const stylesheetPattern = /^[ \t]*<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="(?:\/|\.\.?\/)*styles\.css(?:\?[^\"]*)?")[^>]*>[ \t]*\r?\n?/gim;
const scriptPreloadPattern = /^[ \t]*<link\b(?=[^>]*\brel="modulepreload")(?=[^>]*\bhref="(?:\/|\.\.?\/)*script\.js(?:\?[^\"]*)?")[^>]*>[ \t]*\r?\n?/gim;
const comparePreloadPattern = /^[ \t]*<link\b(?=[^>]*\brel="modulepreload")(?=[^>]*\bhref="(?:\/|\.\.?\/)*compare\.js(?:\?[^\"]*)?")[^>]*>[ \t]*\r?\n?/gim;
const placesCoveragePreloadPattern = /^[ \t]*<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="script")(?=[^>]*\bhref="(?:\/|\.\.?\/)*places-coverage\.js(?:\?[^\"]*)?")[^>]*>[ \t]*\r?\n?/gim;
const ogImagePattern = /^[ \t]*<meta\b(?=[^>]*\bproperty="og:image")(?=[^>]*\bcontent="[^"]*")[^>]*>[ \t]*\r?\n?/gim;
const twitterImagePattern = /^[ \t]*<meta\b(?=[^>]*\bname="twitter:image")(?=[^>]*\bcontent="[^"]*")[^>]*>[ \t]*\r?\n?/gim;

function transformHtml(original, relativePath) {
  const routeFile = routeFiles.has(relativePath);
  const hadCoreAssetMetadata =
    hasMatch(original, stylesheetPreloadPattern) ||
    hasMatch(original, stylesheetPattern) ||
    hasMatch(original, scriptPreloadPattern);
  const hadSocialMetadata =
    hasMatch(original, ogImagePattern) || hasMatch(original, twitterImagePattern);
  const isComparePage = relativePath === "compare/index.html";
  const isPlacesPage = relativePath === "places/index.html";

  let html = original;
  html = removeTagLines(html, stylesheetPreloadPattern);
  html = removeTagLines(html, stylesheetPattern);
  html = removeTagLines(html, scriptPreloadPattern);
  html = removeTagLines(html, comparePreloadPattern);
  html = removeTagLines(html, placesCoveragePreloadPattern);

  if (routeFile || hadCoreAssetMetadata) {
    const headLinks = [
      `<link rel="preload" as="style" href="/styles.css?v=${styles.version}">`,
      `<link rel="modulepreload" href="/script.js?v=${script.version}">`,
      isComparePage
        ? `<link rel="modulepreload" href="/compare.js?v=${compareScript.version}">`
        : null,
      isPlacesPage
        ? `<link rel="preload" as="script" href="/places-coverage.js?v=${placesCoverageScript.version}" integrity="${placesCoverageScript.integrity}" crossorigin="anonymous">`
        : null,
      `<link rel="stylesheet" href="/styles.css?v=${styles.version}" integrity="${styles.integrity}" crossorigin="anonymous">`,
    ]
      .filter(Boolean)
      .join("\n    ");
    html = insertAfterViewport(html, headLinks, relativePath);
  }

  html = html.replace(
    /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="(?:\/|\.\.?\/)*script\.js(?:\?[^\"]*)?")[^>]*><\/script>/gi,
    `<script type="module" src="script.js?v=${script.version}" integrity="${script.integrity}" crossorigin="anonymous"></script>`,
  );
  html = html.replace(
    /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="(?:\/|\.\.?\/)*compare\.js(?:\?[^\"]*)?")[^>]*><\/script>/gi,
    `<script type="module" src="../compare.js?v=${compareScript.version}" integrity="${compareScript.integrity}" crossorigin="anonymous"></script>`,
  );
  html = html.replace(
    /<script\b(?=[^>]*\bsrc="(?:\/|\.\.?\/)*places-coverage\.js(?:\?[^\"]*)?")[^>]*><\/script>/gi,
    `<script src="../places-coverage.js?v=${placesCoverageScript.version}" integrity="${placesCoverageScript.integrity}" crossorigin="anonymous" defer></script>`,
  );
  html = html.replace(
    /<script\b(?=[^>]*\bsrc="(?:\/|\.\.?\/)*route-table-labels\.js(?:\?[^\"]*)?")[^>]*><\/script>/gi,
    `<script src="/route-table-labels.js?v=${routeTableScript.version}" defer></script>`,
  );

  html = removeTagLines(html, ogImagePattern);
  html = removeTagLines(html, twitterImagePattern);
  if (routeFile || hadSocialMetadata) {
    html = insertBeforeHeadEnd(
      html,
      `<meta property="og:image" content="${socialCardUrl}">\n    <meta name="twitter:image" content="${socialCardUrl}">`,
      relativePath,
    );
  }

  return html;
}

const drift = [];
let changed = 0;
for (const relativePath of listHtmlFiles()) {
  const filePath = absolute(relativePath);
  const original = readFileSync(filePath, "utf8");
  const synchronized = transformHtml(original, relativePath);
  if (original === synchronized) {
    continue;
  }

  if (checkOnly) {
    drift.push(relativePath);
  } else {
    writeFileSync(filePath, synchronized, "utf8");
    changed += 1;
  }
}

if (drift.length > 0) {
  throw new Error(
    `HTML asset metadata is stale in ${drift.length} file${drift.length === 1 ? "" : "s"}:\n${drift.join("\n")}`,
  );
}

console.log(
  checkOnly
    ? `Verified current asset fingerprints, integrity hashes, and social-card metadata across ${listHtmlFiles().length} HTML files.`
    : `Synchronized asset fingerprints, integrity hashes, and social-card metadata in ${changed} HTML files.`,
);
