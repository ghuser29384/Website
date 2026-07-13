Yes. Codex should parse only the 3 parse-eligible WDI snapshots, and only into context-only staging artifacts. No country promotion yet. Keep all OWID and Fishcount snapshots blocked for numeric parsing until upstream provider/license/access issues are resolved. World Bank API access is programmatic and suitable for this next parse step, but Codex must still preserve attribution/no-endorsement terms and dataset/API terms in the staged metadata. OWID should remain blocked because its own FAQ says most OWID data is third-party, third-party provider terms control reuse, and users must check provider licenses and cite both OWID and the provider.

Paste this to Codex:

Proceed with WDI context-only parsing.

Current reviewed state:
- 15 snapshots reviewed.
- 3 World Bank WDI snapshots are parse_eligible.
- 10 OWID mirror snapshots are blocked_license_unclear.
- 2 Fishcount snapshots are blocked_unauthorized.
- No numeric country measurements have been parsed yet.
- No countries have been promoted.
- No release artifacts have been regenerated.

Decision:
Parse only the 3 parse-eligible WDI snapshots:
- SP.POP.TOTL
- AG.LND.TOTL.K2
- AG.LND.AGRI.K2

Use scope:
- context-only parsing for country denominators and land-context layers.
- Not pain/suffering measurements.
- Not country promotion.
- Not canonical profile promotion.
- Not ranking-like output.

Keep blocked:
- All OWID snapshots remain blocked for numeric parsing until underlying provider license URI, redistribution terms, storage permission, and attribution are resolved.
- Fishcount remains blocked because both direct URLs returned 401 Unauthorized. Do not bypass access control.

Hard rules:
- Do not parse OWID or Fishcount numeric values.
- Do not promote any country.
- Do not regenerate final public release artifacts.
- Do not commit raw WDI files unless repository policy and license/storage review permit it.
- Do not make WDI context rows look like pain/suffering estimates.
- Do not weaken schemas or tests.

Step 1 — Locate candidate directory.

