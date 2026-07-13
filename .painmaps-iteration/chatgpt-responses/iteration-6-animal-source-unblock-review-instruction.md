Continue the Painmaps country-data staging workflow.

Decision:
Do not integrate WDI rows into production artifacts. Keep WDI context rows candidate-only.

Next local action:
Run Iteration 6: animal-layer source unblock review. The goal is to identify whether any blocked OWID animal/insecticide snapshots can become parse-eligible by recording the underlying provider, provider license URI, redistribution terms, storage permission, and required attribution. Do not parse numeric values yet.

Current state:
- WDI context-only parse succeeded and remains candidate-only.
- 639 WDI context rows exist in staging.
- No country promotions.
- No production release regeneration.
- 10 OWID snapshots remain blocked_license_unclear.
- 2 Fishcount snapshots remain blocked_unauthorized.
- Iteration 5 mapping report says direct production integration would collide with current evidence enums, coverage vocabulary, provenance/source-snapshot registries, and compiler assumptions.

Hard rules:
- Do not parse OWID numeric values in this iteration.
- Do not retry Fishcount with cookies, browser sessions, copied headers, spoofed headers, or access-control workarounds.
- Do not promote countries.
- Do not regenerate final release artifacts.
- Do not commit raw snapshots.
- Do not weaken schemas/tests.
- Keep WDI candidate-only.
- If OWID metadata says the data is third-party, record the underlying provider/license terms before marking parse-eligible.

Step 1 — Locate repo and candidate directory.

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

Step 2 — Create an OWID/Fishcount unblock review script.

Create:

scripts/review_blocked_animal_sources.py

The script should:

read source-license-access-review.csv;
read source-snapshots.fetched.json;
read blocked-source-decisions.csv;
inspect the remaining local OWID metadata JSON files if present;
identify blocked OWID rows;
extract or infer from metadata:
OWID grapher slug or snapshot ID,
title,
underlying provider,
data publisher/source,
source URL,
license text or license URI if present,
citation text,
whether OWID says “processed by Our World in Data” or similar,
whether the underlying source is FAO, Fishcount, World Bank, or another provider;
leave Fishcount rows blocked_unauthorized;
produce review artifacts only, not parsed values.

Output files:

animal-source-unblock-review.csv
animal-source-unblock-review.json
animal-source-unblock-summary.md

Required columns/fields:

source_snapshot_id
source_id
affected_layer_ids
affected_issue_ids
fetch_status
current_parse_status
owid_metadata_file
grapher_slug
title
underlying_provider
underlying_source_url
underlying_license_name
underlying_license_uri
owid_citation
provider_citation
can_store_raw_snapshot
can_publish_derived_values
can_publish_derived_country_values
required_attribution
no_endorsement_or_provider_caveat
evidence_found
remaining_uncertainty
recommended_parse_status
recommended_allowed_use_scope
block_reason_if_still_blocked
next_action

Allowed recommended_parse_status values:

parse_eligible_after_license_update
blocked_license_unclear
blocked_provider_terms_unclear
blocked_storage_unclear
blocked_unauthorized
blocked_manual_permission_required

Rules:

Any Fishcount 401 row must remain blocked_unauthorized.
Any OWID row without a clear underlying provider license URI must remain blocked.
Any OWID row with third-party data but no provider redistribution/storage permission must remain blocked.
If an OWID row is potentially parse-eligible, it must still be marked parse_eligible_after_license_update, not directly parsed.
Do not mark a source parse-eligible solely because OWID mirrored the CSV.
Do not treat OWID’s CC BY as covering third-party provider data unless metadata clearly says OWID produced the data.

Step 3 — Implement the script defensively.

It should not fail if OWID metadata fields are nested or missing. It should dump relevant metadata snippets into animal-source-unblock-summary.md for manual review.

Step 4 — Run the script.

python3 scripts/review_blocked_animal_sources.py 2>&1 | tee animal-source-unblock-review.log

