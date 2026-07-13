# Country data candidate validation — iteration 1

## Git state

- Repository: `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando`
- Branch: `country-context-release-candidate`
- Status before this report was written:
  - `?? about/painmap_country_data_addition_package.zip` (pre-existing unrelated source ZIP; left untouched)
  - `?? data/candidates/painmaps_country_data_addition_2026_07_07/`

## Candidate package location

- Source ZIP: `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/painmaps_missing_country_data_release_candidate.zip`
- Staged package: `data/candidates/painmaps_country_data_addition_2026_07_07/`
- Package report inspected: `data/candidates/painmaps_country_data_addition_2026_07_07/final-report.md`
- Package checklist inspected: `data/candidates/painmaps_country_data_addition_2026_07_07/codex-pr-checklist.md`

## Fetch results

- Fetch command: `python3 scripts/fetch_country_context_sources.py`
- Snapshot manifest: `source-snapshots.json`
- Fetched manifest written: `source-snapshots.fetched.json`
- Snapshot count: 15
- Success count: 0
- Failed count: 15
- Local snapshot files captured: 0
- Shared error class: `URLError(SSLCertVerificationError(... certificate verify failed: unable to get local issuer certificate ...))`

No numeric source parsing was performed. No candidate measurement row is eligible for production import because there are no fetched source bytes, checksums, confirmed reference periods, or license-reviewed snapshots.

## Failed sources

| source_snapshot_id | upstream URL | error | fallback source needed |
|---|---|---|---|
| `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.1` | `https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=20000` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.2` | `https://api.worldbank.org/v2/country/all/indicator/AG.LND.TOTL.K2?format=json&per_page=20000` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.3` | `https://api.worldbank.org/v2/country/all/indicator/AG.LND.AGRI.K2?format=json&per_page=20000` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.1` | `https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.2` | `https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.metadata.json?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.1` | `https://ourworldindata.org/grapher/farmed-fish-killed.csv?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.2` | `https://ourworldindata.org/grapher/farmed-fish-killed.metadata.json?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.1` | `https://ourworldindata.org/grapher/wild-caught-fish.csv?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.2` | `https://ourworldindata.org/grapher/wild-caught-fish.metadata.json?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.1` | `https://ourworldindata.org/grapher/farmed-crustaceans.csv?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.2` | `https://ourworldindata.org/grapher/farmed-crustaceans.metadata.json?csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.1` | `https://ourworldindata.org/grapher/insecticide-use.csv?v=1&csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.2` | `https://ourworldindata.org/grapher/insecticide-use.metadata.json?v=1&csvType=full&useColumnShortNames=false` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-fish.1` | `https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-fish-slaughtered-each-year` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-decapods.1` | `https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans` | Python SSL local issuer certificate verification failure | Not yet; first retry with a working local CA/cert configuration or approved fetch path. |

## Licenses reviewed

No fetched snapshot can be approved yet because no source bytes were captured and every candidate license remains pending or conditional.

| license_id | status | review result |
|---|---|---|
| `world-bank-terms-review-required` | `blocked_pending_review` | Blocked. World Bank terms and redistribution/storage permission still need explicit review. |
| `owid-cc-by-with-third-party-terms-review` | `conditional` | Unclear/conditional. OWID-authored content may be CC BY, but graph metadata and original-provider terms must be checked per snapshot before redistribution. |
| `owid-cc-by-with-fao-terms-review` | `conditional` | Unclear/conditional. FAOSTAT-derived data terms must be verified before redistribution. |
| `fishcount-terms-review-required` | `blocked_pending_review` | Blocked. Fishcount terms must be reviewed before republishing or storing snapshots. |

## Current repo coverage source of truth

Files inspected:

- `v1/coverage.json`
- `v1/places/index.json`
- `data/country-gap-ledger.json`
- `data/provenance-registry.json`
- `data/place-measurements.json`
- `data/source-freshness.json`
- `data/release-modes.json`
- `releases/2026-05-31/manifest.json`
- `data/openapi.json`
- `data/dcat.json`
- `data/source-snapshots.json`

Current release coverage observed from `v1/coverage.json`, `v1/places/index.json`, and `data/country-gap-ledger.json`:

- Release ID: `2026-05-31.atlas.2`
- Places indexed: 2,114
- Current country boundary entries: 239
- ADM1 context rows: 1,874
- Canonical country profiles: 2
- Canonical place profiles: 3
- Release measurements: 8
- Direct evidence place measurements: 0
- Evidence layer coverage: direct 0, modeled 0, proxy 6, priority overlay 2, boundary 237, ADM1 context overlay 1,874, no-data 0
- Current country gap ledger: 239 rows, 2 eligible/canonical countries, 237 boundary-only countries
- Ranking readiness: disabled because there are fewer than 10 canonical country profiles and the canonical ratio is below the threshold.

The current repo already records the prior candidate review as blocked:

- `publish_candidate_measurements: false`
- `proposed_measurements: 1743`
- `proposed_measurements_with_raw_values: 0`
- `planned_source_snapshots: 13`
- `captured_source_snapshots: 0`
- `candidate_promotions: 0`

