import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const site = "https://painmap.org";
const routeManifest = readJson("data/routes.json");
const expectedRoutes = routeManifest.routes.map((route) => route.file);
const expectedExports = [
  "data/routes.json",
  "data/route-smoke.json",
  "data/provenance-registry.json",
  "data/place-measurements.json",
  "data/place-measurements.csv",
  "data/places.geojson",
  "data/countries-lite.geojson",
  "data/natural-earth-countries.geojson",
  "data/openapi.json",
  "data/dcat.json",
  "v1/releases.json",
  "v1/layers.json",
  "v1/sources.json",
  "v1/places/BRA.json",
  "v1/places/BRA/measurements.json",
  "v1/places/IND.json",
  "v1/places/IND/measurements.json",
  "releases/2026-05-31/manifest.json",
  "latest/manifest.json",
  "assets/social-card.svg",
  "vendor/d3.v7.min.js",
  "vendor/topojson-client.v3.min.js",
  ".nojekyll",
  ".well-known/security.txt",
  "_headers",
  "vercel.json",
  "README.md",
  "LICENSE",
];
const failures = [];

function absolute(file) {
  return path.join(root, file);
}

function read(file) {
  return readFileSync(absolute(file), "utf8");
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(root, file), "utf8"));
}

function hashFile(file, algorithm = "sha384", encoding = "base64") {
  return createHash(algorithm).update(readFileSync(absolute(file))).digest(encoding);
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

function walkFiles(dir = root, predicate = () => true) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }

    const absoluteEntry = path.join(dir, entry);
    const stat = statSync(absoluteEntry);

    if (stat.isDirectory()) {
      files.push(...walkFiles(absoluteEntry, predicate));
      continue;
    }

    const relative = path.relative(root, absoluteEntry);

    if (predicate(relative)) {
      files.push(relative);
    }
  }

  return files.sort();
}

function expectPattern(file, html, pattern, label) {
  if (!pattern.test(html)) {
    failures.push(`${file} is missing ${label}`);
  }
}

function routeUrl(route) {
  return `${site}${route.path}`;
}

for (const file of expectedRoutes) {
  if (!existsSync(absolute(file))) {
    failures.push(`Missing route file from data/routes.json: ${file}`);
  }
}

for (const file of expectedExports) {
  if (!existsSync(absolute(file))) {
    failures.push(`Missing expected export/config file: ${file}`);
  }
}

for (const file of expectedExports.filter((entry) => /\.(json|geojson)$/.test(entry))) {
  if (!existsSync(absolute(file))) {
    continue;
  }

  try {
    JSON.parse(read(file));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
  }
}

const stylesheetSri = `sha384-${hashFile("styles.css")}`;
const scriptSri = `sha384-${hashFile("script.js")}`;
const d3Sri = `sha384-${hashFile("vendor/d3.v7.min.js")}`;
const topojsonSri = `sha384-${hashFile("vendor/topojson-client.v3.min.js")}`;

for (const route of routeManifest.routes) {
  const file = route.file;

  if (!existsSync(absolute(file))) {
    continue;
  }

  const html = read(file);
  const canonical = routeUrl(route);

  expectPattern(file, html, new RegExp(`<title>${escapeRegExp(route.title)}</title>`), "route-manifest title");
  expectPattern(
    file,
    html,
    new RegExp(`<meta name="description" content="${escapeRegExp(route.description)}">`),
    "route-manifest description"
  );
  expectPattern(
    file,
    html,
    new RegExp(`<link rel="canonical" href="${escapeRegExp(canonical)}">`),
    "route-manifest canonical"
  );
  expectPattern(file, html, /Content-Security-Policy/, "Content-Security-Policy meta tag");
  expectPattern(file, html, /name="referrer" content="strict-origin-when-cross-origin"/, "strict referrer metadata");
  expectPattern(file, html, /<meta property="og:image" content="https:\/\/painmap\.org\/assets\/social-card\.svg">/, "og:image metadata");
  expectPattern(file, html, /<meta name="twitter:card" content="summary_large_image">/, "twitter card metadata");
  expectPattern(file, html, /<meta name="twitter:image" content="https:\/\/painmap\.org\/assets\/social-card\.svg">/, "twitter image metadata");
  expectPattern(file, html, /type="application\/ld\+json"/, "route JSON-LD");
  expectPattern(
    file,
    html,
    new RegExp(`<link rel="stylesheet" href="[^"]+" integrity="${escapeRegExp(stylesheetSri)}" crossorigin="anonymous">`),
    "current stylesheet SRI"
  );

  for (const navItem of routeManifest.navigation) {
    expectPattern(
      file,
      html,
      new RegExp(`<a href="${escapeRegExp(navItem.path)}">${escapeRegExp(navItem.label)}</a>`),
      `navigation item ${navItem.label}`
    );
  }
}

const home = read("index.html");
expectPattern(
  "index.html",
  home,
  new RegExp(`<script src="vendor/d3\\.v7\\.min\\.js" integrity="${escapeRegExp(d3Sri)}" crossorigin="anonymous"></script>`),
  "vendored d3 script with SRI"
);
expectPattern(
  "index.html",
  home,
  new RegExp(`<script src="vendor/topojson-client\\.v3\\.min\\.js" integrity="${escapeRegExp(topojsonSri)}" crossorigin="anonymous"></script>`),
  "vendored topojson script with SRI"
);
expectPattern(
  "index.html",
  home,
  new RegExp(`<script type="module" src="script\\.js" integrity="${escapeRegExp(scriptSri)}" crossorigin="anonymous"></script>`),
  "current script.js SRI"
);

