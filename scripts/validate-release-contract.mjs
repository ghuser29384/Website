import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const schemaTargets = [
  ["schemas/place-index.schema.json", "v1/places/index.json"],
  ["schemas/place-measurements.schema.json", "data/place-measurements.json"],
  ["schemas/coverage.schema.json", "v1/coverage.json"],
];

function absolute(file) {
  return path.join(root, file);
}

function read(file) {
  return readFileSync(absolute(file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function localFileForEndpoint(endpointPath) {
  if (endpointPath === "/") {
    return "index.html";
  }

  if (endpointPath.endsWith("/")) {
    return `${endpointPath.slice(1)}index.html`;
  }

  return endpointPath.replace(/^\//, "");
}

function valueType(value) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (Number.isInteger(value)) {
    return "integer";
  }

  return typeof value;
}

function matchesType(value, expectedType) {
  const actual = valueType(value);

  if (expectedType === "number") {
    return actual === "number" || actual === "integer";
  }

  return actual === expectedType;
}

function validateSchema(schema, value, pointer = "$") {
  if (schema.const !== undefined && value !== schema.const) {
    failures.push(`${pointer} expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    failures.push(`${pointer} expected one of ${schema.enum.join(", ")}`);
  }

  if (schema.type) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];

    if (!expectedTypes.some((type) => matchesType(value, type))) {
      failures.push(`${pointer} expected ${expectedTypes.join(" or ")}, got ${valueType(value)}`);
      return;
    }
  }

  if (schema.minimum !== undefined && typeof value === "number" && value < schema.minimum) {
    failures.push(`${pointer} expected minimum ${schema.minimum}`);
  }

  if (schema.required && value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required) {
      if (!(key in value)) {
        failures.push(`${pointer} missing required property ${key}`);
      }
    }
  }

  if (schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (key in value) {
        validateSchema(childSchema, value[key], `${pointer}.${key}`);
      }
    }
  }

  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => validateSchema(schema.items, item, `${pointer}[${index}]`));
  }
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(absolute(file))).digest("hex");
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

for (const [schemaFile, dataFile] of schemaTargets) {
  expect(existsSync(absolute(schemaFile)), `Missing schema ${schemaFile}`);
  expect(existsSync(absolute(dataFile)), `Missing schema target ${dataFile}`);

  if (existsSync(absolute(schemaFile)) && existsSync(absolute(dataFile))) {
    validateSchema(readJson(schemaFile), readJson(dataFile), dataFile);
  }
}

const placeIndex = readJson("v1/places/index.json");
const measurements = readJson("data/place-measurements.json");
const releaseManifest = readJson("releases/2026-05-31/manifest.json");
const endpointSmoke = readJson("data/endpoint-smoke.json");
const measurementRowsByPlace = new Map();

for (const row of measurements.measurements) {
  const rows = measurementRowsByPlace.get(row.place_id) || [];
  rows.push(row);
  measurementRowsByPlace.set(row.place_id, rows);
}

for (const item of placeIndex.items) {
  const rows = measurementRowsByPlace.get(item.place_id) || [];

  expect(
    item.canonical_measurement_count === rows.length,
    `v1/places/index.json measurement count mismatch for ${item.place_id}`
  );

  if (rows.length > 0) {
    expect(item.coverage_status === "canonical_measurements", `${item.place_id} should be canonical_measurements`);
    expect(Boolean(item.profile_url), `${item.place_id} missing profile_url`);
    expect(Boolean(item.measurements_url), `${item.place_id} missing measurements_url`);
    expect(existsSync(absolute(`v1/places/${item.place_id}.json`)), `${item.place_id} profile JSON missing`);
    expect(
      existsSync(absolute(`v1/places/${item.place_id}/measurements.json`)),
      `${item.place_id} measurements JSON missing`
    );
    continue;
  }

  expect(item.coverage_status === "boundary_index_only", `${item.place_id} without rows should be boundary_index_only`);
}

for (const endpoint of endpointSmoke.endpoints) {
  expect(endpoint.method === "GET", `${endpoint.path} smoke endpoint must be GET`);
  expect(endpoint.expected_status === 200, `${endpoint.path} smoke endpoint must expect 200`);

  const file = localFileForEndpoint(endpoint.path);
  expect(existsSync(absolute(file)), `${endpoint.path} smoke endpoint points to missing file ${file}`);

  if (!existsSync(absolute(file))) {
    continue;
  }

  const size = statSync(absolute(file)).size;
  expect(size > 0, `${endpoint.path} smoke endpoint file is empty`);

  if (endpoint.format.includes("json")) {
    try {
      JSON.parse(read(file));
    } catch (error) {
      failures.push(`${endpoint.path} smoke endpoint is not valid JSON: ${error.message}`);
    }
  }

  if (endpoint.format === "text/html") {
    expect(/<!doctype html>/i.test(read(file)), `${endpoint.path} smoke endpoint is not an HTML document`);
  }

  if (endpoint.path === "/.well-known/security.txt") {
    const body = read(file);
    expect(/Canonical: https:\/\/painmap\.org\/\.well-known\/security\.txt/.test(body), "security.txt missing canonical URL");
    expect(/Expires: \d{4}-\d{2}-\d{2}T/.test(body), "security.txt missing machine-readable expiry");
  }
}

for (const artifact of releaseManifest.artifacts ?? []) {
  const file = artifact.path.replace(/^\//, "");

  if (!existsSync(absolute(file))) {
    failures.push(`Release manifest artifact missing: ${artifact.path}`);
    continue;
  }

  expect(artifact.bytes === statSync(absolute(file)).size, `Release manifest byte mismatch for ${artifact.path}`);
  expect(artifact.sha256 === sha256(file), `Release manifest sha256 mismatch for ${artifact.path}`);
}

for (const requiredArtifact of [
  "/v1/places/index.json",
  "/v1/coverage.json",
  "/schemas/place-index.schema.json",
  "/schemas/place-measurements.schema.json",
  "/schemas/coverage.schema.json",
  "/data/endpoint-smoke.json",
  "/data/performance-budgets.json",
  "/data/analytics-events.json",
]) {
  expect(
    releaseManifest.artifacts?.some((artifact) => artifact.path === requiredArtifact),
    `Release manifest missing ${requiredArtifact}`
  );
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Release contract validation passed for ${schemaTargets.length} schemas and ${endpointSmoke.endpoints.length} smoke endpoints.`);
