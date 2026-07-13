# PainMap country data addition package — release candidate

Generated: 2026-07-07T04:52:27.509327+00:00

## Live site inspection

The live `https://painmaps.org/` homepage was accessible. It describes PainMap as a mixed-evidence atlas where place values keep source, vintage, evidence kind, and uncertainty attached. It also states that the default view reads the frozen `2026-05-31.atlas.2` release and that live overlay values stay outside immutable release rows. The homepage reports **2,114 indexed places**, **239 country boundary entries**, **1,874 ADM1 poverty-context rows**, **2 canonical country profiles** (Brazil and India), and **0 direct place-evidence rows**.

## What this package adds

This package adds a conservative country-data expansion scaffold:

- `country-gap-ledger.csv/json`: 249 ISO country/territory rows, with Brazil and India marked as existing canonical profiles and all other countries/territories marked as missing or little-data candidates.
- `country-source-coverage.csv`: required/proposed source groups for each country.
- `source-snapshots.json`: planned immutable source snapshots for WDI, OWID graphers, and Fishcount pages.
- `proposed-country-measurements.csv/json`: release-candidate measurement rows for seven country-context layers, with no fabricated numeric values.
- `country-promotion-decisions.json`: explicit machine-readable reasons for non-promotion.
- `release-coverage-summary.json`: live coverage summary and current gap counts.
- `scripts/fetch_country_context_sources.py`: a local internet-enabled fetcher for source snapshot files and checksums.

## Countries promoted now

None.

## Why no numeric measurements were promoted

The browser could inspect the homepage and linked source pages, but the sandbox could not retrieve PainMap's hidden JSON artifacts or source CSV/API downloads directly. Publishing numeric country rows without source snapshots, checksums, license verification, reference periods, and method QA would create false completeness. Therefore this package stages missing-country data and provides a fetch/validation path; it does not publish fabricated values.

## Promotion gate

A country can be promoted only when required source groups resolve, snapshots exist, licenses permit publication, reference periods/source vintage are clear, methods are registered, values pass sanity checks, evidence kind is not overstated, comparability metadata is present, and the UI can render the country without implying false completeness.

## Recommended next local command

```bash
cd painmaps_country_data_addition_2026_07_07
python scripts/fetch_country_context_sources.py
```

Then validate licenses, parse source CSV/API outputs, populate numeric rows, and promote only countries that pass all gates.
