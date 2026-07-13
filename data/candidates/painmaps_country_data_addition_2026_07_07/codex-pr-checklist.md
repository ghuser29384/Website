# Codex PR checklist — country data expansion

- [ ] Import package under `data/candidates/country-data-expansion/`.
- [ ] Run source snapshot fetcher locally with internet access.
- [ ] Verify source licenses/redistribution terms before publication.
- [ ] Parse only fetched and checksummed snapshots.
- [ ] Populate numeric values only after reference period/source vintage are known.
- [ ] Register methods and transforms.
- [ ] Enforce comparability metadata.
- [ ] Keep boundary-only/no-data/partial countries from ranking-like UI.
- [ ] Regenerate release coverage summary.
- [ ] Regenerate release artifacts through compiler, not by hand.
- [ ] Run schema, source/license, source-snapshot, coverage, OpenAPI, and UX smoke tests.
- [ ] Release notes list countries promoted and countries still blocked.
