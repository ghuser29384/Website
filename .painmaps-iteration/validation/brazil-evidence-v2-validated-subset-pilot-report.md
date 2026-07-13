# Brazil evidence v2 validated-subset pilot report

## Purpose
Fetch candidate-only pilot responses only for Brazil series that passed metadata validation. No release integration, no country promotion.

## Inputs
- `brazil-series-metadata-validation.csv`
- `brazil-series-validation-decision.csv/json`
- `brazil-target-series.csv`
- `brazil_validated_subset_pilot_codex_instruction.md` from the repo root; `/mnt/data/brazil_validated_subset_pilot_codex_instruction.md` was not present in this desktop environment

## Decision split
- pilot_observation_eligible: `6`
- unavailable_exact_series_code: `9`
- blocked_metadata_validation_failed: `0`

## Pilot observations
- fetched pilot response rows: `6`
- source snapshots written: `6`
- pilot evidence_kind: `{'direct_context': 5, 'proxy_context': 1}`
- rows missing raw_value or reference_period: `6`

- `21.867.5320`
  - layer_id: `fao_qcl_brazil_slaughter_context`
  - issue_id: `issue.factory-farmed-animals`
  - item_label: `Meat of cattle with the bone, fresh or chilled`
  - raw_value: ``
  - unit_label: `head`
  - reference_period: ``
  - evidence_kind: `direct_context`
  - source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-867-5320.json`
  - checksum: `ea4125b4d2b5fc682fa4f8a3ec7cd6622154195890231f99a45ed689eccfa1c4`
  - legal_status: `review_stage_not_release_approved`
  - promotion_decision: `not_promoted_candidate_only`
  - caveat: FAO/QCL producing-animals/slaughtered context via DBnomics metadata/distribution path; not a welfare or suffering estimate; candidate-only pending legal, source, method, and UX review. Latest non-null observation was not present in the fetched DBnomics response.
- `21.977.5320`
  - layer_id: `fao_qcl_brazil_slaughter_context`
  - issue_id: `issue.factory-farmed-animals`
  - item_label: `Meat of sheep, fresh or chilled`
  - raw_value: ``
  - unit_label: `head`
  - reference_period: ``
  - evidence_kind: `direct_context`
  - source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-977-5320.json`
  - checksum: `b44f2b387b5cf8118358b76d3d2aa5abd853f32dc51428fe2cbbdf220179666e`
  - legal_status: `review_stage_not_release_approved`
  - promotion_decision: `not_promoted_candidate_only`
  - caveat: FAO/QCL producing-animals/slaughtered context via DBnomics metadata/distribution path; not a welfare or suffering estimate; candidate-only pending legal, source, method, and UX review. Latest non-null observation was not present in the fetched DBnomics response.
- `21.1017.5320`
  - layer_id: `fao_qcl_brazil_slaughter_context`
  - issue_id: `issue.factory-farmed-animals`
  - item_label: `Meat of goat, fresh or chilled`
  - raw_value: ``
  - unit_label: `head`
  - reference_period: ``
  - evidence_kind: `direct_context`
  - source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1017-5320.json`
  - checksum: `4d2e7abf80d59c9c0d641febbb2c9ff65a77e6f6499a37108ec3a570b3d85cd9`
  - legal_status: `review_stage_not_release_approved`
  - promotion_decision: `not_promoted_candidate_only`
  - caveat: FAO/QCL producing-animals/slaughtered context via DBnomics metadata/distribution path; not a welfare or suffering estimate; candidate-only pending legal, source, method, and UX review. Latest non-null observation was not present in the fetched DBnomics response.
- `21.1035.5320`
  - layer_id: `fao_qcl_brazil_slaughter_context`
  - issue_id: `issue.factory-farmed-animals`
  - item_label: `Meat of pig with the bone, fresh or chilled`
  - raw_value: ``
  - unit_label: `head`
  - reference_period: ``
  - evidence_kind: `direct_context`
  - source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1035-5320.json`
  - checksum: `41a823bfa4ddc8bc88e540423e63bff822a46a2bba30827987a35082304dffaa`
  - legal_status: `review_stage_not_release_approved`
  - promotion_decision: `not_promoted_candidate_only`
  - caveat: FAO/QCL producing-animals/slaughtered context via DBnomics metadata/distribution path; not a welfare or suffering estimate; candidate-only pending legal, source, method, and UX review. Latest non-null observation was not present in the fetched DBnomics response.
