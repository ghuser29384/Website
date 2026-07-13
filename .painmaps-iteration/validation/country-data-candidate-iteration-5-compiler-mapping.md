# Country data candidate validation - iteration 5 compiler mapping

## Purpose
Map the WDI context-only staging artifacts into the existing Painmaps compiler and release architecture before any production integration. This report does not integrate production artifacts, regenerate final release artifacts, parse OWID/Fishcount numeric values, or promote countries.

## Discovery inputs
- Repo: `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando`
- Branch: `country-context-release-candidate`
- Candidate directory: `data/candidates/painmaps_country_data_addition_2026_07_07`
- Discovery files:
  - `.painmaps-iteration/validation/iteration-5-repo-structure-and-scripts.txt`
  - `.painmaps-iteration/validation/iteration-5-repo-file-discovery.txt`
  - `.painmaps-iteration/validation/iteration-5-artifact-shape-summary.txt`

## Existing repo contracts found

### Release compiler/build scripts
- `package.json` exposes the release/data gates:
  - `npm run build:data` -> `node scripts/build-static-artifacts.mjs`
  - `npm run validate:release` -> `node scripts/validate-release-contract.mjs`
  - `npm run check` -> build data, static-site check, release validation, UI smoke, fixture check
  - `npm run smoke:endpoints` expects a local server on `http://127.0.0.1:4173`
- `scripts/build-static-artifacts.mjs` is the current compiler hook. It reads `v1/coverage.json`, `v1/places/index.json`, `v1/adm1/index.json`, `data/place-measurements.json`, `data/provenance-registry.json`, `v1/layers.json`, `data/source-freshness.json`, and `releases/2026-05-31/manifest.json`, then rewrites generated release artifacts.
- The compiler currently has a candidate-review hook, but it is hard-coded to `data/candidates/country-data-expansion` via `COUNTRY_DATA_CANDIDATE_DIR`. The new WDI parse lives in the dated directory `data/candidates/painmaps_country_data_addition_2026_07_07`, so current compiler candidate review will not ingest it without an explicit adapter/path change.
- `scripts/validate-release-contract.mjs` validates production release schemas and candidate package safety. Its candidate checks are also hard-coded to `data/candidates/country-data-expansion`, not the dated WDI directory.

### Schema files
- `schemas/place-measurements.schema.json` defines production `data/place-measurements.json`. It requires `measurement_id`, `release_id`, `place_id`, `place_name`, `geometry_level`, `layer_id`, `evidence_kind`, numeric `raw_value`, `display_value`, `source_ids`, confidence bounds, `uncertainty_class`, `extraction_timestamp`, `transform_version`, `reviewer_status`, `source_file_checksum`, and `license_id`.
- Production `evidence_kind` is limited to `direct`, `modeled`, `proxy`, `priority-overlay`, and `boundary`. The WDI rows use `direct_context`, so they cannot be inserted as production measurements without either a new non-measurement context contract or an explicit schema/product decision.
- `schemas/place-index.schema.json` permits place `coverage_status` values `canonical_measurements`, `boundary_index_only`, `adm1_context_overlay`, and `no_data`. The WDI rows use `partial_context_only`, so public place-index surfacing requires a schema change or candidate-only storage.
- `schemas/coverage.schema.json` allows an object-valued `coverage_status`; it can carry compact summaries, but public release updates still require the compiler and release validation.
- `schemas/source-snapshot.schema.json` defines production source snapshot records with `source_snapshot_id`, `source_id`, `upstream_url`, `retrieval_timestamp`, `source_vintage`, `media_type`, retrieval metadata, checksum fields, and optional `license_id`.
- `schemas/country-gap-ledger.schema.json` supports country rows plus a `candidate_review` object and summary counts. This is the closest existing public release surface for non-promoted candidate status, but current compiler support targets the older candidate directory.

