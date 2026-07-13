# Country data candidate validation - iteration 13 QCL series URL validation

## Purpose
Validate 14 inferred DBnomics FAO/QCL series URLs with observations disabled. No numeric parsing, no country promotion, no production artifact regeneration.

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
- `dbnomics-fao-qcl-series-query-plan.csv`
- 14 rows with `first_fetch_scope=candidate_validation_scope`

## Outputs
- `dbnomics-fao-qcl-series-url-validation.csv/json`
- `dbnomics-fao-qcl-series-url-validation.md`

## Validation summary
- row count: `14`
- metadata_validation_status: `{'validated_metadata_only': 4, 'metadata_validation_failed': 10}`
- observations_present: `{'false': 14}`
- guard_exit: `1`

## Validated series URLs
- `1.867.5320`
  - item: `867` Meat of cattle with the bone, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.867.5320?observations=false&metadata=true`
  - response series name: `Producing Animals/Slaughtered (5320) – Armenia – Meat of cattle with the bone, fresh or chilled`
  - metadata_validation_status: `validated_metadata_only`
- `1.977.5320`
  - item: `977` Meat of sheep, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.977.5320?observations=false&metadata=true`
  - response series name: `Producing Animals/Slaughtered (5320) – Armenia – Meat of sheep, fresh or chilled`
  - metadata_validation_status: `validated_metadata_only`
- `1.1017.5320`
  - item: `1017` Meat of goat, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1017.5320?observations=false&metadata=true`
  - response series name: `Producing Animals/Slaughtered (5320) – Armenia – Meat of goat, fresh or chilled`
  - metadata_validation_status: `validated_metadata_only`
- `1.1035.5320`
  - item: `1035` Meat of pig with the bone, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1035.5320?observations=false&metadata=true`
  - response series name: `Producing Animals/Slaughtered (5320) – Armenia – Meat of pig with the bone, fresh or chilled`
  - metadata_validation_status: `validated_metadata_only`