- `21.1097.5320`
  - layer_id: `fao_qcl_brazil_slaughter_context`
  - issue_id: `issue.factory-farmed-animals`
  - item_label: `Horse meat, fresh or chilled`
  - raw_value: ``
  - unit_label: `head`
  - reference_period: ``
  - evidence_kind: `direct_context`
  - source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1097-5320.json`
  - checksum: `52678c630eec4b3ac5de8e633f3ed2ac949c608d80e279c24c9b64e041fbde89`
  - legal_status: `review_stage_not_release_approved`
  - promotion_decision: `not_promoted_candidate_only`
  - caveat: FAO/QCL producing-animals/slaughtered context via DBnomics metadata/distribution path; not a welfare or suffering estimate; candidate-only pending legal, source, method, and UX review. Latest non-null observation was not present in the fetched DBnomics response.
- `21.1309.5157`
  - layer_id: `fao_rp_brazil_insecticide_proxy_context`
  - issue_id: `issue.insect-welfare`
  - item_label: `Insecticides`
  - raw_value: ``
  - unit_label: `tonnes or source-reported unit`
  - reference_period: ``
  - evidence_kind: `proxy_context`
  - source_snapshot_id: `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1309-5157.json`
  - checksum: `906e2bb26f8ee1b0f0f7dc890700bd1a14bc66d38d773fd27f9c491acb604ac5`
  - legal_status: `review_stage_not_release_approved`
  - promotion_decision: `not_promoted_candidate_only`
  - caveat: FAO/RP insecticide-use proxy via DBnomics metadata/distribution path; not direct insect suffering evidence; candidate-only pending legal, source, method, and UX review. Latest non-null observation was not present in the fetched DBnomics response.

## Unavailable series
- `21.947.5320` — Meat of buffalo, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1058.5320` — Meat of chickens, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1069.5320` — Meat of ducks, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1073.5320` — Meat of geese, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1080.5320` — Meat of turkeys, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1108.5320` — Meat of asses, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1111.5320` — Meat of mules, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1127.5320` — Meat of camels, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.
- `21.1141.5320` — Meat of rabbits and hares, fresh or chilled
  - http_status: `404`
  - availability_status: `unavailable_exact_series_code`
  - promotion_decision: `blocked_series_not_available`
  - reason: Exact DBnomics/FAO series returned 404; do not retry or infer value.

## Source snapshots
- `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-867-5320.json`
  - series_code: `21.867.5320`
  - source_url: `https://api.db.nomics.world/v22/series/FAO/QCL/21.867.5320?observations=true&metadata=true`
  - local_path: `fetched-source-snapshots/brazil-validated-subset/snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-867-5320.json`
  - http_status: `200`
  - byte_size: `16122`
  - checksum: `ea4125b4d2b5fc682fa4f8a3ec7cd6622154195890231f99a45ed689eccfa1c4`
  - legal_status: `review_stage_not_release_approved`
- `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-977-5320.json`
  - series_code: `21.977.5320`
  - source_url: `https://api.db.nomics.world/v22/series/FAO/QCL/21.977.5320?observations=true&metadata=true`
  - local_path: `fetched-source-snapshots/brazil-validated-subset/snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-977-5320.json`
  - http_status: `200`
  - byte_size: `16107`
  - checksum: `b44f2b387b5cf8118358b76d3d2aa5abd853f32dc51428fe2cbbdf220179666e`
  - legal_status: `review_stage_not_release_approved`
- `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1017-5320.json`
  - series_code: `21.1017.5320`
  - source_url: `https://api.db.nomics.world/v22/series/FAO/QCL/21.1017.5320?observations=true&metadata=true`
  - local_path: `fetched-source-snapshots/brazil-validated-subset/snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1017-5320.json`
  - http_status: `200`
  - byte_size: `16110`
  - checksum: `4d2e7abf80d59c9c0d641febbb2c9ff65a77e6f6499a37108ec3a570b3d85cd9`
  - legal_status: `review_stage_not_release_approved`
