import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedRoutes = [
  "index.html",
  "atlas/index.html",
  "events/index.html",
  "countries/index.html",
  "place/BRA/index.html",
  "methods/index.html",
  "data/index.html",
  "dataset/place-measurements/index.html",
  "dataset/provenance-registry/index.html",
  "api/index.html",
  "developers/index.html",
  "resources/index.html",
  "about/index.html",
  "updates/index.html",
  "security/index.html",
  "policies/privacy/index.html",
  "policies/terms/index.html",
  "policies/accessibility/index.html",
  "policies/editorial-policy/index.html",
  "policies/contact/index.html",
];
const expectedExports = [
  "data/provenance-registry.json",
  "data/place-measurements.json",
  "data/place-measurements.csv",
  "data/places.geojson",
  "data/countries-lite.geojson",
  "data/openapi.json",
  "data/dcat.json",
  ".well-known/security.txt",
  "_headers",
  "vercel.json",
];

const failures = [];

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}

function routeFileForHref(href) {
  const cleanHref = href.split("#")[0].split("?")[0];

  if (!cleanHref || cleanHref.startsWith("http") || cleanHref.startsWith("mailto:")) {
    return null;
  }

  if (cleanHref === "/") {
    return "index.html";
  }

  if (cleanHref.startsWith("/")) {
    return cleanHref.endsWith("/")
      ? `${cleanHref.slice(1)}index.html`
      : cleanHref.slice(1);
  }

  return null;
}

function walkHtmlFiles(dir = root) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }

    const absolute = path.join(dir, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      files.push(...walkHtmlFiles(absolute));
      continue;
    }

    if (entry.endsWith(".html")) {
      files.push(path.relative(root, absolute));
    }
  }

  return files.sort();
}

for (const file of expectedRoutes) {
  if (!existsSync(path.join(root, file))) {
    failures.push(`Missing expected route file: ${file}`);
    continue;
  }

  const html = read(file);

  for (const pattern of [
    /<title>[^<]+<\/title>/,
    /<meta[\s\S]*?name="description"[\s\S]*?content="[^"]+"[\s\S]*?>/,
    /<link[\s\S]*?rel="canonical"[\s\S]*?href="https:\/\/painmap\.org\/[^"]*"[\s\S]*?>/,
    /Content-Security-Policy/,
    /<meta[\s\S]*?name="referrer"[\s\S]*?content="strict-origin-when-cross-origin"[\s\S]*?>/,
  ]) {
    if (!pattern.test(html)) {
      failures.push(`${file} is missing required metadata: ${pattern}`);
    }
  }
}

for (const file of expectedExports) {
  if (!existsSync(path.join(root, file))) {
    failures.push(`Missing expected export/config file: ${file}`);
  }
}

for (const file of expectedExports.filter((entry) => entry.endsWith(".json") || entry.endsWith(".geojson"))) {
  try {
    JSON.parse(read(file));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
  }
}

const sitemap = read("sitemap.xml");
for (const file of expectedRoutes) {
  const route = file === "index.html" ? "" : file.replace(/index\.html$/, "");
  const url = `https://painmap.org/${route}`;

  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    failures.push(`sitemap.xml missing ${url}`);
  }
}

for (const file of walkHtmlFiles()) {
  const html = read(file);
  const dirname = path.dirname(file);

  if (!/Content-Security-Policy/.test(html)) {
    failures.push(`${file} is missing a Content-Security-Policy meta tag`);
  }

  if (!/name="referrer" content="strict-origin-when-cross-origin"/.test(html)) {
    failures.push(`${file} is missing strict-origin-when-cross-origin referrer metadata`);
  }

  if (!/<link[\s\S]*?rel="stylesheet"[\s\S]*?integrity="sha384-[^"]+"[\s\S]*?crossorigin="anonymous"[\s\S]*?>/.test(html)) {
    failures.push(`${file} stylesheet is missing SRI metadata`);
  }

  if (file === "index.html" && !/<script[\s\S]*?src="script\.js"[\s\S]*?integrity="sha384-[^"]+"[\s\S]*?crossorigin="anonymous"[\s\S]*?><\/script>/.test(html)) {
    failures.push("index.html script.js is missing SRI metadata");
  }

  if (/dataset\//.test(file) && !/\/data\/[^"]+\.(json|csv|geojson)/.test(html)) {
    failures.push(`${file} is a dataset page without direct data export links`);
  }

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const href = match[1];

    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) {
      continue;
    }

    if (href.startsWith("/")) {
      const routeFile = routeFileForHref(href);

      if (routeFile && !existsSync(path.join(root, routeFile))) {
        failures.push(`${file} links to missing route ${href} (${routeFile})`);
      }

      continue;
    }

    const target = path.normalize(path.join(dirname, href.split("#")[0].split("?")[0]));

    if (!existsSync(path.join(root, target))) {
      failures.push(`${file} links to missing local asset ${href} (${target})`);
    }
  }

  for (const match of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noreferrer[^"]*"/.test(match[0])) {
      failures.push(`${file} has target="_blank" link without rel="noreferrer"`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Static site check passed for ${expectedRoutes.length} routes.`);
