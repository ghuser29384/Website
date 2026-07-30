import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "data/routes.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function decodeHtml(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function titleFromHtml(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].trim()) : null;
}

function descriptionFromHtml(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((entry) => /\bname=(['"])description\1/i.test(entry));
  if (!tag) return null;

  const match = tag.match(/\bcontent=(['"])([\s\S]*?)\1/i);
  return match ? decodeHtml(match[2].trim()) : null;
}

let changes = 0;
for (const route of manifest.routes ?? []) {
  const routePath = path.join(root, String(route.file ?? ""));
  if (!route.file || !existsSync(routePath)) continue;

  const html = readFileSync(routePath, "utf8");
  const title = titleFromHtml(html);
  const description = descriptionFromHtml(html);

  if (title && route.title !== title) {
    route.title = title;
    changes += 1;
  }

  if (description && route.description !== description) {
    route.description = description;
    changes += 1;
  }
}

if (changes > 0) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(`Synchronized ${changes} route metadata field${changes === 1 ? "" : "s"}.`);
