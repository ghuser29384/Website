# Country data candidate validation - iteration 6 animal-source unblock review

## Purpose

Review blocked animal-layer sources for possible license/access unblocking. No numeric parsing, no country promotion, no production artifact regeneration.

## Git state

Branch: `country-context-release-candidate`

`git status --short` before this report:

```text
?? .painmaps-iteration/
?? about/painmap_country_data_addition_package.zip
?? data/candidates/painmaps_country_data_addition_2026_07_07/
```

## Candidate directory

`/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07`

## Inputs reviewed

- 10 OWID rows that were previously `blocked_license_unclear`.
- 2 Fishcount rows that were previously `blocked_unauthorized`.
- Input files:
  - `source-license-access-review.csv`
  - `source-snapshots.fetched.json`
  - `blocked-source-decisions.csv`
  - `raw-snapshot-storage-disposition.csv`
  - `snapshot-dependency-impact.json`

## WDI status

WDI context rows remain candidate-only and are not integrated into production artifacts.

Current WDI staging remains unchanged:
- `parsed-wdi-country-context.csv/json`: 639 WDI context rows.
- No country promotions.
- No final release artifact regeneration.

## Review outputs

- `data/candidates/painmaps_country_data_addition_2026_07_07/scripts/review_blocked_animal_sources.py`
- `data/candidates/painmaps_country_data_addition_2026_07_07/animal-source-unblock-review.csv`
- `data/candidates/painmaps_country_data_addition_2026_07_07/animal-source-unblock-review.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/animal-source-unblock-summary.md`
- `data/candidates/painmaps_country_data_addition_2026_07_07/animal-source-unblock-review.log`
- `data/candidates/painmaps_country_data_addition_2026_07_07/animal-source-unblock-guard.log`

## Summary counts

- `blocked_provider_terms_unclear`: 10
- `blocked_unauthorized`: 2
- `parse_eligible_after_license_update`: 0

## Potentially unblocked sources

None.

No OWID row has enough local evidence to become `parse_eligible_after_license_update`. Every OWID row still lacks a recorded underlying provider license URI and has `can_store_raw_snapshot=false`, `can_publish_derived_values=false`, and `can_publish_derived_country_values=false`.

## Still blocked sources

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.1`
  - source: `owid-land-animals-slaughtered`
  - layer/issue: `factory-farmed-animals` / `issue.factory-farmed-animals`
  - underlying provider: Food and Agriculture Organization of the United Nations (2025)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.2`
  - source: `owid-land-animals-slaughtered`
  - layer/issue: `factory-farmed-animals` / `issue.factory-farmed-animals`
  - underlying provider: Food and Agriculture Organization of the United Nations (2025)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.1`
  - source: `owid-farmed-fish-killed`
  - layer/issue: `farmed-fish` / `issue.farmed-fish`
  - underlying provider: Fishcount (2024)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.2`
  - source: `owid-farmed-fish-killed`
  - layer/issue: `farmed-fish` / `issue.farmed-fish`
  - underlying provider: Fishcount (2024)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.1`
  - source: `owid-wild-caught-fish`
  - layer/issue: `wild-caught-fish` / `issue.wild-caught-fish`
  - underlying provider: Mood and Brooke (2024)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.2`
  - source: `owid-wild-caught-fish`
  - layer/issue: `wild-caught-fish` / `issue.wild-caught-fish`
  - underlying provider: Mood and Brooke (2024)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.1`
  - source: `owid-farmed-crustaceans`
  - layer/issue: `farmed-crustaceans` / `issue.farmed-crustaceans`
  - underlying provider: Fishcount (2024)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.2`
  - source: `owid-farmed-crustaceans`
  - layer/issue: `farmed-crustaceans` / `issue.farmed-crustaceans`
  - underlying provider: Fishcount (2024)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.1`
  - source: `owid-insecticide-use-fao`
  - layer/issue: `insects-insecticide` / `issue.insect-welfare`
  - underlying provider: Food and Agriculture Organization of the United Nations (2025)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.2`
  - source: `owid-insecticide-use-fao`
  - layer/issue: `insects-insecticide` / `issue.insect-welfare`
  - underlying provider: Food and Agriculture Organization of the United Nations (2025)
  - recommended status: `blocked_provider_terms_unclear`
  - reason: no underlying provider license URI, raw-snapshot storage permission, or derived-country-value redistribution permission is recorded.

- `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-fish.1`
  - source: `fishcount-farmed-fish`
  - layer/issue: `farmed-fish` / `issue.farmed-fish`
  - underlying provider: Fishcount
  - recommended status: `blocked_unauthorized`
  - reason: source fetch returned `401 Unauthorized`; authorized access and license-compatible redistribution/storage permission are missing.

- `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-decapods.1`
  - source: `fishcount-farmed-decapods`
  - layer/issue: `farmed-crustaceans` / `issue.farmed-crustaceans`
  - underlying provider: Fishcount
  - recommended status: `blocked_unauthorized`
  - reason: source fetch returned `401 Unauthorized`; authorized access and license-compatible redistribution/storage permission are missing.

## Fishcount decision

Fishcount remains `blocked_unauthorized`.

No Fishcount cookies, browser sessions, copied headers, spoofed headers, or access-control workarounds were used or attempted.

## Validation commands and results

Review command:

```bash
python3 scripts/review_blocked_animal_sources.py 2>&1 | tee animal-source-unblock-review.log
```

Result:

```text
rows: 12
recommended_parse_status: {'blocked_provider_terms_unclear': 10, 'blocked_unauthorized': 2}
potentially_unblocked: 0
fishcount_blocked_unauthorized: 2
animal source unblock review completed
```

JSON validation:

```bash
python3 -m json.tool animal-source-unblock-review.json > /tmp/animal-source-unblock-review.pretty.json
```

Result: exited 0.

Guard:

```bash
python3 - <<'PY' | tee animal-source-unblock-guard.log
...
PY
```

Result:

```text
rows: 12
recommended_parse_status: {'blocked_provider_terms_unclear': 10, 'blocked_unauthorized': 2}
animal source unblock review validation passed
```

## Data promotion status

No OWID/Fishcount numeric values were parsed. No countries were promoted. No final release artifacts were regenerated.

## Next question for ChatGPT

Given this unblock review, should Codex:

1. update source/license review tables for any `parse_eligible_after_license_update` OWID rows,
2. keep all animal sources blocked,
3. seek alternate license-compatible animal sources,
4. ask user for permission/licensing follow-up,
5. or stop?
