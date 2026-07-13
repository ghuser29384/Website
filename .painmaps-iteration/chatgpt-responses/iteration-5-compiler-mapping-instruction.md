Next exact local action: inspect the repo compiler/schema/artifact contracts and produce a mapping report for the WDI context-only staging rows. Do not integrate into production artifacts, parse OWID/Fishcount, promote countries, or regenerate final release artifacts.

Continue the Painmaps country-data staging workflow.

Decision:
Proceed with compiler/artifact-contract inspection only. Map the WDI context-only staging rows into the existing Painmaps release pipeline on paper first.

Do not integrate into production artifacts yet.
Do not regenerate final release artifacts.
Do not parse OWID or Fishcount numeric values.
Do not promote countries.
Do not weaken schemas/tests.

Current iteration 4 result:
- WDI context-only staging parse succeeded.
- 639 parsed WDI context rows:
  - SP.POP.TOTL: 215 rows, reference period 2025
  - AG.LND.TOTL.K2: 215 rows, reference period 2023
  - AG.LND.AGRI.K2: 209 rows, reference period 2023
- Coverage rows: 249
- Countries with any WDI context row: 215
- Countries with all 3 WDI context inputs: 209
- Countries with partial WDI context: 6
- Countries with no WDI context rows: 34
- Country promotions: 0
- OWID blocked_license_unclear: 10 snapshots
- Fishcount blocked_unauthorized: 2 snapshots

Step 1 — Locate repo and candidate artifacts.

REPO="/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando"
cd "$REPO" || exit 1

CANDIDATE_DIR="$(find "$REPO" -name "parsed-wdi-country-context.csv" -path "*painmaps_country_data_addition_2026_07_07*" -print -quit | xargs dirname)"
if [ -z "$CANDIDATE_DIR" ] || [ ! -d "$CANDIDATE_DIR" ]; then
  echo "No WDI candidate directory found."
  exit 1
fi

echo "Candidate dir: $CANDIDATE_DIR"

Step 2 — Inspect repository structure and package scripts.

cd "$REPO" || exit 1

{
  echo "# Iteration 5 repo/compiler discovery"
  echo
  echo "## Git state"
  git status --short
  git branch --show-current
  echo
  echo "## Repo top-level files"
  find . -maxdepth 2 -type f | sort | sed -n '1,240p'
  echo
  echo "## Package scripts"
  if [ -f package.json ]; then
    node -e 'const p=require("./package.json"); console.log(JSON.stringify(p.scripts||{}, null, 2))'
  else
    echo "No package.json at repo root."
  fi
  echo
  echo "## Candidate artifact files"
  find "$CANDIDATE_DIR" -maxdepth 2 -type f | sort
} > .painmaps-iteration/validation/iteration-5-repo-structure-and-scripts.txt

Step 3 — Locate existing release compiler, schemas, and public artifacts.

mkdir -p .painmaps-iteration/validation

{
  echo "# Existing release/data/compiler files"
  echo
  echo "## Likely compiler/build scripts and data contracts"
  find . -type f | grep -Ei 'build|compile|release|generate|validate|schema|manifest|coverage|measurement|place|source|license|openapi|dcat|layer|method|assumption|snapshot' | sort | sed -n '1,500p'
  echo
  echo "## Public/data directories"
  find . -maxdepth 4 -type d | grep -Ei 'data|public|release|schema|source|coverage|place|v1|api|ogc|dist' | sort
} > .painmaps-iteration/validation/iteration-5-repo-file-discovery.txt

Step 4 — Summarize candidate and existing artifact shapes.

python3 - <<'PY' > ".painmaps-iteration/validation/iteration-5-artifact-shape-summary.txt"
import csv, json
from pathlib import Path

repo = Path(".").resolve()
candidate_matches = list(repo.glob("**/painmaps_country_data_addition_2026_07_07/parsed-wdi-country-context.csv"))
candidate_dir = candidate_matches[0].parent if candidate_matches else None

