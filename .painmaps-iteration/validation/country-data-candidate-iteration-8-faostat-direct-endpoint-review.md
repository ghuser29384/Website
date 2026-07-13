# Country data candidate validation - iteration 8 FAOSTAT direct endpoint review

## Purpose
Review exact direct FAOSTAT endpoint candidates for blocked animal-context layers. No numeric parsing, no country promotion, no production artifact regeneration.

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
- `fao-terms`: `https://www.fao.org/contact-us/terms/db-terms-of-use/en/` -> HTTP `200`, `metadata_review_required`, Content-Type `text/html; charset=utf-8`
- `faostat-qcl-page`: `https://www.fao.org/faostat/en/#data/QCL` -> HTTP `206`, `metadata_review_required`, Content-Type `text/html`
- `faostat-rp-page`: `https://www.fao.org/faostat/en/#data/RP` -> HTTP `206`, `metadata_review_required`, Content-Type `text/html`
- `faostat-api-root`: `https://fenixservices.fao.org/faostat/api/v1/` -> HTTP `521`, `blocked_endpoint_not_found`, Content-Type `text/plain; charset=UTF-8`
- `faostat-domain-codes`: `https://fenixservices.fao.org/faostat/api/v1/Definitions/DomainCodes/DomainCodes` -> HTTP `521`, `blocked_endpoint_not_found`, Content-Type `text/plain; charset=UTF-8`
- `faostat-element-codes`: `https://fenixservices.fao.org/faostat/api/v1/Definitions/ElementCodes` -> HTTP `521`, `blocked_endpoint_not_found`, Content-Type `text/plain; charset=UTF-8`
- `faostat-item-codes`: `https://fenixservices.fao.org/faostat/api/v1/Definitions/ItemCodes` -> HTTP `521`, `blocked_endpoint_not_found`, Content-Type `text/plain; charset=UTF-8`
- `faostat-qcl-bulk-normalized`: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data_(Normalized).zip` -> HTTP `403`, `blocked_endpoint_not_found`, Content-Type `text/html`
- `faostat-qcl-bulk-wide`: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data.zip` -> HTTP `403`, `blocked_endpoint_not_found`, Content-Type `text/html`
- `faostat-pesticides-bulk-normalized`: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data_(Normalized).zip` -> HTTP `403`, `blocked_endpoint_not_found`, Content-Type `text/html`
- `faostat-pesticides-bulk-wide`: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data.zip` -> HTTP `403`, `blocked_endpoint_not_found`, Content-Type `text/html`

## Review summary
- `blocked_endpoint_not_found`: 8
- `metadata_review_required`: 3

## Fetch snapshot candidates
None. No tested FAOSTAT bulk endpoint reached `fetch_snapshot_candidate`; all four bulk ZIP candidates returned HTTP `403` in the range-check review. Do not fetch full raw ZIPs until ChatGPT reviews corrected or alternative exact endpoints.

## Metadata review candidates
- `fao-terms`
  - URL: `https://www.fao.org/contact-us/terms/db-terms-of-use/en/`
  - HTTP status: `200`
  - Content-Type: `text/html; charset=utf-8`
  - Machine-readable: `false`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `4096`
  - Sample sha256: `cbfe41c62289ecbae5f53b6a8b0e3f9cac54d490f085487b891014be315da30b`
  - Next action: Use as legal/terms basis only; not a data snapshot.
- `faostat-qcl-page`
  - URL: `https://www.fao.org/faostat/en/#data/QCL`
  - HTTP status: `206`
  - Content-Type: `text/html`
  - Machine-readable: `false`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `3752`
  - Sample sha256: `e7d6c678671ba94e79217f3ed76de34cf93d3414d9677cedecb66c84089846af`
  - Next action: Inspect metadata for exact domain/dataset names and third-party exceptions; do not parse values.
- `faostat-rp-page`
  - URL: `https://www.fao.org/faostat/en/#data/RP`
  - HTTP status: `206`
  - Content-Type: `text/html`
  - Machine-readable: `false`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `3752`
  - Sample sha256: `e7d6c678671ba94e79217f3ed76de34cf93d3414d9677cedecb66c84089846af`
  - Next action: Inspect metadata for exact domain/dataset names and third-party exceptions; do not parse values.