### Measurement artifacts
- Production `data/place-measurements.json` has 8 canonical release measurements. It is scoped to release `2026-05-31.atlas.2` and uses source-backed proxy/priority-overlay rows for WLD, BRA, and IND.
- Partitioned production measurement files exist under `v1/places/{place_id}/measurements.json` for canonical places.
- Current production measurements include lineage fields that the validator enforces: `source_snapshot_ids`, `source_vintage`, `method_id`, `method_version`, `transform_version`, `comparability_group_id`, `evidence_kind`, `unit_label`, and `reference_period`.
- The WDI context rows should not be appended to `data/place-measurements.json` in this iteration because they are context denominators, not pain/suffering measurements, and their vocabulary does not currently satisfy the production measurement contract.

### Coverage artifacts
- `v1/coverage.json` currently reports 2 canonical country profiles, 237 boundary-only countries, and a compact candidate review for the older `release-candidate-2026-07-country-context-v0` package.
- `data/country-gap-ledger.json` currently reports 239 countries, 2 eligible/canonical profiles, 237 boundary-only countries, and a non-published candidate review.
- `v1/places/index.json` currently has 2114 places, 239 country boundaries, 1874 ADM1 context rows, 2 canonical country profiles, and 237 boundary-only country entries.
- The existing coverage/ledger surfaces are suitable for summarizing candidate status after a compiler change, but they must not be hand-edited.

### Place/profile artifacts
- Public place index: `v1/places/index.json`
- Canonical place profiles: `v1/places/WLD.json`, `v1/places/BRA.json`, `v1/places/IND.json`
- Canonical measurement partitions: `v1/places/WLD/measurements.json`, `v1/places/BRA/measurements.json`, `v1/places/IND/measurements.json`
- Neighbor payloads exist for indexed countries, including boundary-only countries.
- OGC-style place features exist under `ogc/collections/places/`, including partitioned country feature files.
- Existing country place IDs are ISO3-like values such as `ABW`; the older candidate package uses `country:ABW` in some rows. The new parsed WDI rows use ISO3 `place_id` values, which better match production place IDs, but integration still needs explicit universe matching.

### Source/license artifacts
- Production source and license registry: `data/provenance-registry.json` and mirrored public `v1/sources.json`.
- Production source snapshots: `data/source-snapshots.json`.
- Production source freshness: `data/source-freshness.json`.
- New WDI candidate registry additions are staged only:
  - `data/candidates/painmaps_country_data_addition_2026_07_07/source-registry-additions.wdi-reviewed.json`
  - `data/candidates/painmaps_country_data_addition_2026_07_07/license-registry-additions.wdi-reviewed.json`
- `world-bank-wdi-api` and `cc-by-4.0-world-bank-wdi` are not yet production provenance entries. Production integration would need registry additions plus release validation.

### OpenAPI/DCAT artifacts
- `data/openapi.json` is the public static API contract. It currently advertises release, layer, source, place index, ADM1, coverage, place profile, measurement, release manifest, latest manifest, and provenance endpoints.
- `data/dcat.json` catalogs canonical place measurements, place index, ADM1 context, coverage, release modes, third-party fetch policy, and release artifacts.
- A new public WDI context endpoint would require OpenAPI/DCAT/manifest updates and then `npm run build:data`, `npm run validate:release`, and `node scripts/check-static-site.mjs`.
- A candidate-only artifact under `data/candidates/` does not need to be advertised in OpenAPI/DCAT until ChatGPT approves a public release-candidate endpoint.

### Route/sitemap artifacts
- Route inventory is in `data/routes.json`.
- Main static routes include `/`, `/atlas/`, `/places/`, `/countries/` as a legacy alias, `/compare/`, `/data/`, `/api/`, `/developers/`, `/releases/`, and `/releases/2026-05-31/`.
- `sitemap.xml`, `robots.txt`, `_headers`, service worker files, and release manifests are validated by `scripts/check-static-site.mjs` and `scripts/validate-release-contract.mjs`.
- No route/sitemap artifact should change for this candidate-only mapping pass.

## Candidate WDI artifacts
- `parsed-wdi-country-context.csv/json`: 639 direct-context WDI rows.
- `wdi-country-context-coverage.csv/json`: 249 coverage rows.
- `source-registry-additions.wdi-reviewed.json`: reviewed WDI source metadata only.
- `license-registry-additions.wdi-reviewed.json`: reviewed WDI license metadata only.
- `blocked-source-decisions.csv/json`: OWID/Fishcount blocked rows only.

