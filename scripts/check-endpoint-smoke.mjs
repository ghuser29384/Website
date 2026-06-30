import { readFileSync } from "node:fs";

const baseUrl = process.env.PAINMAP_SMOKE_BASE_URL || "http://127.0.0.1:4173";
const requestTimeoutMs = Number(process.env.PAINMAP_SMOKE_TIMEOUT_MS || 5000);
const requestAttempts = Number(process.env.PAINMAP_SMOKE_ATTEMPTS || 4);
const releaseSmoke = JSON.parse(readFileSync("data/endpoint-smoke.json", "utf8"));
const routeManifest = JSON.parse(readFileSync("data/routes.json", "utf8"));
const base = new URL(baseUrl);
const expectedIssueTracker = "https://github.com/ghuser29384/Website/issues/new";
const failures = [];

const routePaths = new Set(Array.isArray(routeManifest.routes) ? routeManifest.routes.map((route) => route.path) : []);

if (!base.pathname.endsWith("/")) {
  base.pathname = `${base.pathname}/`;
}

function endpointUrl(path) {
  return new URL(path.replace(/^\//, ""), base).href;
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function parseJson(endpoint, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`${endpoint.path} did not return parseable JSON: ${error.message}`);
    return null;
  }
}

function validateJsonEndpoint(endpoint, json) {
  if (!json) {
    return;
  }

  if (endpoint.path === "/data/openapi.json") {
    expect(json.openapi === "3.1.0", "/data/openapi.json must be OpenAPI 3.1.0");
  }

  if (endpoint.path === "/data/source-snapshots.json") {
    expect(Array.isArray(json.source_snapshots), "/data/source-snapshots.json must include source_snapshots");
    expect(Boolean(json.release_id), "/data/source-snapshots.json must include release_id");
    expect(typeof json.release_date === "string", "/data/source-snapshots.json must include release_date");
    expect(
      Array.isArray(json.source_snapshots) && json.source_snapshots.every((entry) => entry?.source_snapshot_id && entry?.source_id),
      "/data/source-snapshots.json entries must include source_snapshot_id and source_id"
    );
  }

  if (endpoint.path === "/data/country-gap-ledger.json") {
    expect(Array.isArray(json.countries), "/data/country-gap-ledger.json must include countries");
    expect(json.summary?.country_count === json.countries.length, "/data/country-gap-ledger.json country_count must match number of rows");
    expect(Number.isFinite(json.summary?.canonical_country_profiles), "/data/country-gap-ledger.json must include canonical_country_profiles summary");
  }

  if (endpoint.path === "/data/country-profile-input-spec.json") {
    expect(Array.isArray(json?.coverage_gate?.minimum_inputs), "/data/country-profile-input-spec.json must include minimum_inputs");
    expect(Array.isArray(json?.coverage_gate?.eligible_input_groups), "/data/country-profile-input-spec.json must include eligible_input_groups");
    expect(Array.isArray(json?.coverage_gate?.blocked_input_groups), "/data/country-profile-input-spec.json must include blocked_input_groups");
    expect(Boolean(json.release_id), "/data/country-profile-input-spec.json must include release_id");
  }

  if (endpoint.path === "/schemas/source-snapshot.schema.json") {
    expect(json.title === "PainMap source snapshot registry", "/schemas/source-snapshot.schema.json title mismatch");
    expect(json.type === "object", "/schemas/source-snapshot.schema.json must declare object type");
  }

  if (endpoint.path === "/schemas/country-gap-ledger.schema.json") {
    expect(json.title === "PainMap country gap ledger", "/schemas/country-gap-ledger.schema.json title mismatch");
    expect(json.type === "object", "/schemas/country-gap-ledger.schema.json must declare object type");
  }

  if (endpoint.path === "/data/dcat.json") {
    expect(Boolean(json["@context"] || json["@type"]), "/data/dcat.json must be a DCAT/JSON-LD document");
  }

  if (endpoint.path === "/data/release-modes.json") {
    expect(json.default_mode === "snapshot", "/data/release-modes.json must default to snapshot");
  }

  if (endpoint.path === "/data/source-freshness.json") {
    expect(Number.isFinite(json.source_count), "/data/source-freshness.json must publish source_count");
    expect(json.schedule?.release_candidate_prs === true, "/data/source-freshness.json must enable release-candidate PR workflow");
    expect(Array.isArray(json.validation_lanes), "/data/source-freshness.json must include validation_lanes");
  }

  if (endpoint.path === "/data/third-party-fetches.json") {
    expect(json.default_network_collection === false, "/data/third-party-fetches.json must disable default network collection");
    expect(
      json.snapshot_mode_client_upstream_fetches === false,
      "/data/third-party-fetches.json must mark snapshot mode as no client upstream fetches"
    );
    expect(
      json.domains?.some((entry) => entry.domain === "api.worldbank.org"),
      "/data/third-party-fetches.json must document World Bank fetch behavior"
    );
    expect(
      json.domains?.some((entry) => entry.domain === "api.worldpop.org"),
      "/data/third-party-fetches.json must document WorldPop fetch behavior"
    );
  }

  if (endpoint.path === "/data/accessibility-audit.json") {
    expect(json.standard === "wcag_2_2_aa_audit_matrix", "/data/accessibility-audit.json must publish WCAG audit matrix standard");
    expect(json.target_conformance === "WCAG 2.2 AA", "/data/accessibility-audit.json must target WCAG 2.2 AA");
    expect(
      json.route_matrix?.some((route) => route.path === "/compare/"),
      "/data/accessibility-audit.json must cover compare route"
    );
    expect(
      json.open_items?.some((item) => /NVDA/.test(item)),
      "/data/accessibility-audit.json must track NVDA follow-up before a conformance claim"
    );
  }

  if (endpoint.path === "/data/ui-smoke.json") {
    expect(json.release_id === releaseSmoke.release_id, "/data/ui-smoke.json release_id mismatch");
    expect(json.standard === "static_accessibility_visual_smoke", "/data/ui-smoke.json must publish the UI smoke standard");
    expect(Array.isArray(json.routes), "/data/ui-smoke.json must include route contracts");
    expect(json.routes?.some((route) => route.path === "/" && route.accessibility?.required_ids?.includes("country-search")), "/data/ui-smoke.json must cover homepage search accessibility");
  }

  if (endpoint.path === "/data/claims.json") {
    const claims = Array.isArray(json?.claims) ? json.claims : [];
    const claimIds = new Set();

    expect(Number.isFinite(json.count), "/data/claims.json must publish claim count");
    expect(json.count === claims.length, "/data/claims.json count must match claims length");
    expect(json.release_id === releaseSmoke.release_id, "/data/claims.json release_id mismatch");

    for (const claim of claims) {
      expect(Boolean(claim?.claim_id), "/data/claims.json claim_id must be present");
      expect(Boolean(claim?.release_id === releaseSmoke.release_id), `/data/claims.json claim release_id mismatch for ${claim?.claim_id || "missing claim id"}`);
      expect(["route", "place", "adm1-place"].includes(claim?.subject_type), `/data/claims.json must use a supported claim subject_type for ${claim?.claim_id || "missing claim id"}`);
      expect(Boolean(claim?.subject_id), `/data/claims.json claim must include subject_id for ${claim?.claim_id || "missing claim id"}`);
      expect(Boolean(claim?.subject_label), `/data/claims.json claim must include subject_label for ${claim?.claim_id || "missing claim id"}`);
      expect(typeof claim?.route === "string", `/data/claims.json claim must include route for ${claim?.claim_id || "missing claim id"}`);
      expect(Boolean(claim?.coverage_status), `/data/claims.json claim must include coverage_status for ${claim?.claim_id || "missing claim id"}`);
      expect(Boolean(claim?.context), `/data/claims.json claim must include context for ${claim?.claim_id || "missing claim id"}`);
      expect(typeof claim?.correction_url === "string", `/data/claims.json correction_url must be a string for ${claim?.claim_id || "missing claim id"}`);
      expect(claim?.correction_url?.startsWith(expectedIssueTracker), `/data/claims.json correction_url must use configured issue tracker for ${claim?.claim_id || "missing claim id"}`);

      expect(!claimIds.has(claim.claim_id), `/data/claims.json claim_id must be unique: ${claim.claim_id}`);
      claimIds.add(claim.claim_id);

      if (claim.subject_type === "route") {
        expect(routePaths.has(claim.route), `/data/claims.json route subject must point to a known route: ${claim.route}`);
      }

      if (claim.subject_type === "place") {
        expect(claim.route === `/place/${claim.subject_id}/`, `/data/claims.json place claim route must match canonical place URL for ${claim.claim_id}`);
      }

      if (claim.subject_type === "adm1-place") {
        expect(
          claim.route.includes("/place/") && claim.route.includes("/adm1/"),
          `/data/claims.json adm1-place claim route must be an ADM1 context URL for ${claim.claim_id}`
        );
        expect(routePaths.has(claim.route), `/data/claims.json adm1-place route must point to a known route: ${claim.route}`);
      }
    }
  }

  if (endpoint.path === "/v1/places/index.json") {
    expect(json.count === json.items?.length, "/v1/places/index.json count must match item length");
    expect(json.items?.some((item) => item.place_id === "IND"), "/v1/places/index.json must include IND");
  }

  if (endpoint.path === "/v1/adm1/index.json") {
    expect(json.coverage_status === "adm1_context_overlay", "/v1/adm1/index.json must label ADM1 context coverage");
    expect(json.count === json.items?.length, "/v1/adm1/index.json count must match item length");
  }

  if (endpoint.path === "/v1/coverage.json") {
    expect(Number.isFinite(json.coverage_status?.places_indexed), "/v1/coverage.json must publish place coverage count");
    expect(Array.isArray(json.known_sparse_areas), "/v1/coverage.json must publish known sparse areas");
  }

  if (endpoint.path === "/ogc/collections/places/items.json") {
    expect(json.type === "FeatureCollection", "/ogc/collections/places/items.json must be a FeatureCollection");
    expect(Array.isArray(json.features), "/ogc/collections/places/items.json must include features");
  }

  if (endpoint.path === "/ogc/collections/places/item-index.json") {
    expect(json.count === json.items?.length, "/ogc/collections/places/item-index.json count must match item length");
    expect(
      json.items?.some((item) => item.place_id === "IND" && item.item_url?.endsWith("/ogc/collections/places/items/IND.json")),
      "/ogc/collections/places/item-index.json must include IND item URL"
    );
  }

  if (endpoint.path === "/ogc/collections/places/items/IND.json") {
    expect(json.type === "Feature", "/ogc/collections/places/items/IND.json must be a Feature");
    expect(json.id === "IND", "/ogc/collections/places/items/IND.json must have id IND");
    expect(Boolean(json.geometry), "/ogc/collections/places/items/IND.json must include geometry");
  }

  if (endpoint.path === "/releases/2026-05-31/manifest.json") {
    expect(json.release_id === releaseSmoke.release_id, "/releases/2026-05-31/manifest.json release_id mismatch");
    expect(Array.isArray(json.artifacts), "/releases/2026-05-31/manifest.json must include artifacts");
  }

  if (endpoint.path === "/releases/2026-05-31/diff.json") {
    expect(json.release_id === releaseSmoke.release_id, "/releases/2026-05-31/diff.json release_id mismatch");
    expect(
      json.human_readable_url?.endsWith("/releases/2026-05-31/changes/"),
      "/releases/2026-05-31/diff.json must link human-readable changes"
    );
  }

  if (endpoint.path === "/releases/2026-05-31/migration.json") {
    expect(json.release_id === releaseSmoke.release_id, "/releases/2026-05-31/migration.json release_id mismatch");
    expect(json.migration_type === "initial_release_baseline", "/releases/2026-05-31/migration.json must mark initial baseline");
    expect(Array.isArray(json.schema_changes), "/releases/2026-05-31/migration.json must include schema_changes");
    expect(Array.isArray(json.new_layer_ids), "/releases/2026-05-31/migration.json must include new_layer_ids");
  }
}

function validateTextEndpoint(endpoint, text) {
  if (endpoint.format === "text/html") {
    expect(/<!doctype html>/i.test(text), `${endpoint.path} must return HTML`);
    expect(/<main\b/i.test(text), `${endpoint.path} must include a main landmark`);
  }

  if (endpoint.path === "/") {
    expect(text.includes("Mixed-evidence atlas of pain sources by place"), "/ must include homepage title copy");
    expect(text.includes("Full place index"), "/ must include coverage module copy");
    expect(text.includes("id=\"atlas-layer-rail\""), "/ must include the persistent atlas layer rail");
    expect(text.includes("id=\"atlas-layer-source-count\""), "/ must expose atlas layer source count");
  }

  if (endpoint.path === "/places/") {
    expect(text.includes("Coverage today"), "/places/ must include coverage status copy");
    expect(text.includes("/v1/places/index.json"), "/places/ must link to the place index");
  }

  if (endpoint.path === "/compare/") {
    expect(text.includes("id=\"compare-requested-list\""), "/compare/ must include URL-requested place list");
  }

  if (endpoint.path === "/examples/") {
    expect(text.includes("Run static-data recipes"), "/examples/ must include the recipe command panel");
    expect(text.includes("compare-places.mjs"), "/examples/ must include the place comparison recipe");
    expect(text.includes("join-own-geography.mjs"), "/examples/ must include the custom geography join recipe");
    expect(text.includes("cite-release.mjs"), "/examples/ must include the release citation recipe");
  }

  if (endpoint.path === "/releases/2026-05-31/changes/") {
    expect(text.includes("Human-readable release changes"), "/releases/2026-05-31/changes/ must include changes title");
    expect(text.includes("What changed"), "/releases/2026-05-31/changes/ must include notable changes section");
    expect(text.includes("/releases/2026-05-31/diff.json"), "/releases/2026-05-31/changes/ must link diff JSON");
  }

  if (endpoint.path === "/policies/accessibility/audit-2026-06-05/") {
    expect(text.includes("WCAG audit matrix"), "/policies/accessibility/audit-2026-06-05/ must include audit title");
    expect(
      text.includes("No full WCAG conformance claim"),
      "/policies/accessibility/audit-2026-06-05/ must avoid overclaiming conformance"
    );
    expect(
      text.includes("VoiceOver-and-NVDA-required-before-conformance-claim"),
      "/policies/accessibility/audit-2026-06-05/ must expose screen-reader follow-up status"
    );
  }

  if (endpoint.path === "/offline.html") {
    expect(text.includes("PainMap is offline"), "/offline.html must render offline copy");
    expect(text.includes('meta http-equiv="refresh"'), "/offline.html should expose retry refresh behavior");
    expect(text.includes('href="/"'), "/offline.html should offer home navigation");
    expect(text.includes('href="/places/"'), "/offline.html should offer cached places path");
    expect(text.includes('href="/compare/"'), "/offline.html should offer compare path fallback");
    expect(text.includes('href="/v1/coverage.json"'), "/offline.html should link to coverage data");
    expect(!/script\s+(type="module"|src=)/i.test(text), "/offline.html should not depend on scripts for offline rendering");
  }

  if (endpoint.path === "/service-worker.js") {
    expect(text.includes("CACHE_VERSION"), "/service-worker.js must define a cache version");
    expect(text.includes("OFFLINE_FALLBACK"), "/service-worker.js must define offline fallback path");
    expect(text.includes('self.addEventListener("install"'), "/service-worker.js must register install handler");
    expect(text.includes('self.addEventListener("activate"'), "/service-worker.js must register activate handler");
    expect(text.includes('self.addEventListener("fetch"'), "/service-worker.js must register fetch handler");
    expect(text.includes("staleWhileRevalidate"), "/service-worker.js must implement stale-while-revalidate data strategy");
    expect(text.includes("networkFirst"), "/service-worker.js must use network-first strategy for navigation");
  }

  if (endpoint.path === "/.well-known/security.txt") {
    expect(text.includes("Contact:"), "/.well-known/security.txt must include Contact");
    expect(text.includes("Expires:"), "/.well-known/security.txt must include Expires");
    expect(text.includes("Canonical: https://painmap.org/.well-known/security.txt"), "/.well-known/security.txt must include Canonical");
  }

  if (endpoint.path === "/data/country-gap-ledger.csv") {
    const rows = text.split("\n").filter(Boolean);
    expect(rows.length > 1, "/data/country-gap-ledger.csv must include headers and rows");
  }

  if (endpoint.path === "/clients/typescript/painmap-client.ts") {
    expect(text.includes("export class PainMapClient"), "TypeScript client must export PainMapClient");
  }

  if (endpoint.path === "/clients/python/painmap_client.py") {
    expect(text.includes("class PainMapClient"), "Python client must define PainMapClient");
  }
}

async function fetchWithRetry(endpoint) {
  const url = endpointUrl(endpoint.path);
  let lastError = null;

  for (let attempt = 1; attempt <= requestAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch(url, { method: endpoint.method || "GET", signal: controller.signal });
      const text = await response.text();
      return { response, text, url };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < requestAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`${endpoint.path} could not be fetched from ${url}: ${lastError?.message || "unknown error"}`);
}

for (const endpoint of releaseSmoke.endpoints ?? []) {
  try {
    const { response, text, url } = await fetchWithRetry(endpoint);

    expect(
      response.status === endpoint.expected_status,
      `${endpoint.path} expected ${endpoint.expected_status}, got ${response.status} from ${url}`
    );

    if (response.status !== endpoint.expected_status) {
      continue;
    }

    if (endpoint.format.includes("json")) {
      validateJsonEndpoint(endpoint, parseJson(endpoint, text));
    } else {
      validateTextEndpoint(endpoint, text);
    }
  } catch (error) {
    failures.push(error.message);
  }
}

if (failures.length) {
  console.error("Endpoint smoke check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Endpoint smoke check passed for ${releaseSmoke.endpoints.length} endpoints against ${base.href}`);