Step 5 — Validate outputs.

python3 -m json.tool animal-source-unblock-review.json > /tmp/animal-source-unblock-review.pretty.json

python3 - <<'PY'
import csv, sys
from collections import Counter

rows = list(csv.DictReader(open("animal-source-unblock-review.csv", newline="", encoding="utf-8")))
bad = []

allowed = {
    "parse_eligible_after_license_update",
    "blocked_license_unclear",
    "blocked_provider_terms_unclear",
    "blocked_storage_unclear",
    "blocked_unauthorized",
    "blocked_manual_permission_required",
}

for r in rows:
    sid = r["source_snapshot_id"]
    status = r["recommended_parse_status"]

    if status not in allowed:
        bad.append((sid, "invalid recommended_parse_status", status))

    joined = (r["source_id"] + " " + sid).lower()
    if "fishcount" in joined and status != "blocked_unauthorized":
        bad.append((sid, "Fishcount must remain blocked_unauthorized"))

    if "owid" in joined:
        if status.startswith("parse_eligible"):
            for k in [
                "underlying_provider",
                "underlying_license_uri",
                "required_attribution",
                "evidence_found",
                "recommended_allowed_use_scope",
            ]:
                if not r.get(k, "").strip():
                    bad.append((sid, f"potentially parse-eligible OWID row missing {k}"))

        if status == "parse_eligible_after_license_update":
            if r.get("can_publish_derived_country_values", "").lower() != "true":
                bad.append((sid, "parse_eligible_after_license_update requires can_publish_derived_country_values=true"))

print("rows:", len(rows))
print("recommended_parse_status:", dict(Counter(r["recommended_parse_status"] for r in rows)))

if bad:
    print("ANIMAL_SOURCE_UNBLOCK_REVIEW_FAILED")
    for item in bad:
        print(item)
    sys.exit(1)

print("animal source unblock review validation passed")
PY

Step 6 — Write iteration 6 report.

Create:

.painmaps-iteration/validation/country-data-candidate-iteration-6-animal-source-unblock-review.md

Include:

# Country data candidate validation — iteration 6 animal-source unblock review

## Purpose
Review blocked animal-layer sources for possible license/access unblocking. No numeric parsing, no country promotion, no production artifact regeneration.

## Git state
[branch and git status --short]

## Candidate directory
[path]

## Inputs reviewed
- 10 OWID blocked_license_unclear rows
- 2 Fishcount blocked_unauthorized rows

## WDI status
WDI context rows remain candidate-only and are not integrated into production artifacts.

## Review outputs
- animal-source-unblock-review.csv/json
- animal-source-unblock-summary.md

## Summary counts
[counts by recommended_parse_status]

## Potentially unblocked sources
List any rows with `parse_eligible_after_license_update`, including:
- source_snapshot_id
- layer/issue
- underlying provider
- license URI
- allowed use scope
- required attribution
- evidence found

## Still blocked sources
List rows still blocked and why.

## Fishcount decision
Confirm Fishcount remains blocked_unauthorized and no bypass was attempted.

## Validation commands and results
[paste script output and guard output]

## Data promotion status
No OWID/Fishcount numeric values parsed. No countries promoted. No final release artifacts regenerated.

## Next question for ChatGPT
Given this unblock review, should Codex:
1. update source/license review tables for any parse_eligible_after_license_update OWID rows,
2. keep all animal sources blocked,
3. seek alternate license-compatible animal sources,
4. ask user for permission/licensing follow-up,
5. or stop?

Step 7 — Copy report to clipboard.

cd "$REPO" || exit 1
cat ".painmaps-iteration/validation/country-data-candidate-iteration-6-animal-source-unblock-review.md" | pbcopy
echo "Copied iteration 6 report to clipboard. Paste it into ChatGPT."

Stop after this report. Do not parse animal-layer numeric values until ChatGPT reviews the unblock findings.