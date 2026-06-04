# PainMap static site

PainMap is a public static atlas for pain-source evidence by place. The site separates direct evidence, modeled estimates, proxy aggregates, priority overlays, and boundary layers instead of presenting them as one undifferentiated score.

## Static release contract

- Route source of truth: `data/routes.json`
- Canonical measurements: `data/place-measurements.json`
- Full place index: `v1/places/index.json`
- ADM1 context overlay index: `v1/adm1/index.json`
- Coverage status: `v1/coverage.json`
- Snapshot/live overlay contract: `data/release-modes.json`
- Per-place geography discovery: `v1/places/{place_id}/neighbors.json`
- OGC-style place features: `ogc/index.json`, `ogc/collections/places/items.json`, `ogc/collections/places/item-index.json`, `ogc/collections/places/items/{place_id}.json`
- Provenance and license registry: `data/provenance-registry.json`
- JSON Schemas: `schemas/place-index.schema.json`, `schemas/adm1-context.schema.json`, `schemas/place-measurements.schema.json`, `schemas/coverage.schema.json`, `schemas/release-modes.schema.json`, `schemas/ogc-place-features.schema.json`
- Release manifest: `releases/2026-05-31/manifest.json`
- Release diff: `releases/2026-05-31/diff.json`
- Latest alias: `latest/manifest.json`
- Static API index: `data/openapi.json`
- Field budgets: `data/performance-budgets.json`
- Source freshness: `data/source-freshness.json`
- Endpoint smoke manifest: `data/endpoint-smoke.json`
- Typed clients: `clients/typescript/painmap-client.ts`, `clients/python/painmap_client.py`
- Example recipes: `examples/README.md`

Run the release artifact builder before checks:

```sh
npm run build:data
npm run check
npm run freshness:sources
npm run smoke:endpoints
```

The build step generates sitemap entries, route smoke metadata, generated country place pages, high-priority ADM1 context pages, v1 JSON files, per-place neighbor payloads, ADM1 context payloads, CSV and GeoJSON exports, full and per-country OGC-style place features, JSON Schemas, release-mode contracts, coverage and endpoint manifests, release diffs, headers, security.txt, social metadata, subresource integrity hashes, and release checksums.

`npm run check` also validates schema targets, endpoint smoke files, place-index measurement counts, release-manifest hashes, source-freshness metadata, and required QA artifacts. `npm run freshness:sources` validates the source cadence policy and scheduled release-candidate workflow. `npm run smoke:endpoints` reads `data/endpoint-smoke.json` against a local static server, checking homepage, places, OpenAPI, DCAT, coverage, OGC, client, release, and `security.txt` endpoints. The GitHub Actions workflow at `.github/workflows/painmap-static-checks.yml` runs these gates on pushes and pull requests before publishing so generated artifacts cannot drift from the committed tree; `.github/workflows/painmap-source-freshness.yml` runs weekly and opens a release-candidate PR when regenerated freshness artifacts drift.

## Data posture

The public site has no accounts, forms, payments, saved views, uploads, or personal-health workflows. The homepage defaults to snapshot mode, which uses immutable release artifacts and local static assets; live overlay mode is explicitly selected and may load current public-source rows outside the release measurements. Privacy-preserving telemetry is documented in `data/analytics-events.json` and is limited to route, release-mode, atlas place selection, dataset, manifest, search-status, fetch-timing, and web-vital events. The static site has no default network collector and the event contract forbids user ids, precise user location, query strings, cross-site tracking, and personal-health fields.

Field budgets are published in `data/performance-budgets.json`: LCP <= 2500 ms, INP <= 200 ms, and CLS <= 0.1. The homepage dispatches local `painmap:telemetry` events for those metrics when the browser exposes the relevant PerformanceObserver entry types.

## Attribution and licenses

PainMap original site code and release metadata are MIT licensed. Data rows retain their source license and attribution pointers in `data/provenance-registry.json`; downstream users should carry `source_ids`, `license_id`, `source_vintage`, `extraction_timestamp`, `transform_version`, `reviewer_status`, `source_file_checksum`, `evidence_kind`, `uncertainty_class`, and confidence fields with every copied value.

Key source families include Welfare Footprint, Our World in Data, World Bank public indicators, Natural Earth, geoBoundaries, and PainMap method notes. See the provenance registry for source URLs and license URIs.

## Security

Confidential vulnerability reports can be sent to `security@painmap.org`. Public corrections, source updates, accessibility reports, and non-sensitive issues can use the project issue tracker.
