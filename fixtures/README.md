# PainMap fixture workflow

These files are intentionally small. They give contributors a stable local preview release without loading full country geometry, ADM1 context, or runtime public-source overlays.

## Files

- `mock-registry.json`: release, place, layer, source, and route metadata for a minimal preview atlas.
- `place-measurements.fixture.json`: two canonical fixture measurement rows with source, license, uncertainty, and lineage fields.

## Commands

```sh
npm run fixtures:check
npm run preview:fixture
```

`fixtures:check` validates that fixture measurements reference known mock places, layers, sources, and licenses.

`preview:fixture` writes a disposable static release skeleton to `tmp/preview-release/` with:

- `index.html`
- `data/place-measurements.json`
- `v1/places/index.json`
- `v1/places/TST.json`
- `releases/preview/manifest.json`

The `tmp/` directory is ignored by git. Use this workflow for local experiments before touching the full release artifact builder.