```bash
REPO="/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando"
cd "$REPO" || exit 1

CANDIDATE_DIR="$(find "$REPO" -name "source-license-access-review.csv" -path "*painmaps_country_data_addition_2026_07_07*" -print -quit | xargs dirname)"
if [ -z "$CANDIDATE_DIR" ] || [ ! -d "$CANDIDATE_DIR" ]; then
  echo "No candidate directory found."
  exit 1
fi

cd "$CANDIDATE_DIR" || exit 1
echo "Using candidate dir: $CANDIDATE_DIR"

Step 2 — Create a WDI context parser.

Create:

scripts/parse_wdi_context_snapshots.py

The script must:

read source-snapshots.fetched.json;
read source-license-access-review.csv;
select only rows where:
source_id == world-bank-wdi-api,
parse_status == parse_eligible,
fetch_status == ok;
parse only indicators:
SP.POP.TOTL
AG.LND.TOTL.K2
AG.LND.AGRI.K2;
parse the World Bank V2 JSON response format: [metadata, rows];
ignore aggregate/non-country rows unless their ISO3 appears in Painmaps’ country gap ledger;
choose the latest non-null value per ISO3 and indicator;
emit only staging artifacts, not final release measurements.

Output files:

parsed-wdi-country-context.csv
parsed-wdi-country-context.json
wdi-country-context-coverage.csv
wdi-country-context-coverage.json
blocked-source-decisions.csv
blocked-source-decisions.json

Step 3 — Use this exact output schema.

parsed-wdi-country-context.csv/json columns/fields:

candidate_row_id
release_candidate_id
release_id
place_id
iso3
country_name
layer_id
issue_id
metric_id
indicator_id
indicator_name
row_role
evidence_kind
value_type
raw_value
normalized_value
display_value
unit_label
ranking_mode
rank_value
reference_period
reference_period_semantics
source_vintage
method_id
method_version
transform_version
source_ids
source_snapshot_ids
license_id
attribution
uncertainty_class
caveat
comparability_group_id
evidence_compatibility_rule
coverage_status
coverage_reason
missing_inputs
promotion_decision
allowed_use_scope
source_file_checksum
source_file_checksum_algorithm
source_file_byte_size
retrieval_timestamp

Use these values:

For SP.POP.TOTL:

layer_id = country-context-population
issue_id = issue.human-context
metric_id = population_total
indicator_name = Population, total
row_role = country_context_denominator
evidence_kind = direct_context
value_type = count
unit_label = people
ranking_mode = none
rank_value = empty/null
method_id = method.wdi-country-context-latest-non-null
method_version = method.wdi-country-context-latest-non-null.v0
transform_version = transform.wdi-country-context-latest-non-null.v0
comparability_group_id = context-denominator-population
evidence_compatibility_rule = comparable only as WDI country context denominator, not as pain/suffering estimate
coverage_status = partial_context_only
coverage_reason = WDI context denominator parsed from latest non-null value; not a canonical pain/suffering profile
promotion_decision = not_promoted_context_only

For AG.LND.TOTL.K2:

layer_id = country-context-land-area
issue_id = issue.wild-animals
metric_id = land_area_sq_km
indicator_name = Land area (sq. km)
row_role = country_context_land_denominator
evidence_kind = direct_context
value_type = area
unit_label = sq km
ranking_mode = none
rank_value = empty/null
method_id = method.wdi-country-context-latest-non-null
method_version = method.wdi-country-context-latest-non-null.v0
transform_version = transform.wdi-country-context-latest-non-null.v0
comparability_group_id = context-denominator-land-area
evidence_compatibility_rule = comparable only as WDI land-area context denominator, not as wild-animal suffering estimate
coverage_status = partial_context_only
coverage_reason = WDI land-area context parsed from latest non-null value; not a canonical pain/suffering profile
promotion_decision = not_promoted_context_only

For AG.LND.AGRI.K2:

layer_id = country-context-agricultural-land
issue_id = issue.wild-animals
metric_id = agricultural_land_sq_km
indicator_name = Agricultural land (sq. km)
row_role = country_context_agricultural_land_denominator
evidence_kind = direct_context
value_type = area
unit_label = sq km
ranking_mode = none
rank_value = empty/null
method_id = method.wdi-country-context-latest-non-null
method_version = method.wdi-country-context-latest-non-null.v0
transform_version = transform.wdi-country-context-latest-non-null.v0
comparability_group_id = context-denominator-agricultural-land
evidence_compatibility_rule = comparable only as WDI agricultural-land context denominator, not as animal suffering estimate
coverage_status = partial_context_only
coverage_reason = WDI agricultural-land context parsed from latest non-null value; not a canonical pain/suffering profile
promotion_decision = not_promoted_context_only

General field rules:

release_candidate_id = release-candidate-2026-07-07.country-context.v0
Use the current release ID from the candidate package if available; otherwise keep the existing candidate release ID and mark as candidate.
place_id = ISO3.
normalized_value = null for this context-only stage.
display_value must be human-readable but not ranking-like.
source_ids = ["world-bank-wdi-api"].
source_snapshot_ids must contain the exact WDI snapshot ID used.
source_vintage = reference_period.
reference_period = latest non-null World Bank year for that ISO3/indicator.
reference_period_semantics = latest_non_null_wdi_year.
uncertainty_class = context_only.
caveat = Context denominator from World Bank WDI; not a pain/suffering measurement and not sufficient for country profile promotion.
missing_inputs should list the blocked animal-pain source groups still needed for canonical/richer country profile promotion.

wdi-country-context-coverage.csv/json fields:

iso3
country_name
has_population_total
population_reference_period
has_land_area
land_area_reference_period
has_agricultural_land
agricultural_land_reference_period
wdi_context_complete
missing_wdi_context_inputs
context_row_count
coverage_status_after_wdi_parse
promotion_decision_after_wdi_parse

Rules:

wdi_context_complete = true only if all three WDI indicators have latest non-null values.
coverage_status_after_wdi_parse = partial_context_only for countries with any WDI context rows.
promotion_decision_after_wdi_parse = not_promoted_context_only.
Countries with no WDI rows remain blocked/no-data according to the existing gap ledger.

blocked-source-decisions.csv/json fields:

source_snapshot_id
source_id
parse_status
affected_layer_ids
affected_issue_ids
affected_country_count
affected_measurement_stub_count
block_reason
required_to_unblock

Rules:

Include all 10 blocked OWID snapshots and both Fishcount snapshots.
Do not include any blocked-source-derived measurement rows in parsed-wdi-country-context.*.

Step 4 — Write the parser defensively.

The script must fail if:

any non-WDI row is parsed;
any parse source has parse_status != parse_eligible;
any parsed row uses a blocked source ID or snapshot ID;
any parsed row has promotion_decision containing promote;
any parsed row has ranking_mode != none;
any parsed row has a nonempty rank_value;
any parsed row has evidence_kind outside direct_context;
any parsed row lacks source snapshot/checksum/byte-size/retrieval metadata;
any parsed row lacks reference period;
any country row uses an ISO3 not present in the candidate country gap ledger.

Step 5 — Run parser.

python3 scripts/parse_wdi_context_snapshots.py 2>&1 | tee parse-wdi-country-context.log

Step 6 — Validate outputs.

python3 -m json.tool parsed-wdi-country-context.json > /tmp/parsed-wdi-country-context.pretty.json
python3 -m json.tool wdi-country-context-coverage.json > /tmp/wdi-country-context-coverage.pretty.json
python3 -m json.tool blocked-source-decisions.json > /tmp/blocked-source-decisions.pretty.json

Run this guard:

python3 - <<'PY'
import csv, json, sys
from collections import Counter

parsed = list(csv.DictReader(open("parsed-wdi-country-context.csv", newline="", encoding="utf-8")))
coverage = list(csv.DictReader(open("wdi-country-context-coverage.csv", newline="", encoding="utf-8")))
blocked = list(csv.DictReader(open("blocked-source-decisions.csv", newline="", encoding="utf-8")))
review = list(csv.DictReader(open("source-license-access-review.csv", newline="", encoding="utf-8")))

review_by_snapshot = {r["source_snapshot_id"]: r for r in review}
bad = []

allowed_indicators = {"SP.POP.TOTL", "AG.LND.TOTL.K2", "AG.LND.AGRI.K2"}
allowed_source_ids = {"world-bank-wdi-api"}

for r in parsed:
    if r["source_ids"] not in ('["world-bank-wdi-api"]', "world-bank-wdi-api"):
        bad.append((r.get("candidate_row_id"), "unexpected source_ids", r["source_ids"]))

    if r["indicator_id"] not in allowed_indicators:
        bad.append((r.get("candidate_row_id"), "unexpected indicator", r["indicator_id"]))

    if r["evidence_kind"] != "direct_context":
        bad.append((r.get("candidate_row_id"), "bad evidence_kind", r["evidence_kind"]))

    if r["ranking_mode"] != "none":
        bad.append((r.get("candidate_row_id"), "bad ranking_mode", r["ranking_mode"]))

    if r.get("rank_value"):
        bad.append((r.get("candidate_row_id"), "rank_value must be empty", r.get("rank_value")))

    if "promote" in r["promotion_decision"] and r["promotion_decision"] != "not_promoted_context_only":
        bad.append((r.get("candidate_row_id"), "bad promotion_decision", r["promotion_decision"]))

    for k in ["reference_period", "source_vintage", "source_snapshot_ids", "source_file_checksum", "source_file_checksum_algorithm", "source_file_byte_size", "retrieval_timestamp"]:
        if not r.get(k):
            bad.append((r.get("candidate_row_id"), f"missing {k}"))

    try:
        float(r["raw_value"])
    except Exception:
        bad.append((r.get("candidate_row_id"), "raw_value not numeric", r.get("raw_value")))

    # Check snapshot review status.
    snap_ids_raw = r["source_snapshot_ids"]
    snap_ids = []
    try:
        snap_ids = json.loads(snap_ids_raw)
    except Exception:
        snap_ids = [snap_ids_raw]
    for sid in snap_ids:
        rr = review_by_snapshot.get(sid)
        if not rr:
            bad.append((r.get("candidate_row_id"), "snapshot missing from review", sid))
        elif rr["parse_status"] != "parse_eligible":
            bad.append((r.get("candidate_row_id"), "snapshot not parse_eligible", sid, rr["parse_status"]))

# Ensure no blocked source generated parsed rows.
blocked_source_ids = {r["source_id"] for r in review if r["parse_status"] != "parse_eligible"}
for r in parsed:
    if any(b in r["source_ids"] for b in blocked_source_ids):
        bad.append((r.get("candidate_row_id"), "blocked source appears in parsed rows", r["source_ids"]))

if not blocked:
    bad.append(("blocked-source-decisions", "empty blocked-source decisions"))

for r in blocked:
    if r["source_id"] == "world-bank-wdi-api":
        bad.append((r["source_snapshot_id"], "WDI should not be in blocked-source-decisions"))
    if not r["block_reason"]:
        bad.append((r["source_snapshot_id"], "blocked source missing block_reason"))

print("parsed_rows:", len(parsed))
print("coverage_rows:", len(coverage))
print("blocked_rows:", len(blocked))
print("parsed indicators:", dict(Counter(r["indicator_id"] for r in parsed)))
print("coverage status:", dict(Counter(r["coverage_status_after_wdi_parse"] for r in coverage)))

if bad:
    print("WDI_CONTEXT_VALIDATION_FAILED")
    for item in bad:
        print(item)
    sys.exit(1)

print("WDI context-only parse validation passed")
PY

Step 7 — Create reviewed source/license registry staging files.

Create:

source-registry-additions.wdi-reviewed.json
license-registry-additions.wdi-reviewed.json

Rules:

Include only source/license entries required for the 3 WDI parsed context snapshots.
Keep blocked OWID/Fishcount out of reviewed parse-eligible registries.
Record:
World Bank WDI/API source ID,
publisher,
upstream API URLs,
terms URL,
license ID,
required attribution,
no-endorsement caveat,
redistribution/storage note,
review date,
next review due.

Step 8 — Create iteration 4 validation report.

Create:

.painmaps-iteration/validation/country-data-candidate-iteration-4-wdi-context-parse.md

Include:

# Country data candidate validation — iteration 4

## Purpose
Parse only 3 reviewed WDI snapshots into context-only staging rows. No pain/suffering rows, no country promotion, no release artifact regeneration.

## Git state
[branch and git status --short]

## Candidate directory
[path]

## Inputs parsed
[3 WDI snapshots and indicators]

## Inputs intentionally blocked
[10 OWID blocked_license_unclear, 2 Fishcount blocked_unauthorized]

## Output files
- parsed-wdi-country-context.csv/json
- wdi-country-context-coverage.csv/json
- blocked-source-decisions.csv/json
- source-registry-additions.wdi-reviewed.json
- license-registry-additions.wdi-reviewed.json

## Parsed row counts
[counts by indicator, country, missing WDI fields]

## Coverage result
[number of countries with all 3 WDI context inputs]
[number with partial WDI context]
[number with no WDI context]
[confirm: 0 country promotions]

## Validation commands and results
[json validation, WDI guard output, git diff --check]

## Data promotion status
No countries promoted. These are context-only candidate rows.

## Next question for ChatGPT
Given these WDI context-only rows, should Codex:
1. integrate them into candidate coverage artifacts only,
2. inspect the repo compiler to map them into existing release artifacts,
3. request license review for OWID providers,
4. find alternate license-compatible animal data sources,
5. or stop?

Step 9 — Report back.

Paste the iteration 4 report into ChatGPT.

Do not integrate into production release artifacts until ChatGPT reviews the parsed WDI context-only output.


After Codex finishes this iteration, the most likely next step is **candidate coverage integration**, not canonical country promotion. WDI population/land/agricultural-land can improve denominators and context availability, but it does not add the missing animal-pain layers.