import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const outputDir = path.resolve(root, "tmp/preview-release");
const registry = readJson("fixtures/mock-registry.json");
const measurements = readJson("fixtures/place-measurements.fixture.json");
const failures = [];

function absolute(file) {
  return path.join(root, file);
}

function readJson(file) {
  return JSON.parse(readFileSync(absolute(file), "utf8"));
}

function ensureParent(file) {
  mkdirSync(path.dirname(file), { recursive: true });
}

function writeText(file, value) {
  ensureParent(file);
  writeFileSync(file, value);
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  failures.push(message);
}

function validateFixtureInputs() {
  const placeIds = new Set(registry.places?.map((place) => place.place_id));
  const layerIds = new Set(registry.layers?.map((layer) => layer.layer_id));
  const sourceIds = new Set(registry.sources?.map((source) => source.source_id));
  const licenseIds = new Set(registry.licenses?.map((license) => license.license_id));

  if (!registry.release_id || registry.release_id !== measurements.build?.release_id) {
    fail("fixture registry and measurement build release_id must match");
  }

  for (const collectionName of ["places", "layers", "sources", "licenses", "routes"]) {
    if (!Array.isArray(registry[collectionName]) || registry[collectionName].length === 0) {
      fail(`fixtures/mock-registry.json must include ${collectionName}`);
    }
  }

  if (!Array.isArray(measurements.measurements) || measurements.measurements.length < 2) {
    fail("fixtures/place-measurements.fixture.json must include at least two measurements");
  }

  for (const row of measurements.measurements ?? []) {
    if (!row.measurement_id?.startsWith(`${registry.release_id}:`)) {
      fail(`${row.measurement_id || "(missing measurement_id)"} must start with ${registry.release_id}:`);
    }

    if (!placeIds.has(row.place_id)) {
      fail(`${row.measurement_id} references unknown place ${row.place_id}`);
    }

    if (!layerIds.has(row.layer_id)) {
      fail(`${row.measurement_id} references unknown layer ${row.layer_id}`);
    }

    for (const sourceId of row.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) {
        fail(`${row.measurement_id} references unknown source ${sourceId}`);
      }
    }

    if (!licenseIds.has(row.license_id)) {
      fail(`${row.measurement_id} references unknown license ${row.license_id}`);
    }

    if (!Number.isFinite(row.raw_value) || !Number.isFinite(row.rank_value)) {
      fail(`${row.measurement_id} must include numeric raw_value and rank_value`);
    }

    if (row.confidence_low > row.confidence_high) {
      fail(`${row.measurement_id} confidence_low must be <= confidence_high`);
    }

    if (!/^[a-f0-9]{64}$/.test(row.source_file_checksum || "")) {
      fail(`${row.measurement_id} must include a sha256 source_file_checksum`);
    }
  }
}

function placeIndex() {
  const rowsByPlace = new Map();

  for (const row of measurements.measurements) {
    rowsByPlace.set(row.place_id, (rowsByPlace.get(row.place_id) ?? 0) + 1);
  }

  const items = registry.places.map((place) => ({
    ...place,
    latest_release_id: registry.release_id,
    canonical_measurement_count: rowsByPlace.get(place.place_id) ?? 0,
    profile_url: place.place_id === "TST" ? "/v1/places/TST.json" : null,
    page_url: null,
  }));

  return {
    release_id: registry.release_id,
    generated_at: registry.generated_at,
    count: items.length,
    items,
  };
}

function placeProfile(placeId) {
  const place = registry.places.find((entry) => entry.place_id === placeId);
  const rows = measurements.measurements.filter((row) => row.place_id === placeId);

  return {
    release_id: registry.release_id,
    generated_at: registry.generated_at,
    place,
    measurements: rows,
    links: [
      { rel: "place-index", href: "/v1/places/index.json" },
      { rel: "measurements", href: "/data/place-measurements.json" },
    ],
  };
}

function previewFiles() {
  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PainMap Preview Fixture</title>
  </head>
  <body>
    <main id="main-content">
      <h1>PainMap Preview Fixture</h1>
      <p>Small local preview release for fixture-driven development.</p>
      <ul>
        <li><a href="/data/place-measurements.json">Fixture measurements</a></li>
        <li><a href="/v1/places/index.json">Fixture place index</a></li>
        <li><a href="/v1/places/TST.json">Testland profile</a></li>
      </ul>
    </main>
  </body>
</html>
`;

  return new Map([
    ["index.html", indexHtml],
    ["data/place-measurements.json", `${JSON.stringify(measurements, null, 2)}\n`],
    ["v1/places/index.json", `${JSON.stringify(placeIndex(), null, 2)}\n`],
    ["v1/places/TST.json", `${JSON.stringify(placeProfile("TST"), null, 2)}\n`],
  ]);
}

function manifest(files) {
  return {
    release_id: registry.release_id,
    generated_at: registry.generated_at,
    preview_only: true,
    source_fixture_files: ["fixtures/mock-registry.json", "fixtures/place-measurements.fixture.json"],
    artifacts: [...files.entries()].map(([file, contents]) => ({
      path: `/${file}`,
      sha256: sha256Text(contents),
      bytes: Buffer.byteLength(contents),
    })),
  };
}

function writePreviewRelease() {
  const files = previewFiles();
  const releaseManifest = manifest(files);
  files.set("releases/preview/manifest.json", `${JSON.stringify(releaseManifest, null, 2)}\n`);

  for (const [file, contents] of files.entries()) {
    writeText(path.join(outputDir, file), contents);
  }

  console.log(`Wrote preview fixture release to ${path.relative(root, outputDir)}`);
  console.log(`Artifacts: ${files.size}`);
}

validateFixtureInputs();

if (failures.length) {
  console.error("Preview fixture validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (checkOnly) {
  console.log(`Preview fixture check passed for ${measurements.measurements.length} measurements and ${registry.places.length} places.`);
} else {
  writePreviewRelease();
}
