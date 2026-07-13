Iteration 3 source/license/access review summary for Painmaps country-data candidate.

Local report: .painmaps-iteration/validation/country-data-candidate-iteration-3-source-license-review.md
Candidate dir: data/candidates/painmaps_country_data_addition_2026_07_07
Branch: country-context-release-candidate
Git status: untracked .painmaps-iteration/, about/painmap_country_data_addition_package.zip, data/candidates/painmaps_country_data_addition_2026_07_07/

Fetch carried forward:
- 15 snapshot rows reviewed.
- 13 fetches succeeded.
- 2 Fishcount fetches returned 401 Unauthorized.
- TLS errors after the local CA fix: 0.
- No numeric country measurements were parsed.
- No release artifacts were regenerated.
- No countries were promoted.

Review artifacts:
- data/candidates/painmaps_country_data_addition_2026_07_07/source-license-access-review.csv
- data/candidates/painmaps_country_data_addition_2026_07_07/source-license-access-review.json

Required review columns are present, including allowed_use_scope.
Review status counts:
- parse_eligible: 3
- blocked_license_unclear: 10
- blocked_unauthorized: 2
- blocked_terms_unclear: 0
- blocked_manual_review_required: 0
- rows with empty allowed_use_scope: 0

Parse-eligible:
- 3 World Bank WDI snapshots, source_id=world-bank-wdi-api.
- Indicators: SP.POP.TOTL, AG.LND.TOTL.K2, AG.LND.AGRI.K2.
- Allowed use scope: context-only parsing for country denominators and land-context layers; not pain/suffering measurements; no country promotion without later normalization and promotion gates.
- Attribution/terms recorded: WDI CC BY 4.0 indicator evidence, World Bank/data-provider attribution, and no-endorsement requirement.

Blocked:
- 10 OWID mirror snapshots are blocked_license_unclear because OWID metadata identifies third-party/original providers and the candidate registry lacks underlying provider license URI, redistribution terms, and storage permission. OWID mirror URL alone is not approval.
- 2 Fishcount direct snapshots are blocked_unauthorized because fetch returned 401 Unauthorized. No bypass was attempted.

Storage disposition:
- Added raw-snapshot-storage-disposition.csv/json.
- 10 blocked OWID raw files were deleted after metadata review because can_store_raw_snapshot=false.
- Only 3 WDI raw files remain locally stored.
- source-snapshots.fetched.json keeps byte/checksum audit trails for removed OWID files with storage_status=removed_after_license_review.
- Fishcount storage_status=not_fetched.

Dependency impact:
- WDI: affects human-context-denominators and wild-animal-land-proxy; issues issue.human-context and issue.wild-animals; 249 countries, 498 generated stubs per snapshot.
- OWID land animals: factory-farmed-animals; 249 countries/stubs per snapshot; blocked.
- OWID/fish farmed fish: farmed-fish; 249 countries/stubs per snapshot; blocked.
- OWID wild-caught fish: wild-caught-fish; 249 countries/stubs per snapshot; blocked.
- OWID/Fishcount crustaceans: farmed-crustaceans; 249 countries/stubs per snapshot; blocked.
- OWID insecticide/FAO: insects-insecticide; 249 countries/stubs per snapshot; blocked.

Validation:
- Exact source-review validation guard passed.
- Required review columns are present.
- empty allowed_use_scope rows=0.
- Raw-storage guard passed: no can_store_raw_snapshot=false row still has a stored local raw snapshot.
- JSON validation passed for source-snapshots.fetched, source-license-access-review, snapshot-dependency-impact, and raw-snapshot-storage-disposition.
- git diff --check passed.

Question:
Given this populated review, should Codex parse only the 3 WDI context-only snapshots first? If yes, specify the exact output schema/files, source/license registry updates, validation commands, and blocked-source handling. Confirm that all OWID and Fishcount snapshots remain blocked for numeric parsing unless their upstream provider/license/access status is resolved.
