# Brazil evidence v2 DBnomics observations=1 pilot report

## Purpose
Retry six metadata-validated Brazil DBnomics FAO series with `observations=1`, candidate-only. No release integration and no country promotion.

## Why this was needed
Previous pilot used `observations=true`, but DBnomics docs specify `observations=1`.

## Inputs
- `brazil-series-validation-decision.csv`
- 6 `pilot_observation_eligible` rows
- 9 `unavailable_exact_series_code` rows

## Outputs
- `brazil-dbnomics-observations-param1-response-shape.csv/json`
- `brazil-dbnomics-observations-param1-pilot.csv/json`
- `brazil-dbnomics-observations-param1-source-snapshots.json`
- `brazil-dbnomics-observations-param1-unavailable-series.csv/json`
- `brazil-dbnomics-observations-param1-summary.md`

## Pilot observations

### 21.867.5320 - Meat of cattle with the bone, fresh or chilled
- series_code: `21.867.5320`
- layer_id: `fao_qcl_brazil_slaughter_context`
- issue_id: `issue.factory-farmed-animals`
- item_label: `Meat of cattle with the bone, fresh or chilled`
- raw_value: ``
- unit_label: `head`
- reference_period: ``
- evidence_kind: `direct_context`
- observation_extraction_status: `no_observation_pairs_found`
- source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-867-5320.json`
- checksum: `ea4125b4d2b5fc682fa4f8a3ec7cd6622154195890231f99a45ed689eccfa1c4`
- legal_status: `review_stage_not_release_approved`
- promotion_decision: `not_promoted_candidate_only`

### 21.977.5320 - Meat of sheep, fresh or chilled
- series_code: `21.977.5320`
- layer_id: `fao_qcl_brazil_slaughter_context`
- issue_id: `issue.factory-farmed-animals`
- item_label: `Meat of sheep, fresh or chilled`
- raw_value: ``
- unit_label: `head`
- reference_period: ``
- evidence_kind: `direct_context`
- observation_extraction_status: `no_observation_pairs_found`
- source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-977-5320.json`
- checksum: `b44f2b387b5cf8118358b76d3d2aa5abd853f32dc51428fe2cbbdf220179666e`
- legal_status: `review_stage_not_release_approved`
- promotion_decision: `not_promoted_candidate_only`

### 21.1017.5320 - Meat of goat, fresh or chilled
- series_code: `21.1017.5320`
- layer_id: `fao_qcl_brazil_slaughter_context`
- issue_id: `issue.factory-farmed-animals`
- item_label: `Meat of goat, fresh or chilled`
- raw_value: ``
- unit_label: `head`
- reference_period: ``
- evidence_kind: `direct_context`
- observation_extraction_status: `no_observation_pairs_found`
- source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1017-5320.json`
- checksum: `4d2e7abf80d59c9c0d641febbb2c9ff65a77e6f6499a37108ec3a570b3d85cd9`
- legal_status: `review_stage_not_release_approved`
- promotion_decision: `not_promoted_candidate_only`

### 21.1035.5320 - Meat of pig with the bone, fresh or chilled
- series_code: `21.1035.5320`
- layer_id: `fao_qcl_brazil_slaughter_context`
- issue_id: `issue.factory-farmed-animals`
- item_label: `Meat of pig with the bone, fresh or chilled`
- raw_value: ``
- unit_label: `head`
- reference_period: ``
- evidence_kind: `direct_context`
- observation_extraction_status: `no_observation_pairs_found`
- source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1035-5320.json`
- checksum: `41a823bfa4ddc8bc88e540423e63bff822a46a2bba30827987a35082304dffaa`
- legal_status: `review_stage_not_release_approved`
- promotion_decision: `not_promoted_candidate_only`

### 21.1097.5320 - Horse meat, fresh or chilled
- series_code: `21.1097.5320`
- layer_id: `fao_qcl_brazil_slaughter_context`
- issue_id: `issue.factory-farmed-animals`
- item_label: `Horse meat, fresh or chilled`
- raw_value: ``
- unit_label: `head`
- reference_period: ``
- evidence_kind: `direct_context`
- observation_extraction_status: `no_observation_pairs_found`
- source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1097-5320.json`
- checksum: `52678c630eec4b3ac5de8e633f3ed2ac949c608d80e279c24c9b64e041fbde89`
- legal_status: `review_stage_not_release_approved`
- promotion_decision: `not_promoted_candidate_only`

### 21.1309.5157 - Insecticides
- series_code: `21.1309.5157`
- layer_id: `fao_rp_brazil_insecticide_proxy_context`
- issue_id: `issue.insect-welfare`
- item_label: `Insecticides`
- raw_value: ``
- unit_label: `source-reported unit`
- reference_period: ``
- evidence_kind: `proxy_context`
- observation_extraction_status: `no_observation_pairs_found`
- source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1309-5157.json`
- checksum: `906e2bb26f8ee1b0f0f7dc890700bd1a14bc66d38d773fd27f9c491acb604ac5`
- legal_status: `review_stage_not_release_approved`
- promotion_decision: `not_promoted_candidate_only`

