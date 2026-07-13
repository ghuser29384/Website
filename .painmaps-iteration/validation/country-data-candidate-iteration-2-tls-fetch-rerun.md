# Country data candidate validation - iteration 2 TLS fetch rerun

## Git state

- Repository: `/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando`
- Branch: `country-context-release-candidate`
- Candidate package: `data/candidates/painmaps_country_data_addition_2026_07_07/`
- Existing unrelated untracked source ZIP: `about/painmap_country_data_addition_package.zip`

## TLS diagnosis

Initial diagnostic showed Homebrew Python was using OpenSSL default verify paths with a missing CA file:

- Python executable: `/opt/homebrew/opt/python@3.14/bin/python3.14`
- Python version: `3.14.4`
- Platform: `macOS-13.5.1-arm64-arm-64bit-Mach-O`
- OpenSSL: `OpenSSL 3.6.2 7 Apr 2026`
- Expected default CA file: `/opt/homebrew/etc/openssl@3/cert.pem`
- Actual issue: `/opt/homebrew/etc/openssl@3/cert.pem` did not exist and `/opt/homebrew/etc/openssl@3/certs` was empty.

Evidence saved:

- `.painmaps-iteration/validation/iteration-2-python-ssl-diagnostic.txt`
- `.painmaps-iteration/validation/iteration-2-certifi-ca-path.txt`
- `.painmaps-iteration/validation/iteration-2-verified-https-smoke.txt`

## TLS fix applied

Created a local Homebrew OpenSSL CA bundle symlink:

```text
/opt/homebrew/etc/openssl@3/cert.pem -> /opt/homebrew/etc/ca-certificates/cert.pem
```

This preserves HTTPS certificate verification. I did not use `ssl._create_unverified_context`, `PYTHONHTTPSVERIFY=0`, `curl -k`, or `curl --insecure`.

After the symlink, default Python SSL verification recognized:

```text
DefaultVerifyPaths(cafile='/opt/homebrew/etc/openssl@3/cert.pem', ...)
```

Evidence saved:

- `.painmaps-iteration/validation/iteration-2-python-ssl-after-ca-symlink.txt`

## Fetch rerun

Fetch command rerun without `SSL_CERT_FILE`:

```bash
python3 data/candidates/painmaps_country_data_addition_2026_07_07/scripts/fetch_country_context_sources.py
```

Output saved:

- `.painmaps-iteration/validation/iteration-2-fetch-after-ca-symlink.txt`
- `.painmaps-iteration/validation/iteration-2-fetch-manifest-summary.txt`

Result:

- Snapshot manifest rows: 15
- Fetched OK: 13
- Failed: 2
- Remaining TLS certificate errors: 0
- Fetched local files: 13
- Fetched local size: about 12M

The fetched manifest validates as JSON:

```bash
python3 -m json.tool data/candidates/painmaps_country_data_addition_2026_07_07/source-snapshots.fetched.json
```

## Successful snapshots

