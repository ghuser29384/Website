# FAOSTAT direct endpoint review

Generated: 2026-07-08T08:09:04.794372Z

## Scope

Endpoint reachability, license-basis, and snapshot-candidate review only. No numeric parsing.

## Results

### fao-terms

- URL: `https://www.fao.org/contact-us/terms/db-terms-of-use/en/`
- HTTP status: `200`
- Content-Type: `text/html; charset=utf-8`
- Machine-readable: `false`
- Recommended status: `metadata_review_required`
- Next action: Use as legal/terms basis only; not a data snapshot.

### faostat-qcl-page

- URL: `https://www.fao.org/faostat/en/#data/QCL`
- HTTP status: `206`
- Content-Type: `text/html`
- Machine-readable: `false`
- Recommended status: `metadata_review_required`
- Next action: Inspect metadata for exact domain/dataset names and third-party exceptions; do not parse values.

### faostat-rp-page

- URL: `https://www.fao.org/faostat/en/#data/RP`
- HTTP status: `206`
- Content-Type: `text/html`
- Machine-readable: `false`
- Recommended status: `metadata_review_required`
- Next action: Inspect metadata for exact domain/dataset names and third-party exceptions; do not parse values.

### faostat-api-root

- URL: `https://fenixservices.fao.org/faostat/api/v1/`
- HTTP status: `521`
- Content-Type: `text/plain; charset=UTF-8`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 521: '<none>'>`

### faostat-domain-codes

- URL: `https://fenixservices.fao.org/faostat/api/v1/Definitions/DomainCodes/DomainCodes`
- HTTP status: `521`
- Content-Type: `text/plain; charset=UTF-8`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 521: '<none>'>`

### faostat-element-codes

- URL: `https://fenixservices.fao.org/faostat/api/v1/Definitions/ElementCodes`
- HTTP status: `521`
- Content-Type: `text/plain; charset=UTF-8`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 521: '<none>'>`

### faostat-item-codes

- URL: `https://fenixservices.fao.org/faostat/api/v1/Definitions/ItemCodes`
- HTTP status: `521`
- Content-Type: `text/plain; charset=UTF-8`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 521: '<none>'>`

### faostat-qcl-bulk-normalized

- URL: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data_(Normalized).zip`
- HTTP status: `403`
- Content-Type: `text/html`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 403: 'Forbidden'>`

### faostat-qcl-bulk-wide

- URL: `https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data.zip`
- HTTP status: `403`
- Content-Type: `text/html`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 403: 'Forbidden'>`

### faostat-pesticides-bulk-normalized

- URL: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data_(Normalized).zip`
- HTTP status: `403`
- Content-Type: `text/html`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 403: 'Forbidden'>`

### faostat-pesticides-bulk-wide

- URL: `https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data.zip`
- HTTP status: `403`
- Content-Type: `text/html`
- Machine-readable: `true`
- Recommended status: `blocked_endpoint_not_found`
- Next action: Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL.
- Error: `<HTTPError 403: 'Forbidden'>`

