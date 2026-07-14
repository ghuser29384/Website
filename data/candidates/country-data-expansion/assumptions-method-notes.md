# PainMap country candidate method notes

Generated: 2026-07-14T12:47:02Z

This package now contains **24 source-backed candidate rows** across **8 countries**: USA, CHN, JPN, DEU, GBR, RUS, IDN, MEX.

The populated contracts are:

- `animals_slaughtered_proxy`: latest positive OWID/FAO land-animal slaughter row, summed across the chart's reported species columns when no total column is supplied.
- `insecticide_tonnes_proxy`: latest positive OWID/FAO agricultural insecticide-use row in tonnes.
- `land_area_proxy`: latest positive World Bank `AG.LND.TOTL.K2` land-area row in square kilometres.

These are context proxies, not direct pain measurements. Country reference years may differ. No row is promoted to the active immutable release, and all eight countries remain subject to manual source, license, method, comparability, and UX review.

## Promotion gate

1. Confirm the original provider terms recorded through OWID metadata and attribution.
2. Review aggregation semantics for land-animal species columns.
3. Confirm proxy labels and comparison warnings in the UI.
4. Complete the remaining canonical country-profile source groups.
5. Publish only through a new immutable PainMap release.
