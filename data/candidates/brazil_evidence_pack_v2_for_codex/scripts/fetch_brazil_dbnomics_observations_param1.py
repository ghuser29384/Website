#!/usr/bin/env python3
import csv
import hashlib
import json
import math
import ssl
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DECISION_CSV = Path("brazil-series-validation-decision.csv")
TARGET_CSV = Path("brazil-target-series.csv")
SNAPSHOT_DIR = Path("fetched-source-snapshots/brazil-observations-param1")

OUT_SHAPE_CSV = Path("brazil-dbnomics-observations-param1-response-shape.csv")
OUT_SHAPE_JSON = Path("brazil-dbnomics-observations-param1-response-shape.json")
OUT_PILOT_CSV = Path("brazil-dbnomics-observations-param1-pilot.csv")
OUT_PILOT_JSON = Path("brazil-dbnomics-observations-param1-pilot.json")
OUT_SNAPSHOTS_JSON = Path("brazil-dbnomics-observations-param1-source-snapshots.json")
OUT_UNAVAILABLE_CSV = Path("brazil-dbnomics-observations-param1-unavailable-series.csv")
OUT_UNAVAILABLE_JSON = Path("brazil-dbnomics-observations-param1-unavailable-series.json")
OUT_SUMMARY_MD = Path("brazil-dbnomics-observations-param1-summary.md")

FAO_TERMS_URL = "https://www.fao.org/contact-us/terms/db-terms-of-use/en/"
FAO_LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"

PILOT_FIELDS = [
    "candidate_row_id",
    "country_iso3",
    "country_name",
    "series_code",
    "dataset_code",
    "provider_code",
    "layer_id",
    "issue_id",
    "item_code",
    "item_label",
    "element_code",
    "element_label",
    "evidence_kind",
    "row_role",
    "raw_value",
    "unit_label",
    "reference_period",
    "reference_period_semantics",
    "source_id",
    "source_snapshot_id",
    "source_url",
    "retrieval_timestamp",
    "checksum_algorithm",
    "checksum",
    "byte_size",
    "license_id",
    "attribution",
    "legal_status",
    "method_status",
    "coverage_status",
    "promotion_decision",
    "caveat",
    "observation_extraction_status",
]

SHAPE_FIELDS = [
    "candidate_row_id",
    "series_code",
    "dataset_code",
    "provider_code",
    "source_url",
    "http_status",
    "content_type",
    "byte_size",
    "checksum_algorithm",
    "checksum",
    "source_snapshot_id",
    "local_path",
    "json_parse_status",
    "top_level_keys",
    "series_docs_count",
    "doc_keys",
    "values_type",
    "observations_type",
    "periods_type",
    "values_pair_count",
    "observations_pair_count",
    "extracted_pair_count",
    "extraction_path",
    "latest_period",
    "latest_value_present",
    "observation_extraction_status",
    "error",
]

UNAVAILABLE_FIELDS = [
    "series_code",
    "country_iso3",
    "country_name",
    "dataset_code",
    "provider_code",
    "item_code",
    "item_label",
    "element_code",
    "element_label",
    "http_status",
    "metadata_validation_status",
    "availability_status",
    "promotion_decision",
    "next_action",
    "reason",
]


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_csv(path):
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fields):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, rows):
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def pick(row, *names, default=""):
    for name in names:
        value = row.get(name)
        if value not in (None, ""):
            return value
    return default


def series_code_from(row):
    return pick(row, "series_code", "response_series_code", "target_series_code")


def target_by_series():
    if not TARGET_CSV.exists():
        return {}
    return {series_code_from(row): row for row in read_csv(TARGET_CSV) if series_code_from(row)}


def element_code_from(row, target):
    return pick(row, "element_code", "response_dimensions_element", default=pick(target, "element_code"))


def dataset_for(row, target):
    element_code = element_code_from(row, target)
    if element_code == "5320":
        return "QCL"
    if element_code == "5157":
        return "RP"
    return pick(row, "dataset_code", default=pick(target, "dataset_code"))


def source_url_for(row, target):
    series = series_code_from(row)
    dataset = dataset_for(row, target)
    return f"https://api.db.nomics.world/v22/series/FAO/{dataset}/{series}?observations=1"


