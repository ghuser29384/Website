#!/usr/bin/env python3
import csv
import hashlib
import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "brazil-target-series.csv"

METADATA_CSV = ROOT / "brazil-series-metadata-validation.csv"
METADATA_JSON = ROOT / "brazil-series-metadata-validation.json"
METADATA_MD = ROOT / "brazil-series-metadata-validation.md"

PILOT_CSV = ROOT / "brazil-pilot-observations.csv"
PILOT_JSON = ROOT / "brazil-pilot-observations.json"
PILOT_MD = ROOT / "brazil-pilot-observations.md"

REPORT = (
    ROOT.parents[2]
    / ".painmaps-iteration"
    / "validation"
    / "brazil-evidence-v2-validation-report.md"
)

METADATA_FIELDS = [
    "series_code",
    "metadata_url",
    "http_status",
    "content_type",
    "byte_size",
    "sha256",
    "dataset_code",
    "provider_code",
    "response_series_code",
    "response_series_name",
    "response_dimensions_area",
    "response_dimensions_item",
    "response_dimensions_element",
    "observations_requested",
    "observations_present",
    "metadata_validation_status",
    "allowed_use_scope",
    "error",
]

PILOT_FIELDS = [
    "series_code",
    "pilot_observation_url",
    "http_status",
    "content_type",
    "byte_size",
    "sha256",
    "dataset_code",
    "provider_code",
    "area_code",
    "area_label",
    "item_code",
    "item_label",
    "element_code",
    "element_label",
    "latest_period",
    "latest_value",
    "unit_label",
    "evidence_kind",
    "allowed_use_scope",
    "promotion_decision",
    "caveat",
    "error",
]

