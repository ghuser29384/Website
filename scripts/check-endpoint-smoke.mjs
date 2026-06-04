import { readFileSync } from "node:fs";

const baseUrl = process.env.PAINMAP_SMOKE_BASE_URL || "http://127.0.0.1:4173";
const requestTimeoutMs = Number(process.env.PAINMAP_SMOKE_TIMEOUT_MS || 5000);
const requestAttempts = Number(process.env.PAINMAP_SMOKE_ATTEMPTS || 4);
const releaseSmoke = JSON.parse(readFileSync("data/endpoint-smoke.json", "utf8"));
const base = new URL(baseUrl);
const failures = [];

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
  }

  if (endpoint.path === "/places/") {
    expect(text.includes("Coverage today"), "/places/ must include coverage status copy");
    expect(text.includes("/v1/places/index.json"), "/places/ must link to the place index");
  }

  if (endpoint.path === "/compare/") {
    expect(text.includes("id=\"compare-requested-list\""), "/compare/ must include URL-requested place list");
  }

  if (endpoint.path === "/examples/") {
    expect(text.includes("Load a place profile"), "/examples/ must include place-profile recipe copy");
  }

  if (endpoint.path === "/.well-known/security.txt") {
    expect(text.includes("Contact:"), "/.well-known/security.txt must include Contact");
    expect(text.includes("Expires:"), "/.well-known/security.txt must include Expires");
    expect(text.includes("Canonical: https://painmap.org/.well-known/security.txt"), "/.well-known/security.txt must include Canonical");
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