def fetch(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Painmaps Brazil candidate pilot evidence fetch; review-stage only"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as response:
            body = response.read()
            return {
                "status": getattr(response, "status", ""),
                "content_type": response.headers.get("Content-Type", ""),
                "body": body,
                "error": "",
            }
    except urllib.error.HTTPError as exc:
        return {
            "status": exc.code,
            "content_type": exc.headers.get("Content-Type", "") if exc.headers else "",
            "body": exc.read(),
            "error": repr(exc),
        }


def type_name(value):
    if value is None:
        return ""
    if isinstance(value, list):
        return "list"
    if isinstance(value, dict):
        return "mapping"
    return type(value).__name__


def numeric_or_none(value):
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if stripped == "" or stripped.upper() in {"NA", "N/A", "NAN", "NULL"}:
            return None
        value = stripped
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(numeric):
        return None
    return value


def add_pair(pairs, period, value):
    if period in (None, ""):
        return
    numeric_value = numeric_or_none(value)
    if numeric_value is None:
        return
    pairs.append((str(period), numeric_value))


def latest_pair(pairs):
    if not pairs:
        return "", ""

    def period_key(pair):
        period = pair[0]
        return period

    period, value = sorted(pairs, key=period_key)[-1]
    return period, str(value)


def extract_pairs(payload):
    docs = payload.get("series", {}).get("docs", []) if isinstance(payload, dict) else []
    doc = docs[0] if docs and isinstance(docs[0], dict) else {}
    diagnostics = {
        "series_docs_count": len(docs) if isinstance(docs, list) else 0,
        "doc_keys": "|".join(sorted(doc.keys())) if doc else "",
        "values_type": type_name(doc.get("values")),
        "observations_type": type_name(doc.get("observations")),
        "periods_type": type_name(doc.get("period") or doc.get("periods")),
        "values_pair_count": 0,
        "observations_pair_count": 0,
        "extracted_pair_count": 0,
        "extraction_path": "",
        "observation_extraction_status": "no_observation_pairs_found",
    }
    pairs = []

    values = doc.get("values")
    if isinstance(values, list) and values and all(isinstance(v, dict) for v in values):
        for item in values:
            add_pair(pairs, item.get("period") or item.get("Period"), item.get("value") or item.get("Value"))
        diagnostics["values_pair_count"] = len(pairs)
        if pairs:
            diagnostics["extraction_path"] = "series.docs[0].values_list_period_value_objects"

    if not pairs and isinstance(values, dict):
        for period, value in values.items():
            add_pair(pairs, period, value)
        diagnostics["values_pair_count"] = len(pairs)
        if pairs:
            diagnostics["extraction_path"] = "series.docs[0].values_mapping_period_to_value"

    observations = doc.get("observations")
    if not pairs and isinstance(observations, dict):
        for period, value in observations.items():
            if isinstance(value, dict):
                add_pair(pairs, period, value.get("value") or value.get("Value"))
            else:
                add_pair(pairs, period, value)
        diagnostics["observations_pair_count"] = len(pairs)
        if pairs:
            diagnostics["extraction_path"] = "series.docs[0].observations_mapping"

    if not pairs and isinstance(observations, list):
        for item in observations:
            if isinstance(item, dict):
                add_pair(pairs, item.get("period") or item.get("Period"), item.get("value") or item.get("Value"))
        diagnostics["observations_pair_count"] = len(pairs)
        if pairs:
            diagnostics["extraction_path"] = "series.docs[0].observations_list_period_value_objects"

    periods = doc.get("period") or doc.get("periods")
    if not pairs and isinstance(values, list) and isinstance(periods, list) and len(values) == len(periods):
        for period, value in zip(periods, values):
            add_pair(pairs, period, value)
        diagnostics["values_pair_count"] = len(pairs)
        if pairs:
            diagnostics["extraction_path"] = "series.docs[0].periods_values_parallel_arrays"

    diagnostics["extracted_pair_count"] = len(pairs)
    if pairs:
        diagnostics["observation_extraction_status"] = "latest_non_null_observation_extracted"
    return pairs, diagnostics


def classify(row, target):
    element_code = element_code_from(row, target)
    if element_code == "5157":
        return {
            "layer_id": "fao_rp_brazil_insecticide_proxy_context",
            "issue_id": "issue.insect-welfare",
            "evidence_kind": "proxy_context",
            "row_role": "brazil_country_insecticide_proxy_candidate",
            "unit_label": "source-reported unit",
            "source_id": "dbnomics-fao-rp-brazil-insecticide-pilot",
            "caveat": "FAO/RP insecticide-use proxy via DBnomics distribution path; not direct insect suffering evidence; candidate-only pending legal, source, method, and UX review.",
        }
    return {
        "layer_id": "fao_qcl_brazil_slaughter_context",
        "issue_id": "issue.factory-farmed-animals",
        "evidence_kind": "direct_context",
        "row_role": "brazil_country_animal_slaughter_context_candidate",
        "unit_label": "head",
        "source_id": "dbnomics-fao-qcl-brazil-slaughter-pilot",
        "caveat": "FAO/QCL Producing Animals/Slaughtered context via DBnomics distribution path; not a welfare or suffering estimate; candidate-only pending legal, source, method, and UX review.",
    }


def unavailable_row(row, target):
    return {
        "series_code": series_code_from(row),
        "country_iso3": "BRA",
        "country_name": "Brazil",
        "dataset_code": dataset_for(row, target),
        "provider_code": "FAO",
        "item_code": pick(row, "item_code", "response_dimensions_item", default=pick(target, "item_code")),
        "item_label": pick(row, "item_label", default=pick(target, "item_label")),
        "element_code": element_code_from(row, target),
        "element_label": pick(row, "element_label", default=pick(target, "element_label")),
        "http_status": pick(row, "http_status"),
        "metadata_validation_status": pick(row, "metadata_validation_status"),
        "availability_status": "unavailable_exact_series_code",
        "promotion_decision": "blocked_series_not_available",
        "next_action": "do not infer; if needed, inspect FAO/DBnomics metadata for alternate item code or leave category absent",
        "reason": pick(row, "validation_decision_reason", default="Exact DBnomics/FAO series unavailable; keep absent."),
    }


def main():
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    decisions = read_csv(DECISION_CSV)
    targets = target_by_series()
    eligible = [row for row in decisions if row.get("validation_decision") == "pilot_observation_eligible"]
    unavailable = [row for row in decisions if row.get("validation_decision") == "unavailable_exact_series_code"]

    if len(eligible) != 6:
        raise SystemExit(f"Expected exactly 6 pilot_observation_eligible rows, found {len(eligible)}")
    if len(unavailable) != 9:
        raise SystemExit(f"Expected exactly 9 unavailable_exact_series_code rows, found {len(unavailable)}")

    pilot_rows = []
    shape_rows = []
    snapshot_rows = []
    unavailable_rows = []

    for idx, row in enumerate(eligible, start=1):
        series = series_code_from(row)
        target = targets.get(series, {})
        dataset = dataset_for(row, target)
        source_url = source_url_for(row, target)
        retrieved_at = now_iso()
        result = fetch(source_url)
        body = result["body"]
        checksum = hashlib.sha256(body).hexdigest()
        snapshot_id = f"snapshot.release-candidate-2026-07-09.brazil-observations-param1.{series.replace('.', '-')}.json"
        local_path = SNAPSHOT_DIR / snapshot_id
        local_path.write_bytes(body)

        json_parse_status = "not_parsed"
        payload = {}
        parse_error = ""
        try:
            payload = json.loads(body.decode("utf-8"))
            json_parse_status = "parsed"
        except Exception as exc:
            parse_error = repr(exc)
            json_parse_status = "parse_failed"

        pairs, diagnostics = extract_pairs(payload) if json_parse_status == "parsed" else ([], {
            "series_docs_count": 0,
            "doc_keys": "",
            "values_type": "",
            "observations_type": "",
            "periods_type": "",
            "values_pair_count": 0,
            "observations_pair_count": 0,
            "extracted_pair_count": 0,
            "extraction_path": "",
            "observation_extraction_status": "response_json_parse_failed",
        })
        latest_period, latest_value = latest_pair(pairs)
        extraction_status = diagnostics["observation_extraction_status"]
        info = classify(row, target)
        candidate_row_id = f"brazil-param1-pilot-{idx:03d}"

        item_code = pick(row, "item_code", "response_dimensions_item", default=pick(target, "item_code"))
        item_label = pick(row, "item_label", default=pick(target, "item_label"))
        element_code = element_code_from(row, target)
        element_label = pick(row, "element_label", default=pick(target, "element_label"))

        pilot_rows.append({
            "candidate_row_id": candidate_row_id,
            "country_iso3": "BRA",
            "country_name": "Brazil",
            "series_code": series,
            "dataset_code": dataset,
            "provider_code": "FAO",
            "layer_id": info["layer_id"],
            "issue_id": info["issue_id"],
            "item_code": item_code,
            "item_label": item_label,
            "element_code": element_code,
            "element_label": element_label,
            "evidence_kind": info["evidence_kind"],
            "row_role": info["row_role"],
            "raw_value": latest_value,
            "unit_label": info["unit_label"],
            "reference_period": latest_period,
            "reference_period_semantics": "latest_numeric_non_null_dbnomics_fao_period",
            "source_id": info["source_id"],
            "source_snapshot_id": snapshot_id,
            "source_url": source_url,
            "retrieval_timestamp": retrieved_at,
            "checksum_algorithm": "sha256",
            "checksum": checksum,
            "byte_size": str(len(body)),
            "license_id": "fao-statistical-database-cc-by-4.0-review-stage",
            "attribution": "FAO as underlying provider; DBnomics as distributor/mirror. Candidate-only pending final source/license review.",
            "legal_status": "review_stage_not_release_approved",
            "method_status": "candidate_pilot_only_not_parse_eligible_for_release",
            "coverage_status": "candidate_context_only",
            "promotion_decision": "not_promoted_candidate_only",
            "caveat": info["caveat"],
            "observation_extraction_status": extraction_status,
        })

        top_keys = "|".join(sorted(payload.keys())) if isinstance(payload, dict) else ""
        shape_rows.append({
            "candidate_row_id": candidate_row_id,
            "series_code": series,
            "dataset_code": dataset,
            "provider_code": "FAO",
            "source_url": source_url,
            "http_status": str(result["status"]),
            "content_type": result["content_type"],
            "byte_size": str(len(body)),
            "checksum_algorithm": "sha256",
            "checksum": checksum,
            "source_snapshot_id": snapshot_id,
            "local_path": str(local_path),
            "json_parse_status": json_parse_status,
            "top_level_keys": top_keys,
            "series_docs_count": str(diagnostics["series_docs_count"]),
            "doc_keys": diagnostics["doc_keys"],
            "values_type": diagnostics["values_type"],
            "observations_type": diagnostics["observations_type"],
            "periods_type": diagnostics["periods_type"],
            "values_pair_count": str(diagnostics["values_pair_count"]),
            "observations_pair_count": str(diagnostics["observations_pair_count"]),
            "extracted_pair_count": str(diagnostics["extracted_pair_count"]),
            "extraction_path": diagnostics["extraction_path"],
            "latest_period": latest_period,
            "latest_value_present": "true" if latest_value else "false",
            "observation_extraction_status": extraction_status,
            "error": result["error"] or parse_error,
        })

        snapshot_rows.append({
            "source_snapshot_id": snapshot_id,
            "series_code": series,
            "dataset_code": dataset,
            "provider_code": "FAO",
            "source_id": info["source_id"],
            "source_url": source_url,
            "local_path": str(local_path),
            "retrieval_timestamp": retrieved_at,
            "http_status": str(result["status"]),
            "content_type": result["content_type"],
            "checksum_algorithm": "sha256",
            "checksum": checksum,
            "byte_size": len(body),
            "legal_status": "review_stage_not_release_approved",
            "allowed_use_scope": "candidate pilot observation snapshot only; no production release use; no country promotion",
            "provider": "Food and Agriculture Organization of the United Nations",
            "distributor": "DBnomics",
            "license_uri": FAO_LICENSE_URI,
            "terms_url": FAO_TERMS_URL,
        })

    for row in unavailable:
        series = series_code_from(row)
        unavailable_rows.append(unavailable_row(row, targets.get(series, {})))

    write_csv(OUT_SHAPE_CSV, shape_rows, SHAPE_FIELDS)
    write_json(OUT_SHAPE_JSON, shape_rows)
    write_csv(OUT_PILOT_CSV, pilot_rows, PILOT_FIELDS)
    write_json(OUT_PILOT_JSON, pilot_rows)
    write_json(OUT_SNAPSHOTS_JSON, snapshot_rows)
    write_csv(OUT_UNAVAILABLE_CSV, unavailable_rows, UNAVAILABLE_FIELDS)
    write_json(OUT_UNAVAILABLE_JSON, unavailable_rows)

    OUT_SUMMARY_MD.write_text(
        "# Brazil DBnomics observations=1 pilot summary\n\n"
        "Candidate-only corrected pilot for six metadata-validated Brazil DBnomics FAO series. "
        "No production release integration and no country promotion.\n\n"
        f"- pilot rows: {len(pilot_rows)}\n"
        f"- response-shape rows: {len(shape_rows)}\n"
        f"- unavailable rows copied without retry: {len(unavailable_rows)}\n"
        f"- rows with raw value: {sum(1 for row in pilot_rows if row['raw_value'])}\n\n"
        "## Pilot rows\n\n"
        + "\n".join(
            f"- `{row['series_code']}` - {row['item_label']} - "
            f"{row['raw_value']} {row['unit_label']} ({row['reference_period']}) - "
            f"{row['observation_extraction_status']}"
            for row in pilot_rows
        )
        + "\n\n## Unavailable exact series codes\n\n"
        + "\n".join(
            f"- `{row['series_code']}` - {row['item_label']} - {row['availability_status']}"
            for row in unavailable_rows
        )
        + "\n",
        encoding="utf-8",
    )

    print("pilot_rows:", len(pilot_rows))
    print("shape_rows:", len(shape_rows))
    print("unavailable_rows:", len(unavailable_rows))
    print("rows_with_raw_value:", sum(1 for row in pilot_rows if row["raw_value"]))
    print("wrote", OUT_PILOT_CSV)
    print("wrote", OUT_SHAPE_CSV)
    print("wrote", OUT_SNAPSHOTS_JSON)
    print("wrote", OUT_UNAVAILABLE_CSV)


if __name__ == "__main__":
    main()
