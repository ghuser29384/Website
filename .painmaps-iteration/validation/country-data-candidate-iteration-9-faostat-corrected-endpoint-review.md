# Country data candidate validation - iteration 9 FAOSTAT corrected endpoint review

## Purpose
Retest corrected FAOSTAT bulk URL candidates using no-Range streaming probes. No full ZIP fetch, no numeric parsing, no country promotion, no production artifact regeneration.

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
- `faostat-qcl-production-prefix-normalized`: `https://bulks-faostat.fao.org/production/Production_Crops_Livestock_Products_E_All_Data_(Normalized).zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`
- `faostat-qcl-production-prefix-wide`: `https://bulks-faostat.fao.org/production/Production_Crops_Livestock_Products_E_All_Data.zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`
- `faostat-qcl-no-prefix-normalized`: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data_(Normalized).zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`
- `faostat-qcl-no-prefix-wide`: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data.zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`
- `faostat-pesticides-inputs-prefix-normalized`: `https://bulks-faostat.fao.org/inputs/Inputs_Pesticides_Use_E_All_Data_(Normalized).zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`
- `faostat-pesticides-inputs-prefix-wide`: `https://bulks-faostat.fao.org/inputs/Inputs_Pesticides_Use_E_All_Data.zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`
- `faostat-pesticides-no-prefix-normalized`: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data_(Normalized).zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`
- `faostat-pesticides-no-prefix-wide`: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data.zip` -> HTTP `403`, ZIP magic `false`, `blocked_endpoint_not_found`

## Review summary
- `blocked_endpoint_not_found`: 8

## Fetch snapshot candidates
None. No corrected FAOSTAT bulk URL resolved with confirmed ZIP magic in this no-Range probe.

## Still blocked endpoints
- `faostat-qcl-production-prefix-normalized`
  - URL: `https://bulks-faostat.fao.org/production/Production_Crops_Livestock_Products_E_All_Data_(Normalized).zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

- `faostat-qcl-production-prefix-wide`
  - URL: `https://bulks-faostat.fao.org/production/Production_Crops_Livestock_Products_E_All_Data.zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

- `faostat-qcl-no-prefix-normalized`
  - URL: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data_(Normalized).zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

- `faostat-qcl-no-prefix-wide`
  - URL: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data.zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

- `faostat-pesticides-inputs-prefix-normalized`
  - URL: `https://bulks-faostat.fao.org/inputs/Inputs_Pesticides_Use_E_All_Data_(Normalized).zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

- `faostat-pesticides-inputs-prefix-wide`
  - URL: `https://bulks-faostat.fao.org/inputs/Inputs_Pesticides_Use_E_All_Data.zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

- `faostat-pesticides-no-prefix-normalized`
  - URL: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data_(Normalized).zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

- `faostat-pesticides-no-prefix-wide`
  - URL: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data.zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Content-Length: `919`
  - ZIP magic confirmed: `false`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure.
  - Error: `<HTTPError 403: 'Forbidden'>`

## Metadata review rows
None.

## License/terms basis
FAO Statistical Database Terms; CC BY 4.0 default unless metadata/webpage says otherwise; attribution required; no FAO endorsement; third-party exceptions must be checked.

## Data promotion status
No animal values parsed. No countries promoted. No final release artifacts regenerated. WDI rows remain candidate-only. OWID mirrors were not used. Fishcount was not retried or bypassed.

## Validation
Review command:

```bash
python3 scripts/review_faostat_corrected_endpoints.py 2>&1 | tee faostat-corrected-endpoint-review.log
```

Output:

```text
wrote faostat-corrected-endpoint-review.csv
wrote faostat-corrected-endpoint-review.json
wrote faostat-corrected-endpoint-review.md
faostat-qcl-production-prefix-normalized 403 false blocked_endpoint_not_found text/html
faostat-qcl-production-prefix-wide 403 false blocked_endpoint_not_found text/html
faostat-qcl-no-prefix-normalized 403 false blocked_endpoint_not_found text/html
faostat-qcl-no-prefix-wide 403 false blocked_endpoint_not_found text/html
faostat-pesticides-inputs-prefix-normalized 403 false blocked_endpoint_not_found text/html
faostat-pesticides-inputs-prefix-wide 403 false blocked_endpoint_not_found text/html
faostat-pesticides-no-prefix-normalized 403 false blocked_endpoint_not_found text/html
faostat-pesticides-no-prefix-wide 403 false blocked_endpoint_not_found text/html
```

Validation commands/output:

```text
$ python3 -m json.tool faostat-corrected-endpoint-review.json > /tmp/faostat-corrected-endpoint-review.pretty.json
$ python3 - <<'PY' | tee faostat-corrected-endpoint-review-validation.log
rows: 8
recommended_status: {'blocked_endpoint_not_found': 8}
FAOSTAT corrected endpoint review validation passed
```

## Artifacts generated
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/scripts/review_faostat_corrected_endpoints.py` (10791 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-corrected-endpoint-review.csv` (9690 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-corrected-endpoint-review.json` (15207 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-corrected-endpoint-review.md` (3234 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-corrected-endpoint-review.log` (800 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-corrected-endpoint-review-validation.log` (114 bytes)

## Next question for ChatGPT
Which exact `fetch_snapshot_candidate`, if any, should Codex fetch as a full source snapshot first? If none resolved, should Codex keep FAOSTAT blocked pending a manually verified public download URL?