## Failed or mismatched series URLs
- `1.947.5320`
  - item: `947` Meat of buffalo, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.947.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1058.5320`
  - item: `1058` Meat of chickens, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1058.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1069.5320`
  - item: `1069` Meat of ducks, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1069.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1073.5320`
  - item: `1073` Meat of geese, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1073.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1080.5320`
  - item: `1080` Meat of turkeys, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1080.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1097.5320`
  - item: `1097` Horse meat, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1097.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1108.5320`
  - item: `1108` Meat of asses, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1108.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1111.5320`
  - item: `1111` Meat of mules, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1111.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1127.5320`
  - item: `1127` Meat of camels, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1127.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`
- `1.1141.5320`
  - item: `1141` Meat of rabbits and hares, fresh or chilled
  - metadata-only URL: `https://api.db.nomics.world/v22/series/FAO/QCL/1.1141.5320?observations=false&metadata=true`
  - http_status: `404`
  - metadata_validation_status: `metadata_validation_failed`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''`

## Data promotion status
No observations fetched. No animal values parsed. No countries promoted. No final release artifacts regenerated. WDI rows remain candidate-only.

## Validation
Script command:

```bash
python3 scripts/validate_dbnomics_fao_qcl_series_urls.py 2>&1 | tee dbnomics-fao-qcl-series-url-validation.log
```

Script output:

```text
selected_rows: 14
wrote dbnomics-fao-qcl-series-url-validation.csv
wrote dbnomics-fao-qcl-series-url-validation.json
wrote dbnomics-fao-qcl-series-url-validation.md
metadata_validation_status: {'validated_metadata_only': 4, 'metadata_validation_failed': 10}
observations_present: {'false': 14}
1.867.5320 200 validated_metadata_only 1.867.5320 1 867 5320 false
1.947.5320 404 metadata_validation_failed     false
1.977.5320 200 validated_metadata_only 1.977.5320 1 977 5320 false
1.1017.5320 200 validated_metadata_only 1.1017.5320 1 1017 5320 false
1.1035.5320 200 validated_metadata_only 1.1035.5320 1 1035 5320 false
1.1058.5320 404 metadata_validation_failed     false
1.1069.5320 404 metadata_validation_failed     false
1.1073.5320 404 metadata_validation_failed     false
1.1080.5320 404 metadata_validation_failed     false
1.1097.5320 404 metadata_validation_failed     false
1.1108.5320 404 metadata_validation_failed     false
1.1111.5320 404 metadata_validation_failed     false
1.1127.5320 404 metadata_validation_failed     false
1.1141.5320 404 metadata_validation_failed     false
```

JSON validation command:

```bash
python3 -m json.tool dbnomics-fao-qcl-series-url-validation.json > /tmp/dbnomics-fao-qcl-series-url-validation.pretty.json
```

Guard output:

```text
rows: 14
metadata_validation_status: {'validated_metadata_only': 4, 'metadata_validation_failed': 10}
observations_present: {'false': 14}
QCL_SERIES_URL_VALIDATION_FAILED
('1.947.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.947.5320', 'bad dataset', '')
('1.947.5320', 'bad provider', '')
('1.947.5320', 'series code mismatch', '')
('1.947.5320', 'bad element', '')
('1.947.5320', 'bad area', '', '1')
('1.947.5320', 'bad item', '', '947')
('1.1058.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1058.5320', 'bad dataset', '')
('1.1058.5320', 'bad provider', '')
('1.1058.5320', 'series code mismatch', '')
('1.1058.5320', 'bad element', '')
('1.1058.5320', 'bad area', '', '1')
('1.1058.5320', 'bad item', '', '1058')
('1.1069.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1069.5320', 'bad dataset', '')
('1.1069.5320', 'bad provider', '')
('1.1069.5320', 'series code mismatch', '')
('1.1069.5320', 'bad element', '')
('1.1069.5320', 'bad area', '', '1')
('1.1069.5320', 'bad item', '', '1069')
('1.1073.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1073.5320', 'bad dataset', '')
('1.1073.5320', 'bad provider', '')
('1.1073.5320', 'series code mismatch', '')
('1.1073.5320', 'bad element', '')
('1.1073.5320', 'bad area', '', '1')
('1.1073.5320', 'bad item', '', '1073')
('1.1080.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1080.5320', 'bad dataset', '')
('1.1080.5320', 'bad provider', '')
('1.1080.5320', 'series code mismatch', '')
('1.1080.5320', 'bad element', '')
('1.1080.5320', 'bad area', '', '1')
('1.1080.5320', 'bad item', '', '1080')
('1.1097.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1097.5320', 'bad dataset', '')
('1.1097.5320', 'bad provider', '')
('1.1097.5320', 'series code mismatch', '')
('1.1097.5320', 'bad element', '')
('1.1097.5320', 'bad area', '', '1')
('1.1097.5320', 'bad item', '', '1097')
('1.1108.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1108.5320', 'bad dataset', '')
('1.1108.5320', 'bad provider', '')
('1.1108.5320', 'series code mismatch', '')
('1.1108.5320', 'bad element', '')
('1.1108.5320', 'bad area', '', '1')
('1.1108.5320', 'bad item', '', '1108')
('1.1111.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1111.5320', 'bad dataset', '')
('1.1111.5320', 'bad provider', '')
('1.1111.5320', 'series code mismatch', '')
('1.1111.5320', 'bad element', '')
('1.1111.5320', 'bad area', '', '1')
('1.1111.5320', 'bad item', '', '1111')
('1.1127.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1127.5320', 'bad dataset', '')
('1.1127.5320', 'bad provider', '')
('1.1127.5320', 'series code mismatch', '')
('1.1127.5320', 'bad element', '')
('1.1127.5320', 'bad area', '', '1')
('1.1127.5320', 'bad item', '', '1127')
('1.1141.5320', 'not validated', 'metadata_validation_failed', "<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_element=''; response_dimensions_area=''; response_dimensions_item=''")
('1.1141.5320', 'bad dataset', '')
('1.1141.5320', 'bad provider', '')
('1.1141.5320', 'series code mismatch', '')
('1.1141.5320', 'bad element', '')
('1.1141.5320', 'bad area', '', '1')
('1.1141.5320', 'bad item', '', '1141')
guard_exit=1
```

## Artifacts generated
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/scripts/validate_dbnomics_fao_qcl_series_urls.py` (12703 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-series-url-validation.csv` (11688 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-series-url-validation.json` (23200 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-series-url-validation.md` (7090 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-series-url-validation.log` (1097 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/dbnomics-fao-qcl-series-url-validation-guard.log` (5246 bytes)

## Next question for ChatGPT
Should Codex next:
1. review area-code mapping against Painmaps place IDs,
2. fetch FAO/RP metadata for insecticide proxy,
3. fetch observations for a tiny metadata-validated pilot sample,
4. keep DBnomics blocked pending legal review,
5. or stop?