Observed iteration-4 WDI counts:
- `SP.POP.TOTL`: 215 rows, reference period 2025.
- `AG.LND.TOTL.K2`: 215 rows, reference period 2023.
- `AG.LND.AGRI.K2`: 209 rows, reference period 2023.
- `wdi-country-context-coverage`: 249 rows.
- Countries with any WDI context row: 215.
- Countries with all 3 WDI context inputs: 209.
- Countries with partial WDI context: 6.
- Countries with no WDI context rows: 34.
- Country promotions: 0.
- Blocked OWID snapshots: 10 `blocked_license_unclear`.
- Blocked Fishcount snapshots: 2 `blocked_unauthorized`.

## Field mapping proposal

- `candidate_row_id` -> candidate-only stable row key. Could become a derived public context-row ID later, but it is not a production measurement field.
- `release_candidate_id` -> candidate package identifier. Maps to candidate-review summaries, not active production `release_id`.
- `release_id` -> candidate-scoped release ID. Must remain distinct from active release `2026-05-31.atlas.2` until promotion/release review.
- `place_id` -> maps to production `place_id` only when it is an ISO3 place ID present in `v1/places/index.json`. The new parsed WDI rows use ISO3 values, which is compatible with the place index after universe matching.
- `iso3` -> maps to `iso3` in `v1/places/index.json` and `data/country-gap-ledger.json`.
- `country_name` -> maps to production `place_name`; candidate-only name should be reconciled with `v1/places/index.json` before surfacing.
- `layer_id` -> maps structurally to production `layer_id`, but the new WDI context layer IDs are not active public release layers. Public surfacing would require `v1/layers.json` and route/copy review.
- `issue_id` -> candidate-only or future layer/method metadata. It is not required by production measurement schema.
- `metric_id` -> candidate-only context metric identifier. Production place measurements do not currently expose `metric_id` as a required field.
- `indicator_id` -> WDI-specific source indicator ID. Keep candidate-only or store in method/source metadata if a context artifact is later published.
- `row_role` -> candidate-only semantic guard, currently `country_context_denominator`.
- `evidence_kind` -> candidate value `direct_context` conflicts with production measurement enum. Do not coerce it to `direct`; that would overstate the row as direct pain/suffering evidence.
- `value_type` -> maps structurally to production `value_type`, but context-specific values should stay candidate-only until a context artifact contract exists.
- `raw_value` -> production measurement schema requires numeric `raw_value`, and WDI JSON rows do have numeric values; however the values are context denominators, not pain/suffering measurements, so numeric type alone is insufficient for production insertion.
- `normalized_value` -> production measurements may use normalized values, but WDI rows intentionally leave this null/blank because no ranking or normalized pain metric is allowed.
- `display_value` -> maps structurally to production `display_value`; safe only with context-only labeling.
- `unit_label` -> maps to production `unit_label` and the required coverage fields.
- `ranking_mode` -> maps structurally to production `ranking_mode`; WDI rows correctly use `none`.
- `reference_period` -> maps to the required production coverage field `reference_period`.
- `reference_period_semantics` -> candidate-only method detail. Could become `method_note` or method metadata in a future context contract.
- `source_vintage` -> maps to the required production coverage field `source_vintage`.
- `method_id` -> maps to the required production coverage field `method_id`, but the method is not yet registered as production methodology.
- `method_version` -> maps to the required production coverage field `method_version`.
- `transform_version` -> maps to the required production coverage field `transform_version`.
- `source_ids` -> maps to production `source_ids`, but `world-bank-wdi-api` must first be added to production provenance if surfaced publicly.
- `source_snapshot_ids` -> maps to production `source_snapshot_ids`, but the WDI snapshot IDs are currently candidate-local and not in `data/source-snapshots.json`.
- `license_id` -> maps to production `license_id`, but `cc-by-4.0-world-bank-wdi` must first be added to production provenance if surfaced publicly.
- `attribution` -> maps structurally to production attribution text; must preserve World Bank/provider attribution and no-endorsement caveat.
- `uncertainty_class` -> candidate value `context_only` needs an explicit public uncertainty/methodology decision before production surfacing.
- `caveat` -> candidate caveat should remain attached to any future context row. Production measurements currently use `method_note`; a context artifact could keep `caveat` directly.
- `comparability_group_id` -> maps to the required production coverage field `comparability_group_id`.
- `evidence_compatibility_rule` -> candidate-only guard. If surfaced, it should remain explicit rather than be lost in a measurement adapter.
- `coverage_status` -> candidate value `partial_context_only` does not fit the production place-index enum. Keep candidate-only unless a new public coverage vocabulary is approved.
- `coverage_reason` -> maps to country-gap-ledger and place-index coverage reason semantics.
- `promotion_decision` -> maps to candidate review/promotion decision semantics. It must remain `not_promoted_context_only` for all WDI rows in this iteration.

