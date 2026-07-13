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
from typing import Any

INPUT_CSV = Path("brazil-dbnomics-observations-param1-pilot.csv")
OUT_CSV = Path("dbnomics-observation-shape-diagnostics.csv")
OUT_JSON = Path("dbnomics-observation-shape-diagnostics.json")
OUT_MD = Path("dbnomics-observation-shape-diagnostics.md")
SNAPSHOT_DIR = Path("diagnostic-snapshots/dbnomics-observation-shapes")
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

VARIANTS = [
    ("no_query", ""),
    ("observations_1", "observations=1"),
    ("observations_1_metadata_true", "observations=1&metadata=true"),
    ("observations_1_metadata_false", "observations=1&metadata=false"),
    ("observations_true", "observations=true"),
    ("observations_1_align_periods_1", "observations=1&align_periods=1"),
    ("format_json_observations_1", "format=json&observations=1"),
]

FIELDS = [
    "diagnostic_row_id",
    "series_code",
    "variant_name",
    "url",
    "http_status",
    "content_type",
    "content_length_header",
    "byte_size",
    "sha256",
    "local_snapshot_path",
    "json_parse_status",
    "top_level_keys",
    "meta_args_observations",
    "meta_args_metadata",
    "series_docs_count",
    "series_doc_0_keys",
    "has_values_key_anywhere",
    "has_period_key_anywhere",
    "has_periods_key_anywhere",
    "has_observations_key_anywhere",
    "has_value_key_anywhere",
    "candidate_observation_path",
    "observation_shape_status",
    "allowed_use_scope",
    "error",
]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def build_base_url(series_code: str, dataset_code: str) -> str:
    provider = "FAO"
    return f"https://api.db.nomics.world/v22/series/{provider}/{dataset_code}/{series_code}"

def add_query(url: str, query: str) -> str:
    if not query:
        return url
    return f"{url}?{query}"

def fetch(url: str) -> dict[str, Any]:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Painmaps DBnomics observation-shape diagnostic; candidate-only; no production parsing",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
            body = r.read()
            return {
                "ok": True,
                "http_status": str(getattr(r, "status", "")),
                "content_type": r.headers.get("Content-Type", ""),
                "content_length_header": r.headers.get("Content-Length", ""),
                "body": body,
                "error": "",
            }
    except urllib.error.HTTPError as e:
        body = e.read(4096) if hasattr(e, "read") else b""
        return {
            "ok": False,
            "http_status": str(e.code),
            "content_type": e.headers.get("Content-Type", "") if e.headers else "",
            "content_length_header": e.headers.get("Content-Length", "") if e.headers else "",
            "body": body,
            "error": repr(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "http_status": "",
            "content_type": "",
            "content_length_header": "",
            "body": b"",
            "error": repr(e),
        }

def walk(obj: Any, path: str = "$"):
    yield path, obj
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj[:50]):
            yield from walk(v, f"{path}[{i}]")

def key_exists_anywhere(obj: Any, key: str) -> bool:
    if isinstance(obj, dict):
        if key in obj:
            return True
        return any(key_exists_anywhere(v, key) for v in obj.values())
    if isinstance(obj, list):
        return any(key_exists_anywhere(v, key) for v in obj[:50])
    return False

def discover_observation_path(payload: Any) -> tuple[str, str]:
    """Return (status, path). Do not extract values; only diagnose shape."""
    candidates = []

    for path, node in walk(payload):
        if isinstance(node, dict):
            keys = set(node.keys())

            # Common DBnomics / time-series shapes.
            if {"period", "value"}.issubset(keys):
                candidates.append((path, "dict_with_period_value"))

            if "values" in keys:
                v = node["values"]
                if isinstance(v, (list, dict)):
                    candidates.append((f"{path}.values", f"values_{type(v).__name__}"))

            if "observations" in keys:
                v = node["observations"]
                if isinstance(v, (list, dict)):
                    candidates.append((f"{path}.observations", f"observations_{type(v).__name__}"))

            if "periods" in keys:
                v = node["periods"]
                if isinstance(v, (list, dict)):
                    candidates.append((f"{path}.periods", f"periods_{type(v).__name__}"))

        elif isinstance(node, list):
            if node and isinstance(node[0], dict) and {"period", "value"}.issubset(node[0].keys()):
                candidates.append((path, "list_of_period_value_dicts"))

    if candidates:
        # Prefer actual period/value pairs over generic values/observations markers.
        for p, kind in candidates:
            if "period_value" in kind:
                return "candidate_period_value_path_found", p
        return "candidate_observation_container_found", candidates[0][0]

    return "no_candidate_observation_path_found", ""

def infer_dataset_code(series_code: str, input_row: dict[str, str]) -> str:
    if input_row.get("dataset_code"):
        return input_row["dataset_code"]
    if series_code.endswith(".5157") or input_row.get("element_code") == "5157":
        return "RP"
    return "QCL"

