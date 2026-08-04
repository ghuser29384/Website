const [leftPlaceId = "BRA", rightPlaceId = "IND"] = process.argv.slice(2);
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

function rowsByLayer(profile) {
  return new Map(profile.measurements.map((row) => [row.layer_id, row]));
}

function formatDelta(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

const [leftProfile, rightProfile] = await Promise.all([
  fetchJson(`/v1/places/${encodeURIComponent(leftPlaceId)}.json`),
  fetchJson(`/v1/places/${encodeURIComponent(rightPlaceId)}.json`),
]);

if (leftProfile.release_id !== rightProfile.release_id) {
  throw new Error(`Release mismatch: ${leftProfile.release_id} vs ${rightProfile.release_id}`);
}

const leftRows = rowsByLayer(leftProfile);
const rightRows = rowsByLayer(rightProfile);
const commonLayerIds = [...leftRows.keys()].filter((layerId) => rightRows.has(layerId)).sort();

console.log(`${leftProfile.place_name} (${leftProfile.place_id}) vs ${rightProfile.place_name} (${rightProfile.place_id})`);
console.log(`Release: ${leftProfile.release_id}`);
console.log(`Shared measured layers: ${commonLayerIds.length}`);

for (const layerId of commonLayerIds) {
  const left = leftRows.get(layerId);
  const right = rightRows.get(layerId);
  const delta = Number(right.rank_value ?? right.normalized_value) - Number(left.rank_value ?? left.normalized_value);
  const sourceIds = [...new Set([...left.source_ids, ...right.source_ids])].sort();

  console.log(`\n${left.layer_name}`);
  console.log(`- ${leftProfile.place_id}: ${left.display_value} [${left.evidence_kind}, ${left.uncertainty_class}]`);
  console.log(`- ${rightProfile.place_id}: ${right.display_value} [${right.evidence_kind}, ${right.uncertainty_class}]`);
  console.log(`- Rank delta (${rightProfile.place_id} minus ${leftProfile.place_id}): ${formatDelta(delta)}`);
  console.log(`- Source IDs: ${sourceIds.join(", ")}`);
  console.log(`- Lineage checksums: ${left.source_file_checksum}; ${right.source_file_checksum}`);
}
