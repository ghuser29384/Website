# Country data candidate validation - iteration 10 DBnomics FAO endpoint review

## Purpose
Review DBnomics FAO mirror endpoints as candidate metadata/snapshot sources for blocked animal-context layers. No numeric parsing, no country promotion, no production artifact regeneration.

## Git state
Branch: `country-context-release-candidate`

```text
?? .painmaps-iteration/
?? about/painmap_country_data_addition_package.zip
?? data/candidates/painmaps_country_data_addition_2026_07_07/
```

## Candidate directory
`/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07`

## URLs tested
- `dbnomics-fao-provider-page`: `https://db.nomics.world/FAO` -> HTTP `200`, `metadata_review_required`, Content-Type `text/html`
- `dbnomics-fao-qcl-page`: `https://db.nomics.world/FAO/QCL` -> HTTP `200`, `metadata_review_required`, Content-Type `text/html`
- `dbnomics-fao-rp-page`: `https://db.nomics.world/FAO/RP` -> HTTP `200`, `metadata_review_required`, Content-Type `text/html`
- `dbnomics-api-docs`: `https://api.db.nomics.world/v22/apidocs` -> HTTP `200`, `metadata_review_required`, Content-Type `text/html; charset=utf-8`
- `dbnomics-api-fao-qcl-dataset`: `https://api.db.nomics.world/v22/datasets/FAO/QCL` -> HTTP `200`, `metadata_review_required`, Content-Type `application/json`
- `dbnomics-api-fao-rp-dataset`: `https://api.db.nomics.world/v22/datasets/FAO/RP` -> HTTP `200`, `metadata_review_required`, Content-Type `application/json`
- `dbnomics-api-fao-qcl-slaughter-sample`: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1017.5320` -> HTTP `200`, `metadata_review_required`, Content-Type `application/json`
- `dbnomics-api-fao-rp-insecticides-sample`: `https://api.db.nomics.world/v22/series/FAO/RP/1.1309.5157` -> HTTP `200`, `metadata_review_required`, Content-Type `application/json`

## Review summary
- `metadata_review_required`: 8

## Resolved metadata/API endpoints
- `dbnomics-fao-provider-page`
  - URL: `https://db.nomics.world/FAO`
  - HTTP status: `200`
  - Content-Type: `text/html`
  - Content-Length: `95123`
  - Machine-readable: `false`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `2570275623d7097ac120ec3ce466d307737734f942cc67c4b77827a01c19c42d`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

- `dbnomics-fao-qcl-page`
  - URL: `https://db.nomics.world/FAO/QCL`
  - HTTP status: `200`
  - Content-Type: `text/html`
  - Content-Length: `244408`
  - Machine-readable: `false`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `d04911d041c8566339ad06a46a80572b425922ad9b125d23999530ac936b87d6`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

- `dbnomics-fao-rp-page`
  - URL: `https://db.nomics.world/FAO/RP`
  - HTTP status: `200`
  - Content-Type: `text/html`
  - Content-Length: `230136`
  - Machine-readable: `false`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `d04911d041c8566339ad06a46a80572b425922ad9b125d23999530ac936b87d6`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

- `dbnomics-api-docs`
  - URL: `https://api.db.nomics.world/v22/apidocs`
  - HTTP status: `200`
  - Content-Type: `text/html; charset=utf-8`
  - Content-Length: `3140`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `3140`
  - Sample sha256: `d2d911c8f47b5a639a24e2edf0074caa6db8346702ef5a055b2054d8e91c098a`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

- `dbnomics-api-fao-qcl-dataset`
  - URL: `https://api.db.nomics.world/v22/datasets/FAO/QCL`
  - HTTP status: `200`
  - Content-Type: `application/json`
  - Content-Length: `15175`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `063bf2ba7edbc3de9e025dd5d88b8652713b00b4ea5efae79d306f4b4b34fbcd`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

- `dbnomics-api-fao-rp-dataset`
  - URL: `https://api.db.nomics.world/v22/datasets/FAO/RP`
  - HTTP status: `200`
  - Content-Type: `application/json`
  - Content-Length: `7965`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `aabd8708ac1af39376d1d798797fbb5bf7a1864d5640d33f9c710a85dcbe3388`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

- `dbnomics-api-fao-qcl-slaughter-sample`
  - URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1017.5320`
  - HTTP status: `200`
  - Content-Type: `application/json`
  - Content-Length: `15991`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `ef51c9368e37804bcd47c47c67f59cc7d6c32327246ce5870aa7b57b8c7042a3`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

- `dbnomics-api-fao-rp-insecticides-sample`
  - URL: `https://api.db.nomics.world/v22/series/FAO/RP/1.1309.5157`
  - HTTP status: `200`
  - Content-Type: `application/json`
  - Content-Length: `8747`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `03717366fd505e78db68da65b7cb3b59e7da5ea7fd1a17d303862d6d0e32ffac`
  - Next action: Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot.

## Failed endpoints
None.

## Legal/source status
- FAO remains underlying provider.
- DBnomics is a mirror/distributor and must be cited if used.
- FAO Statistical Database Terms remain the provider legal basis.
- DBnomics mirror/distribution suitability remains subject to ChatGPT review.
- No row is parse-eligible yet.

## Data promotion status
No animal values parsed. No countries promoted. No final release artifacts regenerated. WDI rows remain candidate-only. OWID mirrors were not used. Fishcount was not retried or bypassed.

## Validation
Review command:

```bash
python3 scripts/review_dbnomics_fao_endpoints.py 2>&1 | tee dbnomics-fao-endpoint-review.log
```

Output:

```text
wrote dbnomics-fao-endpoint-review.csv
wrote dbnomics-fao-endpoint-review.json
wrote dbnomics-fao-endpoint-review.md
dbnomics-fao-provider-page 200 metadata_review_required text/html
dbnomics-fao-qcl-page 200 metadata_review_required text/html
dbnomics-fao-rp-page 200 metadata_review_required text/html
dbnomics-api-docs 200 metadata_review_required text/html; charset=utf-8
dbnomics-api-fao-qcl-dataset 200 metadata_review_required application/json
dbnomics-api-fao-rp-dataset 200 metadata_review_required application/json
dbnomics-api-fao-qcl-slaughter-sample 200 metadata_review_required application/json
dbnomics-api-fao-rp-insecticides-sample 200 metadata_review_required application/json
```

Validation commands/output:

```text
$ python3 -m json.tool dbnomics-fao-endpoint-review.json > /tmp/dbnomics-fao-endpoint-review.pretty.json
$ python3 - <<'PY' | tee dbnomics-fao-endpoint-review-validation.log
rows: 8
recommended_status: {'metadata_review_required': 8}
DBnomics FAO endpoint review validation passed
```

## Artifacts generated
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/scripts/review_dbnomics_fao_endpoints.py` (10743 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-endpoint-review.csv` (10177 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-endpoint-review.json` (16541 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-endpoint-review.md` (2933 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-endpoint-review.log` (695 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-endpoint-review-validation.log` (107 bytes)

## Next question for ChatGPT
Do any DBnomics FAO endpoints qualify for a full source-snapshot fetch next? If yes, which exact endpoint should Codex fetch first and what source-snapshot manifest fields should be used? If no, should all animal-source layers remain blocked pending manual source acquisition or permission?
