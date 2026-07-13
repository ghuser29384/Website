# Codex next actions — Brazil evidence v2

## Decision

Run Brazil-only metadata validation, then a tiny pilot observation fetch only if metadata validation passes. This is candidate/staging evidence only.

## Hard rules

- Do not parse OWID/Fishcount values.
- Do not retry or bypass Fishcount.
- Do not promote Brazil or any other country.
- Do not regenerate production release artifacts.
- Do not create ranking-like outputs.
- Keep all rows staging-only and coverage-honest.

## Step 1 — place this pack in the repo

Copy this folder into:

```text
data/candidates/brazil_evidence_pack_v2_for_codex/
```

## Step 2 — validate metadata URLs

Read:

```text
data/candidates/brazil_evidence_pack_v2_for_codex/brazil-target-series.csv
```

For every row, fetch `metadata_url` only. Validate:

- HTTP 200.
- JSON response.
- `observations=false` in response metadata or no observation arrays present.
- response dataset/provider/series code matches expected.
- response dimensions match area/item/element.

Write:

```text
brazil-series-metadata-validation.csv
brazil-series-metadata-validation.json
brazil-series-metadata-validation.md
```

## Step 3 — only if all metadata validations pass, fetch tiny pilot observations

Fetch only the listed `pilot_observation_url` rows. This is a small Brazil-only pilot.

Write:

```text
brazil-pilot-observations.csv
brazil-pilot-observations.json
brazil-pilot-observations.md
```

Rows must be labeled:

- QCL: `evidence_kind=direct_context`, `promotion_decision=not_promoted_context_only`.
- RP: `evidence_kind=proxy_context`, `promotion_decision=not_promoted_context_only`.

## Step 4 — write report

Write:

```text
.painmaps-iteration/validation/brazil-evidence-v2-validation-report.md
```

Include counts, validation results, pilot latest values if fetched, and all blockers.

## Step 5 — stop and paste report to ChatGPT

Do not integrate into production artifacts until ChatGPT reviews the report.