Additional observed candidate fields:
- `indicator_name` -> candidate-only WDI label or future source metadata.
- `rank_value` -> intentionally blank; should remain blank/null for context-only rows.
- `missing_inputs` -> maps to country-gap-ledger missing input semantics; useful for candidate review.
- `allowed_use_scope` -> candidate-only license/scope guard that should be retained in any future schema.
- `source_file_checksum`, `source_file_checksum_algorithm`, `source_file_byte_size`, `retrieval_timestamp` -> map to source-snapshot/lineage semantics, but they are currently candidate snapshot evidence, not active production source snapshots.

## Recommended integration point

Recommendation:
1. candidate-only artifact only.

Reason:
The WDI rows are useful as context denominator evidence, but direct production integration would currently violate or weaken existing contracts:
- `evidence_kind=direct_context` is intentionally outside the production measurement enum.
- `coverage_status=partial_context_only` is outside the public place-index enum.
- WDI source/license/snapshot IDs are not production provenance entries yet.
- WDI layer and method IDs are not active public release layer/method contracts yet.
- The current compiler and validator only recognize the older `data/candidates/country-data-expansion` candidate path.
- OpenAPI, DCAT, release manifest, sitemap/routes, and static-site contracts should not change until ChatGPT approves a public candidate endpoint or release-candidate artifact.

## Candidate-only artifact names

Keep the current dated candidate artifacts as the source of truth for this pass:
- `data/candidates/painmaps_country_data_addition_2026_07_07/parsed-wdi-country-context.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/parsed-wdi-country-context.csv`
- `data/candidates/painmaps_country_data_addition_2026_07_07/wdi-country-context-coverage.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/wdi-country-context-coverage.csv`
- `data/candidates/painmaps_country_data_addition_2026_07_07/source-registry-additions.wdi-reviewed.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/license-registry-additions.wdi-reviewed.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/blocked-source-decisions.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/blocked-source-decisions.csv`

If ChatGPT later approves a cleaner candidate-only contract, add generated aliases under the same dated directory rather than production release paths:
- `data/candidates/painmaps_country_data_addition_2026_07_07/country-context-rows.wdi-reviewed.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/country-context-coverage.wdi-reviewed.json`
- `data/candidates/painmaps_country_data_addition_2026_07_07/schemas/wdi-country-context-row.schema.json`

## Required code changes

Do not edit these yet. If ChatGPT approves candidate-only compiler integration, the likely code changes are:
- `scripts/build-static-artifacts.mjs`: make `COUNTRY_DATA_CANDIDATE_DIR` configurable or add a dated candidate review reader for `data/candidates/painmaps_country_data_addition_2026_07_07`.
- `scripts/build-static-artifacts.mjs`: add a candidate-only WDI context reader that summarizes `parsed-wdi-country-context.json` and `wdi-country-context-coverage.json` into non-published candidate review metadata without appending rows to `data/place-measurements.json`.
- `scripts/validate-release-contract.mjs`: add validation for the dated WDI candidate directory, including non-published status, zero promotions, `ranking_mode=none`, context-only evidence, WDI-only source parsing, and blocked OWID/Fishcount rows.
- `data/candidates/painmaps_country_data_addition_2026_07_07/schemas/wdi-country-context-row.schema.json`: add or expand a candidate schema so the WDI context row contract is explicit.
- `data/provenance-registry.json`, `data/source-snapshots.json`, and `v1/sources.json`: update only in a later public-integration pass after ChatGPT approves production provenance integration.
- `v1/layers.json`: update only if WDI context layers become public API/UI layers.
- `data/openapi.json`, `data/dcat.json`, `releases/2026-05-31/manifest.json`, and `latest/manifest.json`: update only if a public endpoint or release-candidate artifact is approved and generated through the compiler.

