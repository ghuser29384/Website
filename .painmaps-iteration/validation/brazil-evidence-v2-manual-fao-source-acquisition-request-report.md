# Brazil evidence v2 manual FAO source acquisition request report

## Purpose

Prepare manual official FAO source acquisition packet after automated DBnomics and FAO endpoint discovery failed to produce usable observations/endpoints.

## Decision carried forward

- DBnomics blocked for observations.
- Automated official FAO endpoint discovery did not find approved data endpoints.
- Manual official FAO/FAOSTAT/FAODATA download is now required if Brazil animal-context evidence should proceed.

## Files created

- `manual-fao-source-acquisition-request.md`
- `manual-fao-source-acquisition-manifest-template.csv`
- `manual-fao-source-acquisition-manifest-template.json`
- `manual-fao-source-validation-plan.md`

## Data status

No data fetched. No numeric parsing. No country promotion. No release regeneration.

## Next action for user

Download official FAO files according to `manual-fao-source-acquisition-request.md` and place them under:

```text
data/candidates/brazil_evidence_pack_v2_for_codex/manual-source-inputs/
```

## Next action for Codex after user supplies files

Validate source files against `manual-fao-source-validation-plan.md`. Do not parse values until validation passes and ChatGPT approves extraction.
