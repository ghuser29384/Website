#!/usr/bin/env python3
import csv
import hashlib
import json
import ssl
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT_CSV = Path("faostat-corrected-endpoint-review.csv")
OUT_JSON = Path("faostat-corrected-endpoint-review.json")
OUT_MD = Path("faostat-corrected-endpoint-review.md")

TERMS_URL = "https://www.fao.org/contact-us/terms/db-terms-of-use/en/"
LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"

CANDIDATES = [
    {
        "candidate_source_id": "faostat-qcl-production-prefix-normalized",
        "source_family": "faostat-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://bulks-faostat.fao.org/production/Production_Crops_Livestock_Products_E_All_Data_(Normalized).zip",
        "probe_mode": "no_range_stream",
    },
    {
        "candidate_source_id": "faostat-qcl-production-prefix-wide",
        "source_family": "faostat-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://bulks-faostat.fao.org/production/Production_Crops_Livestock_Products_E_All_Data.zip",
        "probe_mode": "no_range_stream",
    },
    {
        "candidate_source_id": "faostat-qcl-no-prefix-normalized",
        "source_family": "faostat-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data_(Normalized).zip",
        "probe_mode": "no_range_stream",
    },
    {
        "candidate_source_id": "faostat-qcl-no-prefix-wide",
        "source_family": "faostat-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data.zip",
        "probe_mode": "no_range_stream",
    },
    {
        "candidate_source_id": "faostat-pesticides-inputs-prefix-normalized",
        "source_family": "faostat-pesticides",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://bulks-faostat.fao.org/inputs/Inputs_Pesticides_Use_E_All_Data_(Normalized).zip",
        "probe_mode": "no_range_stream",
    },
    {
        "candidate_source_id": "faostat-pesticides-inputs-prefix-wide",
        "source_family": "faostat-pesticides",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://bulks-faostat.fao.org/inputs/Inputs_Pesticides_Use_E_All_Data.zip",
        "probe_mode": "no_range_stream",
    },
    {
        "candidate_source_id": "faostat-pesticides-no-prefix-normalized",
        "source_family": "faostat-pesticides",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data_(Normalized).zip",
        "probe_mode": "no_range_stream",
    },
    {
        "candidate_source_id": "faostat-pesticides-no-prefix-wide",
        "source_family": "faostat-pesticides",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data.zip",
        "probe_mode": "no_range_stream",
    },
]

FIELDS = [
    "candidate_source_id",
    "source_family",
    "blocked_layer_ids_it_could_unblock",
    "intended_issue_ids",
    "candidate_url",
    "request_method",
    "http_status",
    "content_type",
    "content_length",
    "redirect_url",
    "sample_sha256",
    "sample_byte_size",
    "zip_magic_ok",
    "machine_readable",
    "publisher",
    "license_name",
    "license_uri",
    "terms_url",
    "third_party_exception_possible",
    "raw_snapshot_storage_initial_assessment",
    "derived_values_publication_initial_assessment",
    "required_attribution",
    "no_endorsement_caveat",
    "recommended_status",
    "recommended_next_action",
    "error",
]

