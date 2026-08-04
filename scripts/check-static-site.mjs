import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const site = "https://painmaps.org";
const routeManifest = readJson("data/routes.json");
const expectedRoutes = routeManifest.routes.map((route) => route.file);
const expectedExports = [
  "data/routes.json",
  "data/route-smoke.json",
  "data/provenance-registry.json",
  "offline.html",
  "service-worker.js",
  "data/place-measurements.json",
  "data/place-measurements.csv",
  "data/places.geojson",
  "data/analytics-events.json",
  "data/performance-budgets.json",
  "data/source-freshness.json",
  "data/third-party-fetches.json",
  "data/accessibility-audit.json",
  "data/ui-smoke.json",
  "data/source-snapshots.json",
  "data/country-gap-ledger.json",
  "data/country-gap-ledger.csv",
  "data/country-profile-input-spec.json",
  "data/endpoint-smoke.json",
  "data/claims.json",
  "data/countries-lite.geojson",
  "data/natural-earth-countries.geojson",
  "data/gsap-adm1-2023.json",
  "data/openapi.json",
  "data/dcat.json",
  "compare.js",
  "ogc/index.json",
  "ogc/conformance.json",
  "ogc/collections/index.json",
  "ogc/collections/places/index.json",
  "ogc/collections/places/item-index.json",
  "ogc/collections/places/items.json",
  "ogc/collections/places/items/IND.json",
  "clients/typescript/painmap-client.ts",
  "clients/python/painmap_client.py",
  "examples/README.md",
  "examples/load-place-profile.mjs",
  "examples/compare-places.mjs",
  "examples/join-own-geography.mjs",
  "examples/cite-release.mjs",
  "examples/custom-geography.csv",
  "examples/load_place_profile.py",
  "fixtures/README.md",
  "fixtures/mock-registry.json",
  "fixtures/place-measurements.fixture.json",
  ".devcontainer/devcontainer.json",
  "scripts/build-preview-release.mjs",
  "scripts/check-source-freshness.mjs",
  "scripts/check-ui-smoke.mjs",
  "scripts/check-endpoint-smoke.mjs",
  ".github/workflows/painmap-static-checks.yml",
  ".github/workflows/painmap-source-freshness.yml",
  "schemas/place-index.schema.json",
  "schemas/adm1-context.schema.json",
  "schemas/place-measurements.schema.json",
  "schemas/coverage.schema.json",
  "schemas/source-snapshot.schema.json",
  "schemas/country-gap-ledger.schema.json",
  "schemas/ogc-place-features.schema.json",
  "v1/releases.json",
  "v1/layers.json",
  "v1/sources.json",
  "v1/coverage.json",
  "v1/places/index.json",
  "v1/adm1/index.json",
  "v1/places/IND/adm1.json",
  "v1/places/WLD.json",
  "v1/places/WLD/measurements.json",
  "v1/places/WLD/neighbors.json",
  "v1/places/BRA.json",
  "v1/places/BRA/measurements.json",
  "v1/places/BRA/neighbors.json",
  "v1/places/IND.json",
  "v1/places/IND/measurements.json",
  "v1/places/IND/neighbors.json",
  "releases/2026-05-31/manifest.json",
  "releases/2026-05-31/diff.json",
  "releases/2026-05-31/changes/index.html",
  "releases/2026-05-31/migration.json",
  "policies/accessibility/audit-2026-06-05/index.html",
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
    if (entry === ".git" || entry === "node_modules" || entry === "tmp" || entry === ".devcontainer") {
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

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function routeUrl(route) {
  return `${site}${route.path}`;
}

function routeCanonicalUrl(route) {
  return `${site}${route.canonicalPath || route.path}`;
}

function routeLabel(route) {
  return route.title.replace(/ \| PainMap$/, "");
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
const compareScriptSri = `sha384-${hashFile("compare.js")}`;
const d3Sri = `sha384-${hashFile("vendor/d3.v7.min.js")}`;
const topojsonSri = `sha384-${hashFile("vendor/topojson-client.v3.min.js")}`;
const stylesheetVersion = hashFile("styles.css", "sha256", "hex").slice(0, 16);
const scriptVersion = hashFile("script.js", "sha256", "hex").slice(0, 16);
const compareScriptVersion = hashFile("compare.js", "sha256", "hex").slice(0, 16);
const d3Version = hashFile("vendor/d3.v7.min.js", "sha256", "hex").slice(0, 16);
const topojsonVersion = hashFile("vendor/topojson-client.v3.min.js", "sha256", "hex").slice(0, 16);

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

for (const route of routeManifest.routes) {
  const file = route.file;

  if (!existsSync(absolute(file))) {
    continue;
  }

  const html = read(file);
  const canonical = routeCanonicalUrl(route);

  expectPattern(file, html, new RegExp(`<title>${escapeRegExp(htmlEscape(route.title))}</title>`), "route-manifest title");
  expectPattern(
    file,
    html,
    new RegExp(`<meta name="description" content="${escapeRegExp(htmlEscape(route.description))}">`),
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
  expectPattern(file, html, /<link rel="preconnect" href="https:\/\/www\.geoboundaries\.org".*?>/, "preconnect to geoboundaries");
  expectPattern(file, html, /<link rel="preconnect" href="https:\/\/api\.worldbank\.org".*?>/, "preconnect to worldbank");
  expectPattern(file, html, /<meta property="og:image" content="https:\/\/painmaps\.org\/assets\/social-card\.svg">/, "og:image metadata");
  expectPattern(file, html, /<meta name="twitter:card" content="summary_large_image">/, "twitter card metadata");
  expectPattern(file, html, /<meta name="twitter:image" content="https:\/\/painmaps\.org\/assets\/social-card\.svg">/, "twitter image metadata");
  expectPattern(file, html, /type="application\/ld\+json"/, "route JSON-LD");

  if (route.path !== "/") {
    expectPattern(file, html, /<nav class="breadcrumbs" aria-label="Breadcrumb">/, "visible breadcrumb navigation");
    expectPattern(
      file,
      html,
      new RegExp(`<span aria-current="page">${escapeRegExp(htmlEscape(routeLabel(route)))}</span>`),
      "current breadcrumb label"
    );
    expectPattern(file, html, /"@type":"BreadcrumbList"/, "BreadcrumbList structured data");
    expectPattern(file, html, /data-painmap-jsonld="breadcrumbs"/, "managed breadcrumb structured data");
  }

  if (route.path.startsWith("/place/") || route.generated === "country-place" || route.generated === "adm1-place") {
    expectPattern(file, html, /Open correction form/, "place route correction form link");
  }

  expectPattern(
    file,
    html,
    new RegExp(`<link rel="stylesheet" href="[^"]*styles\\.css\\?v=${stylesheetVersion}" integrity="${escapeRegExp(stylesheetSri)}" crossorigin="anonymous">`),
    "current stylesheet SRI"
  );
  expectPattern(
    file,
    html,
    new RegExp(`<link rel="preload" as="style" href="[^"]*styles\\.css\\?v=${stylesheetVersion}">`),
    "current stylesheet preload"
  );
  expectPattern(
    file,
    html,
    new RegExp(`<link rel="modulepreload" href="/script\\.js\\?v=${scriptVersion}">`),
    "current modulepreload for script.js"
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
  new RegExp(`<script src="vendor/d3\\.v7\\.min\\.js\\?v=${d3Version}" integrity="${escapeRegExp(d3Sri)}" crossorigin="anonymous"></script>`),
  "vendored d3 script with SRI"
);
expectPattern(
  "index.html",
  home,
  new RegExp(`<script src="vendor/topojson-client\\.v3\\.min\\.js\\?v=${topojsonVersion}" integrity="${escapeRegExp(topojsonSri)}" crossorigin="anonymous"></script>`),
  "vendored topojson script with SRI"
);
expectPattern(
  "index.html",
  home,
  new RegExp(`<script type="module" src="script\\.js\\?v=${scriptVersion}" integrity="${escapeRegExp(scriptSri)}" crossorigin="anonymous"></script>`),
  "current script.js SRI"
);
expectPattern("index.html", home, /script\.js\?v=[a-f0-9]{16}/, "homepage script cache fingerprint");

if (countMatches(home, /<script src="vendor\/d3\.v7\.min\.js\?v=/g) !== 1) {
  failures.push("index.html must include exactly one versioned D3 script");
}

if (countMatches(home, /<script src="vendor\/topojson-client\.v3\.min\.js\?v=/g) !== 1) {
  failures.push("index.html must include exactly one versioned TopoJSON script");
}

if (countMatches(home, /<script type="module" src="script\.js\?v=/g) !== 1) {
  failures.push("index.html must include exactly one versioned homepage module script");
}

const script = read("script.js");
const placesCoverage = read("places-coverage.js");
const offlinePage = read("offline.html");
const vercelConfig = read("vercel.json");
const packageJson = readJson("package.json");
const workflow = read(".github/workflows/painmap-static-checks.yml");

if (packageJson.scripts?.["smoke:endpoints"] !== "node scripts/check-endpoint-smoke.mjs") {
  failures.push("package.json must expose smoke:endpoints for endpoint smoke checks");
}

if (packageJson.scripts?.["freshness:sources"] !== "node scripts/check-source-freshness.mjs") {
  failures.push("package.json must expose freshness:sources for source freshness checks");
}

if (packageJson.scripts?.["fixtures:check"] !== "node scripts/build-preview-release.mjs --check") {
  failures.push("package.json must expose fixtures:check for local fixture validation");
}

if (packageJson.scripts?.["preview:fixture"] !== "node scripts/build-preview-release.mjs") {
  failures.push("package.json must expose preview:fixture for local preview-release generation");
}

if (!packageJson.scripts?.check?.includes("npm run fixtures:check")) {
  failures.push("package.json check script must include fixture validation");
}

if (packageJson.scripts?.["smoke:ui"] !== "node scripts/check-ui-smoke.mjs") {
  failures.push("package.json must expose smoke:ui for accessibility and visual smoke checks");
}

for (const workflowPattern of [
  /npm run check/,
  /npm run freshness:sources/,
  /git diff --exit-code/,
  /python3 -m py_compile clients\/python\/painmap_client\.py examples\/load_place_profile\.py/,
  /python3 -m http\.server 4173 --bind 127\.0\.0\.1/,
  /npm run smoke:endpoints/,
]) {
  if (!workflowPattern.test(workflow)) {
    failures.push(`.github/workflows/painmap-static-checks.yml missing ${workflowPattern}`);
  }
}

expectPattern("scripts/check-endpoint-smoke.mjs", read("scripts/check-endpoint-smoke.mjs"), /data\/endpoint-smoke\.json/, "endpoint smoke manifest reader");
expectPattern("scripts/check-endpoint-smoke.mjs", read("scripts/check-endpoint-smoke.mjs"), /\/data\/claims\.json/, "claims endpoint assertion");
expectPattern("scripts/check-endpoint-smoke.mjs", read("scripts/check-endpoint-smoke.mjs"), /v1\/places\/index\.json/, "place-index endpoint assertion");
expectPattern("scripts/check-endpoint-smoke.mjs", read("scripts/check-endpoint-smoke.mjs"), /well-known\/security\.txt/, "security.txt endpoint assertion");
expectPattern("scripts/check-source-freshness.mjs", read("scripts/check-source-freshness.mjs"), /data\/source-freshness\.json/, "source freshness manifest reader");
expectPattern("scripts/check-source-freshness.mjs", read("scripts/check-source-freshness.mjs"), /validation_lanes/, "source freshness validation lane assertions");
expectPattern("scripts/build-preview-release.mjs", read("scripts/build-preview-release.mjs"), /fixtures\/mock-registry\.json/, "preview release mock registry reader");
expectPattern("scripts/build-preview-release.mjs", read("scripts/build-preview-release.mjs"), /fixtures\/place-measurements\.fixture\.json/, "preview release measurement fixture reader");
expectPattern("fixtures/README.md", read("fixtures/README.md"), /npm run preview:fixture/, "fixture preview command docs");
expectPattern(".devcontainer/devcontainer.json", read(".devcontainer/devcontainer.json"), /npm run check/, "devcontainer post-create checks");
expectPattern("README.md", read("README.md"), /npm run preview:fixture/, "README fixture preview docs");
expectPattern("developers/index.html", read("developers/index.html"), /Local preview fixtures[\s\S]*npm run preview:fixture/, "developer fixture preview docs");
expectPattern("scripts/check-ui-smoke.mjs", read("scripts/check-ui-smoke.mjs"), /data\/ui-smoke\.json/, "UI smoke manifest reader");
expectPattern("scripts/check-ui-smoke.mjs", read("scripts/check-ui-smoke.mjs"), /aria-\(\?:controls\|describedby/, "UI smoke ARIA reference assertions");
expectPattern("scripts/check-ui-smoke.mjs", read("scripts/check-ui-smoke.mjs"), /required_components/, "UI smoke visual component assertions");
expectPattern(".github/workflows/painmap-source-freshness.yml", read(".github/workflows/painmap-source-freshness.yml"), /schedule:[\s\S]*cron: "17 9 \* \* 1"/, "scheduled source freshness workflow");
expectPattern(".github/workflows/painmap-source-freshness.yml", read(".github/workflows/painmap-source-freshness.yml"), /peter-evans\/create-pull-request@v6/, "source freshness release-candidate PR action");
expectPattern("script.js", script, /recordTelemetry\("route_view"\)/, "route_view telemetry instrumentation");
expectPattern("script.js", script, /recordTelemetry\("atlas_place_selected"/, "atlas_place_selected telemetry instrumentation");
expectPattern("script.js", script, /SERVICE_WORKER_SCRIPT\s*=\s*"\/service-worker\.js"/, "homepage service worker script path");
expectPattern("script.js", script, /registerServiceWorker\(\);/, "homepage service worker registration call");
expectPattern("script.js", script, /PerformanceObserver/, "field performance observer instrumentation");
expectPattern("script.js", script, /__painmapTelemetryEvents/, "homepage in-memory telemetry audit queue");
expectPattern("script.js", script, /dataset\.telemetryLastEvent = eventName/, "homepage DOM telemetry audit marker");
expectPattern("script.js", script, /TELEMETRY_ENDPOINT = document\.documentElement\.dataset\.telemetryEndpoint \|\| ""/, "no default telemetry collector");
expectPattern("places-coverage.js", placesCoverage, /const SERVICE_WORKER_SCRIPT = "\/service-worker\.js"/, "places coverage service worker script path");
expectPattern("places-coverage.js", placesCoverage, /registerServiceWorker\(\);/, "places coverage service worker registration call");
expectPattern("offline.html", offlinePage, /PainMap is offline/, "offline fallback page copy");
expectPattern("offline.html", offlinePage, /meta http-equiv="refresh"/, "offline retry refresh control");
expectPattern("offline.html", offlinePage, /href="\/places\/"/, "offline fallback places link");
expectPattern("offline.html", offlinePage, /href="\/v1\/coverage\.json"/, "offline fallback coverage link");
expectPattern("vercel.json", vercelConfig, /\"source\": \"\/service-worker\.js\"/, "service-worker cache header rule in vercel config");
expectPattern("index.html", home, /id="country-search"[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"[\s\S]*?aria-expanded="false"[\s\S]*?aria-controls="country-options"/, "APG-style country search combobox input");
expectPattern("index.html", home, /id="country-options"[\s\S]*?role="listbox"/, "country search listbox");
expectPattern("script.js", script, /countrySearchInput\.setAttribute\("aria-expanded", "true"\)/, "combobox expanded state on input");
expectPattern("script.js", script, /countrySearchInput\.setAttribute\("aria-expanded", "false"\)/, "combobox collapsed state on input");
expectPattern("script.js", script, /countrySearchInput\.setAttribute\("aria-activedescendant", activeOption\.id\)/, "combobox active descendant management");
expectPattern("script.js", script, /scrollIntoView\(\{ block: "nearest" \}\)/, "combobox active option scroll management");
expectPattern("script.js", script, /setSearchStatus\(`\$\{currentCountrySearchOptions\.length\} results available\.`\)/, "combobox result count status announcement");
expectPattern("index.html", home, /id="compare-place-link" href="\/compare\/\?places=WLD"/, "homepage compare place CTA");
expectPattern("index.html", home, /id="compare-save-button"[\s\S]*Save for compare/, "homepage save-for-compare button");
expectPattern("index.html", home, /id="compare-drawer"[\s\S]*id="compare-drawer-status"[\s\S]*aria-live="polite"[\s\S]*id="compare-drawer-list"/, "homepage saved compare drawer");
expectPattern("script.js", script, /COMPARE_QUEUE_STORAGE_KEY = "painmap\.compareQueue\.v1"/, "compare queue local storage key");
expectPattern("script.js", script, /MAX_COMPARE_QUEUE_ITEMS = 4/, "compare queue size limit");
expectPattern("script.js", script, /function saveCurrentComparePlace/, "compare queue save helper");
expectPattern("script.js", script, /function renderCompareDrawer/, "compare drawer render helper");
expectPattern("script.js", script, /compareUrlForPlaces\(queue\.map\(\(item\) => item\.placeId\)\)/, "shareable saved compare URL");
expectPattern("index.html", home, /class="hero-actions"[\s\S]*href="\/compare\/"[\s\S]*Compare places[\s\S]*href="\/data\/"[\s\S]*Audit data/, "homepage funnel compare and data CTAs");
expectPattern("index.html", home, /id="map-provenance-tray"/, "homepage map provenance tray");
expectPattern("index.html", home, /id="atlas-layer-rail"[\s\S]*aria-live="polite"/, "persistent atlas layer rail live region");
expectPattern("index.html", home, /id="atlas-layer-source-count"[\s\S]*source families/i, "atlas layer rail source count");
expectPattern("script.js", script, /function updateAtlasLayerRail/, "atlas layer rail update helper");
expectPattern("script.js", script, /sourceCount:\s*"6 source families"/, "atlas layer rail dynamic source count");
expectPattern("index.html", home, /swatch-boundary-only/, "non-color boundary-only legend cue");
expectPattern("script.js", script, /boundary-index-hatch/, "map boundary-only hatch pattern");
expectPattern("script.js", script, /countryMapCoverage/, "map coverage class helper");
expectPattern("styles.css", read("styles.css"), /\.country-path\.is-boundary-only/, "boundary-only map uncertainty styling");
expectPattern("styles.css", read("styles.css"), /\.province-path[\s\S]*stroke-dasharray/, "province proxy dash styling");
expectPattern("styles.css", read("styles.css"), /\.hero-section\s*\{[\s\S]*?min-height:\s*min\(44vh,\s*420px\)/, "compact homepage hero before atlas funnel");
expectPattern("styles.css", read("styles.css"), /\.hero-section \.topbar-note\s*\{[\s\S]*?display:\s*none;/, "mobile hero defers explanatory copy below first viewport");
expectPattern("styles.css", read("styles.css"), /\.hero-section \.evidence-kind-strip\s*\{[\s\S]*?display:\s*none;/, "mobile hero defers glossary badges below first viewport");
expectPattern("styles.css", read("styles.css"), /\.search-form\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*1fr;/, "mobile search controls use non-overflowing grid");
expectPattern("styles.css", read("styles.css"), /\.zoom-controls\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/, "mobile zoom controls use fixed grid tracks");
expectPattern("styles.css", read("styles.css"), /\.country-options\[hidden\],[\s\S]*?\.country-options:empty\s*\{[\s\S]*?display:\s*none;/, "empty search options cannot cover mobile controls");
expectPattern("index.html", home, /id="country-search-button"[\s\S]*?<span class="button-label">Find<\/span>/, "mobile search submit keeps visible label");
expectPattern("styles.css", read("styles.css"), /\.button-label\s*\{[\s\S]*?z-index:\s*1;/, "button labels paint above control backgrounds");
expectPattern("styles.css", read("styles.css"), /#country-search-button\s*\{[\s\S]*?max-width:\s*calc\(100vw - 3rem\);/, "mobile search submit constrained to viewport");
expectPattern("styles.css", read("styles.css"), /\.layout\s*\{[\s\S]*?order:\s*1;/, "atlas search layout ordered directly after hero");
expectPattern("styles.css", read("styles.css"), /\.audience-panel\s*\{[\s\S]*?order:\s*2;/, "audience panel ordered after atlas funnel");
expectPattern("styles.css", read("styles.css"), /\.release-mode-panel\s*\{[\s\S]*?order:\s*2;/, "release mode panel ordered after atlas funnel");
expectPattern("styles.css", read("styles.css"), /\.coverage-panel\s*\{[\s\S]*?order:\s*2;/, "coverage panel ordered after atlas funnel");
expectPattern("styles.css", read("styles.css"), /\.governance-panel\s*\{[\s\S]*?order:\s*6;/, "governance panel ordered after product surfaces");
expectPattern("compare/index.html", read("compare/index.html"), /id="compare-requested-list"/, "compare URL requested-place list");
expectPattern("compare.js", read("compare.js"), /recordTelemetry\("route_view"\)/, "compare route_view telemetry instrumentation");
expectPattern("compare.js", read("compare.js"), /recordTelemetry\("compare_opened"[\s\S]*requested_places_count/, "compare opened telemetry instrumentation");
expectPattern("compare.js", read("compare.js"), /PerformanceObserver/, "compare field performance observer instrumentation");
expectPattern("compare.js", read("compare.js"), /__painmapTelemetryEvents/, "compare in-memory telemetry audit queue");
expectPattern("compare.js", read("compare.js"), /dataset\.telemetryLastEvent = eventName/, "compare DOM telemetry audit marker");
expectPattern("compare.js", read("compare.js"), /TELEMETRY_ENDPOINT = document\.documentElement\.dataset\.telemetryEndpoint \|\| ""/, "compare route has no default telemetry collector");
expectPattern("compare/index.html", read("compare/index.html"), /compare\.js\?v=[a-f0-9]{16}/, "compare script cache fingerprint");
expectPattern(
  "compare/index.html",
  read("compare/index.html"),
  new RegExp(`<script type="module" src="\\.\\./compare\\.js\\?v=${compareScriptVersion}" integrity="${escapeRegExp(compareScriptSri)}" crossorigin="anonymous"></script>`),
  "current compare.js SRI"
);
expectPattern(
  "compare/index.html",
  read("compare/index.html"),
  new RegExp(`<link rel="modulepreload" href="/compare\\.js\\?v=${compareScriptVersion}">`),
  "current compare.js modulepreload"
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

  if (
    smokeRoute.file !== route.file ||
    smokeRoute.expected_title !== route.title ||
    smokeRoute.expected_canonical !== routeCanonicalUrl(route)
  ) {
    failures.push(`data/route-smoke.json route mismatch for ${route.path}`);
  }
}

if (!routeManifest.navigation.some((entry) => entry.label === "Places" && entry.path === "/places/")) {
  failures.push("data/routes.json navigation must use canonical /places/ route");
}

if (!routeManifest.routes.some((entry) => entry.path === "/places/" && entry.file === "places/index.html")) {
  failures.push("data/routes.json missing canonical /places/ route");
}

if (!routeManifest.routes.some((entry) => entry.path === "/countries/" && entry.file === "countries/index.html")) {
  failures.push("data/routes.json missing legacy /countries/ alias route");
}

const placeIndex = readJson("v1/places/index.json");
if (placeIndex.count !== placeIndex.items.length) {
  failures.push("v1/places/index.json count does not match items length");
}

if (placeIndex.count < 200) {
  failures.push("v1/places/index.json does not expose broad country coverage");
}

for (const placeId of ["WLD", "BRA", "IND"]) {
  if (!placeIndex.items.some((item) => item.place_id === placeId)) {
    failures.push(`v1/places/index.json missing ${placeId}`);
  }
}

for (const placeId of ["BRA", "IND"]) {
  const item = placeIndex.items.find((entry) => entry.place_id === placeId);

  if (!item || item.coverage_status !== "canonical_measurements" || item.canonical_measurement_count < 1) {
    failures.push(`v1/places/index.json must mark ${placeId} as canonical measurement coverage`);
  }
}

if (!placeIndex.items.some((entry) => entry.coverage_status === "boundary_index_only")) {
  failures.push("v1/places/index.json must expose boundary-index-only places");
}

const countryPlaceItems = placeIndex.items.filter((item) => item.geometry_level === "country");
const countryPlaceRoutes = routeManifest.routes.filter((route) => /^\/place\/[A-Z0-9]{3}\/$/.test(route.path));
const adm1PlaceItems = placeIndex.items.filter((item) => item.geometry_level === "adm1");
const staticAdm1Items = adm1PlaceItems.filter((item) => item.page_url);
const adm1PlaceRoutes = routeManifest.routes.filter((route) => route.generated === "adm1-place");
const allowedCoverageStatuses = new Set([
  "canonical_measurements",
  "boundary_index_only",
  "adm1_context_overlay",
  "no_data",
]);
const noDataPlaceCount = placeIndex.items.filter((item) => item.coverage_status === "no_data").length;

if (placeIndex.items.some((item) => !allowedCoverageStatuses.has(item.coverage_status))) {
  failures.push("v1/places/index.json contains unrecognized coverage_status values");
}

if (countryPlaceRoutes.length !== countryPlaceItems.length) {
  failures.push("data/routes.json must include one static /place/{ISO}/ route for every indexed country");
}

for (const item of countryPlaceItems) {
  if (!routeManifest.routes.some((route) => route.path === `/place/${item.place_id}/` && route.file === `place/${item.place_id}/index.html`)) {
    failures.push(`data/routes.json missing static place route for ${item.place_id}`);
  }

  if (!existsSync(absolute(`place/${item.place_id}/index.html`))) {
    failures.push(`Missing generated country place page for ${item.place_id}`);
  }
}

if (adm1PlaceItems.length < 1000) {
  failures.push("v1/places/index.json must expose broad ADM1 context coverage");
}

if (staticAdm1Items.length < 100) {
  failures.push("v1/places/index.json must expose at least 100 static ADM1 context pages");
}

if (adm1PlaceRoutes.length !== staticAdm1Items.length) {
  failures.push("data/routes.json must include one static route for every top ADM1 context page");
}

for (const item of staticAdm1Items) {
  const url = new URL(item.page_url);
  const routePath = url.pathname;

  if (!routeManifest.routes.some((route) => route.path === routePath && route.generated === "adm1-place")) {
    failures.push(`data/routes.json missing static ADM1 route for ${item.place_id}`);
  }

  const routeFile = routeFileForHref(routePath);

  if (!routeFile || !existsSync(absolute(routeFile))) {
    failures.push(`Missing generated ADM1 context page for ${item.place_id}`);
  }
}

const adm1Index = readJson("v1/adm1/index.json");
if (adm1Index.coverage_status !== "adm1_context_overlay") {
  failures.push("v1/adm1/index.json must be labeled adm1_context_overlay");
}

if (adm1Index.count !== adm1Index.items?.length || adm1Index.count !== adm1PlaceItems.length) {
  failures.push("v1/adm1/index.json count must match place-index ADM1 rows");
}

if (adm1Index.static_page_count !== staticAdm1Items.length) {
  failures.push("v1/adm1/index.json static_page_count mismatch");
}

if (!adm1Index.items?.every((item) => item.coverage_status === "adm1_context_overlay" && item.geometry_level === "adm1")) {
  failures.push("v1/adm1/index.json items must be ADM1 context overlays");
}

const coverage = readJson("v1/coverage.json");
if (coverage.coverage_status?.places_indexed !== placeIndex.count) {
  failures.push("v1/coverage.json places_indexed does not match place index count");
}

if ((coverage.known_sparse_areas ?? []).length < 3) {
  failures.push("v1/coverage.json must publish known sparse areas");
}

if (coverage.coverage_status?.evidence_layer_coverage?.direct !== 0) {
  failures.push("v1/coverage.json direct evidence place coverage should be explicit for this release");
}

if (coverage.coverage_status?.adm1_boundaries?.static_context_count !== adm1PlaceItems.length) {
  failures.push("v1/coverage.json ADM1 static context count mismatch");
}

if (coverage.coverage_status?.evidence_layer_coverage?.no_data !== noDataPlaceCount) {
  failures.push("v1/coverage.json no_data count does not match place index");
}

const defaultRankingReadiness = coverage.default_ranking_readiness;
if (!defaultRankingReadiness || typeof defaultRankingReadiness !== "object") {
  failures.push("v1/coverage.json must expose default_ranking_readiness");
} else {
  const readinessRule = defaultRankingReadiness.rule;
  const readinessReason = defaultRankingReadiness.reason;
  const readinessNote = defaultRankingReadiness.release_note_url;

  if (
    typeof defaultRankingReadiness.ready !== "boolean" &&
    typeof defaultRankingReadiness.enabled !== "boolean"
  ) {
    failures.push("v1/coverage.json default_ranking_readiness must declare ready or enabled");
  }

  if (!readinessRule || typeof readinessRule !== "string") {
    failures.push("v1/coverage.json default_ranking_readiness requires a non-empty rule");
  }

  if (!readinessReason || typeof readinessReason !== "string") {
    failures.push("v1/coverage.json default_ranking_readiness requires a reason string");
  }

  if (!readinessNote || typeof readinessNote !== "string") {
    failures.push("v1/coverage.json default_ranking_readiness requires a release_note_url");
  }

  if (
    !defaultRankingReadiness.summary_generated_at ||
    !/\d{4}-\d{2}-\d{2}T/.test(defaultRankingReadiness.summary_generated_at)
  ) {
    failures.push("v1/coverage.json default_ranking_readiness requires summary_generated_at timestamp");
  }
}

const releaseModes = readJson("data/release-modes.json");
if (releaseModes.default_mode !== "snapshot") {
  failures.push("data/release-modes.json must default to snapshot mode");
}

for (const modeId of ["snapshot", "live"]) {
  if (!releaseModes.modes?.some((entry) => entry.id === modeId && entry.cache_rule && entry.network_behavior)) {
    failures.push(`data/release-modes.json missing ${modeId} mode cache and network rules`);
  }
}

expectPattern("index.html", read("index.html"), /id="release-mode-snapshot"/, "snapshot release mode tab");
expectPattern("index.html", read("index.html"), /id="release-mode-live"/, "live release mode tab");
expectPattern(
  "index.html",
  read("index.html"),
  /id="globe-mode"[^>]*disabled[^>]*aria-disabled="true"/,
  "disabled static cause-mode control"
);
expectPattern(
  "index.html",
  read("index.html"),
  /id="ranking-mode"[^>]*disabled[^>]*aria-disabled="true"/,
  "disabled static ranking-mode control"
);
expectPattern(
  "script.js",
  read("script.js"),
  /const rankingDisabled = !rankingReady;/,
  "release-wide ranking-readiness control gate"
);
expectPattern(
  "script.js",
  read("script.js"),
  /function renderIssues\(country\) \{[\s\S]*?if \(!releaseRankingReadiness\(state\.releaseCoverage\)\)/,
  "human issue ranking fail-closed gate"
);
expectPattern(
  "script.js",
  read("script.js"),
  /function renderAnimalIssues\(country\) \{[\s\S]*?if \(!releaseRankingReadiness\(state\.releaseCoverage\)\)/,
  "animal issue ranking fail-closed gate"
);
if (read("script.js").includes("Select a country to use country-scoped ranking controls")) {
  failures.push("script.js must not imply that country-scoped cause rankings bypass release ranking readiness");
}

const analyticsEvents = readJson("data/analytics-events.json");
for (const eventName of ["route_view", "atlas_place_selected", "dataset_download", "compare_opened", "release_manifest_opened", "release_mode_selected"]) {
  if (!analyticsEvents.allowed_events?.some((entry) => entry.event === eventName)) {
    failures.push(`data/analytics-events.json missing required event ${eventName}`);
  }
}

if (
  analyticsEvents.privacy?.no_user_ids !== true ||
  analyticsEvents.privacy?.no_precise_location !== true ||
  analyticsEvents.privacy?.no_personal_health_fields !== true ||
  analyticsEvents.privacy?.default_network_collection !== false
) {
  failures.push("data/analytics-events.json privacy controls are incomplete");
}

const performanceBudgets = readJson("data/performance-budgets.json");
if (performanceBudgets.field_budgets?.largest_contentful_paint_ms > 2500) {
  failures.push("LCP budget must be <= 2500ms");
}

if (performanceBudgets.field_budgets?.interaction_to_next_paint_ms > 200) {
  failures.push("INP budget must be <= 200ms");
}

if (performanceBudgets.field_budgets?.cumulative_layout_shift > 0.1) {
  failures.push("CLS budget must be <= 0.1");
}

const uiSmoke = readJson("data/ui-smoke.json");
if (uiSmoke.release_id !== routeManifest.releaseId || uiSmoke.standard !== "static_accessibility_visual_smoke") {
  failures.push("data/ui-smoke.json must describe the current static accessibility and visual smoke contract");
}

for (const requiredPath of ["/", "/atlas/", "/places/", "/compare/", "/data/", "/api/", "/releases/2026-05-31/", "/security/"]) {
  const entry = uiSmoke.routes?.find((route) => route.path === requiredPath);

  if (!entry) {
    failures.push(`data/ui-smoke.json missing route ${requiredPath}`);
    continue;
  }

  if (!entry.expected_title || !entry.expected_canonical || !entry.visual_contract?.required_components?.length) {
    failures.push(`data/ui-smoke.json route ${requiredPath} is missing expected title, canonical, or visual components`);
  }
}

const sourceFreshness = readJson("data/source-freshness.json");
if (sourceFreshness.source_count !== readJson("v1/sources.json").sources?.length) {
  failures.push("data/source-freshness.json source_count must match v1/sources.json");
}

if (sourceFreshness.schedule?.workflow !== ".github/workflows/painmap-source-freshness.yml" || sourceFreshness.schedule?.release_candidate_prs !== true) {
  failures.push("data/source-freshness.json must describe scheduled release-candidate freshness workflow");
}

for (const laneId of ["schema-validity", "release-reproducibility", "domain-sanity", "editorial-validity"]) {
  if (!sourceFreshness.validation_lanes?.some((lane) => lane.id === laneId && lane.method)) {
    failures.push(`data/source-freshness.json missing ${laneId} validation lane`);
  }
}

const thirdPartyFetches = readJson("data/third-party-fetches.json");
if (
  thirdPartyFetches.default_network_collection !== false ||
  thirdPartyFetches.snapshot_mode_client_upstream_fetches !== false
) {
  failures.push("data/third-party-fetches.json must document no default third-party collection and no snapshot upstream fetches");
}

for (const requiredDomain of [
  "api.worldbank.org",
  "ourworldindata.org",
  "www.geoboundaries.org",
  "media.githubusercontent.com",
  "api.worldpop.org",
]) {
  if (!thirdPartyFetches.domains?.some((entry) => entry.domain === requiredDomain && entry.mode && entry.trigger && entry.privacy_note)) {
    failures.push(`data/third-party-fetches.json missing required domain behavior for ${requiredDomain}`);
  }
}

if (!thirdPartyFetches.modes?.some((entry) => entry.id === "snapshot" && entry.client_upstream_fetches === false)) {
  failures.push("data/third-party-fetches.json must mark snapshot mode as no client upstream fetches");
}

if (!thirdPartyFetches.modes?.some((entry) => entry.id === "live" && entry.client_upstream_fetches === true)) {
  failures.push("data/third-party-fetches.json must mark live mode as opt-in client upstream fetches");
}

const accessibilityAudit = readJson("data/accessibility-audit.json");
if (
  accessibilityAudit.standard !== "wcag_2_2_aa_audit_matrix" ||
  accessibilityAudit.target_conformance !== "WCAG 2.2 AA" ||
  !/No full WCAG conformance claim/.test(accessibilityAudit.conformance_claim || "")
) {
  failures.push("data/accessibility-audit.json must publish an honest WCAG 2.2 AA audit matrix without overclaiming conformance");
}

for (const requiredRoute of ["/", "/place/IND/", "/compare/", "/events/"]) {
  if (!accessibilityAudit.route_matrix?.some((entry) => entry.path === requiredRoute && entry.manual_keyboard_status && entry.screen_reader_status)) {
    failures.push(`data/accessibility-audit.json missing representative route ${requiredRoute}`);
  }
}

for (const method of ["axe browser audit", "manual keyboard audit", "VoiceOver audit", "NVDA audit"]) {
  if (!accessibilityAudit.scope?.required_methods?.includes(method)) {
    failures.push(`data/accessibility-audit.json missing required method ${method}`);
  }
}

const endpointSmoke = readJson("data/endpoint-smoke.json");
for (const requiredPath of ["/", "/places/", "/data/openapi.json", "/data/dcat.json", "/data/release-modes.json", "/data/source-freshness.json", "/data/third-party-fetches.json", "/data/accessibility-audit.json", "/data/ui-smoke.json", "/data/claims.json", "/offline.html", "/service-worker.js", "/v1/places/index.json", "/v1/adm1/index.json", "/v1/places/IND/adm1.json", "/v1/places/BRA/neighbors.json", "/ogc/index.json", "/ogc/collections/places/items.json", "/ogc/collections/places/item-index.json", "/ogc/collections/places/items/IND.json", "/releases/2026-05-31/manifest.json", "/releases/2026-05-31/diff.json", "/releases/2026-05-31/changes/", "/releases/2026-05-31/migration.json", "/policies/accessibility/audit-2026-06-05/", "/.well-known/security.txt"]) {
  if (!endpointSmoke.endpoints?.some((entry) => entry.path === requiredPath && entry.expected_status === 200)) {
    failures.push(`data/endpoint-smoke.json missing required endpoint ${requiredPath}`);
  }
}

const claims = readJson("data/claims.json");
if (claims.release_id !== routeManifest.releaseId) {
  failures.push("data/claims.json release_id mismatch");
}

if (claims.count !== claims.claims?.length) {
  failures.push("data/claims.json count must match claims length");
}

if (!Array.isArray(claims.claims)) {
  failures.push("data/claims.json must publish a claims array");
} else {
  const claimIds = new Set();
  const routeClaims = claims.claims.filter((claim) => claim.subject_type === "route").length;
  const placeClaims = claims.claims.filter((claim) => claim.subject_type === "place").length;
  const adm1Claims = claims.claims.filter((claim) => claim.subject_type === "adm1-place").length;
  const allowedSubjectTypes = new Set(["route", "place", "adm1-place"]);
  const claimRoutes = new Set(routeManifest.routes.map((route) => route.path));
  const countryPlaceClaims = new Map(
    placeIndex.items.filter((item) => item.geometry_level === "country" && item.page_url).map((item) => [item.place_id, item])
  );
  const expectedRouteClaims = routeManifest.routes.length;
  const expectedPlaceClaims = [...countryPlaceClaims.keys()].length;
  const expectedAdm1Claims = placeIndex.items.filter((item) => item.geometry_level === "adm1" && item.page_url).length;

  if (routeClaims !== expectedRouteClaims) {
    failures.push(`data/claims.json route claim count ${routeClaims} should equal route manifest routes ${expectedRouteClaims}`);
  }

  if (placeClaims !== expectedPlaceClaims) {
    failures.push(`data/claims.json place claim count ${placeClaims} should equal country pages ${expectedPlaceClaims}`);
  }

  if (adm1Claims !== expectedAdm1Claims) {
    failures.push(`data/claims.json adm1-place claim count ${adm1Claims} should equal indexed ADM1 pages ${expectedAdm1Claims}`);
  }

  for (const claim of claims.claims) {
    const required = ["claim_id", "release_id", "subject_type", "subject_id", "subject_label", "route", "coverage_status", "context", "correction_url"];

    for (const field of required) {
      if (!claim || !(field in claim)) {
        failures.push(`Claim missing required field ${field}`);
        break;
      }
    }

    if (!allowedSubjectTypes.has(claim.subject_type)) {
      failures.push(`Claim ${claim.claim_id} has unsupported subject_type ${claim.subject_type}`);
    }

    if (claimIds.has(claim.claim_id)) {
      failures.push(`Duplicate claim id ${claim.claim_id}`);
    }

    claimIds.add(claim.claim_id);

    if (!claim.route || !claim.route.startsWith("/")) {
      failures.push(`Claim ${claim.claim_id} must expose a route path`);
    } else if (claim.subject_type === "route") {
      if (!routeManifest.routes.some((route) => route.path === claim.route)) {
        failures.push(`Route claim ${claim.claim_id} references unknown route ${claim.route}`);
      }
    } else if (claim.subject_type === "place") {
      if (!countryPlaceClaims.has(claim.subject_id)) {
        failures.push(`Place claim ${claim.claim_id} references unknown country place_id ${claim.subject_id}`);
      }

      if (claim.route !== `/place/${claim.subject_id}/`) {
        failures.push(`Place claim ${claim.claim_id} should route to /place/${claim.subject_id}/`);
      }
    } else if (claim.subject_type === "adm1-place") {
      if (!claim.route.startsWith("/place/") || !claim.route.includes("/adm1/") || !claimRoutes.has(claim.route)) {
        failures.push(`ADM1 claim ${claim.claim_id} references non-adm1 route ${claim.route}`);
      }
    }

    if (!/^https:\/\/github\.com\/ghuser29384\/Website\/issues\/new/.test(claim.correction_url)) {
      failures.push(`Claim ${claim.claim_id} must use the configured GitHub issue tracker URL`);
    }
  }
}

for (const schemaFile of ["schemas/place-index.schema.json", "schemas/adm1-context.schema.json", "schemas/place-measurements.schema.json", "schemas/coverage.schema.json", "schemas/release-modes.schema.json", "schemas/ogc-place-features.schema.json"]) {
  const schema = readJson(schemaFile);

  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    failures.push(`${schemaFile} must use JSON Schema draft 2020-12`);
  }
}

const openapi = readJson("data/openapi.json");
for (const requiredPath of ["/v1/places/index.json", "/v1/adm1/index.json", "/v1/places/{place_id}/adm1.json", "/v1/coverage.json", "/v1/places/{place_id}/neighbors.json", "/ogc/index.json", "/ogc/collections/places/items.json", "/ogc/collections/places/item-index.json", "/ogc/collections/places/items/{place_id}.json", "/data/release-modes.json", "/data/source-freshness.json", "/data/third-party-fetches.json", "/data/accessibility-audit.json", "/data/ui-smoke.json", "/releases/2026-05-31/diff.json", "/releases/2026-05-31/migration.json", "/schemas/place-index.schema.json", "/schemas/adm1-context.schema.json", "/schemas/release-modes.schema.json", "/schemas/ogc-place-features.schema.json"]) {
  if (!openapi.paths?.[requiredPath]) {
    failures.push(`data/openapi.json missing ${requiredPath}`);
  }
}

if (!openapi.paths?.["/data/claims.json"]) {
  failures.push("data/openapi.json missing /data/claims.json");
}

const ogcPlaceFeatures = readJson("ogc/collections/places/items.json");
const ogcItemIndex = readJson("ogc/collections/places/item-index.json");
if (ogcItemIndex.count !== ogcPlaceFeatures.features?.length || ogcItemIndex.items?.length !== ogcPlaceFeatures.features?.length) {
  failures.push("ogc/collections/places/item-index.json count must match full OGC feature collection");
}

if (!ogcItemIndex.items?.some((item) => item.place_id === "IND" && item.item_url === "https://painmaps.org/ogc/collections/places/items/IND.json")) {
  failures.push("ogc/collections/places/item-index.json missing IND item URL");
}

for (const item of ogcItemIndex.items ?? []) {
  const file = `ogc/collections/places/items/${item.place_id}.json`;

  if (!existsSync(absolute(file))) {
    failures.push(`Missing partitioned OGC item file ${file}`);
    continue;
  }

  const feature = readJson(file);
  if (feature.type !== "Feature" || feature.id !== item.place_id || feature.properties?.neighbors_url !== item.neighbors_url) {
    failures.push(`${file} does not match item-index metadata`);
  }

  if (!feature.geometry) {
    failures.push(`${file} missing geometry`);
  }
}

expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /export class PainMapClient/, "TypeScript PainMapClient export");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async placeIndex\(\): Promise<PlaceIndex>/, "typed placeIndex client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async adm1ContextIndex\(\): Promise<Adm1ContextIndex>/, "typed ADM1 context index client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async countryAdm1Context\(/, "typed country ADM1 context client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async releaseModes\(\): Promise<ReleaseModes>/, "typed releaseModes client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async placeNeighbors\(/, "typed placeNeighbors client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async ogcPlaceFeatures\(/, "typed ogcPlaceFeatures client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async ogcPlaceItemIndex\(\)/, "typed OGC item index client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async ogcPlaceFeature\(/, "typed OGC feature item client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /class PainMapClient:/, "Python PainMapClient class");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def adm1_context_index\(/, "Python adm1_context_index client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def country_adm1_context\(/, "Python country_adm1_context client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def release_modes\(/, "Python release_modes client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def place_neighbors\(/, "Python place_neighbors client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def ogc_place_features\(/, "Python ogc_place_features client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def ogc_place_item_index\(/, "Python ogc_place_item_index client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def ogc_place_feature\(/, "Python ogc_place_feature client method");
expectPattern("examples/README.md", read("examples/README.md"), /node examples\/load-place-profile\.mjs IND/, "Node example command");
expectPattern("examples/README.md", read("examples/README.md"), /python3 examples\/load_place_profile\.py IND/, "Python example command");
expectPattern("examples/README.md", read("examples/README.md"), /node examples\/compare-places\.mjs BRA IND/, "place comparison example command");
expectPattern("examples/README.md", read("examples/README.md"), /node examples\/join-own-geography\.mjs examples\/custom-geography\.csv/, "custom geography join example command");
expectPattern("examples/README.md", read("examples/README.md"), /node examples\/cite-release\.mjs 2026-05-31/, "release citation example command");
expectPattern("examples/compare-places.mjs", read("examples/compare-places.mjs"), /source_file_checksum/, "compare example preserves lineage checksum");
expectPattern("examples/join-own-geography.mjs", read("examples/join-own-geography.mjs"), /ogc\/collections\/places\/item-index\.json/, "join example uses OGC item index");
expectPattern("examples/cite-release.mjs", read("examples/cite-release.mjs"), /release_manifest_sha256/, "citation example reports latest manifest checksum");
expectPattern("examples/index.html", read("examples/index.html"), /TechArticle[\s\S]*comparing places, joining local geography, citing releases/, "examples structured data description");
expectPattern("examples/README.md", read("examples/README.md"), /\/ogc\/collections\/places\/items\.json/, "OGC feature example endpoint");
expectPattern("examples/README.md", read("examples/README.md"), /\/ogc\/collections\/places\/item-index\.json/, "OGC item index example endpoint");
expectPattern("examples/README.md", read("examples/README.md"), /\/ogc\/collections\/places\/items\/IND\.json/, "OGC single feature example endpoint");
expectPattern("examples/README.md", read("examples/README.md"), /\/v1\/adm1\/index\.json/, "ADM1 context example endpoint");

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
expectPattern(".well-known/security.txt", securityTxt, /Contact: mailto:security@painmaps\.org/, "confidential security mail contact");
expectPattern(".well-known/security.txt", securityTxt, /Policy: https:\/\/painmaps\.org\/security\//, "security policy URL");

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
  "extraction_timestamp",
  "transform_version",
  "reviewer_status",
  "source_file_checksum",
  "source_file_checksum_algorithm",
  "source_file_checksum_basis",
  "method_note",
  "uncertainty_class",
  "license_id",
];
const placeMeasurementCsvHeader = read("data/place-measurements.csv").split("\n")[0].split(",");

for (const field of requiredMeasurementFields) {
  if (!placeMeasurementCsvHeader.includes(field)) {
    failures.push(`data/place-measurements.csv missing canonical field ${field}`);
  }
}

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

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(measurement.extraction_timestamp)) {
    failures.push(`${measurement.measurement_id} must include an ISO extraction_timestamp`);
  }

  if (!String(measurement.transform_version || "").startsWith("painmap-static-artifacts.measurement-lineage.")) {
    failures.push(`${measurement.measurement_id} must include the measurement lineage transform version`);
  }

  if (measurement.reviewer_status !== "release-reviewed") {
    failures.push(`${measurement.measurement_id} reviewer_status must be release-reviewed`);
  }

  if (!/^[a-f0-9]{64}$/.test(measurement.source_file_checksum || "")) {
    failures.push(`${measurement.measurement_id} source_file_checksum must be a sha256 hex digest`);
  }

  if (measurement.source_file_checksum_algorithm !== "sha256" || !measurement.source_file_checksum_basis) {
    failures.push(`${measurement.measurement_id} must describe source_file_checksum algorithm and basis`);
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

const releaseMigration = readJson("releases/2026-05-31/migration.json");
if (releaseMigration.release_id !== routeManifest.releaseId || releaseMigration.migration_type !== "initial_release_baseline") {
  failures.push("release migration notes must describe the current initial release baseline");
}

if (!Array.isArray(releaseMigration.schema_changes) || !releaseMigration.schema_changes.some((change) => change.surface === "/data/place-measurements.json" && change.fields_added?.includes("source_file_checksum"))) {
  failures.push("release migration notes must document measurement lineage schema changes");
}

if (!Array.isArray(releaseMigration.renamed_fields) || releaseMigration.renamed_fields.length !== 0) {
  failures.push("release migration notes must explicitly record no renamed fields for the initial baseline");
}

if (!releaseMigration.new_layer_ids?.some((layer) => layer.layer_id === "animal-priority-overlay")) {
  failures.push("release migration notes must document new layer IDs");
}

expectPattern("releases/2026-05-31/index.html", read("releases/2026-05-31/index.html"), /Migration[\s\S]*Schema and layer baseline/, "release page migration section");

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
