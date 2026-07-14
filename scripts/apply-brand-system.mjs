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
const BRAND_ID = "evidence-field-v1";
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
  const replacement = `<a class="brand" href="/" aria-label="PainMap home"><img class="brand-mark" src="${BRAND_ASSET_ROOT}/painmap-symbol-primary.svg" width="44" height="44" alt=""><span>PainMap</span></a>`;
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
    ["immutable", "snapshot"],
    ["not frozen", "live"],
  ];
  return labels.reduce((current, [label, modifier]) => addEvidenceClass(current, label, modifier), html);
}

function applyHomepageCopy(html, relativePath) {
  if (relativePath !== "index.html") return html;

  const oldBlock = /<p class="label">PainMap<\/p>\s*<h1 id="home-title">Mixed-evidence atlas of pain sources by place<\/h1>/i;
  const newBlock = `<p class="label">Public research atlas</p>\n          <h1 id="home-title"><span>Map pain.</span><span>Keep uncertainty visible.</span></h1>\n          <p class="hero-deck">Mixed-evidence atlas of pain sources by place</p>`;
  if (oldBlock.test(html)) {
    html = html.replace(oldBlock, newBlock);
  }

  html = html.replace(
    /<meta property="og:title" content="[^"]*">/i,
    '<meta property="og:title" content="PainMap | Map pain. Keep uncertainty visible.">',
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*">/i,
    '<meta name="twitter:title" content="PainMap | Map pain. Keep uncertainty visible.">',
  );
  return html;
}

function transformHtml(html, relativePath, brandLinks, faviconLink, themeColor) {
  let next = removeExistingBrandLinks(html);
  next = ensureHtmlBrandAttribute(next);
  next = insertHeadAssets(next, brandLinks, faviconLink, themeColor);
  next = replaceBrandAnchor(next);
  next = applyEvidenceClasses(next);
  next = applyHomepageCopy(next, relativePath);
  return next;
}

for (const cssPath of BRAND_CSS_PATHS) {
  if (!existsSync(absolute(cssPath))) {
    throw new Error(`${cssPath} is required before applying the brand system.`);
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
const faviconLink = `<link rel="icon" href="${BRAND_ASSET_ROOT}/painmap-favicon.svg" type="image/svg+xml">`;
const themeColor = `<meta name="theme-color" content="#F2F0E8" data-painmap-brand="${BRAND_ID}">`;

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
if (existsSync(socialSource)) {
  copyFileSync(socialSource, socialTarget);
}

const manifest = {
  name: "PainMap Brand System",
  version: "1.0",
  concept: "The Evidence Field",
  brand_id: BRAND_ID,
  applied_at: "2026-07-14",
  stylesheets,
  assets: {
    symbol: `${BRAND_ASSET_ROOT}/painmap-symbol-primary.svg`,
    favicon: `${BRAND_ASSET_ROOT}/painmap-favicon.svg`,
    social_card: "/assets/social-card.svg",
  },
};
writeFileSync(absolute("data/brand-system.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`PainMap brand system applied to ${changed} HTML files.`);
console.log(`Brand stylesheet versions: ${stylesheets.map((entry) => entry.version).join(", ")}`);