- `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1035-5320.json`
  - series_code: `21.1035.5320`
  - source_url: `https://api.db.nomics.world/v22/series/FAO/QCL/21.1035.5320?observations=true&metadata=true`
  - local_path: `fetched-source-snapshots/brazil-validated-subset/snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1035-5320.json`
  - http_status: `200`
  - byte_size: `16123`
  - checksum: `41a823bfa4ddc8bc88e540423e63bff822a46a2bba30827987a35082304dffaa`
  - legal_status: `review_stage_not_release_approved`
- `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1097-5320.json`
  - series_code: `21.1097.5320`
  - source_url: `https://api.db.nomics.world/v22/series/FAO/QCL/21.1097.5320?observations=true&metadata=true`
  - local_path: `fetched-source-snapshots/brazil-validated-subset/snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1097-5320.json`
  - http_status: `200`
  - byte_size: `16108`
  - checksum: `52678c630eec4b3ac5de8e633f3ed2ac949c608d80e279c24c9b64e041fbde89`
  - legal_status: `review_stage_not_release_approved`
- `snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1309-5157.json`
  - series_code: `21.1309.5157`
  - source_url: `https://api.db.nomics.world/v22/series/FAO/RP/21.1309.5157?observations=true&metadata=true`
  - local_path: `fetched-source-snapshots/brazil-validated-subset/snapshot.release-candidate-2026-07-09.brazil-evidence.v2.21-1309-5157.json`
  - http_status: `200`
  - byte_size: `8865`
  - checksum: `906e2bb26f8ee1b0f0f7dc890700bd1a14bc66d38d773fd27f9c491acb604ac5`
  - legal_status: `review_stage_not_release_approved`

## Data status
- candidate-only
- no ranking
- no country promotion
- no final release artifact regeneration
- legal status remains review-stage
- DBnomics/FAO attribution and terms still require final release review
- fetched responses did not expose observation values through the supplied `pilot_observation_url` URLs, so pilot numeric values remain absent

## Validation
Run command:

```bash
python3 scripts/fetch_brazil_validated_subset_pilot_observations.py 2>&1 | tee brazil-validated-subset-pilot-observations.log
```

Run output:

```text
pilot_rows: 6
pilot_rows_missing_latest_observation: 6
unavailable_rows: 9
wrote brazil-validated-subset-pilot-observations.csv
wrote brazil-unavailable-series.csv
wrote brazil-pilot-source-snapshots.json
```

JSON validation commands:

```bash
python3 -m json.tool brazil-validated-subset-pilot-observations.json > /tmp/brazil-validated-subset-pilot-observations.pretty.json
python3 -m json.tool brazil-unavailable-series.json > /tmp/brazil-unavailable-series.pretty.json
python3 -m json.tool brazil-pilot-source-snapshots.json > /tmp/brazil-pilot-source-snapshots.pretty.json
```

Guard output:

```text
pilot_rows: 6
unavailable_rows: 9
pilot_evidence_kind: {'direct_context': 5, 'proxy_context': 1}
pilot_promotion_decision: {'not_promoted_candidate_only': 6}
BRAZIL_VALIDATED_SUBSET_PILOT_FAILED
('21.867.5320', 'missing raw_value')
('21.867.5320', 'missing reference_period')
('21.977.5320', 'missing raw_value')
('21.977.5320', 'missing reference_period')
('21.1017.5320', 'missing raw_value')
('21.1017.5320', 'missing reference_period')
('21.1035.5320', 'missing raw_value')
('21.1035.5320', 'missing reference_period')
('21.1097.5320', 'missing raw_value')
('21.1097.5320', 'missing reference_period')
('21.1309.5157', 'missing raw_value')
('21.1309.5157', 'missing reference_period')
guard_exit=1
```

## Blocker
The six eligible DBnomics pilot URLs returned HTTP 200 snapshot JSON, but the responses did not include latest non-null observation values or reference periods. The 9 failed metadata rows were not retried and remain `unavailable_exact_series_code`.

## Next question for ChatGPT
Should Codex next:
1. stop with the Brazil candidate pilot evidence,
2. inspect legal/source registry integration requirements,
3. validate area-code/place mapping,
4. add the same validated-subset pilot workflow for India,
5. or prepare a candidate-only evidence card for Brazil?