def main():
    if not INPUT_CSV.exists():
        raise SystemExit(f"Missing {INPUT_CSV}")

    input_rows = list(csv.DictReader(INPUT_CSV.open(newline="", encoding="utf-8")))
    if len(input_rows) != 6:
        raise SystemExit(f"Expected 6 Brazil pilot rows, got {len(input_rows)}")

    out_rows = []
    for input_idx, input_row in enumerate(input_rows, start=1):
        series_code = input_row.get("series_code") or input_row.get("target_series_code")
        if not series_code:
            raise SystemExit(f"Missing series_code in input row {input_idx}")

        dataset_code = infer_dataset_code(series_code, input_row)
        base_url = build_base_url(series_code, dataset_code)

        for variant_idx, (variant_name, query) in enumerate(VARIANTS, start=1):
            url = add_query(base_url, query)
            result = fetch(url)
            body = result["body"]
            checksum = hashlib.sha256(body).hexdigest() if body else ""
            local_snapshot_path = SNAPSHOT_DIR / f"{series_code.replace('.', '-')}.{variant_name}.json_or_error"

            # Store diagnostic response body only. These are not release artifacts.
            local_snapshot_path.write_bytes(body)

            row = {
                "diagnostic_row_id": f"dbnomics-shape-{input_idx:02d}-{variant_idx:02d}",
                "series_code": series_code,
                "variant_name": variant_name,
                "url": url,
                "http_status": result["http_status"],
                "content_type": result["content_type"],
                "content_length_header": result["content_length_header"],
                "byte_size": str(len(body)),
                "sha256": checksum,
                "local_snapshot_path": str(local_snapshot_path),
                "json_parse_status": "",
                "top_level_keys": "",
                "meta_args_observations": "",
                "meta_args_metadata": "",
                "series_docs_count": "",
                "series_doc_0_keys": "",
                "has_values_key_anywhere": "",
                "has_period_key_anywhere": "",
                "has_periods_key_anywhere": "",
                "has_observations_key_anywhere": "",
                "has_value_key_anywhere": "",
                "candidate_observation_path": "",
                "observation_shape_status": "error",
                "allowed_use_scope": "candidate-only response-shape diagnostics; no production parsing; no country promotion",
                "error": result["error"],
            }

            if body:
                try:
                    payload = json.loads(body.decode("utf-8"))
                    row["json_parse_status"] = "parsed"
                    row["top_level_keys"] = "|".join(payload.keys()) if isinstance(payload, dict) else type(payload).__name__

                    meta_args = {}
                    if isinstance(payload, dict):
                        meta_args = (payload.get("_meta") or {}).get("args") or {}
                    row["meta_args_observations"] = str(meta_args.get("observations", ""))
                    row["meta_args_metadata"] = str(meta_args.get("metadata", ""))

                    docs = []
                    if isinstance(payload, dict):
                        docs = ((payload.get("series") or {}).get("docs") or [])
                    row["series_docs_count"] = str(len(docs))
                    if docs:
                        row["series_doc_0_keys"] = "|".join(docs[0].keys())

                    row["has_values_key_anywhere"] = str(key_exists_anywhere(payload, "values")).lower()
                    row["has_period_key_anywhere"] = str(key_exists_anywhere(payload, "period")).lower()
                    row["has_periods_key_anywhere"] = str(key_exists_anywhere(payload, "periods")).lower()
                    row["has_observations_key_anywhere"] = str(key_exists_anywhere(payload, "observations")).lower()
                    row["has_value_key_anywhere"] = str(key_exists_anywhere(payload, "value")).lower()

                    status, path = discover_observation_path(payload)
                    row["observation_shape_status"] = status
                    row["candidate_observation_path"] = path
                except Exception as e:
                    row["json_parse_status"] = "json_parse_error"
                    row["error"] = (row["error"] + "; " if row["error"] else "") + repr(e)

            out_rows.append(row)

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(out_rows)

    OUT_JSON.write_text(json.dumps(out_rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    status_counts = Counter(r["observation_shape_status"] for r in out_rows)
    path_counts = Counter(r["candidate_observation_path"] for r in out_rows if r["candidate_observation_path"])
    http_counts = Counter(r["http_status"] for r in out_rows)

    with OUT_MD.open("w", encoding="utf-8") as out:
        out.write("# DBnomics observation-shape diagnostics\n\n")
        out.write(f"Generated: {now_iso()}\n\n")
        out.write("## Scope\n\n")
        out.write("Candidate-only response-shape diagnostics for six Brazil DBnomics FAO series. No evidence rows generated.\n\n")
        out.write("## Summary\n\n")
        out.write(f"- diagnostic_rows: {len(out_rows)}\n")
        out.write(f"- HTTP status counts: {dict(http_counts)}\n")
        out.write(f"- observation_shape_status counts: {dict(status_counts)}\n")
        out.write(f"- candidate_observation_path counts: {dict(path_counts)}\n\n")
        out.write("## Rows\n\n")
        for r in out_rows:
            out.write(f"### {r['series_code']} — {r['variant_name']}\n\n")
            out.write(f"- URL: `{r['url']}`\n")
            out.write(f"- HTTP status: `{r['http_status']}`\n")
            out.write(f"- top_level_keys: `{r['top_level_keys']}`\n")
            out.write(f"- _meta.args.observations: `{r['meta_args_observations']}`\n")
            out.write(f"- series_docs_count: `{r['series_docs_count']}`\n")
            out.write(f"- series_doc_0_keys: `{r['series_doc_0_keys']}`\n")
            out.write(f"- observation_shape_status: `{r['observation_shape_status']}`\n")
            out.write(f"- candidate_observation_path: `{r['candidate_observation_path']}`\n")
            if r["error"]:
                out.write(f"- error: `{r['error']}`\n")
            out.write("\n")

    print("diagnostic_rows:", len(out_rows))
    print("http_status:", dict(http_counts))
    print("observation_shape_status:", dict(status_counts))
    print("candidate_observation_path:", dict(path_counts))
    print(f"wrote {OUT_CSV}")
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")

if __name__ == "__main__":
    main()
