# PainMap examples

These examples use only public static PainMap files. Keep `release_id`, `source_ids`, `source_vintage`, `extraction_timestamp`, `transform_version`, `reviewer_status`, `source_file_checksum`, `evidence_kind`, `uncertainty_class`, confidence bounds, attribution, and license fields attached when reusing values.

## Load a place profile

```sh
node examples/load-place-profile.mjs IND
python3 examples/load_place_profile.py IND
```

Both commands print the place name, release ID, measurement count, and layer summaries for a canonical measured place. Boundary-only places appear in `/v1/places/index.json`, but they do not have measurement profiles in this release.

## Compare two places

```sh
node examples/compare-places.mjs BRA IND
```

This recipe loads two canonical place profiles, matches shared measured layers, prints each display value, evidence kind, uncertainty class, rank delta, source IDs, and measurement lineage checksums.

## Join with your own geography

```sh
node examples/join-own-geography.mjs examples/custom-geography.csv
```

This recipe joins a local CSV keyed by `place_id` to `/v1/places/index.json` and `/ogc/collections/places/item-index.json`, then prints coverage status, measurement URLs, and per-country OGC feature URLs. Use the sample `examples/custom-geography.csv` as the minimum shape for a portfolio, program, or region list.

## Cite a release

```sh
node examples/cite-release.mjs 2026-05-31
```

This recipe loads the immutable release manifest and latest alias, then prints a short citation, manifest URL, manifest SHA-256, artifact count, and reuse fields that should travel with copied values.

## Useful public entry points

- `/v1/places/index.json`: full place index and coverage status by place.
- `/v1/adm1/index.json`: ADM1 poverty-context overlay index with the top static-page rows ranked.
- `/v1/places/IND/adm1.json`: country-scoped ADM1 context rows for India.
- `/v1/coverage.json`: release coverage counts and known sparse areas.
- `/data/release-modes.json`: Snapshot and live overlay mode contract with cache and network rules.
- `/data/place-measurements.json`: canonical measurement rows.
- `/v1/places/IND/neighbors.json`: release-scoped border neighbors and nearest centroid neighbors for a place.
- `/ogc/collections/places/items.json`: OGC API - Features-style GeoJSON country feature collection.
- `/ogc/collections/places/item-index.json`: partitioned country feature index for clients that need one place boundary at a time.
- `/ogc/collections/places/items/IND.json`: single-country OGC-style GeoJSON feature for India.
- `/schemas/place-index.schema.json`: JSON Schema for the place index.
- `/schemas/release-modes.schema.json`: JSON Schema for the release mode contract.
- `/schemas/ogc-place-features.schema.json`: JSON Schema for the OGC-style place features export.
- `/releases/2026-05-31/manifest.json`: immutable release artifact manifest.
- `/releases/2026-05-31/diff.json`: release diff baseline for comparing future releases.
