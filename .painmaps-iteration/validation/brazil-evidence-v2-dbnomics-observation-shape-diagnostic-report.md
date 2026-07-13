# Brazil evidence v2 DBnomics observation-shape diagnostic report

## Purpose
Diagnose why DBnomics FAO series metadata endpoints return no observations even with `observations=1`. No production parsing, no country promotion.

## Inputs
- `brazil-dbnomics-observations-param1-pilot.csv`
- six validated Brazil DBnomics series:
  - `21.867.5320`
  - `21.977.5320`
  - `21.1017.5320`
  - `21.1035.5320`
  - `21.1097.5320`
  - `21.1309.5157`

## Direct API variants tested
- no query string
- `?observations=1`
- `?observations=1&metadata=true`
- `?observations=1&metadata=false`
- `?observations=true`
- `?observations=1&align_periods=1`
- `?format=json&observations=1`

## Direct API diagnostic summary
- rows tested: 42
- HTTP status counts: `{'200': 42}`
- observation_shape_status counts: `{'no_candidate_observation_path_found': 42}`
- any candidate observation paths found: none
- `_meta.args.observations` changed by variant:
  - `no_query`: `False` for 6 rows
  - all six observation-query variants: `True` for 6 rows each
- `series.docs[0]` never contained `value`, `values`, `period`, `periods`, or `observations`.
- `series.docs[0]` keys for every variant were: `dataset_code|dataset_name|dimensions|indexed_at|provider_code|series_code|series_name`

Generated candidate-only diagnostic artifacts:
- `data/candidates/brazil_evidence_pack_v2_for_codex/scripts/diagnose_dbnomics_observation_shapes.py`
- `data/candidates/brazil_evidence_pack_v2_for_codex/dbnomics-observation-shape-diagnostics.csv`
- `data/candidates/brazil_evidence_pack_v2_for_codex/dbnomics-observation-shape-diagnostics.json`
- `data/candidates/brazil_evidence_pack_v2_for_codex/dbnomics-observation-shape-diagnostics.md`
- `data/candidates/brazil_evidence_pack_v2_for_codex/dbnomics-observation-shape-diagnostics.log`
- `data/candidates/brazil_evidence_pack_v2_for_codex/dbnomics-observation-shape-diagnostics-guard.log`
- `data/candidates/brazil_evidence_pack_v2_for_codex/diagnostic-snapshots/dbnomics-observation-shapes/`

## Python client diagnostic
The official `dbnomics` Python client was tested in an isolated temporary venv at `/tmp/painmaps-dbnomics-client-test`. It was not added as a project dependency.

Install/import status:
- `dbnomics==1.2.7` installed in `/tmp`.
- `import_status: ok`

Observed client messages during fetch:
- `Could not load series observations: {'dataset_code': 'QCL', 'message': 'Could not load series observations', 'provider_code': 'FAO', 'series_code': '21.867.5320'}`
- `Could not load series observations: {'dataset_code': 'RP', 'message': 'Could not load series observations', 'provider_code': 'FAO', 'series_code': '21.1309.5157'}`

Client output for `FAO/QCL/21.867.5320`:
- shape: `(0, 16)`
- columns: `['@frequency', 'provider_code', 'dataset_code', 'dataset_name', 'series_code', 'series_name', 'original_period', 'period', 'original_value', 'value', 'element', 'area', 'item', 'Element', 'Area', 'Item']`
- has_period: `True`
- has_value: `True`
- first rows: empty dataframe

Client output for `FAO/RP/21.1309.5157`:
- shape: `(0, 16)`
- columns: `['@frequency', 'provider_code', 'dataset_code', 'dataset_name', 'series_code', 'series_name', 'original_period', 'period', 'original_value', 'value', 'element', 'area', 'item', 'Element', 'Area', 'Item']`
- has_period: `True`
- has_value: `True`
- first rows: empty dataframe

Client diagnostic file:
- `data/candidates/brazil_evidence_pack_v2_for_codex/dbnomics-python-client-diagnostic.txt`

## Data status
- no final evidence card
- no production rows
- no promotion
- no release regeneration
- candidate-only diagnostics
- no OWID/Fishcount numeric parsing
- no inferred missing values
- no move to India

## Validation
Commands run:

```bash
python3 -m py_compile scripts/diagnose_dbnomics_observation_shapes.py
python3 scripts/diagnose_dbnomics_observation_shapes.py 2>&1 | tee dbnomics-observation-shape-diagnostics.log
python3 -m json.tool dbnomics-observation-shape-diagnostics.json > /tmp/dbnomics-observation-shape-diagnostics.pretty.json
python3 - <<'PY' | tee dbnomics-observation-shape-diagnostics-guard.log
# guard from ChatGPT instruction
PY
python3 -m venv /tmp/painmaps-dbnomics-client-test
source /tmp/painmaps-dbnomics-client-test/bin/activate
python -m pip install --upgrade pip dbnomics
python - <<'PY' | tee dbnomics-python-client-diagnostic.txt
# isolated client diagnostic from ChatGPT instruction
PY
deactivate || true
```

Direct diagnostic output:

```text
diagnostic_rows: 42
http_status: {'200': 42}
observation_shape_status: {'no_candidate_observation_path_found': 42}
candidate_observation_path: {}
wrote dbnomics-observation-shape-diagnostics.csv
wrote dbnomics-observation-shape-diagnostics.json
wrote dbnomics-observation-shape-diagnostics.md
```

Guard output:

```text
diagnostic_rows: 42
http_status: {'200': 42}
extraction_status: {'no_candidate_observation_path_found': 42}
candidate_observation_path: {}
DBnomics observation-shape diagnostic guard passed
```

Note:
- The instruction's initial `find ... | xargs dirname` directory lookup failed on the local iCloud path because the path contains spaces. The target file existed, so Codex continued with the same located file using shell-safe quoting: `BRAZIL_DIR="$(dirname "$FOUND")"`.

Current relevant git status:

```text
?? .painmaps-iteration/
?? data/candidates/brazil_evidence_pack_v2_for_codex/
```

## Next question for ChatGPT
Given the direct API and Python-client diagnostics, should Codex next:
1. use a discovered observation path to make a tiny candidate-only value extraction,
2. keep DBnomics blocked for observations,
3. inspect DBnomics API/openapi internals further,
4. switch to another FAO access path,
5. or stop?
