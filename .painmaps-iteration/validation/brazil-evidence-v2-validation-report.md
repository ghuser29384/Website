# Brazil evidence v2 validation report

## Scope
Candidate-only Brazil evidence staging pack validation. No OWID/Fishcount numeric parsing, no Fishcount retry/bypass, no country promotion, no final release artifact regeneration, and no ranking-like outputs.

## Inputs
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/brazil_evidence_pack_v2_for_codex/brazil-target-series.csv`
- metadata URLs from `brazil-target-series.csv`
- pilot observation URLs from `brazil-target-series.csv`, fetched only after full metadata validation success

## Outputs
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/brazil_evidence_pack_v2_for_codex/brazil-series-metadata-validation.csv`
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/brazil_evidence_pack_v2_for_codex/brazil-series-metadata-validation.json`
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/brazil_evidence_pack_v2_for_codex/brazil-series-metadata-validation.md`
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/brazil_evidence_pack_v2_for_codex/brazil-pilot-observations.csv`
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/brazil_evidence_pack_v2_for_codex/brazil-pilot-observations.json`
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/brazil_evidence_pack_v2_for_codex/brazil-pilot-observations.md`

## Metadata validation summary
- started_at: `2026-07-09T07:54:39.856201Z`
- finished_at: `2026-07-09T07:55:04.441518Z`
- rows: `15`
- metadata_validation_status: `{'validated_metadata_only': 6, 'metadata_validation_failed': 9}`
- observations_present: `{'false': 15}`

## Pilot observation summary
- rows: `0`
- skipped_reason: `metadata_validation_failed`
- pilot_rows_with_errors: `0`

## Metadata blockers
- `21.947.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1058.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1069.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1073.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1080.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1108.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1111.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1127.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`
- `21.1141.5320`
  - http_status: `404`
  - error: `<HTTPError 404: 'NOT FOUND'>; http_status=404; response_dataset_code=''; response_provider_code=''; response_series_code=''; response_dimensions_area=''; response_dimensions_item=''; response_dimensions_element=''`

## Staging decision
All Brazil rows remain staging-only context/proxy evidence until ChatGPT reviews source, license, method, comparability, and UX coverage-honesty gates.

## Next question for ChatGPT
Should Codex keep this pack blocked pending review, inspect exact local files, apply an exact patch, run exact validation commands, or stop?
