const placeId = process.argv[2] || "IND";
const response = await fetch(`https://painmaps.org/v1/places/${encodeURIComponent(placeId)}.json`);

if (!response.ok) {
  throw new Error(`PainMap request failed for ${placeId}: HTTP ${response.status}`);
}

const profile = await response.json();

console.log(`${profile.place_name} (${profile.place_id})`);
console.log(`Release: ${profile.release_id}`);
console.log(`Measurements: ${profile.measurements.length}`);

for (const row of profile.measurements) {
  console.log(`- ${row.layer_name}: ${row.display_value} [${row.evidence_kind}, ${row.uncertainty_class}]`);
}