## Candidate countries

Candidate package counts:

- Candidate country gap ledger rows: 249
- Canonical/currently present according to candidate package: 2 (`BRA`, `IND`)
- Missing or little-data candidates: 247
- Candidate source coverage rows: 2,490
- Proposed measurement stubs: 1,743
- Proposed measurement stubs with raw values: 0 observed in package/repo summaries
- Proposed context layers: 7

Candidate/current mismatch:

- Current countries missing from candidate package: 4 (`CYN`, `KAS`, `KOS`, `SOL`)
- Candidate countries outside current place index: 14 (`ATA`, `BES`, `BVT`, `CCK`, `CXR`, `GIB`, `GLP`, `GUF`, `MTQ`, `MYT`, `REU`, `SJM`, `TKL`, `UMI`)

## Countries eligible for promotion now

None.

`BRA` and `IND` are existing canonical country profiles in the current release, but the candidate package marks them `retain_existing_pending_revalidation`, not newly promotable. All other 247 candidate rows remain blocked pending source snapshots, license review, reference periods, methods, checksums, and QA.

## Countries still blocked

- 247 candidate countries are blocked as `blocked_pending_source_snapshots_license_method_QA`.
- 1,729 proposed measurement stubs are `blocked_pending_source_snapshot_and_QA`.
- 14 proposed measurement stubs for existing canonical countries are `retain_pending_revalidation`.
- All candidate source groups are blocked for production use because the local fetch produced zero valid snapshots and no usable checksums or byte sizes.

Blocking reasons:

- Missing fetched source snapshots.
- Missing checksums and byte sizes.
- Unreviewed or conditional redistribution/storage terms.
- Reference periods and source vintages still `PENDING_METADATA`.
- Methods/transforms not registered for release import.
- Candidate package contains stubs, not validated numeric rows.
- Current UI/release gates intentionally avoid ranking-like country behavior while only 2 of 239 current country boundaries are canonical profiles.

## Tests run

- `git rev-parse --show-toplevel`: confirmed nested repo root at `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando`.
- `git checkout -b country-context-release-candidate`: created and switched to the requested branch.
- `unzip -l /Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/painmaps_missing_country_data_release_candidate.zip`: archive matched expected dated package directory and 19 files.
- `unzip ... -d data/candidates/`: staged candidate package under `data/candidates/painmaps_country_data_addition_2026_07_07/`.
- `sed -n '1,220p' final-report.md`: package says zero countries promoted and no numeric values fabricated.
- `sed -n '1,220p' codex-pr-checklist.md`: checklist requires local fetch, license review, parsing only fetched/checksummed snapshots, method registration, comparability metadata, and compiler regeneration before release.
- `python3 -m json.tool release-coverage-summary.json`: candidate summary shows 249 country-universe rows, 2 current canonical profiles, 247 missing/little-data candidates, 0 package promotions.
- `python3 -m json.tool source-snapshots.json`: planned snapshots inspected.
- `python3 scripts/fetch_country_context_sources.py`: wrote `source-snapshots.fetched.json`; result was 15 snapshots, 0 ok, 15 errors.
- `python3 -m json.tool source-snapshots.fetched.json`: fetched manifest is valid JSON and records per-source SSL failures.
- Repo artifact scan for coverage/place/source/license/measurement/openapi/dcat/release/manifest/schema/layer files: inspected source-of-truth release/data artifacts listed above.

Checks intentionally not run:

- No numeric parsing, build-data regeneration, release validation, UI smoke, endpoint smoke, or publication checks were run because source fetch failed and production artifacts must not be changed from this candidate yet.

## Next question for ChatGPT

Here is Codex's local validation report for the Painmaps missing-country data candidate package.

The candidate package was staged under `data/candidates/painmaps_country_data_addition_2026_07_07/` on branch `country-context-release-candidate`. The package itself says zero countries are promoted and no numeric measurements should be published until source snapshots, licenses, reference periods, methods, comparability, and QA all pass.

The local fetcher ran, but all 15 planned snapshots failed with the same Python SSL certificate verification error: `certificate verify failed: unable to get local issuer certificate`. No source bytes, checksums, byte sizes, source vintages, or reference periods were captured. License statuses remain blocked or conditional. The current release source of truth remains `v1/coverage.json`, `v1/places/index.json`, and `data/country-gap-ledger.json`: 2,114 places indexed, 239 country boundary entries, 2 canonical country profiles (`BRA`, `IND`), 237 boundary-only countries, 8 release measurements, and 0 direct evidence place measurements. The new candidate package has 249 ledger rows, 247 missing/little-data candidates, 1,743 proposed measurement stubs, and 0 raw values. No country is eligible for promotion now.

Please tell Codex the next exact action. Should it:

1. retry fetching after fixing Python/local CA certificate configuration or using an approved fetch path,
2. fetch fallback sources,
3. inspect specific files,
4. parse specific snapshots only after a successful retry,
5. update source/license registries,
6. keep all rows blocked,
7. promote a limited set of country rows,
8. change UX/copy only,
9. or stop?

Do not allow fabricated values or false completeness.
