# Country data candidate validation - iteration 4

## Purpose

Parse only 3 reviewed World Bank WDI snapshots into context-only staging rows. No pain/suffering rows, no country promotion, no release artifact regeneration.

## Git State

Branch: `country-context-release-candidate`

`git status --short`:

```text
?? .painmaps-iteration/
?? about/painmap_country_data_addition_package.zip
?? data/candidates/painmaps_country_data_addition_2026_07_07/
```

## Candidate Directory

`/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07`

## Inputs Parsed

- `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.1` - `SP.POP.TOTL`
- `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.2` - `AG.LND.TOTL.K2`
- `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.3` - `AG.LND.AGRI.K2`

All parsed inputs were `source_id=world-bank-wdi-api`, `fetch_status=ok`, and `parse_status=parse_eligible` in `source-license-access-review.csv`.

## Inputs Intentionally Blocked

- 10 OWID snapshots remain `blocked_license_unclear`.
- 2 Fishcount snapshots remain `blocked_unauthorized`.
- No OWID or Fishcount numeric values were parsed.
- No access-control bypass was attempted.

## Output Files

- `data/candidates/painmaps_country_data_addition_2026_07_07/scripts/parse_wdi_context_snapshots.py`
- `data/candidates/painmaps_country_data_addition_2026_07_07/parsed-wdi-country-context.csv`
- `data/candidates/painmaps_country_data_addition_2026_07_07/parsed-wdi-country-context.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/wdi-country-context-coverage.csv`
- `data/candidates/painmaps_country_data_addition_2026_07_07/wdi-country-context-coverage.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/blocked-source-decisions.csv`
- `data/candidates/painmaps_country_data_addition_2026_07_07/blocked-source-decisions.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/source-registry-additions.wdi-reviewed.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/license-registry-additions.wdi-reviewed.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/parse-wdi-country-context.log`
- `data/candidates/painmaps_country_data_addition_2026_07_07/wdi-context-guard.log`

## Parsed Row Counts

- Parsed context rows: 639
- Countries with any WDI context row: 215
- Countries with all 3 WDI context inputs: 209
- Countries with partial WDI context: 6
- Countries with no WDI context rows: 34

By indicator:

- `SP.POP.TOTL`: 215 rows, reference period `2025`
- `AG.LND.TOTL.K2`: 215 rows, reference period `2023`
- `AG.LND.AGRI.K2`: 209 rows, reference period `2023`

Partial WDI countries:

- `CUW`, `GIB`, `MAC`, `MAF`, `MCO`, `SXM` - each missing `AG.LND.AGRI.K2`

Example no-WDI countries:

- `AIA`, `ALA`, `ATA`, `ATF`, `BES`, `BLM`, `BVT`, `CCK`, `COK`, `CXR`, `ESH`, `FLK`, `GGY`, `GLP`, `GUF`, `HMD`, `IOT`, `JEY`, `MSR`, `MTQ`

## Coverage Result

- `wdi_context_complete=true`: 209 countries
- `coverage_status_after_wdi_parse=partial_context_only`: 215 countries
- Countries with no WDI rows retain the existing gap-ledger status `missing_canonical_country_profile_or_only_boundary_context`.
- `promotion_decision` for every parsed row: `not_promoted_context_only`
- `promotion_decision_after_wdi_parse` for every coverage row: `not_promoted_context_only`
- Country promotions: 0
- Final release artifacts regenerated: 0

## Validation Commands And Results

Parser command:

```bash
python3 scripts/parse_wdi_context_snapshots.py 2>&1 | tee parse-wdi-country-context.log
```

Result:

```text
parsed_rows: 639
coverage_rows: 249
blocked_rows: 12
parsed indicators: {'SP.POP.TOTL': 215, 'AG.LND.TOTL.K2': 215, 'AG.LND.AGRI.K2': 209}
coverage status: {'partial_context_only': 215, 'missing_canonical_country_profile_or_only_boundary_context': 34}
WDI context-only parse completed
```

JSON validation:

```bash
python3 -m json.tool parsed-wdi-country-context.json > /tmp/parsed-wdi-country-context.pretty.json
python3 -m json.tool wdi-country-context-coverage.json > /tmp/wdi-country-context-coverage.pretty.json
python3 -m json.tool blocked-source-decisions.json > /tmp/blocked-source-decisions.pretty.json
python3 -m json.tool source-registry-additions.wdi-reviewed.json > /tmp/source-registry-additions.wdi-reviewed.pretty.json
python3 -m json.tool license-registry-additions.wdi-reviewed.json > /tmp/license-registry-additions.wdi-reviewed.pretty.json
```

Result: all commands exited 0.

WDI guard:

```bash
python3 - <<'PY' | tee wdi-context-guard.log
...
PY
```

Result:

```text
parsed_rows: 639
coverage_rows: 249
blocked_rows: 12
parsed indicators: {'SP.POP.TOTL': 215, 'AG.LND.TOTL.K2': 215, 'AG.LND.AGRI.K2': 209}
coverage status: {'partial_context_only': 215, 'missing_canonical_country_profile_or_only_boundary_context': 34}
WDI context-only parse validation passed
```

Whitespace check:

```bash
git diff --check
```

Result: exited 0.

## Guardrail Checks

- Parsed rows use only `source_ids=["world-bank-wdi-api"]`.
- Parsed rows use only `SP.POP.TOTL`, `AG.LND.TOTL.K2`, and `AG.LND.AGRI.K2`.
- Parsed rows use `evidence_kind=direct_context`.
- Parsed rows use `ranking_mode=none` and empty `rank_value`.
- Parsed rows use `promotion_decision=not_promoted_context_only`.
- Parsed rows include source snapshot IDs, checksums, checksum algorithms, byte sizes, retrieval timestamps, and reference periods.
- `blocked-source-decisions.*` includes 12 rows and no WDI rows.
- OWID/Fishcount blocked-source rows have nonempty `block_reason`.

## Data Promotion Status

No countries promoted. These are context-only candidate rows only.

## Source And License Notes

`source-registry-additions.wdi-reviewed.json` and `license-registry-additions.wdi-reviewed.json` include only the reviewed WDI source/license entries needed for this context parse. They keep blocked OWID/Fishcount sources out of reviewed parse-eligible registries and record World Bank attribution, dataset/API terms URLs, CC BY 4.0 license URI, no-endorsement caveat, review date, and next review due date.

## Next Question For ChatGPT

Given these WDI context-only rows, should Codex:

1. integrate them into candidate coverage artifacts only,
2. inspect the repo compiler to map them into existing release artifacts,
3. request license review for OWID providers,
4. find alternate license-compatible animal data sources,
5. or stop?
