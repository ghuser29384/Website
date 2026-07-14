# PainMap brand assets

This directory contains the production assets for **Evidence Contours — the shape of what we know**, PainMap's visual identity.

The live site is generated from three source layers:

- `brand.css` — design tokens, typography, grid, institutional header, homepage and editorial surfaces;
- `assets/brand/brand-components.css` — evidence notation, snapshot/live states, atlas, tables, route and responsive components;
- `scripts/apply-brand-system.mjs` — deterministic HTML, logo, favicon, social-card and manifest application.

Run `npm run build:data` to regenerate the static site and apply the brand. The script fingerprints both stylesheets, writes Subresource Integrity metadata, applies the system to every generated HTML route and records the active system in `data/brand-system.json`.

## Core language

- Promise: **See the evidence. See its limits.**
- Descriptor: **Animal pain evidence, mapped.**
- Campaign line: **What is known. What is inferred. What is missing.**

## Operating rules

1. Evidence kind is encoded by line or pattern; uncertainty remains separately encoded through intervals, ranges or explicit language.
2. No-data, boundary-only, not-reviewed and not-comparable states are first-class outputs.
3. Frozen snapshots and live overlays must remain visually distinct.
4. Decorative graphics must not imply measurements that are not present.
5. Keep layouts editorial, flat and content-first: fine rules, generous margins, limited corner radii and minimal shadow.
6. Do not embed or redistribute font files. The production stack specifies Noto Serif Display, Inter and PT Mono with resilient system fallbacks.
