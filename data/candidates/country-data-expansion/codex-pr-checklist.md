# Codex PR checklist: add country context data

1. Fetch PainMap current release artifacts and reconcile this ISO country universe with the actual place identity registry.
2. Capture source snapshots for each required dataset; fill retrieval timestamp, checksum, byte size, source vintage, and license metadata.
3. Parse source datasets through release compiler modules.
4. Populate real measurement values only where source, license, reference-period, method, and QA gates pass.
5. Update country-source coverage rows to `present`, `stale`, `missing`, `license_blocked`, or `qa_failed`.
6. Promote countries only when all required source groups pass.
7. Keep Fishcount-derived values blocked until redistribution permission or terms are confirmed.
8. Regenerate release coverage summary and route/indexing policy.
9. Ensure compare views block/warn on incompatible evidence kind, unit, ranking mode, reference period, or comparability group.
10. Run schema, snapshot, source/license, method/transform, coverage, UX, and artifact checksum tests.
