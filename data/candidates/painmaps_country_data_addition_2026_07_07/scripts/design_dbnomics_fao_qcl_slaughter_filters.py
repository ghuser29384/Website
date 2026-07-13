#!/usr/bin/env python3
import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

METADATA_SNAPSHOT = Path(
    "fetched-source-snapshots/"
    "snapshot.release-candidate-2026-07-07.country-context.v0.dbnomics-fao-qcl-dataset-metadata.1.json"
)

OUT_ITEM_CSV = Path("dbnomics-fao-qcl-slaughter-item-filter-design.csv")
OUT_ITEM_JSON = Path("dbnomics-fao-qcl-slaughter-item-filter-design.json")
OUT_SERIES_CSV = Path("dbnomics-fao-qcl-series-query-plan.csv")
OUT_SERIES_JSON = Path("dbnomics-fao-qcl-series-query-plan.json")
OUT_MD = Path("dbnomics-fao-qcl-slaughter-filter-design.md")

ELEMENT_CODE = "5320"
ELEMENT_LABEL = "Producing Animals/Slaughtered"
ALLOWED_USE_SCOPE = "filter design only; no numeric parsing; no country promotion"
ITEM_METHOD_STATUS = "candidate_filter_design_only_not_parse_eligible"
SERIES_QUERY_PLAN_STATUS = "candidate_query_plan_only_no_fetch"

PRIMARY_MEAT_ITEM_CODES = {
    "867": "Meat of cattle with the bone, fresh or chilled",
    "947": "Meat of buffalo, fresh or chilled",
    "977": "Meat of sheep, fresh or chilled",
    "1017": "Meat of goat, fresh or chilled",
    "1035": "Meat of pig with the bone, fresh or chilled",
    "1058": "Meat of chickens, fresh or chilled",
    "1069": "Meat of ducks, fresh or chilled",
    "1073": "Meat of geese, fresh or chilled",
    "1080": "Meat of turkeys, fresh or chilled",
    "1097": "Horse meat, fresh or chilled",
    "1108": "Meat of asses, fresh or chilled",
    "1111": "Meat of mules, fresh or chilled",
    "1127": "Meat of camels, fresh or chilled",
    "1141": "Meat of rabbits and hares, fresh or chilled",
}

MANUAL_REVIEW_ITEM_CODES = {
    "1089": "Meat of pigeons and other birds n.e.c., fresh, chilled or frozen",
    "1151": "Meat of other domestic rodents, fresh or chilled",
    "1158": "Meat of other domestic camelids, fresh or chilled",
    "1163": "Game meat, fresh, chilled or frozen",
    "1166": "Other meat n.e.c. (excluding mammals), fresh, chilled or frozen",
    "1176": "Snails, fresh, chilled, frozen, dried, salted or in brine, except sea snails",
}

ITEM_FIELDS = [
    "dataset_code",
    "dataset_name",
    "provider_name",
    "element_code",
    "element_label",
    "item_code",
    "item_label",
    "include_status",
    "classification_basis",
    "double_counting_risk_note",
    "method_status",
    "allowed_use_scope",
]

SERIES_FIELDS = [
    "dataset_code",
    "dataset_name",
    "provider_name",
    "element_code",
    "element_label",
    "area_code",
    "area_label",
    "item_code",
    "item_label",
    "inferred_series_code",
    "inferred_series_url",
    "area_scope_status",
    "first_fetch_scope",
    "query_plan_status",
    "allowed_use_scope",
    "design_note",
]


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_metadata():
    parsed = json.loads(METADATA_SNAPSHOT.read_text(encoding="utf-8"))
    datasets = parsed.get("datasets", {}).get("docs", [])
    if not datasets:
        raise ValueError("No DBnomics dataset metadata found in snapshot")
    dataset = datasets[0]
    values = dataset.get("dimensions_values_labels", {}) or {}
    element_labels = values.get("element", {}) or {}
    area_labels = values.get("area", {}) or {}
    item_labels = values.get("item", {}) or {}
    if element_labels.get(ELEMENT_CODE) != ELEMENT_LABEL:
        raise ValueError(f"Expected element {ELEMENT_CODE} label {ELEMENT_LABEL!r}")
    return dataset, area_labels, item_labels


