# PR checklist: source-backed country candidate supplement

- [x] Reconcile target ISO3 identifiers with the current PainMap place registry.
- [x] Capture source payload receipts with retrieval timestamps, checksums, and byte sizes.
- [x] Commit compact selected-row extracts for the populated metrics.
- [x] Populate only verified numeric source rows; leave all other stubs unchanged.
- [x] Keep every candidate country non-canonical and excluded from active-release rankings.
- [x] Add an offline validation command for candidate rows, extracts, decisions, package hashes, and the public context export.
- [x] Preserve CC BY 4.0 license and WHO/World Bank attribution for the public mortality-context rows.
- [ ] Complete original-provider license review for OWID/FAO-backed rows.
- [ ] Review land-animal aggregation, proxy semantics, and country-year comparability.
- [ ] Complete remaining canonical source groups.
- [ ] Approve UX caveats and publish through a new immutable release.
