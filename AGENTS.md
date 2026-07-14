# Project guidance for Codex

## Authority and freshness

Use this file as durable project context, not as proof of current release contents, coverage, licensing status, or deployment state.

For every task, apply this order of authority:

1. The user's current request and any exact brief, specification, named file, or acceptance criteria.
2. Current repository files, generated artifacts, validators, tests, Git history, and release evidence.
3. The project intent and historical lessons below.

Rebuild and inspect current artifacts before making present-tense coverage or source claims. Preserve user-owned changes and do not sweep unrelated files into a commit.

## Working agreements

- Read the exact supplied brief or named artifact before acting.
- Preserve user-provided names, labels, prompts, and visible copy unless asked to revise them.
- Prefer extending the current static-release architecture over speculative replacement.
- Make public claims mechanically true. Distinguish direct evidence, modeled estimates, proxy aggregates, priority overlays, and boundary-only geography.
- Keep read-only audits non-mutating unless the user explicitly requests changes.
- Report inventories, pass/fail boundaries, source disposition, evidence, and remaining risks rather than only feature summaries.
- Use exact staging in noisy or iCloud-backed worktrees. Inspect the actual repository root and do not trust an outer folder's Git status when the project is a nested checkout.
- For commit/push work, inspect branch, remote, upstream divergence, recent history, and exact files; stage narrowly.

## Product and evidence model

PainMap is a public static atlas for pain-source evidence by place. Release artifacts and their validators are the source of truth.

Preserve these principles:

- Never collapse heterogeneous evidence into one undifferentiated score.
- Carry provenance, license, vintage, extraction time, transformation version, reviewer status, checksums, evidence kind, uncertainty class, and confidence fields with copied values where the data contract provides them.
- Do not promote values merely because transport succeeded. Licensing, authorization, exact series availability, transformation validity, and evidence quality are independent gates.
- Snapshot mode should remain reproducible from immutable release artifacts. Any live overlay must be explicit and must not be represented as part of the frozen release.
- Fixture and preview data are synthetic and must not be cited as evidence.
- Preserve byte-exact source evidence when required; use narrow `.gitattributes` rules instead of normalizing source CSVs or snapshots.

## Canonical artifacts

Re-detect the latest release rather than assuming a historical date is current. Important repository contracts include:

- `data/routes.json`
- `data/place-measurements.json`
- `v1/places/index.json`
- `v1/coverage.json`
- `data/provenance-registry.json`
- `data/source-freshness.json`
- `data/release-modes.json`
- `data/country-gap-ledger.json` and its CSV counterpart when present
- `latest/manifest.json`
- the active release manifest, diff, migration notes, and checksums

Treat manifest/hash drift as a regeneration problem first. Do not manually patch generated release artifacts unless the builder or specification explicitly requires that approach.

## Historical implementation context

The prior project work included the following areas. Reverify current files before relying on any item:

- Declarative country-gap ledger, source-priority ladder, policy constraints, and promotion gates.
- Candidate-package review for country-data expansion, with original source archives kept separate from auditable extracted evidence.
- Static-site telemetry markers and cache-fingerprinted assets.
- Release-contract, static-site, endpoint, and UI verification workflows.
- TLS repair without disabling certificate verification.
- Source/license/access review and raw-snapshot storage disposition.
- Supported browser handoff procedures for bounded research workflows.

Historical coverage figures are not current claims. One earlier release state recorded 239 countries, 2 canonical country profiles, and 237 boundary-only countries. Another historical source pass produced 15 snapshots, with 13 successes and two Fishcount authorization failures. World Bank WDI was usable only for contextual fields in that pass; OWID and Fishcount remained blocked by licensing/access decisions. A Brazil DBnomics pilot found candidate series but no observation pairs suitable for promotion. Rebuild and inspect the latest artifacts before citing any of these quantities or dispositions.

## Known continuity risks

- Sparse-area compare rendering was historically only partially wired. When working on compare views, inspect whether object-shaped `known_sparse_areas` entries are formatted explicitly and verify the rendered route.
- Country expansion is constrained by licenses, authorization, exact series availability, and evidence quality—not just HTTP access.
- Do not bypass TLS verification to make a source fetch succeed.
- When a source is unavailable or unauthorized, preserve the blocked state and document the exact reason instead of inventing substitute data.
- When browser-assisted research fails repeatedly at the same step, stop after a bounded retry and give the exact manual continuation action rather than duplicating prompts or silently changing scope.

## Verification contract

Inspect `package.json` and current scripts first. The established release checks include:

```bash
npm run build:data
npm run validate:release
node scripts/check-static-site.mjs
```

Before endpoint smoke tests, start a local static server on the expected address, historically:

```bash
python3 -m http.server 4173
npm run smoke:endpoints
```

The current README may expose a broader or renamed command set such as `npm run check`, source-freshness checks, UI smoke tests, fixture checks, and preview generation. Use the current scripts as authoritative and run the proportionate gates for the files changed.

After generated-data changes:

- inspect the generated diff rather than assuming all churn is intended;
- validate schemas, indexes, manifests, hashes, source freshness, endpoint manifests, and required QA artifacts;
- run `git diff --check`;
- verify rendered routes for user-visible changes.

## Questions to recheck when relevant

- Current licensing and access decisions for OWID, Fishcount, and any replacement providers.
- Whether later Brazil or provider work produced valid observations that passed promotion gates.
- Whether compare-route sparse-area formatting is now complete.
- Whether the latest release manifest and generated aliases are internally consistent.
