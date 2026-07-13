You are ChatGPT Pro Extended acting as the research/source-discovery engine for Painmaps.

Context:
Codex has completed a conservative source/license/access review for country-level animal-context data. WDI country context rows are parsed candidate-only, but WDI does not provide the missing animal-pain country layers. The animal-layer sources remain blocked.

Current local status:
- 639 WDI context-only rows were parsed from World Bank WDI:
  - population total,
  - land area,
  - agricultural land.
- These rows are context-only, not pain/suffering measurements.
- No countries were promoted.
- No final release artifacts were regenerated.
- 10 OWID mirror snapshots remain blocked because underlying provider license/storage/redistribution evidence is insufficient.
- 2 Fishcount snapshots remain blocked because direct URLs returned 401 Unauthorized.
- No OWID or Fishcount numeric values were parsed.
- Fishcount must not be bypassed with cookies, browser sessions, headers, or scraping.

Blocked-source digest:

# Blocked animal-source digest

## Summary

- Rows reviewed: 12
- blocked_provider_terms_unclear: 10
- blocked_unauthorized: 2
- Parse-eligible animal-layer sources: 0
- Numeric animal-layer parsing: not performed
- Country promotion: not performed

## Blocked layers and sources

### factory-farmed-animals

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.1`
  - source_id: `owid-land-animals-slaughtered`
  - affected_issue_ids: `issue.factory-farmed-animals`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Food and Agriculture Organization of the United Nations (2025)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.2`
  - source_id: `owid-land-animals-slaughtered`
  - affected_issue_ids: `issue.factory-farmed-animals`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Food and Agriculture Organization of the United Nations (2025)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

### farmed-crustaceans

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.1`
  - source_id: `owid-farmed-crustaceans`
  - affected_issue_ids: `issue.farmed-crustaceans`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Fishcount (2024)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.2`
  - source_id: `owid-farmed-crustaceans`
  - affected_issue_ids: `issue.farmed-crustaceans`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Fishcount (2024)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-decapods.1`
  - source_id: `fishcount-farmed-decapods`
  - affected_issue_ids: `issue.farmed-crustaceans`
  - fetch_status: `error`
  - current_parse_status: `blocked_unauthorized`
  - recommended_parse_status: `blocked_unauthorized`
  - underlying_provider: `Fishcount`
  - underlying_license_uri: ``
  - block_reason: source fetch returned 401 Unauthorized; do not bypass access controls
  - next_action: Seek explicit permission or a license-compatible alternate public source; do not retry with cookies or spoofed headers.

### farmed-fish

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.1`
  - source_id: `owid-farmed-fish-killed`
  - affected_issue_ids: `issue.farmed-fish`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Fishcount (2024)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.2`
  - source_id: `owid-farmed-fish-killed`
  - affected_issue_ids: `issue.farmed-fish`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Fishcount (2024)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-fish.1`
  - source_id: `fishcount-farmed-fish`
  - affected_issue_ids: `issue.farmed-fish`
  - fetch_status: `error`
  - current_parse_status: `blocked_unauthorized`
  - recommended_parse_status: `blocked_unauthorized`
  - underlying_provider: `Fishcount`
  - underlying_license_uri: ``
  - block_reason: source fetch returned 401 Unauthorized; do not bypass access controls
  - next_action: Seek explicit permission or a license-compatible alternate public source; do not retry with cookies or spoofed headers.

### insects-insecticide

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.1`
  - source_id: `owid-insecticide-use-fao`
  - affected_issue_ids: `issue.insect-welfare`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Food and Agriculture Organization of the United Nations (2025)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.2`
  - source_id: `owid-insecticide-use-fao`
  - affected_issue_ids: `issue.insect-welfare`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Food and Agriculture Organization of the United Nations (2025)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

### wild-caught-fish

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.1`
  - source_id: `owid-wild-caught-fish`
  - affected_issue_ids: `issue.wild-caught-fish`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Mood and Brooke (2024)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.

- source_snapshot_id: `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.2`
  - source_id: `owid-wild-caught-fish`
  - affected_issue_ids: `issue.wild-caught-fish`
  - fetch_status: `ok`
  - current_parse_status: `blocked_license_unclear`
  - recommended_parse_status: `blocked_provider_terms_unclear`
  - underlying_provider: `Mood and Brooke (2024)`
  - underlying_license_uri: ``
  - block_reason: OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.
  - next_action: Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.


Task:
Find license-compatible alternate public sources for the blocked country-level animal-context layers. Do not generate final numeric rows yet. The goal is to identify sources that Codex can later fetch, snapshot, license-review, and parse through Painmaps’ release-quality gates.

Blocked or incomplete layers include:
- factory-farmed animals / land animals slaughtered,
- farmed fish,
- wild-caught fish,
- farmed crustaceans / decapods,
- insects / insecticide proxy,
- any related country-level animal context sources that Painmaps can responsibly support.

For each candidate alternate source, provide:

1. Source identity
   - source name,
   - publisher,
   - upstream URL,
   - API/download URL if available,
   - data format,
   - country coverage,
   - temporal coverage,
   - update cadence,
   - whether it has ISO3 or country-code fields.

2. Legal/reuse status
   - license name,
   - license URI,
   - terms URL,
   - whether raw snapshot storage appears permitted,
   - whether derived country values appear publishable,
   - required attribution,
   - no-endorsement or caveat requirements,
   - any uncertainty requiring manual review.

3. Data relevance
   - which blocked Painmaps layer(s) it could support,
   - whether it is direct, modeled, proxy, or context-only,
   - unit,
   - reference-period semantics,
   - whether it can support country-level rows,
   - whether it can support rankings or only context.

4. Method and UX constraints
   - how Painmaps should label the evidence kind,
   - comparability limitations,
   - uncertainty/caveat language,
   - whether it can be used without implying false completeness,
   - whether it can work as context-only if not sufficient for pain/suffering estimates.

5. Recommendation
   - parse candidate now,
   - source/license review required,
   - permission required,
   - reject,
   - defer.

Prioritize sources that are:
- structured,
- public,
- high-country-coverage,
- license-compatible,
- reproducible from stable URLs/API calls,
- suitable for raw source snapshots,
- not dependent on access-controlled pages.

Important constraints:
- Do not recommend scraping access-controlled Fishcount pages.
- Do not recommend using OWID mirror data unless the underlying provider license and reuse terms are clear.
- Do not recommend fabricated regional averages.
- Do not recommend country rankings unless the source and method support them.
- Prefer FAOSTAT, WOAH/WAHIS, UN FAO, World Bank, official APIs, or other authoritative structured sources if license-compatible.
- Natural Earth/geoBoundaries are boundary-only and should not be treated as suffering data.

Deliverables:
- A ranked list of alternate sources.
- A source-review table schema Codex should use.
- Exact source URLs/API calls Codex should try next.
- Which currently blocked layers each source could unblock.
- Which sources should remain blocked.
- The single safest next source for Codex to fetch and review.
- Exact next local Codex action.

Do not output final Painmaps country measurements. Output source-discovery and next-action guidance only.
