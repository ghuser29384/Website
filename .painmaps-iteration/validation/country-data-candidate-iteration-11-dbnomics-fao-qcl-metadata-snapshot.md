# Country data candidate validation - iteration 11 DBnomics FAO/QCL metadata snapshot

## Purpose
Fetch full DBnomics FAO/QCL dataset metadata as a source snapshot. No numeric parsing, no country promotion, no production artifact regeneration.

## Git state
Branch: `country-context-release-candidate`

```text
?? .painmaps-iteration/
?? about/painmap_country_data_addition_package.zip
?? data/candidates/painmaps_country_data_addition_2026_07_07/
```

## Candidate directory
`/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07`

## Snapshot fetched
- URL: `https://api.db.nomics.world/v22/datasets/FAO/QCL`
- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.dbnomics-fao-qcl-dataset-metadata.1`
- local path: `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.dbnomics-fao-qcl-dataset-metadata.1.json`
- byte size: `15175`
- sha256: `ea061d6fc17158a1be7cd28cd562617fa82a39927bae8bd3e14b7a94d4fa04cc`
- retrieval timestamp: `2026-07-08T13:33:00.513441Z`
- content_type: `application/json`
- http_status: `200`

## Dataset metadata confirmed
- dataset code: `QCL`
- dataset name: `Production: Crops and livestock products`
- provider: `Food and Agriculture Organization of the United Nations`
- nb_series: `79606`
- dimensions: `['element', 'area', 'item']`
- element 5320 label: `Producing Animals/Slaughtered`
- element 5320 confirmed: `True`
- area count: `245`
- item count: `301`

## Legal/source status
- FAO is underlying provider.
- DBnomics is distributor/mirror.
- FAO terms and DBnomics distribution role still require final review.
- parse_status remains `metadata_review_required`.
- No row is parse-eligible yet.

## Data promotion status
No numeric observations parsed. No animal values parsed. No countries promoted. No final release artifacts regenerated. WDI rows remain candidate-only.

## Validation
Fetch command:

```bash
python3 scripts/fetch_dbnomics_fao_metadata_snapshot.py 2>&1 | tee dbnomics-fao-qcl-metadata-snapshot-fetch.log
```

Fetch output:

```text
wrote fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.dbnomics-fao-qcl-dataset-metadata.1.json
wrote dbnomics-fao-metadata-source-snapshots.json
wrote dbnomics-fao-qcl-metadata-snapshot-review.md
dataset_code: QCL
dataset_name: Production: Crops and livestock products
provider_name: Food and Agriculture Organization of the United Nations
nb_series: 79606
element_5320_label: Producing Animals/Slaughtered
area_count: 245
item_count: 301
sha256: ea061d6fc17158a1be7cd28cd562617fa82a39927bae8bd3e14b7a94d4fa04cc
```

Validation commands/output:

```text
$ python3 -m json.tool dbnomics-fao-metadata-source-snapshots.json > /tmp/dbnomics-fao-metadata-source-snapshots.pretty.json
$ python3 -m json.tool fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.dbnomics-fao-qcl-dataset-metadata.1.json > /tmp/dbnomics-fao-qcl-dataset-metadata.pretty.json
$ python3 - <<'PY' | tee dbnomics-fao-qcl-metadata-snapshot-validation.log
manifest_rows: 1
dataset_code: QCL
dataset_name: Production: Crops and livestock products
nb_series: 79606
element_5320_label: Producing Animals/Slaughtered
parse_status: metadata_review_required
allowed_use_scope: metadata/distribution review only; no numeric parsing; no country promotion
DBnomics FAO/QCL metadata snapshot validation passed
```

## Artifacts generated
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/scripts/fetch_dbnomics_fao_metadata_snapshot.py` (7794 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.dbnomics-fao-qcl-dataset-metadata.1.json` (15175 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-metadata-source-snapshots.json` (3120 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-metadata-snapshot-review.md` (1111 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-metadata-snapshot-fetch.log` (546 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-metadata-snapshot-validation.log` (344 bytes)

## Next question for ChatGPT
Given the metadata snapshot, should Codex next:
1. fetch the FAO/RP DBnomics dataset metadata snapshot for insecticide proxy,
2. inspect the QCL metadata to design exact series-query filters for element 5320,
3. keep DBnomics blocked pending distributor terms review,
4. or stop?
