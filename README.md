# PainMap static site

PainMap is a public static atlas for pain-source evidence by place. The site separates direct evidence, modeled estimates, proxy aggregates, priority overlays, and boundary layers instead of presenting them as one undifferentiated score.

## Static release contract

- Route source of truth: `data/routes.json`
- Canonical measurements: `data/place-measurements.json`
- Provenance and license registry: `data/provenance-registry.json`
- Release manifest: `releases/2026-05-31/manifest.json`
- Latest alias: `latest/manifest.json`
- Static API index: `data/openapi.json`

Run the release artifact builder before checks:

```sh
npm run build:data
npm run check
```

The build step generates sitemap entries, route smoke metadata, v1 JSON files, CSV and GeoJSON exports, headers, security.txt, social metadata, subresource integrity hashes, and release checksums.

## Data posture

The public site has no accounts, forms, payments, saved views, uploads, or personal-health workflows. No analytics tracker is currently installed. If privacy-preserving analytics are added later, the allowed event vocabulary should stay limited to route and dataset interactions such as `route_view`, `atlas_place_selected`, `dataset_download`, `compare_opened`, and `release_manifest_opened`, with no user ids or precise location.

## Attribution and licenses

PainMap original site code and release metadata are MIT licensed. Data rows retain their source license and attribution pointers in `data/provenance-registry.json`; downstream users should carry `source_ids`, `license_id`, `source_vintage`, `evidence_kind`, `uncertainty_class`, and confidence fields with every copied value.

Key source families include Welfare Footprint, Our World in Data, World Bank public indicators, Natural Earth, geoBoundaries, and PainMap method notes. See the provenance registry for source URLs and license URIs.

## Security

Confidential vulnerability reports can be sent to `security@painmap.org`. Public corrections, source updates, accessibility reports, and non-sensitive issues can use the project issue tracker.