## Response-shape diagnostics
- HTTP status counts: `{'200': 6}`
- JSON parse status counts: `{'parsed': 6}`
- Observation extraction status counts: `{'no_observation_pairs_found': 6}`
- Rows with raw values: `0`
- All six responses exposed `series.docs[0]` metadata keys only: `dataset_code|dataset_name|dimensions|indexed_at|provider_code|series_code|series_name`.
- No `values`, `observations`, or period/value pair structures were found in the corrected `observations=1` responses.

- `21.867.5320`: status `200`, bytes `16122`, docs `1`, extracted pairs `0`, extraction `no_observation_pairs_found`, snapshot `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-867-5320.json`
- `21.977.5320`: status `200`, bytes `16107`, docs `1`, extracted pairs `0`, extraction `no_observation_pairs_found`, snapshot `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-977-5320.json`
- `21.1017.5320`: status `200`, bytes `16110`, docs `1`, extracted pairs `0`, extraction `no_observation_pairs_found`, snapshot `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1017-5320.json`
- `21.1035.5320`: status `200`, bytes `16123`, docs `1`, extracted pairs `0`, extraction `no_observation_pairs_found`, snapshot `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1035-5320.json`
- `21.1097.5320`: status `200`, bytes `16108`, docs `1`, extracted pairs `0`, extraction `no_observation_pairs_found`, snapshot `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1097-5320.json`
- `21.1309.5157`: status `200`, bytes `8865`, docs `1`, extracted pairs `0`, extraction `no_observation_pairs_found`, snapshot `snapshot.release-candidate-2026-07-09.brazil-observations-param1.21-1309-5157.json`

## Unavailable series
- `21.947.5320` - Meat of buffalo, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1058.5320` - Meat of chickens, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1069.5320` - Meat of ducks, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1073.5320` - Meat of geese, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1080.5320` - Meat of turkeys, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1108.5320` - Meat of asses, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1111.5320` - Meat of mules, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1127.5320` - Meat of camels, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`
- `21.1141.5320` - Meat of rabbits and hares, fresh or chilled - `unavailable_exact_series_code` - `blocked_series_not_available`

## Data status
- candidate-only
- no ranking
- no country promotion
- no final release artifact regeneration
- legal status remains review-stage
- DBnomics/FAO attribution and terms still require final review

## Validation

### Pilot run
```text
pilot_rows: 6
shape_rows: 6
unavailable_rows: 9
rows_with_raw_value: 0
wrote brazil-dbnomics-observations-param1-pilot.csv
wrote brazil-dbnomics-observations-param1-response-shape.csv
wrote brazil-dbnomics-observations-param1-source-snapshots.json
wrote brazil-dbnomics-observations-param1-unavailable-series.csv
```

### JSON validation
```text
python3 -m json.tool checks passed for:
- brazil-dbnomics-observations-param1-response-shape.json
- brazil-dbnomics-observations-param1-pilot.json
- brazil-dbnomics-observations-param1-source-snapshots.json
- brazil-dbnomics-observations-param1-unavailable-series.json
```

### Guard
```text
pilot_rows: 6
shape_rows: 6
unavailable_rows: 9
extraction_status: {'no_observation_pairs_found': 6}
pilot_evidence_kind: {'direct_context': 5, 'proxy_context': 1}
pilot_promotion_decision: {'not_promoted_candidate_only': 6}
rows_with_raw_value: 0
rows_with_reference_period: 0
Brazil DBnomics observations=1 pilot guard passed
```

## Next question for ChatGPT
Should Codex next:
1. prepare a Brazil candidate-only evidence card from rows with raw values,
2. inspect DBnomics response shape further because values remain absent,
3. validate area-code/place mapping,
4. stop with the Brazil pilot evidence,
5. or move to India using the same workflow?
