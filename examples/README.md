# PainMap examples

These examples use only public static PainMap files. Keep `release_id`, `source_ids`, `evidence_kind`, `uncertainty_class`, and license fields attached when reusing values.

## Load a place profile

```sh
node examples/load-place-profile.mjs IND
python3 examples/load_place_profile.py IND
```

Both commands print the place name, release ID, measurement count, and layer summaries for a canonical measured place. Boundary-only places appear in `/v1/places/index.json`, but they do not have measurement profiles in this release.

## Useful public entry points

- `/v1/places/index.json`: full place index and coverage status by place.
- `/v1/coverage.json`: release coverage counts and known sparse areas.
- `/data/place-measurements.json`: canonical measurement rows.
- `/v1/places/IND/neighbors.json`: release-scoped border neighbors and nearest centroid neighbors for a place.
- `/ogc/collections/places/items.json`: OGC API - Features-style GeoJSON country feature collection.
- `/schemas/place-index.schema.json`: JSON Schema for the place index.
- `/schemas/ogc-place-features.schema.json`: JSON Schema for the OGC-style place features export.
- `/releases/2026-05-31/manifest.json`: immutable release artifact manifest.
- `/releases/2026-05-31/diff.json`: release diff baseline for comparing future releases.