print("# Artifact shape summary")
print("repo:", repo)
print("candidate_dir:", candidate_dir)
print()

if candidate_dir:
    for name in [
        "parsed-wdi-country-context.csv",
        "wdi-country-context-coverage.csv",
        "blocked-source-decisions.csv",
        "source-registry-additions.wdi-reviewed.json",
        "license-registry-additions.wdi-reviewed.json",
    ]:
        path = candidate_dir / name
        print("##", path)
        if path.suffix == ".csv" and path.exists():
            with open(path, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            print("rows:", len(rows))
            print("columns:", list(rows[0].keys()) if rows else [])
            print("sample:", rows[0] if rows else None)
        elif path.suffix == ".json" and path.exists():
            data = json.load(open(path, encoding="utf-8"))
            print("type:", type(data).__name__)
            print("count:", len(data) if hasattr(data, "__len__") else "n/a")
            if isinstance(data, list) and data:
                print("sample:", data[0])
            elif isinstance(data, dict):
                print("keys:", list(data.keys())[:40])
        print()

patterns = [
    "**/*measurement*.json",
    "**/*measurement*.csv",
    "**/*coverage*.json",
    "**/*coverage*.csv",
    "**/*place*.json",
    "**/*source*.json",
    "**/*license*.json",
    "**/*openapi*.json",
    "**/*schema*.json",
    "**/*manifest*.json",
    "**/*release*.json",
]

seen = set()
for pat in patterns:
    for path in repo.glob(pat):
        if ".git" in path.parts or "node_modules" in path.parts:
            continue
        if path in seen:
            continue
        seen.add(path)

        try:
            size = path.stat().st_size
        except Exception:
            size = 0

        print("##", path)
        print("size:", size)

        if size > 5_000_000:
            print("skipped_large_file: true")
            print()
            continue

        try:
            if path.suffix == ".json":
                data = json.load(open(path, encoding="utf-8"))
                print("json_type:", type(data).__name__)
                if isinstance(data, list):
                    print("count:", len(data))
                    if data:
                        print("sample_keys:", list(data[0].keys()) if isinstance(data[0], dict) else type(data[0]).__name__)
                        print("sample:", data[0])
                elif isinstance(data, dict):
                    print("keys:", list(data.keys())[:80])
                    for k, v in list(data.items())[:5]:
                        if isinstance(v, list):
                            print("list_key:", k, "count:", len(v), "sample:", v[0] if v else None)
                        elif isinstance(v, dict):
                            print("dict_key:", k, "keys:", list(v.keys())[:20])
            elif path.suffix == ".csv":
                with open(path, newline="", encoding="utf-8") as f:
                    rows = list(csv.DictReader(f))
                print("csv_rows:", len(rows))
                print("columns:", list(rows[0].keys()) if rows else [])
                print("sample:", rows[0] if rows else None)
        except Exception as e:
            print("inspect_error:", repr(e))
        print()
PY

Step 5 — Create compiler mapping report.

cat > .painmaps-iteration/validation/country-data-candidate-iteration-5-compiler-mapping.md <<'MD'
# Country data candidate validation — iteration 5 compiler mapping

## Purpose
Map WDI context-only staging artifacts into the existing Painmaps compiler/release architecture. No production integration yet.

## Existing repo contracts found
Fill from:
- `.painmaps-iteration/validation/iteration-5-repo-structure-and-scripts.txt`
- `.painmaps-iteration/validation/iteration-5-repo-file-discovery.txt`
- `.painmaps-iteration/validation/iteration-5-artifact-shape-summary.txt`

### Release compiler/build scripts
[Codex fill]

### Schema files
[Codex fill]

### Measurement artifacts
[Codex fill]

### Coverage artifacts
[Codex fill]

### Place/profile artifacts
[Codex fill]

### Source/license artifacts
[Codex fill]

### OpenAPI/DCAT artifacts
[Codex fill]

### Route/sitemap artifacts
[Codex fill]

## Candidate WDI artifacts
- `parsed-wdi-country-context.csv/json`: 639 direct-context WDI rows.
- `wdi-country-context-coverage.csv/json`: 249 coverage rows.
- `source-registry-additions.wdi-reviewed.json`: reviewed WDI source metadata only.
- `license-registry-additions.wdi-reviewed.json`: reviewed WDI license metadata only.
- `blocked-source-decisions.csv/json`: OWID/Fishcount blocked rows only.

## Field mapping proposal
For each parsed WDI column, map to an existing repo artifact field or mark as candidate-only:

- candidate_row_id -> [Codex fill]
- release_candidate_id -> [Codex fill]
- release_id -> [Codex fill]
- place_id -> [Codex fill]
- iso3 -> [Codex fill]
- country_name -> [Codex fill]
- layer_id -> [Codex fill]
- issue_id -> [Codex fill]
- metric_id -> [Codex fill]
- indicator_id -> [Codex fill]
- row_role -> [Codex fill]
- evidence_kind -> [Codex fill]
- value_type -> [Codex fill]
- raw_value -> [Codex fill]
- normalized_value -> [Codex fill]
- display_value -> [Codex fill]
- unit_label -> [Codex fill]
- ranking_mode -> [Codex fill]
- reference_period -> [Codex fill]
- reference_period_semantics -> [Codex fill]
- source_vintage -> [Codex fill]
- method_id -> [Codex fill]
- method_version -> [Codex fill]
- transform_version -> [Codex fill]
- source_ids -> [Codex fill]
- source_snapshot_ids -> [Codex fill]
- license_id -> [Codex fill]
- attribution -> [Codex fill]
- uncertainty_class -> [Codex fill]
- caveat -> [Codex fill]
- comparability_group_id -> [Codex fill]
- evidence_compatibility_rule -> [Codex fill]
- coverage_status -> [Codex fill]
- coverage_reason -> [Codex fill]
- promotion_decision -> [Codex fill]

## Recommended integration point
Choose one and justify:

1. candidate-only artifact only,
2. compiler input staging file,
3. generated but unpublished release-candidate artifact,
4. production release artifact update after further review.

Recommendation:
[Codex fill]

Reason:
[Codex fill]

## Candidate-only artifact names
If candidate-only integration is recommended, propose exact file paths under `data/candidates/` or the repo-appropriate candidate path.

[Codex fill]

## Required code changes
List exact files that would need edits, but do not edit them yet unless trivial/non-production.

[Codex fill]

## Required tests
List exact commands to validate the candidate-only integration.

[Codex fill]

## UX implications
These WDI rows must appear, if surfaced at all, as:
- context-only denominator rows,
- no ranking,
- no country promotion,
- no pain/suffering estimate,
- coverage-first only.

Repo-specific UX mapping:
[Codex fill]

## Blocked sources
Confirm:
- OWID remains blocked_license_unclear.
- Fishcount remains blocked_unauthorized.
- No OWID/Fishcount numeric values are parsed.

[Codex fill]

## Risks
[Codex fill]

## Checks run
- `git diff --check`: [Codex fill]

## Next question for ChatGPT
Given this mapping, should Codex implement candidate-only integration, inspect specific repo files, or stop?
MD

Step 6 — Fill the report.
Use the three discovery files above to replace every `[Codex fill]` in:
`.painmaps-iteration/validation/country-data-candidate-iteration-5-compiler-mapping.md`.

Do not modify production data files while filling the report.

Step 7 — Run safe check only.

git diff --check

Step 8 — Copy the report to clipboard.

cat "$REPO/.painmaps-iteration/validation/country-data-candidate-iteration-5-compiler-mapping.md" | pbcopy
echo "Copied iteration 5 compiler mapping report to clipboard. Paste it into ChatGPT."

Stop after this report. Do not integrate data until ChatGPT reviews the mapping.