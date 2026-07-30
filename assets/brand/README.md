# PainMap Evidence Contours assets

This directory contains the production assets for **Evidence Contours — the shape of what we know**, PainMap’s visual identity.

The live static site is generated from three source layers:

- `brand.css` — the visual foundation, typography, palette and editorial layout;
- `assets/brand/brand-components.css` — evidence, atlas, route and responsive components;
- `scripts/apply-brand-system.mjs` — deterministic HTML, favicon, social-card and SRI application.

Run `npm run build:data` to regenerate the static site and apply the brand. The script fingerprints both stylesheets, writes Subresource Integrity metadata and records the active system in `data/brand-system.json`.

Before production materialization, synchronize the current `main` data and release state. The generated routes and manifests must then rebuild under the reproducible clock with zero artifact drift. Brand application must not change evidence classifications, uncertainty, provenance, licensing, comparability, or release promotion decisions.

Core proposition: **What is known. What is inferred. What is missing.**

Brand promise: **See the evidence. See its limits.**

Descriptor: **Animal pain evidence, mapped.**

The evidence grammar keeps direct evidence, modeled estimates, proxy aggregates, priority overlays, boundary-only geography and missing data visually distinct. Evidence kind and uncertainty remain separate variables.

Do not embed or redistribute font files. The web implementation uses resilient stacks based on Noto Serif Display, Inter, PT Mono and system fallbacks.
