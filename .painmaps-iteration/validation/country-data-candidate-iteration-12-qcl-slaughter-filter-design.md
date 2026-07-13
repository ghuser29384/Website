# Country data candidate validation - iteration 12 QCL slaughter filter design

## Purpose
Design DBnomics FAO/QCL element-5320 item and series filters before any observation fetch. No numeric parsing, no country promotion, no production artifact regeneration.

## Git state
Branch: `country-context-release-candidate`

```text
?? .painmaps-iteration/
?? about/painmap_country_data_addition_package.zip
?? data/candidates/painmaps_country_data_addition_2026_07_07/
```

## Candidate directory
`/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07`

## Inputs
- DBnomics FAO/QCL metadata snapshot.
- Element 5320 = Producing Animals/Slaughtered.
- ChatGPT-reviewed primary meat whitelist.

Note: the local pasted instruction referenced an exact script body from the latest ChatGPT instruction, but that script body was not present in saved local files. Codex reconstructed the script from the explicit whitelist, required filenames, no-fetch constraints, and validation guard in the pasted instruction.

## Outputs
- `dbnomics-fao-qcl-slaughter-item-filter-design.csv/json`
- `dbnomics-fao-qcl-series-query-plan.csv/json`
- `dbnomics-fao-qcl-slaughter-filter-design.md`

## Primary meat item whitelist
- `867`: Meat of cattle with the bone, fresh or chilled
- `947`: Meat of buffalo, fresh or chilled
- `977`: Meat of sheep, fresh or chilled
- `1017`: Meat of goat, fresh or chilled
- `1035`: Meat of pig with the bone, fresh or chilled
- `1058`: Meat of chickens, fresh or chilled
- `1069`: Meat of ducks, fresh or chilled
- `1073`: Meat of geese, fresh or chilled
- `1080`: Meat of turkeys, fresh or chilled
- `1097`: Horse meat, fresh or chilled
- `1108`: Meat of asses, fresh or chilled
- `1111`: Meat of mules, fresh or chilled
- `1127`: Meat of camels, fresh or chilled
- `1141`: Meat of rabbits and hares, fresh or chilled

## Manual-review animal items
- `1089`: Meat of pigeons and other birds n.e.c., fresh, chilled or frozen
- `1151`: Meat of other domestic rodents, fresh or chilled
- `1158`: Meat of other domestic camelids, fresh or chilled
- `1163`: Game meat, fresh, chilled or frozen
- `1166`: Other meat n.e.c. (excluding mammals), fresh, chilled or frozen
- `1176`: Snails, fresh, chilled, frozen, dried, salted or in brine, except sea snails

## Item classification summary
- `candidate_primary_meat_item`: 14
- `excluded_non_primary_or_aggregate_or_derivative`: 281
- `manual_review_required`: 6

## Series-query plan summary
- total candidate query rows: `3430`
- area-scope counts:
  - `all_qcl_area_codes_from_metadata`: 3430
- first-fetch-scope counts:
  - `candidate_validation_scope`: 14
  - `deferred_full_area_scope_after_review`: 3416

## Double-counting risk
All element-5320 series must not be fetched blindly because derivative/offal/fat/live-animal/crop/aggregate item labels may duplicate or distort slaughter counts. The design uses only the ChatGPT-reviewed 14 primary meat items for candidate query rows and keeps ambiguous animal items in `manual_review_required`.

## Candidate next fetch scope
`14` query-plan rows are in `first_fetch_scope=candidate_validation_scope`. All series URLs remain inferred and not yet validated or fetched.

## Data promotion status
No observations fetched. No animal values parsed. No countries promoted. No final release artifacts regenerated. WDI rows remain candidate-only.

## Validation
Script command:

```bash
python3 scripts/design_dbnomics_fao_qcl_slaughter_filters.py 2>&1 | tee dbnomics-fao-qcl-slaughter-filter-design.log
```

Script output:

```text
wrote dbnomics-fao-qcl-slaughter-item-filter-design.csv
wrote dbnomics-fao-qcl-slaughter-item-filter-design.json
wrote dbnomics-fao-qcl-series-query-plan.csv
wrote dbnomics-fao-qcl-series-query-plan.json
wrote dbnomics-fao-qcl-slaughter-filter-design.md
dataset_code: QCL
dataset_name: Production: Crops and livestock products
element_code: 5320
element_label: Producing Animals/Slaughtered
item_rows: 301
series_rows: 3430
item_status_counts: {'excluded_non_primary_or_aggregate_or_derivative': 281, 'candidate_primary_meat_item': 14, 'manual_review_required': 6}
series_area_status_counts: {'all_qcl_area_codes_from_metadata': 3430}
first_fetch_scope_counts: {'candidate_validation_scope': 14, 'deferred_full_area_scope_after_review': 3416}
method_status: candidate_filter_design_only_not_parse_eligible
query_plan_status: candidate_query_plan_only_no_fetch
allowed_use_scope: filter design only; no numeric parsing; no country promotion
```

Validation commands/output:

```text
$ python3 -m json.tool dbnomics-fao-qcl-slaughter-item-filter-design.json > /tmp/dbnomics-fao-qcl-slaughter-item-filter-design.pretty.json
$ python3 -m json.tool dbnomics-fao-qcl-series-query-plan.json > /tmp/dbnomics-fao-qcl-series-query-plan.pretty.json
$ python3 - <<'PY' | tee dbnomics-fao-qcl-slaughter-filter-design-validation.log
item_rows: 301
series_rows: 3430
item_status_counts: {'excluded_non_primary_or_aggregate_or_derivative': 281, 'candidate_primary_meat_item': 14, 'manual_review_required': 6}
series_area_status_counts: {'all_qcl_area_codes_from_metadata': 3430}
first_fetch_scope_counts: {'candidate_validation_scope': 14, 'deferred_full_area_scope_after_review': 3416}
QCL slaughter filter design validation passed
```

## Artifacts generated
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/scripts/design_dbnomics_fao_qcl_slaughter_filters.py` (13024 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-slaughter-item-filter-design.csv` (166453 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-slaughter-item-filter-design.json` (258420 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-series-query-plan.csv` (2019861 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-series-query-plan.json` (3381227 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-slaughter-filter-design.md` (2786 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-slaughter-filter-design.log` (940 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-slaughter-filter-design-validation.log` (398 bytes)

## Next question for ChatGPT
Should Codex next:
1. validate a very small number of inferred series URLs without parsing values,
2. fetch FAO/RP metadata for insecticide proxy,
3. review the area-code mapping against Painmaps place IDs,
4. keep DBnomics blocked pending legal review,
5. or stop?