def classify_item(code, label):
    if code in PRIMARY_MEAT_ITEM_CODES:
        expected = PRIMARY_MEAT_ITEM_CODES[code]
        return {
            "include_status": "candidate_primary_meat_item",
            "classification_basis": (
                "ChatGPT-reviewed primary meat whitelist; "
                f"expected_label={expected!r}; metadata_label={label!r}"
            ),
            "double_counting_risk_note": (
                "Candidate direct primary meat item for element 5320 filter design; "
                "series URL is still inferred and not fetched."
            ),
        }
    if code in MANUAL_REVIEW_ITEM_CODES:
        expected = MANUAL_REVIEW_ITEM_CODES[code]
        return {
            "include_status": "manual_review_required",
            "classification_basis": (
                "ChatGPT-reviewed ambiguous animal item list; "
                f"expected_label={expected!r}; metadata_label={label!r}"
            ),
            "double_counting_risk_note": (
                "May represent ambiguous animal categories, non-standard species, game, snails, "
                "or other groups; exclude from first primary-meat query plan pending review."
            ),
        }
    return {
        "include_status": "excluded_non_primary_or_aggregate_or_derivative",
        "classification_basis": "Not in ChatGPT-reviewed primary meat whitelist or manual-review animal list.",
        "double_counting_risk_note": (
            "Excluded from first filter design because QCL includes live animals, offal, fat, "
            "milk, derivative, crop, aggregate, and other non-primary-meat items."
        ),
    }


def build_item_rows(dataset, item_labels):
    rows = []
    for item_code, item_label in sorted(item_labels.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else kv[0]):
        cls = classify_item(item_code, item_label)
        rows.append(
            {
                "dataset_code": dataset.get("code"),
                "dataset_name": dataset.get("name"),
                "provider_name": dataset.get("provider_name"),
                "element_code": ELEMENT_CODE,
                "element_label": ELEMENT_LABEL,
                "item_code": item_code,
                "item_label": item_label,
                "include_status": cls["include_status"],
                "classification_basis": cls["classification_basis"],
                "double_counting_risk_note": cls["double_counting_risk_note"],
                "method_status": ITEM_METHOD_STATUS,
                "allowed_use_scope": ALLOWED_USE_SCOPE,
            }
        )
    return rows


def build_series_rows(dataset, area_labels):
    rows = []
    for area_code, area_label in sorted(area_labels.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else kv[0]):
        first_fetch_scope = (
            "candidate_validation_scope" if area_code == "1" else "deferred_full_area_scope_after_review"
        )
        for item_code, item_label in sorted(PRIMARY_MEAT_ITEM_CODES.items(), key=lambda kv: int(kv[0])):
            # DBnomics sample URLs reviewed earlier used area.item.element order for QCL series ids.
            inferred_series_code = f"{area_code}.{item_code}.{ELEMENT_CODE}"
            rows.append(
                {
                    "dataset_code": dataset.get("code"),
                    "dataset_name": dataset.get("name"),
                    "provider_name": dataset.get("provider_name"),
                    "element_code": ELEMENT_CODE,
                    "element_label": ELEMENT_LABEL,
                    "area_code": area_code,
                    "area_label": area_label,
                    "item_code": item_code,
                    "item_label": item_label,
                    "inferred_series_code": inferred_series_code,
                    "inferred_series_url": f"https://api.db.nomics.world/v22/series/FAO/QCL/{inferred_series_code}",
                    "area_scope_status": "all_qcl_area_codes_from_metadata",
                    "first_fetch_scope": first_fetch_scope,
                    "query_plan_status": SERIES_QUERY_PLAN_STATUS,
                    "allowed_use_scope": ALLOWED_USE_SCOPE,
                    "design_note": (
                        "Inferred URL only; do not fetch or parse observations until ChatGPT approves "
                        "series URL validation, legal status, and source-snapshot manifest fields."
                    ),
                }
            )
    return rows