const sitemap = read("sitemap.xml");
for (const route of routeManifest.routes) {
  const url = routeUrl(route);

  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    failures.push(`sitemap.xml missing ${url}`);
  }
}

const smoke = readJson("data/route-smoke.json");
for (const route of routeManifest.routes) {
  const smokeRoute = smoke.routes.find((entry) => entry.path === route.path);

  if (!smokeRoute) {
    failures.push(`data/route-smoke.json missing ${route.path}`);
    continue;
  }

  if (smokeRoute.file !== route.file || smokeRoute.expected_title !== route.title) {
    failures.push(`data/route-smoke.json route mismatch for ${route.path}`);
  }
}

for (const file of walkFiles(root, (entry) => entry.endsWith(".html"))) {
  const html = read(file);
  const dirname = path.dirname(file);

  if (/cdn\.jsdelivr\.net/.test(html)) {
    failures.push(`${file} still references jsDelivr at runtime`);
  }

  if (/raw\.githubusercontent\.com/.test(html)) {
    failures.push(`${file} still references raw.githubusercontent.com`);
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

      if (routeFile && !existsSync(absolute(routeFile))) {
        failures.push(`${file} links to missing route ${href} (${routeFile})`);
      }

      continue;
    }

    const target = path.normalize(path.join(dirname, href.split("#")[0].split("?")[0]));

    if (!existsSync(absolute(target))) {
      failures.push(`${file} links to missing local asset ${href} (${target})`);
    }
  }

  for (const match of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noreferrer[^"]*"/.test(match[0])) {
      failures.push(`${file} has target="_blank" link without rel="noreferrer"`);
    }
  }
}

for (const file of ["_headers", "vercel.json"]) {
  const body = read(file);

  if (/cdn\.jsdelivr\.net|raw\.githubusercontent\.com/.test(body)) {
    failures.push(`${file} still allows a removed runtime vendor or raw GitHub dependency`);
  }
}

const css = read("styles.css");
expectPattern("styles.css", css, /@media \(prefers-reduced-motion: reduce\)/, "reduced-motion media query");
expectPattern("styles.css", css, /animation-duration:\s*0\.01ms/, "reduced-motion animation clamp");
expectPattern("styles.css", css, /outline:\s*3px solid/, "visible focus outlines");

const securityTxt = read(".well-known/security.txt");
expectPattern(".well-known/security.txt", securityTxt, /Contact: mailto:security@painmap\.org/, "confidential security mail contact");
expectPattern(".well-known/security.txt", securityTxt, /Policy: https:\/\/painmap\.org\/security\//, "security policy URL");

const placeMeasurements = readJson("data/place-measurements.json");
const requiredMeasurementFields = [
  "measurement_id",
  "release_id",
  "place_id",
  "place_name",
  "geometry_level",
  "layer_id",
  "layer_name",
  "evidence_kind",
  "value_type",
  "raw_value",
  "display_value",
  "unit_label",
  "ranking_mode",
  "source_ids",
  "confidence_low",
  "confidence_high",
  "provenance_id",
  "source_vintage",
  "method_note",
  "uncertainty_class",
  "license_id",
];

for (const measurement of placeMeasurements.measurements) {
  for (const field of requiredMeasurementFields) {
    if (!(field in measurement)) {
      failures.push(`${measurement.measurement_id ?? "measurement"} missing canonical field ${field}`);
    }
  }

  if (typeof measurement.raw_value !== "number") {
    failures.push(`${measurement.measurement_id} raw_value must be numeric`);
  }

  if (!Array.isArray(measurement.source_ids) || measurement.source_ids.length === 0) {
    failures.push(`${measurement.measurement_id} must include source_ids`);
  }

  if (!["direct", "modeled", "proxy", "priority-overlay", "boundary"].includes(measurement.evidence_kind)) {
    failures.push(`${measurement.measurement_id} has invalid evidence_kind ${measurement.evidence_kind}`);
  }
}

const provenance = readJson("data/provenance-registry.json");
for (const evidenceKind of ["direct", "modeled", "proxy", "priority-overlay", "boundary"]) {
  if (!provenance.methodClasses.some((methodClass) => methodClass.id === evidenceKind)) {
    failures.push(`provenance registry missing evidence-kind class ${evidenceKind}`);
  }
}

const releaseManifest = readJson("releases/2026-05-31/manifest.json");
if (releaseManifest.release_id !== routeManifest.releaseId) {
  failures.push("release manifest release_id does not match data/routes.json");
}

for (const artifact of releaseManifest.artifacts ?? []) {
  const file = artifact.path.replace(/^\//, "");

  if (!existsSync(absolute(file))) {
    failures.push(`release manifest points to missing artifact ${artifact.path}`);
    continue;
  }

  const actual = createHash("sha256").update(readFileSync(absolute(file))).digest("hex");

  if (actual !== artifact.sha256) {
    failures.push(`release manifest sha256 mismatch for ${artifact.path}`);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Static site check passed for ${expectedRoutes.length} manifest routes and ${expectedExports.length} exports.`);