def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def probe_no_range(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Painmaps source-snapshot review; no full download; contact project maintainer",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
            sample = r.read(4096)
            return {
                "ok": True,
                "status": getattr(r, "status", ""),
                "content_type": r.headers.get("Content-Type", ""),
                "content_length": r.headers.get("Content-Length", ""),
                "redirect_url": r.geturl(),
                "sample_sha256": hashlib.sha256(sample).hexdigest(),
                "sample_byte_size": len(sample),
                "zip_magic_ok": sample.startswith(b"PK\x03\x04"),
                "error": "",
            }
    except urllib.error.HTTPError as e:
        body = e.read(512) if hasattr(e, "read") else b""
        return {
            "ok": False,
            "status": e.code,
            "content_type": e.headers.get("Content-Type", "") if e.headers else "",
            "content_length": e.headers.get("Content-Length", "") if e.headers else "",
            "redirect_url": url,
            "sample_sha256": hashlib.sha256(body).hexdigest() if body else "",
            "sample_byte_size": len(body),
            "zip_magic_ok": False,
            "error": repr(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": "",
            "content_type": "",
            "content_length": "",
            "redirect_url": "",
            "sample_sha256": "",
            "sample_byte_size": 0,
            "zip_magic_ok": False,
            "error": repr(e),
        }

def classify(result):
    content_type = (result["content_type"] or "").lower()
    machine_readable = bool(result["zip_magic_ok"] or "zip" in content_type)

    if result["ok"] and result["zip_magic_ok"]:
        status = "fetch_snapshot_candidate"
        next_action = "After ChatGPT approval, fetch this full ZIP as a source snapshot and checksum it; do not parse numeric values yet."
    elif result["ok"] and machine_readable:
        status = "metadata_review_required"
        next_action = "Endpoint is reachable and machine-readable but ZIP magic was not confirmed; inspect before full fetch."
    elif result["ok"]:
        status = "metadata_review_required"
        next_action = "Endpoint reachable but not confirmed as data ZIP; inspect before use."
    else:
        status = "blocked_endpoint_not_found"
        next_action = "Do not fetch; report endpoint failure."

    return {
        "machine_readable": str(machine_readable).lower(),
        "publisher": "Food and Agriculture Organization of the United Nations",
        "license_name": "CC BY 4.0 unless dataset metadata/webpage specifies otherwise",
        "license_uri": LICENSE_URI,
        "terms_url": TERMS_URL,
        "third_party_exception_possible": "true",
        "raw_snapshot_storage_initial_assessment": "appears permitted under FAO Statistical Database Terms if no dataset-specific third-party exception is present",
        "derived_values_publication_initial_assessment": "appears permitted under FAO Statistical Database Terms if no dataset-specific third-party exception is present",
        "required_attribution": "FAO. [YYYY]. [Name of database: Name of dataset OR Name of database]. [Accessed on DD Month YYYY]. [URL]. Licence: CC-BY-4.0.",
        "no_endorsement_caveat": "Do not imply FAO participation, sponsorship, approval, or endorsement.",
        "recommended_status": status,
        "recommended_next_action": next_action,
    }

def main():
    rows = []
    for c in CANDIDATES:
        result = probe_no_range(c["candidate_url"])
        cls = classify(result)
        row = {
            "candidate_source_id": c["candidate_source_id"],
            "source_family": c["source_family"],
            "blocked_layer_ids_it_could_unblock": c["blocked_layer_ids_it_could_unblock"],
            "intended_issue_ids": c["intended_issue_ids"],
            "candidate_url": c["candidate_url"],
            "request_method": "GET no Range; read first 4096 bytes only",
            "http_status": str(result["status"]),
            "content_type": result["content_type"],
            "content_length": result["content_length"],
            "redirect_url": result["redirect_url"],
            "sample_sha256": result["sample_sha256"],
            "sample_byte_size": str(result["sample_byte_size"]),
            "zip_magic_ok": str(result["zip_magic_ok"]).lower(),
            "error": result["error"],
            **cls,
        }
        rows.append(row)

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)

    OUT_JSON.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    with OUT_MD.open("w", encoding="utf-8") as out:
        out.write("# FAOSTAT corrected endpoint review\n\n")
        out.write(f"Generated: {utc_now()}\n\n")
        out.write("Scope: no-Range endpoint probes only; no full ZIP fetch and no numeric parsing.\n\n")
        for r in rows:
            out.write(f"## {r['candidate_source_id']}\n\n")
            out.write(f"- URL: `{r['candidate_url']}`\n")
            out.write(f"- HTTP status: `{r['http_status']}`\n")
            out.write(f"- Content-Type: `{r['content_type']}`\n")
            out.write(f"- Content-Length: `{r['content_length']}`\n")
            out.write(f"- ZIP magic confirmed: `{r['zip_magic_ok']}`\n")
            out.write(f"- Recommended status: `{r['recommended_status']}`\n")
            out.write(f"- Next action: {r['recommended_next_action']}\n")
            if r["error"]:
                out.write(f"- Error: `{r['error']}`\n")
            out.write("\n")

    print(f"wrote {OUT_CSV}")
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")
    for r in rows:
        print(r["candidate_source_id"], r["http_status"], r["zip_magic_ok"], r["recommended_status"], r["content_type"])

if __name__ == "__main__":
    main()