| source_snapshot_id | local path | bytes | sha256 |
|---|---:|---:|---|
| `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.1` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.1.html` | 3512287 | `f958560b78db644282c7147853e0d1a7eff6e324625db44dbd719c0571fceaf4` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.2` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.2.html` | 3556710 | `fa2511c12343943bacc2bbfe901c64853525a388c599ba0c915a5637a1ae3f80` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.3` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.3.html` | 3696853 | `68d32178d5806c1d34cd29f34159fe7742668aea1d981f20d60a045943f24eee` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.1` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.1.csv` | 1102112 | `1954b498f4cf29e18b5389959da20a13bed22d44a9f658db69e2d4ca6fb0ccdf` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.2` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.2.json` | 11815 | `0bee3e0bb858ebe54b767a3aeccde165808ed5fa4cfe735b4fb6c22c8ad1f116` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.1` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.1.csv` | 29395 | `cd27b75f61af6fbebb12fed01cda2d1655f0f5d84690299455bb114ffb501354` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.2` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.2.json` | 4835 | `3c794f096ce7bacd88119724dd9248523e36ba90a06c2e3d9f3859d2bf7c7e68` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.1` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.1.csv` | 13475 | `41c60a6411b644028d7392a5acc98745f0288cc2b6fb8a9cf7172bdf594d84d5` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.2` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.2.json` | 4006 | `9443a464a68a404edcd4266aa014adc9e91054444e7a60e53d2935921a1b63f6` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.1` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.1.csv` | 14004 | `ec497f2d0d9371c69d54b3d1aad15e376d0966547bbe2e238b9bdea316222906` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.2` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.2.json` | 3437 | `acac734f35cb7dfd8eb2eed948a1e2e53e33a40594bc048d3184da4a8e863d04` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.1` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.1.csv` | 197013 | `7928a819d2bf54eb9d8373ceed422bf8de149caabb3dcdbf7ef669a590c12651` |
| `snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.2` | `fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.2.json` | 1355 | `9693fd4135842dc5ba61a9113a7d89b4ad1292bb80772d97d6dee21bf96b1687` |

## Remaining failed snapshots

| source_snapshot_id | upstream URL | error | interpretation |
|---|---|---|---|
| `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-fish.1` | `https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-fish-slaughtered-each-year` | `<HTTPError 401: 'Unauthorized'>` | Not a TLS failure. Source remains blocked unless an approved accessible URL, permission, or fallback source is provided. |
| `snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-decapods.1` | `https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans` | `<HTTPError 401: 'Unauthorized'>` | Not a TLS failure. Source remains blocked unless an approved accessible URL, permission, or fallback source is provided. |

## License and promotion status

- No country rows were promoted.
- No numeric rows were parsed.
- No release artifacts were regenerated.
- Fetched snapshots are not approved for committed storage or production use until source/license review confirms redistribution and raw snapshot storage permissions.
- World Bank, OWID third-party, OWID/FAO, and Fishcount license statuses remain pending or conditional as recorded in `license-registry-additions.json`.
- Fishcount-dependent source groups remain blocked because both Fishcount snapshots returned `401 Unauthorized`.

## Commands run

- `python3 - <<'PY' ... ssl.get_default_verify_paths() ... PY`
- `ls -l /opt/homebrew/etc/openssl@3/cert.pem /opt/homebrew/etc/openssl@3/certs`
- `python3 - <<'PY' ... import certifi ... PY`
- `SSL_CERT_FILE=/opt/homebrew/lib/python3.14/site-packages/certifi/cacert.pem python3 - <<'PY' ... urllib.request.urlopen ... PY`
- `ln -s /opt/homebrew/etc/ca-certificates/cert.pem /opt/homebrew/etc/openssl@3/cert.pem`
- `python3 - <<'PY' ... default verified HTTPS smoke ... PY`
- `python3 data/candidates/painmaps_country_data_addition_2026_07_07/scripts/fetch_country_context_sources.py`
- `python3 -m json.tool data/candidates/painmaps_country_data_addition_2026_07_07/source-snapshots.fetched.json`
- `git diff --stat`
- `git diff --check`
- `git status --short`

## Tests and checks

- Default Python HTTPS verification now succeeds against a World Bank HTTPS endpoint.
- The fetcher rerun completed without SSL certificate verification errors.
- `source-snapshots.fetched.json` is valid JSON.
- `git diff --check` reported no tracked diff whitespace errors.
- Current git status remains untracked-only for `.painmaps-iteration/`, `data/candidates/painmaps_country_data_addition_2026_07_07/`, and the pre-existing `about/painmap_country_data_addition_package.zip`.

Checks intentionally not run:

- No numeric parsing.
- No `npm run build:data`.
- No `npm run validate:release`.
- No UI or endpoint smoke tests.
- No country promotion or release artifact regeneration.

## Next question

The TLS problem is fixed and verified. The next blocking issue is source access and license review:

1. Should Fishcount be retried through a different approved public URL, browser-downloadable artifact, or fallback source?
2. Should Codex inspect the 13 fetched snapshots only for metadata/license/reference-period review without parsing numeric values?
3. Should all fetched raw snapshots remain local/uncommitted until redistribution and storage permissions are approved?
4. Should all country rows remain blocked for now?
