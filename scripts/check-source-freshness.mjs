import { existsSync, readFileSync } from "node:fs";

const freshness = readJson("data/source-freshness.json");
const provenance = readJson("data/provenance-registry.json");
const workflowPath = ".github/workflows/painmap-source-freshness.yml";
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, "utf8") : "";
const today = process.env.PAINMAP_FRESHNESS_TODAY || new Date().toISOString().slice(0, 10);
const enforceDue = process.env.PAINMAP_FRESHNESS_ENFORCE_DUE === "true";
const failures = [];

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const provenanceSourceIds = new Set(provenance.sources?.map((source) => source.source_id));
const freshnessSourceIds = new Set(freshness.sources?.map((source) => source.source_id));

expect(freshness.release_id === provenance.build?.release_id, "data/source-freshness.json release_id must match provenance build release_id");
expect(freshness.source_count === provenance.sources?.length, "data/source-freshness.json source_count must match provenance sources");
expect(Boolean(freshness.provenance_registry_sha256), "data/source-freshness.json must include provenance_registry_sha256");
expect(freshness.schedule?.workflow === workflowPath, "data/source-freshness.json must point at the scheduled freshness workflow");
expect(freshness.schedule?.release_candidate_prs === true, "source freshness schedule must support release-candidate PRs");
expect(freshness.schedule?.local_command === "npm run freshness:sources", "source freshness schedule must publish local command");

for (const sourceId of provenanceSourceIds) {
  expect(freshnessSourceIds.has(sourceId), `data/source-freshness.json missing source ${sourceId}`);
}

for (const source of freshness.sources ?? []) {
  expect(provenanceSourceIds.has(source.source_id), `data/source-freshness.json contains unknown source ${source.source_id}`);
  expect(validDate(source.last_review_date), `${source.source_id} last_review_date must be YYYY-MM-DD`);
  expect(validDate(source.next_review_due), `${source.source_id} next_review_due must be YYYY-MM-DD`);
  expect(Number.isInteger(source.cadence_days) && source.cadence_days > 0, `${source.source_id} cadence_days must be positive`);
  expect(Boolean(source.update_lane), `${source.source_id} must include update_lane`);
  expect(Boolean(source.freshness_basis), `${source.source_id} must include freshness_basis`);
  expect(Boolean(source.release_candidate_action), `${source.source_id} must include release_candidate_action`);

  if (validDate(source.last_review_date) && validDate(source.next_review_due)) {
    expect(source.next_review_due > source.last_review_date, `${source.source_id} next_review_due must be after last_review_date`);
  }

  if (enforceDue && validDate(source.next_review_due)) {
    expect(source.next_review_due >= today, `${source.source_id} freshness review is due or overdue as of ${today}`);
  }
}

for (const laneId of ["schema-validity", "release-reproducibility", "domain-sanity", "editorial-validity"]) {
  expect(
    freshness.validation_lanes?.some((lane) => lane.id === laneId && lane.method),
    `data/source-freshness.json missing validation lane ${laneId}`
  );
}

for (const workflowPattern of [
  /on:\s*[\s\S]*schedule:/,
  /cron: "17 9 \* \* 1"/,
  /npm run build:data/,
  /npm run freshness:sources/,
  /peter-evans\/create-pull-request@v6/,
  /codex\/painmap-source-freshness/,
]) {
  expect(workflowPattern.test(workflow), `${workflowPath} missing ${workflowPattern}`);
}

if (failures.length) {
  console.error("Source freshness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Source freshness check passed for ${freshness.sources.length} sources as of ${today}.`);