## Failed or blocked endpoints
- `faostat-api-root`
  - URL: `https://fenixservices.fao.org/faostat/api/v1/`
  - HTTP status: `521`
  - Content-Type: `text/plain; charset=UTF-8`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `16`
  - Sample sha256: `4558ae09802e147610ebdb88e4472fe625c897af9a18b04d47dfcdb6b563a138`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 521: '<none>'>`
- `faostat-domain-codes`
  - URL: `https://fenixservices.fao.org/faostat/api/v1/Definitions/DomainCodes/DomainCodes`
  - HTTP status: `521`
  - Content-Type: `text/plain; charset=UTF-8`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `16`
  - Sample sha256: `4558ae09802e147610ebdb88e4472fe625c897af9a18b04d47dfcdb6b563a138`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 521: '<none>'>`
- `faostat-element-codes`
  - URL: `https://fenixservices.fao.org/faostat/api/v1/Definitions/ElementCodes`
  - HTTP status: `521`
  - Content-Type: `text/plain; charset=UTF-8`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `16`
  - Sample sha256: `4558ae09802e147610ebdb88e4472fe625c897af9a18b04d47dfcdb6b563a138`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 521: '<none>'>`
- `faostat-item-codes`
  - URL: `https://fenixservices.fao.org/faostat/api/v1/Definitions/ItemCodes`
  - HTTP status: `521`
  - Content-Type: `text/plain; charset=UTF-8`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `false`
  - Sample bytes: `16`
  - Sample sha256: `4558ae09802e147610ebdb88e4472fe625c897af9a18b04d47dfcdb6b563a138`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 521: '<none>'>`
- `faostat-qcl-bulk-normalized`
  - URL: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data_(Normalized).zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `true`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 403: 'Forbidden'>`
- `faostat-qcl-bulk-wide`
  - URL: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data.zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `true`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 403: 'Forbidden'>`
- `faostat-pesticides-bulk-normalized`
  - URL: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data_(Normalized).zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `true`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 403: 'Forbidden'>`
- `faostat-pesticides-bulk-wide`
  - URL: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data.zip`
  - HTTP status: `403`
  - Content-Type: `text/html`
  - Machine-readable: `true`
  - Appears metadata: `true`
  - Appears data: `true`
  - Sample bytes: `512`
  - Sample sha256: `65f2a4c9f94ad951364f15549aeaea87e49bfd86aabe2d5714aec22c8ba328b3`
  - Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
  - Error: `<HTTPError 403: 'Forbidden'>`

## License/terms basis
FAO Statistical Database Terms; CC BY 4.0 default unless metadata/webpage says otherwise; attribution required; no FAO endorsement; third-party exceptions must be checked.

## Data promotion status
No numeric animal values parsed. No countries promoted. No final release artifacts regenerated. WDI rows remain candidate-only. OWID mirrors were not used. Fishcount was not retried or bypassed.

## Validation
Review command:

```bash
python3 scripts/review_faostat_direct_endpoints.py 2>&1 | tee faostat-direct-endpoint-review.log
```

Output:

```text
wrote faostat-direct-endpoint-review.csv
wrote faostat-direct-endpoint-review.json
wrote faostat-direct-endpoint-review.md
fao-terms 200 metadata_review_required text/html; charset=utf-8
faostat-qcl-page 206 metadata_review_required text/html
faostat-rp-page 206 metadata_review_required text/html
faostat-api-root 521 blocked_endpoint_not_found text/plain; charset=UTF-8
faostat-domain-codes 521 blocked_endpoint_not_found text/plain; charset=UTF-8
faostat-element-codes 521 blocked_endpoint_not_found text/plain; charset=UTF-8
faostat-item-codes 521 blocked_endpoint_not_found text/plain; charset=UTF-8
faostat-qcl-bulk-normalized 403 blocked_endpoint_not_found text/html
faostat-qcl-bulk-wide 403 blocked_endpoint_not_found text/html
faostat-pesticides-bulk-normalized 403 blocked_endpoint_not_found text/html
faostat-pesticides-bulk-wide 403 blocked_endpoint_not_found text/html
```

Validation commands/output:

```text
$ python3 -m json.tool faostat-direct-endpoint-review.json > /tmp/faostat-direct-endpoint-review.pretty.json
$ python3 - <<'PY'
rows: 11
recommended_status: {'metadata_review_required': 3, 'blocked_endpoint_not_found': 8}
FAOSTAT direct endpoint review validation passed
```

## Artifacts generated
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/scripts/review_faostat_direct_endpoints.py` (12712 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-direct-endpoint-review.csv` (13034 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-direct-endpoint-review.json` (21451 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-direct-endpoint-review.md` (4124 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-direct-endpoint-review.log` (883 bytes)
- `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07/faostat-direct-endpoint-review-validation.log` (271 bytes)

## Next question for ChatGPT
Which exact FAOSTAT `fetch_snapshot_candidate` should Codex fetch as a full source snapshot first, and what exact source-snapshot manifest fields should it use? Since no tested bulk ZIP endpoint resolved as `fetch_snapshot_candidate` in this run, should Codex test corrected FAOSTAT bulk/API URLs, inspect a specific FAOSTAT metadata endpoint, or keep FAOSTAT blocked pending corrected endpoints?