## Required tests

For the current report-only pass:
- `git diff --check`

For a later candidate-only compiler integration:
- Run the WDI parser/guard again:
  - `python3 data/candidates/painmaps_country_data_addition_2026_07_07/scripts/parse_wdi_context_snapshots.py`
  - JSON validation for `parsed-wdi-country-context.json`, `wdi-country-context-coverage.json`, `blocked-source-decisions.json`, `source-registry-additions.wdi-reviewed.json`, and `license-registry-additions.wdi-reviewed.json`
  - Guard that all WDI rows keep `ranking_mode=none`, `promotion_decision=not_promoted_context_only`, and `coverage_status=partial_context_only`
  - Guard that OWID/Fishcount blocked rows remain blocked and no numeric OWID/Fishcount values are parsed
- If compiler files are changed:
  - `npm run build:data`
  - `npm run validate:release`
  - `node scripts/check-static-site.mjs`
- If UI/route behavior changes:
  - `npm run smoke:ui`
  - `npm run smoke:endpoints` with `npm run serve` running on `http://127.0.0.1:4173`

## UX implications

These WDI rows must appear, if surfaced at all, as:
- context-only denominator rows,
- no ranking,
- no country promotion,
- no pain/suffering estimate,
- coverage-first only.

Repo-specific UX mapping:
- `/places/` could eventually show a "context available, no canonical pain profile" state, but only after the place-index coverage vocabulary is intentionally extended.
- `/compare/` should not compare WDI context rows as pain/suffering burden. It should either hide them from ranking-like comparison or show them as denominator/context rows with compatibility warnings.
- `/data/` and `/api/` should not advertise WDI context rows as canonical measurements. If public, they need a separate context artifact label.
- Map/globe UI should not color countries by WDI denominator values in a way that implies moral burden, animal pain, or country ranking.
- Search results should continue showing boundary-only/no-canonical-profile status unless a new `partial_context_only` public status is approved.

## Blocked sources

Confirmed:
- OWID remains `blocked_license_unclear`.
- Fishcount remains `blocked_unauthorized`.
- No OWID/Fishcount numeric values are parsed.
- `blocked-source-decisions.csv/json` contains 12 blocked rows: 10 OWID and 2 Fishcount.
- All 639 parsed WDI rows use `source_ids=["world-bank-wdi-api"]`, `ranking_mode=none`, `coverage_status=partial_context_only`, and `promotion_decision=not_promoted_context_only`.

## Risks

- Schema mismatch risk: direct insertion into `data/place-measurements.json` would either fail validation or require weakening the production evidence-kind/coverage vocabulary.
- False authority risk: WDI population/land/agriculture values are real context denominators, but users may misread them as pain/suffering evidence if surfaced beside canonical measurements.
- Provenance drift risk: reviewed WDI source/license additions are candidate-local and not yet integrated into production provenance and source-snapshot registries.
- Compiler path risk: production compiler/validator currently target `data/candidates/country-data-expansion`, so the dated WDI directory is invisible to release candidate review unless the path is made explicit.
- Place universe risk: WDI coverage has 249 rows, while current production country place index has 239 country entries; universe reconciliation must happen before public surfacing.
- Release artifact risk: OpenAPI, DCAT, release manifest, latest manifest, and checksums must be generated together if any new public endpoint is approved. Do not hand-edit them.

## Checks run
- `git diff --check`: passed with exit code 0.

## Next question for ChatGPT
Given this mapping, should Codex implement candidate-only integration for the dated WDI directory, inspect a specific compiler/validator file in more detail, or stop with the WDI context rows staged only?
