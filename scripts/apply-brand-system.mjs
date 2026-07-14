import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const BRAND_ID = "evidence-contours-v1";
const BRAND_NAME = "PainMap Evidence Contours";
const BRAND_VERSION = "1.0.0";
const BRAND_CSS_PATHS = ["brand.css", "assets/brand/brand-components.css"];
const BRAND_ASSET_ROOT = "/assets/brand";
const EXCLUDED_DIRS = new Set([".git", ".github", "node_modules", "tmp", ".cache"]);

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function sha384(value) {
  return createHash("sha384").update(value).digest("base64");
}

function shortSha(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function listHtmlFiles(directory = root, files = []) {
  for (const entry of readdirSync(directory)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      listHtmlFiles(fullPath, files);
    } else if (stats.isFile() && entry.toLowerCase().endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

function ensureHtmlBrandAttribute(html) {
  return html.replace(/<html\b([^>]*)>/i, (_tag, attrs) => {
    const withoutExisting = attrs.replace(/\sdata-brand="[^"]*"/gi, "");
    return `<html${withoutExisting} data-brand="${BRAND_ID}">`;
  });
}

function removeExistingBrandLinks(html) {
  return html
    .replace(/\s*<link\b[^>]*data-painmap-brand="[^"]*"[^>]*>\s*/gi, "\n")
    .replace(/\s*<link\b[^>]*href="\/assets\/brand\/painmap-favicon\.svg"[^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\b[^>]*data-painmap-brand="[^"]*"[^>]*>\s*/gi, "\n");
}

function insertHeadAssets(html, brandLinks, faviconLink, themeColor) {
  const links = `${faviconLink}\n    ${themeColor}\n    ${brandLinks}`;
  const lastStylesheet = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)].at(-1);
  if (lastStylesheet?.index != null) {
    const insertAt = lastStylesheet.index + lastStylesheet[0].length;
    return `${html.slice(0, insertAt)}\n    ${links}${html.slice(insertAt)}`;
  }
  return html.replace(/<\/head>/i, `    ${links}\n  </head>`);
}

function replaceBrandAnchor(html) {
  const replacement = `<a class="brand" href="/" aria-label="PainMap home"><img class="brand-logo" src="${BRAND_ASSET_ROOT}/painmap-logo-horizontal-primary.svg" width="226" height="43" alt="PainMap"></a>`;
  return html.replace(/<a\b[^>]*class="brand"[^>]*aria-label="PainMap home"[^>]*>[\s\S]*?<\/a>/gi, replacement);
}

function addEvidenceClass(html, label, modifier) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<span\\b[^>]*class="([^"]*\\bevidence-badge\\b[^"]*)"[^>]*>\\s*${escaped}\\s*<\\/span>`, "gi");
  return html.replace(pattern, (_match, classNames) => {
    const tokens = new Set(classNames.split(/\s+/).filter(Boolean));
    tokens.add(`evidence-badge--${modifier}`);
    return `<span class="${[...tokens].join(" ")}">${label}</span>`;
  });
}

function applyEvidenceClasses(html) {
  const labels = [
    ["direct evidence", "direct"],
    ["modeled estimate", "modeled"],
    ["proxy aggregate", "proxy"],
    ["priority overlay", "priority"],
    ["boundary only", "boundary"],
    ["no comparable data", "nodata"],
    ["immutable", "snapshot"],
    ["not frozen", "live"],
  ];
  return labels.reduce((current, [label, modifier]) => addEvidenceClass(current, label, modifier), html);
}

function applyEvidenceTableCells(html) {
  const cells = [
    ["direct", "direct", "direct"],
    ["direct evidence", "direct", "direct evidence"],
    ["modeled", "modeled", "modeled"],
    ["modeled estimate", "modeled", "modeled estimate"],
    ["proxy", "proxy", "proxy"],
    ["proxy aggregate", "proxy", "proxy aggregate"],
    ["priority-overlay", "priority", "priority overlay"],
    ["priority overlay", "priority", "priority overlay"],
    ["boundary-only", "boundary", "boundary only"],
    ["boundary only", "boundary", "boundary only"],
  ];

  return cells.reduce((current, [source, modifier, display]) => {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<td>\\s*${escaped}\\s*<\\/td>`, "gi");
    return current.replace(
      pattern,
      `<td><span class="pm-evidence-kind pm-evidence-kind--${modifier}">${display}</span></td>`,
    );
  }, html);
}

