# PainMap brand assets

This directory contains the production assets for **The Evidence Field**, PainMap's visual identity.

The live site is generated from three source layers:

- `brand.css` — the visual foundation and design tokens;
- `assets/brand/brand-components.css` — evidence, atlas, route, and responsive components;
- `scripts/apply-brand-system.mjs` — deterministic HTML, favicon, and social-card application.

Run `npm run build:data` to regenerate the static site and apply the brand. The script fingerprints both stylesheets, writes Subresource Integrity metadata, and records the active system in `data/brand-system.json`.

Core message: **Map pain. Keep uncertainty visible.**

Do not embed or redistribute font files. The web implementation uses a resilient stack based on EB Garamond, Inter, and system fallbacks.
