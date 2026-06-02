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
  "data/analytics-events.json",
  "data/performance-budgets.json",
  "data/endpoint-smoke.json",
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
  "ogc/collections/places/items.json",
  "clients/typescript/painmap-client.ts",
  "clients/python/painmap_client.py",
  "examples/README.md",
  "examples/load-place-profile.mjs",
  "examples/load_place_profile.py",
  "schemas/place-index.schema.json",
  "schemas/adm1-context.schema.json",
  "schemas/place-measurements.schema.json",
  "schemas/coverage.schema.json",
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
  expectPattern(file, html, /<meta property="og:image" content="https:\/\/painmap\.org\/assets\/social-card\.svg">/, "og:image metadata");
  expectPattern(file, html, /<meta name="twitter:card" content="summary_large_image">/, "twitter card metadata");
  expectPattern(file, html, /<meta name="twitter:image" content="https:\/\/painmap\.org\/assets\/social-card\.svg">/, "twitter image metadata");
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

const script = read("script.js");
expectPattern("script.js", script, /recordTelemetry\("route_view"\)/, "route_view telemetry instrumentation");
expectPattern("script.js", script, /recordTelemetry\("atlas_place_selected"/, "atlas_place_selected telemetry instrumentation");
expectPattern("script.js", script, /PerformanceObserver/, "field performance observer instrumentation");
expectPattern("script.js", script, /TELEMETRY_ENDPOINT = document\.documentElement\.dataset\.telemetryEndpoint \|\| ""/, "no default telemetry collector");
expectPattern("index.html", home, /id="country-search"[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"[\s\S]*?aria-expanded="false"[\s\S]*?aria-controls="country-options"/, "APG-style country search combobox input");
expectPattern("index.html", home, /id="country-options"[\s\S]*?role="listbox"/, "country search listbox");
expectPattern("script.js", script, /countrySearchInput\.setAttribute\("aria-expanded", "true"\)/, "combobox expanded state on input");
expectPattern("script.js", script, /countrySearchInput\.setAttribute\("aria-expanded", "false"\)/, "combobox collapsed state on input");
expectPattern("script.js", script, /countrySearchInput\.setAttribute\("aria-activedescendant", activeOption\.id\)/, "combobox active descendant management");
expectPattern("script.js", script, /scrollIntoView\(\{ block: "nearest" \}\)/, "combobox active option scroll management");
expectPattern("script.js", script, /setSearchStatus\(`\$\{currentCountrySearchOptions\.length\} results available\.`\)/, "combobox result count status announcement");
expectPattern("index.html", home, /id="compare-place-link" href="\/compare\/\?places=WLD"/, "homepage compare place CTA");
expectPattern("index.html", home, /id="map-provenance-tray"/, "homepage map provenance tray");
expectPattern("index.html", home, /swatch-boundary-only/, "non-color boundary-only legend cue");
expectPattern("script.js", script, /boundary-index-hatch/, "map boundary-only hatch pattern");
expectPattern("script.js", script, /countryMapCoverage/, "map coverage class helper");
expectPattern("styles.css", read("styles.css"), /\.country-path\.is-boundary-only/, "boundary-only map uncertainty styling");
expectPattern("styles.css", read("styles.css"), /\.province-path[\s\S]*stroke-dasharray/, "province proxy dash styling");
expectPattern("compare/index.html", read("compare/index.html"), /id="compare-requested-list"/, "compare URL requested-place list");
expectPattern(
  "compare/index.html",
  read("compare/index.html"),
  new RegExp(`<script type="module" src="\\.\\./compare\\.js" integrity="${escapeRegExp(compareScriptSri)}" crossorigin="anonymous"></script>`),
  "current compare.js SRI"
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

const endpointSmoke = readJson("data/endpoint-smoke.json");
for (const requiredPath of ["/", "/places/", "/data/openapi.json", "/data/dcat.json", "/data/release-modes.json", "/v1/places/index.json", "/v1/adm1/index.json", "/v1/places/IND/adm1.json", "/v1/places/BRA/neighbors.json", "/ogc/index.json", "/ogc/collections/places/items.json", "/releases/2026-05-31/manifest.json", "/releases/2026-05-31/diff.json", "/.well-known/security.txt"]) {
  if (!endpointSmoke.endpoints?.some((entry) => entry.path === requiredPath && entry.expected_status === 200)) {
    failures.push(`data/endpoint-smoke.json missing required endpoint ${requiredPath}`);
  }
}

for (const schemaFile of ["schemas/place-index.schema.json", "schemas/adm1-context.schema.json", "schemas/place-measurements.schema.json", "schemas/coverage.schema.json", "schemas/release-modes.schema.json", "schemas/ogc-place-features.schema.json"]) {
  const schema = readJson(schemaFile);

  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    failures.push(`${schemaFile} must use JSON Schema draft 2020-12`);
  }
}

const openapi = readJson("data/openapi.json");
for (const requiredPath of ["/v1/places/index.json", "/v1/adm1/index.json", "/v1/places/{place_id}/adm1.json", "/v1/coverage.json", "/v1/places/{place_id}/neighbors.json", "/ogc/index.json", "/ogc/collections/places/items.json", "/data/release-modes.json", "/releases/2026-05-31/diff.json", "/schemas/place-index.schema.json", "/schemas/adm1-context.schema.json", "/schemas/release-modes.schema.json", "/schemas/ogc-place-features.schema.json"]) {
  if (!openapi.paths?.[requiredPath]) {
    failures.push(`data/openapi.json missing ${requiredPath}`);
  }
}

expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /export class PainMapClient/, "TypeScript PainMapClient export");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async placeIndex\(\): Promise<PlaceIndex>/, "typed placeIndex client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async adm1ContextIndex\(\): Promise<Adm1ContextIndex>/, "typed ADM1 context index client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async countryAdm1Context\(/, "typed country ADM1 context client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async releaseModes\(\): Promise<ReleaseModes>/, "typed releaseModes client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async placeNeighbors\(/, "typed placeNeighbors client method");
expectPattern("clients/typescript/painmap-client.ts", read("clients/typescript/painmap-client.ts"), /async ogcPlaceFeatures\(/, "typed ogcPlaceFeatures client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /class PainMapClient:/, "Python PainMapClient class");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def adm1_context_index\(/, "Python adm1_context_index client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def country_adm1_context\(/, "Python country_adm1_context client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def release_modes\(/, "Python release_modes client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def place_neighbors\(/, "Python place_neighbors client method");
expectPattern("clients/python/painmap_client.py", read("clients/python/painmap_client.py"), /def ogc_place_features\(/, "Python ogc_place_features client method");
expectPattern("examples/README.md", read("examples/README.md"), /node examples\/load-place-profile\.mjs IND/, "Node example command");
expectPattern("examples/README.md", read("examples/README.md"), /python3 examples\/load_place_profile\.py IND/, "Python example command");
expectPattern("examples/README.md", read("examples/README.md"), /\/ogc\/collections\/places\/items\.json/, "OGC feature example endpoint");
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
