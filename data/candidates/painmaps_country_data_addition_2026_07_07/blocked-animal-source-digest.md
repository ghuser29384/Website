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