function applyHomepageCopy(html, relativePath) {
  if (relativePath !== "index.html") return html;

  const headlineBlock = /<p class="label">(?:PainMap|Public research atlas|Public evidence atlas(?:[^<]*)?)<\/p>\s*<h1 id="home-title">[\s\S]*?<\/h1>(?:\s*<p class="hero-deck">[\s\S]*?<\/p>)?/i;
  const newHeadlineBlock = `<p class="label">Public evidence atlas / Release 2026-05-31.atlas.2</p>\n          <h1 id="home-title"><span>What is known.</span><span>What is inferred.</span><span>What is missing.</span></h1>\n          <p class="hero-deck">PainMap assembles place-based evidence and burden proxies about animal pain, keeping source, method, uncertainty and release context attached.</p>`;
  html = html.replace(headlineBlock, newHeadlineBlock);

  html = html.replace(
    /<div class="hero-actions"[^>]*>[\s\S]*?<\/div>/i,
    `<div class="hero-actions" aria-label="Primary routes">\n            <a class="solid-button" href="/atlas/">Open the atlas</a>\n            <a class="ghost-link" href="/compare/">Compare places</a>\n            <a class="ghost-link" href="/methods/">Read the method</a>\n            <a class="ghost-link" href="/data/">Audit the data</a>\n          </div>`,
  );

  html = html.replace(
    /<p class="topbar-note" id="topbar-note">[\s\S]*?<\/p>/i,
    `<p class="topbar-note" id="topbar-note">\n          Direct evidence, modeled estimates, proxy aggregates and priority overlays remain separately labeled. Boundary-only places and data gaps stay visible instead of being presented as measurements.\n          <strong>See the evidence. See its limits.</strong>\n        </p>`,
  );

  html = html.replace(
    /<meta property="og:title" content="[^"]*">/i,
    '<meta property="og:title" content="PainMap | What is known. What is inferred. What is missing.">',
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*">/i,
    '<meta name="twitter:title" content="PainMap | What is known. What is inferred. What is missing.">',
  );
  return html;
}

function transformHtml(html, relativePath, brandLinks, faviconLink, themeColor) {
  let next = removeExistingBrandLinks(html);
  next = ensureHtmlBrandAttribute(next);
  next = insertHeadAssets(next, brandLinks, faviconLink, themeColor);
  next = replaceBrandAnchor(next);
  next = applyEvidenceClasses(next);
  next = applyEvidenceTableCells(next);
  next = applyHomepageCopy(next, relativePath);
  return next;
}

for (const cssPath of BRAND_CSS_PATHS) {
  if (!existsSync(absolute(cssPath))) {
    throw new Error(`${cssPath} is required before applying the brand system.`);
  }
}

const requiredAssets = [
  "assets/brand/painmap-logo-horizontal-primary.svg",
  "assets/brand/painmap-logo-horizontal-descriptor.svg",
  "assets/brand/painmap-symbol-primary.svg",
  "assets/brand/painmap-favicon.svg",
  "assets/brand/evidence-contours-hero.svg",
  "assets/brand/painmap-social-card.svg",
];
for (const asset of requiredAssets) {
  if (!existsSync(absolute(asset))) {
    throw new Error(`${asset} is required before applying the brand system.`);
  }
}

const stylesheets = BRAND_CSS_PATHS.map((cssPath) => {
  const bytes = readFileSync(absolute(cssPath));
  const version = shortSha(bytes);
  const integrity = `sha384-${sha384(bytes)}`;
  const href = `/${cssPath.replaceAll(path.sep, "/")}`;
  return { path: href, version, integrity };
});
const brandLinks = stylesheets
  .map(({ path: href, version, integrity }) => `<link rel="stylesheet" href="${href}?v=${version}" integrity="${integrity}" crossorigin="anonymous" data-painmap-brand="${BRAND_ID}">`)
  .join("\n    ");
const faviconLink = `<link rel="icon" href="${BRAND_ASSET_ROOT}/painmap-favicon.svg" type="image/svg+xml" data-painmap-brand="${BRAND_ID}">`;
const themeColor = `<meta name="theme-color" content="#F2EFE7" data-painmap-brand="${BRAND_ID}">`;

let changed = 0;
for (const file of listHtmlFiles()) {
  const relativePath = path.relative(root, file);
  const before = readFileSync(file, "utf8");
  const after = transformHtml(before, relativePath, brandLinks, faviconLink, themeColor);
  if (before !== after) {
    writeFileSync(file, after);
    changed += 1;
  }
}

const socialSource = absolute("assets/brand/painmap-social-card.svg");
const socialTarget = absolute("assets/social-card.svg");
copyFileSync(socialSource, socialTarget);

const manifest = {
  name: BRAND_NAME,
  version: BRAND_VERSION,
  concept: "Evidence Contours — the shape of what we know",
  brand_id: BRAND_ID,
  applied_at: "2026-07-14",
  promise: "See the evidence. See its limits.",
  descriptor: "Animal pain evidence, mapped.",
  campaign_line: "What is known. What is inferred. What is missing.",
  stylesheets,
  assets: {
    logo: `${BRAND_ASSET_ROOT}/painmap-logo-horizontal-primary.svg`,
    logo_with_descriptor: `${BRAND_ASSET_ROOT}/painmap-logo-horizontal-descriptor.svg`,
    symbol: `${BRAND_ASSET_ROOT}/painmap-symbol-primary.svg`,
    favicon: `${BRAND_ASSET_ROOT}/painmap-favicon.svg`,
    hero: `${BRAND_ASSET_ROOT}/evidence-contours-hero.svg`,
    social_card: "/assets/social-card.svg",
  },
};
writeFileSync(absolute("data/brand-system.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`PainMap Evidence Contours applied to ${changed} HTML files.`);
console.log(`Brand stylesheet versions: ${stylesheets.map((entry) => entry.version).join(", ")}`);
