#!/usr/bin/env python3
import csv
import hashlib
import json
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT_CSV = Path("faostat-direct-endpoint-review.csv")
OUT_JSON = Path("faostat-direct-endpoint-review.json")
OUT_MD = Path("faostat-direct-endpoint-review.md")

TERMS_URL = "https://www.fao.org/contact-us/terms/db-terms-of-use/en/"
LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"

CANDIDATES = [
    {
        "candidate_source_id": "fao-terms",
        "source_family": "fao-terms",
        "blocked_layer_ids_it_could_unblock": "",
        "intended_issue_ids": "",
        "candidate_url": TERMS_URL,
        "intended_use": "license_terms_review",
    },
    {
        "candidate_source_id": "faostat-qcl-page",
        "source_family": "faostat-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://www.fao.org/faostat/en/#data/QCL",
        "intended_use": "metadata_page_review",
    },
    {
        "candidate_source_id": "faostat-rp-page",
        "source_family": "faostat-pesticides",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://www.fao.org/faostat/en/#data/RP",
        "intended_use": "metadata_page_review",
    },
    {
        "candidate_source_id": "faostat-api-root",
        "source_family": "faostat-api",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals;insects-insecticide",
        "intended_issue_ids": "issue.factory-farmed-animals;issue.insect-welfare",
        "candidate_url": "https://fenixservices.fao.org/faostat/api/v1/",
        "intended_use": "api_root_review",
    },
    {
        "candidate_source_id": "faostat-domain-codes",
        "source_family": "faostat-api",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals;insects-insecticide",
        "intended_issue_ids": "issue.factory-farmed-animals;issue.insect-welfare",
        "candidate_url": "https://fenixservices.fao.org/faostat/api/v1/Definitions/DomainCodes/DomainCodes",
        "intended_use": "api_metadata_review",
    },
    {
        "candidate_source_id": "faostat-element-codes",
        "source_family": "faostat-api",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals;insects-insecticide",
        "intended_issue_ids": "issue.factory-farmed-animals;issue.insect-welfare",
        "candidate_url": "https://fenixservices.fao.org/faostat/api/v1/Definitions/ElementCodes",
        "intended_use": "api_metadata_review",
    },
    {
        "candidate_source_id": "faostat-item-codes",
        "source_family": "faostat-api",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals;insects-insecticide",
        "intended_issue_ids": "issue.factory-farmed-animals;issue.insect-welfare",
        "candidate_url": "https://fenixservices.fao.org/faostat/api/v1/Definitions/ItemCodes",
        "intended_use": "api_metadata_review",
    },
    {
        "candidate_source_id": "faostat-qcl-bulk-normalized",
        "source_family": "faostat-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data_(Normalized).zip",
        "intended_use": "bulk_snapshot_candidate",
    },
    {
        "candidate_source_id": "faostat-qcl-bulk-wide",
        "source_family": "faostat-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://bulks-faostat.fao.org/production/Crops_Livestock_Products_E_All_Data.zip",
        "intended_use": "bulk_snapshot_candidate",
    },
    {
        "candidate_source_id": "faostat-pesticides-bulk-normalized",
        "source_family": "faostat-pesticides",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data_(Normalized).zip",
        "intended_use": "bulk_snapshot_candidate",
    },
    {
        "candidate_source_id": "faostat-pesticides-bulk-wide",
        "source_family": "faostat-pesticides",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://bulks-faostat.fao.org/inputs/Pesticides_Use_E_All_Data.zip",
        "intended_use": "bulk_snapshot_candidate",
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
    "accept_ranges",
    "redirect_url",
    "sample_sha256",
    "sample_byte_size",
    "machine_readable",
    "appears_to_be_metadata",
    "appears_to_be_data",
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

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def fetch_candidate(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Painmaps source-snapshot review; contact: project maintainer",
            "Range": "bytes=0-4095",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=45, context=ctx) as r:
            body = r.read(4096)
            headers = dict(r.headers.items())
            return {
                "ok": True,
                "status": getattr(r, "status", ""),
                "content_type": headers.get("Content-Type", ""),
                "content_length": headers.get("Content-Length", ""),
                "accept_ranges": headers.get("Accept-Ranges", ""),
                "redirect_url": r.geturl(),
                "sample_sha256": hashlib.sha256(body).hexdigest(),
                "sample_byte_size": len(body),
                "error": "",
            }
    except urllib.error.HTTPError as e:
        # Read a small error body only.
        body = e.read(512) if hasattr(e, "read") else b""
        return {
            "ok": False,
            "status": e.code,
            "content_type": e.headers.get("Content-Type", "") if e.headers else "",
            "content_length": e.headers.get("Content-Length", "") if e.headers else "",
            "accept_ranges": e.headers.get("Accept-Ranges", "") if e.headers else "",
            "redirect_url": url,
            "sample_sha256": hashlib.sha256(body).hexdigest() if body else "",
            "sample_byte_size": len(body),
            "error": repr(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": "",
            "content_type": "",
            "content_length": "",
            "accept_ranges": "",
            "redirect_url": "",
            "sample_sha256": "",
            "sample_byte_size": 0,
            "error": repr(e),
        }

def classify(c, result):
    url = c["candidate_url"]
    ct = (result["content_type"] or "").lower()
    status = str(result["status"])
    is_zip = "zip" in ct or url.endswith(".zip")
    is_json = "json" in ct or "/api/" in url
    is_html = "html" in ct or "faostat/en" in url or "terms" in url

    machine_readable = bool(is_zip or is_json)
    appears_metadata = bool(is_json or is_html or c["intended_use"].endswith("review"))
    appears_data = bool(is_zip and c["intended_use"] == "bulk_snapshot_candidate")

    if not result["ok"]:
        rec = "blocked_endpoint_not_found"
        next_action = "Do not fetch; report endpoint failure and ask ChatGPT for corrected FAO URL."
    elif c["candidate_source_id"] == "fao-terms":
        rec = "metadata_review_required"
        next_action = "Use as legal/terms basis only; not a data snapshot."
    elif c["intended_use"] in {"metadata_page_review", "api_root_review", "api_metadata_review"}:
        rec = "metadata_review_required"
        next_action = "Inspect metadata for exact domain/dataset names and third-party exceptions; do not parse values."
    elif c["intended_use"] == "bulk_snapshot_candidate" and machine_readable:
        rec = "fetch_snapshot_candidate"
        next_action = "After ChatGPT approval, fetch full source snapshot and compute checksum; do not parse values yet."
    else:
        rec = "blocked_terms_unclear"
        next_action = "Endpoint reachable but classification/license is unclear; keep blocked."

    return {
        "machine_readable": str(machine_readable).lower(),
        "appears_to_be_metadata": str(appears_metadata).lower(),
        "appears_to_be_data": str(appears_data).lower(),
        "publisher": "Food and Agriculture Organization of the United Nations",
        "license_name": "CC BY 4.0 unless dataset metadata/webpage specifies otherwise",
        "license_uri": LICENSE_URI,
        "terms_url": TERMS_URL,
        "third_party_exception_possible": "true",
        "raw_snapshot_storage_initial_assessment": "appears permitted under FAO Statistical Database Terms if no dataset-specific third-party exception is present",
        "derived_values_publication_initial_assessment": "appears permitted under FAO Statistical Database Terms if no dataset-specific third-party exception is present",
        "required_attribution": "FAO. [YYYY]. [Name of database: Name of dataset OR Name of database]. [Accessed on DD Month YYYY]. [URL]. Licence: CC-BY-4.0.",
        "no_endorsement_caveat": "Do not imply FAO participation, sponsorship, approval, or endorsement.",
        "recommended_status": rec,
        "recommended_next_action": next_action,
    }

def main():
    rows = []
    for c in CANDIDATES:
        result = fetch_candidate(c["candidate_url"])
        cls = classify(c, result)
        row = {
            "candidate_source_id": c["candidate_source_id"],
            "source_family": c["source_family"],
            "blocked_layer_ids_it_could_unblock": c["blocked_layer_ids_it_could_unblock"],
            "intended_issue_ids": c["intended_issue_ids"],
            "candidate_url": c["candidate_url"],
            "request_method": "GET with Range bytes=0-4095",
            "http_status": str(result["status"]),
            "content_type": result["content_type"],
            "content_length": result["content_length"],
            "accept_ranges": result["accept_ranges"],
            "redirect_url": result["redirect_url"],
            "sample_sha256": result["sample_sha256"],
            "sample_byte_size": str(result["sample_byte_size"]),
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
        out.write("# FAOSTAT direct endpoint review\n\n")
        out.write(f"Generated: {now_iso()}\n\n")
        out.write("## Scope\n\n")
        out.write("Endpoint reachability, license-basis, and snapshot-candidate review only. No numeric parsing.\n\n")
        out.write("## Results\n\n")
        for r in rows:
            out.write(f"### {r['candidate_source_id']}\n\n")
            out.write(f"- URL: `{r['candidate_url']}`\n")
            out.write(f"- HTTP status: `{r['http_status']}`\n")
            out.write(f"- Content-Type: `{r['content_type']}`\n")
            out.write(f"- Machine-readable: `{r['machine_readable']}`\n")
            out.write(f"- Recommended status: `{r['recommended_status']}`\n")
            out.write(f"- Next action: {r['recommended_next_action']}\n")
            if r["error"]:
                out.write(f"- Error: `{r['error']}`\n")
            out.write("\n")

    print(f"wrote {OUT_CSV}")
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")
    for r in rows:
        print(r["candidate_source_id"], r["http_status"], r["recommended_status"], r["content_type"])

if __name__ == "__main__":
    main()
