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

QUERY_PLAN_CSV = Path("dbnomics-fao-qcl-series-query-plan.csv")

OUT_CSV = Path("dbnomics-fao-qcl-series-url-validation.csv")
OUT_JSON = Path("dbnomics-fao-qcl-series-url-validation.json")
OUT_MD = Path("dbnomics-fao-qcl-series-url-validation.md")

ALLOWED_USE_SCOPE = "series URL metadata validation only; no numeric parsing; no country promotion"
VALIDATION_SCOPE = "candidate_validation_scope"
QUERY_STATUS = "candidate_query_plan_only_no_fetch"

FIELDS = [
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
    "metadata_only_url",
    "request_method",
    "http_status",
    "content_type",
    "content_length",
    "byte_size",
    "sha256",
    "dbnomics_num_found",
    "series_doc_count",
    "response_dataset_code",
    "response_provider_code",
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


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def metadata_only_url(url):
    parsed = urllib.parse.urlparse(url)
    query = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    query["observations"] = "false"
    query["metadata"] = "true"
    return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query)))


def fetch(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Painmaps DBnomics FAO/QCL series metadata validation; observations disabled; contact project maintainer",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
            body = r.read()
            return {
                "ok": True,
                "status": getattr(r, "status", ""),
                "content_type": r.headers.get("Content-Type", ""),
                "content_length": r.headers.get("Content-Length", ""),
                "body": body,
                "error": "",
            }
    except urllib.error.HTTPError as e:
        body = e.read() if hasattr(e, "read") else b""
        return {
            "ok": False,
            "status": e.code,
            "content_type": e.headers.get("Content-Type", "") if e.headers else "",
            "content_length": e.headers.get("Content-Length", "") if e.headers else "",
            "body": body,
            "error": repr(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": "",
            "content_type": "",
            "content_length": "",
            "body": b"",
            "error": repr(e),
        }


def get_nested(obj, *keys):
    cur = obj
    for key in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur


def series_docs(parsed):
    series = parsed.get("series")
    if isinstance(series, dict):
        docs = series.get("docs")
        if isinstance(docs, list):
            return docs
    if isinstance(series, list):
        return series
    return []


def num_found(parsed):
    series = parsed.get("series")
    if isinstance(series, dict):
        for key in ("num_found", "numFound", "total", "count"):
            if key in series:
                return series.get(key)
    return ""


def response_dataset_code(parsed, doc):
    return (
        get_nested(parsed, "dataset", "code")
        or get_nested(parsed, "datasets", "docs", 0, "code")
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


def dimensions(doc):
    dims = doc.get("dimensions")
    if isinstance(dims, dict):
        return dims
    dims = doc.get("dimensions_values")
    if isinstance(dims, dict):
        return dims
    values = doc.get("values")
    if isinstance(values, dict):
        return {k: v for k, v in values.items() if k in {"area", "item", "element"}}
    return {}


def observations_present(doc, parsed):
    observation_keys = (
        "observations",
        "values",
        "period",
        "value",
        "original_period",
        "original_value",
    )
    for source in (doc, parsed):
        if not isinstance(source, dict):
            continue
        for key in observation_keys:
            value = source.get(key)
            if value not in (None, "", [], {}):
                return True
    return False


def validate_row(plan_row, result, parsed, doc):
    dims = dimensions(doc)
    series_code = doc.get("series_code", "") or doc.get("code", "")
    errors = []
    if str(result["status"]) != "200":
        errors.append(f"http_status={result['status']}")
    if response_dataset_code(parsed, doc) != "QCL":
        errors.append(f"response_dataset_code={response_dataset_code(parsed, doc)!r}")
    if response_provider_code(parsed, doc) != "FAO":
        errors.append(f"response_provider_code={response_provider_code(parsed, doc)!r}")
    if series_code != plan_row["inferred_series_code"]:
        errors.append(f"response_series_code={series_code!r}")
    if dims.get("element", "") != "5320":
        errors.append(f"response_dimensions_element={dims.get('element', '')!r}")
    if dims.get("area", "") != plan_row["area_code"]:
        errors.append(f"response_dimensions_area={dims.get('area', '')!r}")
    if dims.get("item", "") != plan_row["item_code"]:
        errors.append(f"response_dimensions_item={dims.get('item', '')!r}")
    if observations_present(doc, parsed):
        errors.append("observations_present=true")
    if errors:
        return "metadata_validation_failed", "; ".join(errors)
    return "validated_metadata_only", ""


def empty_output_row(plan_row, url, result):
    return {
        **{key: plan_row.get(key, "") for key in [
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
        ]},
        "metadata_only_url": url,
        "request_method": "GET observations=false metadata=true",
        "http_status": str(result["status"]),
        "content_type": result["content_type"],
        "content_length": result["content_length"],
        "byte_size": str(len(result["body"])),
        "sha256": hashlib.sha256(result["body"]).hexdigest() if result["body"] else "",
        "dbnomics_num_found": "",
        "series_doc_count": "0",
        "response_dataset_code": "",
        "response_provider_code": "",
        "response_series_code": "",
        "response_series_name": "",
        "response_dimensions_area": "",
        "response_dimensions_item": "",
        "response_dimensions_element": "",
        "observations_requested": "false",
        "observations_present": "unknown",
        "metadata_validation_status": "metadata_validation_failed",
        "allowed_use_scope": ALLOWED_USE_SCOPE,
        "error": result["error"],
    }


def build_row(plan_row):
    url = metadata_only_url(plan_row["inferred_series_url"])
    result = fetch(url)
    row = empty_output_row(plan_row, url, result)
    parsed = {}
    doc = {}
    if result["body"]:
        try:
            parsed = json.loads(result["body"].decode("utf-8"))
            docs = series_docs(parsed)
            doc = docs[0] if docs else {}
            dims = dimensions(doc)
            row.update(
                {
                    "dbnomics_num_found": str(num_found(parsed)),
                    "series_doc_count": str(len(docs)),
                    "response_dataset_code": str(response_dataset_code(parsed, doc)),
                    "response_provider_code": str(response_provider_code(parsed, doc)),
                    "response_series_code": str(doc.get("series_code", "") or doc.get("code", "")),
                    "response_series_name": str(doc.get("series_name", "") or doc.get("name", "")),
                    "response_dimensions_area": str(dims.get("area", "")),
                    "response_dimensions_item": str(dims.get("item", "")),
                    "response_dimensions_element": str(dims.get("element", "")),
                    "observations_present": str(observations_present(doc, parsed)).lower(),
                }
            )
            status, validation_error = validate_row(plan_row, result, parsed, doc)
            row["metadata_validation_status"] = status
            row["error"] = "; ".join(x for x in [row["error"], validation_error] if x)
        except Exception as e:
            row["metadata_validation_status"] = "metadata_validation_failed"
            row["error"] = "; ".join(x for x in [row["error"], f"json_parse_or_validation_error={e!r}"] if x)
    return row


def select_plan_rows():
    rows = list(csv.DictReader(QUERY_PLAN_CSV.open(newline="", encoding="utf-8")))
    selected = [
        row
        for row in rows
        if row.get("first_fetch_scope") == VALIDATION_SCOPE
        and row.get("query_plan_status") == QUERY_STATUS
    ]
    return selected


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def write_markdown(rows):
    status_counts = Counter(row["metadata_validation_status"] for row in rows)
    observation_counts = Counter(row["observations_present"] for row in rows)
    with OUT_MD.open("w", encoding="utf-8") as out:
        out.write("# DBnomics FAO/QCL series URL validation\n\n")
        out.write(f"Generated: {utc_now()}\n\n")
        out.write("## Scope\n\n")
        out.write(
            "Metadata-only validation of 14 inferred DBnomics FAO/QCL series URLs. "
            "Requests used `observations=false&metadata=true`. No observation values were parsed or written.\n\n"
        )
        out.write("## Summary\n\n")
        out.write(f"- rows: `{len(rows)}`\n")
        out.write(f"- metadata_validation_status: `{dict(status_counts)}`\n")
        out.write(f"- observations_present: `{dict(observation_counts)}`\n\n")
        out.write("## Series rows\n\n")
        for row in rows:
            out.write(f"### {row['inferred_series_code']}\n\n")
            out.write(f"- item: `{row['item_code']}` {row['item_label']}\n")
            out.write(f"- metadata-only URL: `{row['metadata_only_url']}`\n")
            out.write(f"- HTTP status: `{row['http_status']}`\n")
            out.write(f"- response series name: `{row['response_series_name']}`\n")
            out.write(f"- metadata_validation_status: `{row['metadata_validation_status']}`\n")
            if row["error"]:
                out.write(f"- error: `{row['error']}`\n")
            out.write("\n")


def main():
    plan_rows = select_plan_rows()
    output_rows = []
    for plan_row in plan_rows:
        output_rows.append(build_row(plan_row))

    write_csv(OUT_CSV, output_rows)
    OUT_JSON.write_text(json.dumps(output_rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(output_rows)

    print(f"selected_rows: {len(plan_rows)}")
    print(f"wrote {OUT_CSV}")
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")
    print("metadata_validation_status:", dict(Counter(row["metadata_validation_status"] for row in output_rows)))
    print("observations_present:", dict(Counter(row["observations_present"] for row in output_rows)))
    for row in output_rows:
        print(
            row["inferred_series_code"],
            row["http_status"],
            row["metadata_validation_status"],
            row["response_series_code"],
            row["response_dimensions_area"],
            row["response_dimensions_item"],
            row["response_dimensions_element"],
            row["observations_present"],
        )


if __name__ == "__main__":
    main()