def write_csv(path, rows, fields):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def write_markdown(dataset, item_rows, series_rows):
    item_counts = Counter(row["include_status"] for row in item_rows)
    area_counts = Counter(row["area_scope_status"] for row in series_rows)
    fetch_counts = Counter(row["first_fetch_scope"] for row in series_rows)
    primary_rows = [row for row in item_rows if row["include_status"] == "candidate_primary_meat_item"]
    manual_rows = [row for row in item_rows if row["include_status"] == "manual_review_required"]

    with OUT_MD.open("w", encoding="utf-8") as out:
        out.write("# DBnomics FAO/QCL slaughter filter design\n\n")
        out.write(f"Generated: {now_iso()}\n\n")
        out.write("## Scope\n\n")
        out.write(
            "Design-only filter and inferred series-query plan for DBnomics FAO/QCL element 5320. "
            "No DBnomics series observations were fetched or parsed.\n\n"
        )
        out.write("## Dataset metadata\n\n")
        out.write(f"- dataset_code: `{dataset.get('code')}`\n")
        out.write(f"- dataset_name: `{dataset.get('name')}`\n")
        out.write(f"- provider_name: `{dataset.get('provider_name')}`\n")
        out.write(f"- element_code: `{ELEMENT_CODE}`\n")
        out.write(f"- element_label: `{ELEMENT_LABEL}`\n")
        out.write(f"- dimensions: `{dataset.get('dimensions_codes_order')}`\n\n")
        out.write("## Primary meat item whitelist\n\n")
        for row in primary_rows:
            out.write(f"- `{row['item_code']}`: {row['item_label']}\n")
        out.write("\n## Manual-review animal items\n\n")
        for row in manual_rows:
            out.write(f"- `{row['item_code']}`: {row['item_label']}\n")
        out.write("\n## Item classification summary\n\n")
        for key, value in sorted(item_counts.items()):
            out.write(f"- `{key}`: {value}\n")
        out.write("\n## Series-query plan summary\n\n")
        out.write(f"- total query-plan rows: `{len(series_rows)}`\n")
        out.write("- area-scope counts:\n")
        for key, value in sorted(area_counts.items()):
            out.write(f"  - `{key}`: {value}\n")
        out.write("- first-fetch-scope counts:\n")
        for key, value in sorted(fetch_counts.items()):
            out.write(f"  - `{key}`: {value}\n")
        out.write("\n## Double-counting risk\n\n")
        out.write(
            "All element-5320 series must not be fetched blindly because QCL contains offal, fat, "
            "live-animal, derivative, aggregate, and other item labels that may duplicate or distort "
            "slaughter counts. This design limits the initial candidate query plan to the explicit "
            "primary-meat whitelist and leaves ambiguous animal items in manual review.\n\n"
        )
        out.write("## Candidate next fetch scope\n\n")
        out.write(
            f"`{fetch_counts.get('candidate_validation_scope', 0)}` inferred query-plan rows are marked "
            "`first_fetch_scope=candidate_validation_scope`. All series URLs remain inferred and were not fetched.\n\n"
        )
        out.write("## Decision status\n\n")
        out.write(f"- method_status: `{ITEM_METHOD_STATUS}`\n")
        out.write(f"- query_plan_status: `{SERIES_QUERY_PLAN_STATUS}`\n")
        out.write(f"- allowed_use_scope: {ALLOWED_USE_SCOPE}\n")


def main():
    dataset, area_labels, item_labels = load_metadata()
    item_rows = build_item_rows(dataset, item_labels)
    series_rows = build_series_rows(dataset, area_labels)

    write_csv(OUT_ITEM_CSV, item_rows, ITEM_FIELDS)
    OUT_ITEM_JSON.write_text(json.dumps(item_rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    write_csv(OUT_SERIES_CSV, series_rows, SERIES_FIELDS)
    OUT_SERIES_JSON.write_text(json.dumps(series_rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    write_markdown(dataset, item_rows, series_rows)

    print(f"wrote {OUT_ITEM_CSV}")
    print(f"wrote {OUT_ITEM_JSON}")
    print(f"wrote {OUT_SERIES_CSV}")
    print(f"wrote {OUT_SERIES_JSON}")
    print(f"wrote {OUT_MD}")
    print("dataset_code:", dataset.get("code"))
    print("dataset_name:", dataset.get("name"))
    print("element_code:", ELEMENT_CODE)
    print("element_label:", ELEMENT_LABEL)
    print("item_rows:", len(item_rows))
    print("series_rows:", len(series_rows))
    print("item_status_counts:", dict(Counter(row["include_status"] for row in item_rows)))
    print("series_area_status_counts:", dict(Counter(row["area_scope_status"] for row in series_rows)))
    print("first_fetch_scope_counts:", dict(Counter(row["first_fetch_scope"] for row in series_rows)))
    print("method_status:", ITEM_METHOD_STATUS)
    print("query_plan_status:", SERIES_QUERY_PLAN_STATUS)
    print("allowed_use_scope:", ALLOWED_USE_SCOPE)


if __name__ == "__main__":
    main()