METADATA_ALLOWED_USE = (
    "Brazil-only DBnomics series metadata validation; no numeric parsing; "
    "no ranking; no country promotion; no production release integration"
)
PILOT_ALLOWED_USE = (
    "Brazil-only tiny pilot observations for staging review; no ranking; "
    "no country promotion; no production release integration"
)


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_rows():
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def fetch(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Painmaps Brazil evidence v2 candidate validation; "
                "staging-only; no country promotion"
            )
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
            body = r.read()
            return {
                "ok": True,
                "status": str(getattr(r, "status", "")),
                "content_type": r.headers.get("Content-Type", ""),
                "byte_size": str(len(body)),
                "sha256": hashlib.sha256(body).hexdigest(),
                "body": body,
                "error": "",
            }
    except urllib.error.HTTPError as e:
        body = e.read() if hasattr(e, "read") else b""
        return {
            "ok": False,
            "status": str(e.code),
            "content_type": e.headers.get("Content-Type", "") if e.headers else "",
            "byte_size": str(len(body)),
            "sha256": hashlib.sha256(body).hexdigest() if body else "",
            "body": body,
            "error": repr(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": "",
            "content_type": "",
            "byte_size": "0",
            "sha256": "",
            "body": b"",
            "error": repr(e),
        }


def parse_json(result):
    if not result["body"]:
        return {}, "empty response body"
    try:
        return json.loads(result["body"].decode("utf-8")), ""
    except Exception as e:
        return {}, repr(e)


def series_docs(parsed):
    series = parsed.get("series")
    if isinstance(series, dict):
        docs = series.get("docs")
        if isinstance(docs, list):
            return docs
    if isinstance(series, list):
        return series
    return []


def first_doc(parsed):
    docs = series_docs(parsed)
    return docs[0] if docs else {}


def get_nested(obj, *keys):
    cur = obj
    for key in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur


def response_dataset_code(parsed, doc):
    return (
        get_nested(parsed, "dataset", "code")
        or doc.get("dataset_code")
        or doc.get("dataset")
        or ""
    )


def response_provider_code(parsed, doc):
    return (
        get_nested(parsed, "provider", "code")
        or get_nested(parsed, "dataset", "provider_code")
        or doc.get("provider_code")
        or doc.get("provider")
        or ""
    )


def response_series_code(doc):
    return doc.get("series_code", "") or doc.get("code", "")


def response_series_name(doc):
    return doc.get("series_name", "") or doc.get("name", "")


def dimensions(doc):
    for key in ("dimensions", "dimensions_values", "values"):
        value = doc.get(key)
        if isinstance(value, dict):
            dims = {k: str(v) for k, v in value.items() if k in {"area", "item", "element"}}
            if dims:
                return dims
    return {}


def has_observations(obj):
    if not isinstance(obj, dict):
        return False
    for key in (
        "observations",
        "period",
        "value",
        "original_period",
        "original_value",
    ):
        value = obj.get(key)
        if value not in (None, "", [], {}):
            return True
    values = obj.get("values")
    if isinstance(values, dict) and not any(k in {"area", "item", "element"} for k in values):
        return bool(values)
    return False


def observations_present(doc, parsed):
    return has_observations(doc) or has_observations(parsed)


def query_value(url, key):
    parsed = urllib.parse.urlparse(url)
    query = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    return query.get(key, "")


def validate_metadata(row, result, parsed, doc):
    errors = []
    dims = dimensions(doc)
    dataset_code = response_dataset_code(parsed, doc)
    provider_code = response_provider_code(parsed, doc)
    series_code = response_series_code(doc)
    obs_present = observations_present(doc, parsed)

    if result["status"] != "200":
        errors.append(f"http_status={result['status']}")
    if not parsed:
        errors.append("json_response=false")
    if dataset_code != row["dataset_code"]:
        errors.append(f"response_dataset_code={dataset_code!r}")
    if provider_code != "FAO":
        errors.append(f"response_provider_code={provider_code!r}")
    if series_code != row["series_code"]:
        errors.append(f"response_series_code={series_code!r}")
    if dims.get("area", "") != row["area_code"]:
        errors.append(f"response_dimensions_area={dims.get('area', '')!r}")
    if dims.get("item", "") != row["item_code"]:
        errors.append(f"response_dimensions_item={dims.get('item', '')!r}")
    if dims.get("element", "") != row["element_code"]:
        errors.append(f"response_dimensions_element={dims.get('element', '')!r}")
    if obs_present:
        errors.append("observations_present=true")

    return (
        "validated_metadata_only" if not errors else "metadata_validation_failed",
        "; ".join(errors),
    )


def metadata_output_row(row, result, parsed, parse_error):
    doc = first_doc(parsed)
    dims = dimensions(doc)
    status, validation_error = validate_metadata(row, result, parsed, doc)
    error = "; ".join(part for part in [result["error"], parse_error, validation_error] if part)
    return {
        "series_code": row["series_code"],
        "metadata_url": row["metadata_url"],
        "http_status": result["status"],
        "content_type": result["content_type"],
        "byte_size": result["byte_size"],
        "sha256": result["sha256"],
        "dataset_code": response_dataset_code(parsed, doc),
        "provider_code": response_provider_code(parsed, doc),
        "response_series_code": response_series_code(doc),
        "response_series_name": response_series_name(doc),
        "response_dimensions_area": dims.get("area", ""),
        "response_dimensions_item": dims.get("item", ""),
        "response_dimensions_element": dims.get("element", ""),
        "observations_requested": query_value(row["metadata_url"], "observations"),
        "observations_present": "true" if observations_present(doc, parsed) else "false",
        "metadata_validation_status": status,
        "allowed_use_scope": METADATA_ALLOWED_USE,
        "error": error,
    }


def sort_period_key(period):
    text = str(period)
    try:
        return (0, int(text), text)
    except ValueError:
        return (1, text)


def iter_observations_from_doc(doc):
    values = doc.get("values")
    if isinstance(values, dict) and not any(k in {"area", "item", "element"} for k in values):
        for period, value in values.items():
            yield str(period), value

    periods = doc.get("period") or doc.get("original_period")
    values = doc.get("value") or doc.get("original_value")
    if isinstance(periods, list) and isinstance(values, list):
        for period, value in zip(periods, values):
            yield str(period), value

    observations = doc.get("observations")
    if isinstance(observations, list):
        for obs in observations:
            if isinstance(obs, dict):
                period = obs.get("period") or obs.get("original_period") or obs.get("time")
                value = obs.get("value") or obs.get("original_value")
                if period not in (None, "") and value not in (None, ""):
                    yield str(period), value
            elif isinstance(obs, (list, tuple)) and len(obs) >= 2:
                yield str(obs[0]), obs[1]


def latest_observation(doc):
    observations = [
        (period, value)
        for period, value in iter_observations_from_doc(doc)
        if period not in ("", None) and value not in ("", None)
    ]
    if not observations:
        return "", ""
    period, value = sorted(observations, key=lambda pair: sort_period_key(pair[0]))[-1]
    return str(period), str(value)


def unit_label(doc):
    for key in ("unit", "unit_label", "unit_name", "Unit", "units", "Units"):
        value = doc.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def caveat_for(row):
    if row["dataset_code"] == "RP":
        return "Insecticide use is proxy context only; it is not direct insect suffering evidence."
    return "Slaughter series is direct context only; it is not a final Painmaps country measurement."


def pilot_status(row, result, parsed, doc):
    errors = []
    dims = dimensions(doc)
    latest_period, latest_value = latest_observation(doc)
    if result["status"] != "200":
        errors.append(f"http_status={result['status']}")
    if not parsed:
        errors.append("json_response=false")
    if response_dataset_code(parsed, doc) != row["dataset_code"]:
        errors.append(f"response_dataset_code={response_dataset_code(parsed, doc)!r}")
    if response_provider_code(parsed, doc) != "FAO":
        errors.append(f"response_provider_code={response_provider_code(parsed, doc)!r}")
    if response_series_code(doc) != row["series_code"]:
        errors.append(f"response_series_code={response_series_code(doc)!r}")
    if dims.get("area", "") != row["area_code"]:
        errors.append(f"response_dimensions_area={dims.get('area', '')!r}")
    if dims.get("item", "") != row["item_code"]:
        errors.append(f"response_dimensions_item={dims.get('item', '')!r}")
    if dims.get("element", "") != row["element_code"]:
        errors.append(f"response_dimensions_element={dims.get('element', '')!r}")
    if not latest_period or latest_value == "":
        errors.append("latest_observation_missing")
    return latest_period, latest_value, "; ".join(errors)


def pilot_output_row(row, result, parsed, parse_error):
    doc = first_doc(parsed)
    latest_period, latest_value, validation_error = pilot_status(row, result, parsed, doc)
    error = "; ".join(part for part in [result["error"], parse_error, validation_error] if part)
    return {
        "series_code": row["series_code"],
        "pilot_observation_url": row["pilot_observation_url"],
        "http_status": result["status"],
        "content_type": result["content_type"],
        "byte_size": result["byte_size"],
        "sha256": result["sha256"],
        "dataset_code": response_dataset_code(parsed, doc),
        "provider_code": response_provider_code(parsed, doc),
        "area_code": row["area_code"],
        "area_label": row["area_label"],
        "item_code": row["item_code"],
        "item_label": row["item_label"],
        "element_code": row["element_code"],
        "element_label": row["element_label"],
        "latest_period": latest_period,
        "latest_value": latest_value,
        "unit_label": unit_label(doc),
        "evidence_kind": "proxy_context" if row["dataset_code"] == "RP" else "direct_context",
        "allowed_use_scope": PILOT_ALLOWED_USE,
        "promotion_decision": "not_promoted_context_only",
        "caveat": caveat_for(row),
        "error": error,
    }


def write_csv(path, rows, fields):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, rows):
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_metadata_md(rows, started_at, finished_at):
    status_counts = Counter(r["metadata_validation_status"] for r in rows)
    observations_counts = Counter(r["observations_present"] for r in rows)
    lines = [
        "# Brazil series metadata validation",
        "",
        f"- started_at: `{started_at}`",
        f"- finished_at: `{finished_at}`",
        f"- row_count: `{len(rows)}`",
        f"- metadata_validation_status: `{dict(status_counts)}`",
        f"- observations_present: `{dict(observations_counts)}`",
        "",
        "## Rows",
    ]
    for row in rows:
        lines.extend(
            [
                f"- `{row['series_code']}`",
                f"  - status: `{row['metadata_validation_status']}`",
                f"  - http_status: `{row['http_status']}`",
                f"  - dataset/provider: `{row['dataset_code']}` / `{row['provider_code']}`",
                f"  - dimensions: area `{row['response_dimensions_area']}`, item `{row['response_dimensions_item']}`, element `{row['response_dimensions_element']}`",
                f"  - observations_present: `{row['observations_present']}`",
            ]
        )
        if row["error"]:
            lines.append(f"  - error: `{row['error']}`")
    METADATA_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_pilot_md(rows, skipped_reason, started_at, finished_at):
    lines = [
        "# Brazil pilot observations",
        "",
        f"- started_at: `{started_at}`",
        f"- finished_at: `{finished_at}`",
        f"- row_count: `{len(rows)}`",
        f"- skipped_reason: `{skipped_reason}`" if skipped_reason else "- skipped_reason: ``",
        "",
    ]
    if rows:
        lines.append("## Latest pilot values")
        for row in rows:
            lines.extend(
                [
                    f"- `{row['series_code']}` {row['item_label']}",
                    f"  - latest_period: `{row['latest_period']}`",
                    f"  - latest_value: `{row['latest_value']}`",
                    f"  - evidence_kind: `{row['evidence_kind']}`",
                    f"  - promotion_decision: `{row['promotion_decision']}`",
                    f"  - caveat: {row['caveat']}",
                ]
            )
            if row["error"]:
                lines.append(f"  - error: `{row['error']}`")
    PILOT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_report(metadata_rows, pilot_rows, skipped_reason, started_at, finished_at):
    metadata_status = Counter(r["metadata_validation_status"] for r in metadata_rows)
    observations_status = Counter(r["observations_present"] for r in metadata_rows)
    pilot_errors = [r for r in pilot_rows if r["error"]]
    lines = [
        "# Brazil evidence v2 validation report",
        "",
        "## Scope",
        "Candidate-only Brazil evidence staging pack validation. No OWID/Fishcount numeric parsing, no Fishcount retry/bypass, no country promotion, no final release artifact regeneration, and no ranking-like outputs.",
        "",
        "## Inputs",
        f"- `{CSV_PATH}`",
        "- metadata URLs from `brazil-target-series.csv`",
        "- pilot observation URLs from `brazil-target-series.csv`, fetched only after full metadata validation success",
        "",
        "## Outputs",
        f"- `{METADATA_CSV}`",
        f"- `{METADATA_JSON}`",
        f"- `{METADATA_MD}`",
        f"- `{PILOT_CSV}`",
        f"- `{PILOT_JSON}`",
        f"- `{PILOT_MD}`",
        "",
        "## Metadata validation summary",
        f"- started_at: `{started_at}`",
        f"- finished_at: `{finished_at}`",
        f"- rows: `{len(metadata_rows)}`",
        f"- metadata_validation_status: `{dict(metadata_status)}`",
        f"- observations_present: `{dict(observations_status)}`",
        "",
        "## Pilot observation summary",
        f"- rows: `{len(pilot_rows)}`",
        f"- skipped_reason: `{skipped_reason}`" if skipped_reason else "- skipped_reason: ``",
        f"- pilot_rows_with_errors: `{len(pilot_errors)}`",
        "",
    ]
    if pilot_rows:
        lines.append("## Pilot latest values")
        for row in pilot_rows:
            lines.extend(
                [
                    f"- `{row['series_code']}` {row['item_label']}",
                    f"  - latest_period: `{row['latest_period']}`",
                    f"  - latest_value: `{row['latest_value']}`",
                    f"  - unit_label: `{row['unit_label']}`",
                    f"  - evidence_kind: `{row['evidence_kind']}`",
                    f"  - promotion_decision: `{row['promotion_decision']}`",
                    f"  - caveat: {row['caveat']}",
                ]
            )
            if row["error"]:
                lines.append(f"  - error: `{row['error']}`")
        lines.append("")
    failed_metadata = [r for r in metadata_rows if r["metadata_validation_status"] != "validated_metadata_only"]
    if failed_metadata:
        lines.append("## Metadata blockers")
        for row in failed_metadata:
            lines.extend(
                [
                    f"- `{row['series_code']}`",
                    f"  - http_status: `{row['http_status']}`",
                    f"  - error: `{row['error']}`",
                ]
            )
        lines.append("")
    if pilot_errors:
        lines.append("## Pilot blockers")
        for row in pilot_errors:
            lines.extend(
                [
                    f"- `{row['series_code']}`",
                    f"  - http_status: `{row['http_status']}`",
                    f"  - error: `{row['error']}`",
                ]
            )
        lines.append("")
    lines.extend(
        [
            "## Staging decision",
            "All Brazil rows remain staging-only context/proxy evidence until ChatGPT reviews source, license, method, comparability, and UX coverage-honesty gates.",
            "",
            "## Next question for ChatGPT",
            "Should Codex keep this pack blocked pending review, inspect exact local files, apply an exact patch, run exact validation commands, or stop?",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    started_at = utc_now()
    rows = read_rows()
    metadata_rows = []
    for row in rows:
        result = fetch(row["metadata_url"])
        parsed, parse_error = parse_json(result)
        metadata_rows.append(metadata_output_row(row, result, parsed, parse_error))

    metadata_finished_at = utc_now()
    write_csv(METADATA_CSV, metadata_rows, METADATA_FIELDS)
    write_json(METADATA_JSON, metadata_rows)
    write_metadata_md(metadata_rows, started_at, metadata_finished_at)

    all_metadata_ok = all(
        r["metadata_validation_status"] == "validated_metadata_only" for r in metadata_rows
    )
    pilot_rows = []
    skipped_reason = ""
    if all_metadata_ok:
        for row in rows:
            result = fetch(row["pilot_observation_url"])
            parsed, parse_error = parse_json(result)
            pilot_rows.append(pilot_output_row(row, result, parsed, parse_error))
    else:
        skipped_reason = "metadata_validation_failed"

    finished_at = utc_now()
    write_csv(PILOT_CSV, pilot_rows, PILOT_FIELDS)
    write_json(PILOT_JSON, pilot_rows)
    write_pilot_md(pilot_rows, skipped_reason, started_at, finished_at)
    write_report(metadata_rows, pilot_rows, skipped_reason, started_at, finished_at)

    print(f"metadata_rows: {len(metadata_rows)}")
    print(
        "metadata_validation_status:",
        dict(Counter(r["metadata_validation_status"] for r in metadata_rows)),
    )
    print(
        "metadata_observations_present:",
        dict(Counter(r["observations_present"] for r in metadata_rows)),
    )
    if all_metadata_ok:
        print(f"pilot_rows: {len(pilot_rows)}")
        print("pilot_rows_with_errors:", sum(1 for r in pilot_rows if r["error"]))
    else:
        print(f"pilot_skipped: {skipped_reason}")
    print(f"wrote {METADATA_CSV}")
    print(f"wrote {METADATA_JSON}")
    print(f"wrote {METADATA_MD}")
    print(f"wrote {PILOT_CSV}")
    print(f"wrote {PILOT_JSON}")
    print(f"wrote {PILOT_MD}")
    print(f"wrote {REPORT}")


if __name__ == "__main__":
    main()
