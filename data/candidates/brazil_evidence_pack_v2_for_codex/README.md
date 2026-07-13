# Brazil evidence pack v2 for Codex

Purpose: continue Brazil-only evidence collection for Painmaps without creating final country measurements.

This pack reflects ChatGPT Pro Extended research through 2026-07-08 and should be treated as a Codex-readable staging handoff.

Scope:
- Brazil only (`place_id = BRA`, FAOSTAT/DBnomics area code `21`).
- Metadata validation and tiny pilot observation fetching only.
- No production release integration.
- No country promotion.
- No OWID/Fishcount numeric parsing.
- No final Painmaps country measurements.

Key decision:
- Validate Brazil FAO/QCL primary-meat `element=5320` series metadata first.
- Validate Brazil FAO/RP insecticide proxy metadata second.
- Only after metadata validation succeeds, fetch a tiny pilot observation set, still marked `context/proxy` and `not_promoted_context_only`.

Start with `codex-next-actions-v2.md`.
