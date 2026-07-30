# PainMap source-backed country data supplement

Generated: 2026-07-14T12:47:02Z

## Added data

- 8 countries: USA, CHN, JPN, DEU, GBR, RUS, IDN, MEX.
- 24 populated candidate rows across land-animal slaughter, insecticide-use, and land-area contracts.
- 4 captured source receipts with upstream URLs, retrieval timestamps, payload checksums, byte counts, and committed compact extracts.
- A separate public WHO/World Bank mortality-linked context export with 741 observations across 191 PainMap-indexed countries.
- Current PainMap ISO3 mappings reconciled against `v1/places/index.json`.

## Publication decision

**No country was promoted.** All rows remain candidate scoped. The active `2026-05-31.atlas.2` release and canonical `data/place-measurements.json` are unchanged.

## Remaining blockers

- Final review of the original FAO/OWID provider terms and attribution.
- Manual review of species aggregation, proxy semantics, country-year comparability, and UI caveats.
- Completion of remaining canonical source groups, especially aquatic-animal inputs and population/agricultural-land context.
- A new immutable release build and release note if promotion is approved.

## Required UI caveats

1. “This country card is a context proxy, not a direct measurement of total pain.”
2. “Country reference years may differ; compare only rows with the same metric, unit, method version, and reference-period semantics.”
3. “Insecticide tonnage is not a count of insects harmed, and land area is not a census of wild animals.”
4. “Candidate data is excluded from default rankings until release review and promotion.”
