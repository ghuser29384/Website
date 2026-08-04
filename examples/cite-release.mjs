const releaseDate = process.argv[2] || "2026-05-31";
const baseUrl = process.env.PAINMAP_BASE_URL || "https://painmaps.org";
const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

function endpoint(path) {
  return new URL(path.replace(/^\//, ""), base).href;
}

async function fetchJson(path) {
  const response = await fetch(endpoint(path));

  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}`);
  }

  return response.json();
}

const [manifest, latest] = await Promise.all([
  fetchJson(`/releases/${encodeURIComponent(releaseDate)}/manifest.json`),
  fetchJson("/latest/manifest.json"),
]);

const manifestUrl = `${base.origin}/releases/${releaseDate}/manifest.json`;
const releaseUrl = `${base.origin}/releases/${releaseDate}/`;
const manifestSha = latest.release_manifest_url === manifestUrl ? latest.release_manifest_sha256 : "verify from /latest/manifest.json";

console.log("Suggested citation");
console.log(
  `PainMap. ${manifest.release_id} static atlas release. Generated ${manifest.generated_at}. ${releaseUrl}`
);
console.log("");
console.log("Machine-verifiable release details");
console.log(`- Release ID: ${manifest.release_id}`);
console.log(`- Immutable release URL: ${releaseUrl}`);
console.log(`- Manifest URL: ${manifestUrl}`);
console.log(`- Manifest SHA-256: ${manifestSha}`);
console.log(`- Artifact count: ${manifest.artifacts.length}`);
console.log("");
console.log("Reuse note");
console.log(
  "Carry release_id, source_ids, source_vintage, extraction_timestamp, transform_version, reviewer_status, source_file_checksum, evidence_kind, uncertainty_class, confidence bounds, license_id, and attribution with copied values."
);
