#!/usr/bin/env python3
import csv
import hashlib
import json
import ssl
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT_CSV = Path("dbnomics-fao-endpoint-review.csv")
OUT_JSON = Path("dbnomics-fao-endpoint-review.json")
OUT_MD = Path("dbnomics-fao-endpoint-review.md")

FAO_TERMS_URL = "https://www.fao.org/contact-us/terms/db-terms-of-use/en/"
FAO_LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"
DBNOMICS_PROVIDER_URL = "https://db.nomics.world/FAO"

CANDIDATES = [
    {
        "candidate_source_id": "dbnomics-fao-provider-page",
        "source_family": "dbnomics-fao-provider",
        "blocked_layer_ids_it_could_unblock": "",
        "intended_issue_ids": "",
        "candidate_url": "https://db.nomics.world/FAO",
        "intended_use": "provider_metadata_review",
    },
    {
        "candidate_source_id": "dbnomics-fao-qcl-page",
        "source_family": "dbnomics-fao-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://db.nomics.world/FAO/QCL",
        "intended_use": "dataset_metadata_review",
    },
    {
        "candidate_source_id": "dbnomics-fao-rp-page",
        "source_family": "dbnomics-fao-rp",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://db.nomics.world/FAO/RP",
        "intended_use": "dataset_metadata_review",
    },
    {
        "candidate_source_id": "dbnomics-api-docs",
        "source_family": "dbnomics-api",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals;insects-insecticide",
        "intended_issue_ids": "issue.factory-farmed-animals;issue.insect-welfare",
        "candidate_url": "https://api.db.nomics.world/v22/apidocs",
        "intended_use": "api_metadata_review",
    },
    {
        "candidate_source_id": "dbnomics-api-fao-qcl-dataset",
        "source_family": "dbnomics-fao-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://api.db.nomics.world/v22/datasets/FAO/QCL",
        "intended_use": "api_dataset_metadata_review",
    },
    {
        "candidate_source_id": "dbnomics-api-fao-rp-dataset",
        "source_family": "dbnomics-fao-rp",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://api.db.nomics.world/v22/datasets/FAO/RP",
        "intended_use": "api_dataset_metadata_review",
    },
    {
        "candidate_source_id": "dbnomics-api-fao-qcl-slaughter-sample",
        "source_family": "dbnomics-fao-qcl",
        "blocked_layer_ids_it_could_unblock": "factory-farmed-animals",
        "intended_issue_ids": "issue.factory-farmed-animals",
        "candidate_url": "https://api.db.nomics.world/v22/series/FAO/QCL/1.1017.5320",
        "intended_use": "api_series_sample_review",
    },
    {
        "candidate_source_id": "dbnomics-api-fao-rp-insecticides-sample",
        "source_family": "dbnomics-fao-rp",
        "blocked_layer_ids_it_could_unblock": "insects-insecticide",
        "intended_issue_ids": "issue.insect-welfare",
        "candidate_url": "https://api.db.nomics.world/v22/series/FAO/RP/1.1309.5157",
        "intended_use": "api_series_sample_review",
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
    "machine_readable",
    "appears_to_be_metadata",
    "appears_to_be_data",
    "provider",
    "distributor",
    "provider_terms_url",
    "provider_license_name",
    "provider_license_uri",
    "distributor_terms_url",
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

def probe(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Painmaps DBnomics FAO source review; sample only; contact project maintainer",
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
            "error": repr(e),
        }

def classify(candidate, result):
    ct = (result["content_type"] or "").lower()
    url = candidate["candidate_url"]
    is_json = "json" in ct or "api.db.nomics.world" in url
    is_html = "html" in ct or "db.nomics.world/FAO" in url
    ok = result["ok"]

    machine_readable = bool(is_json)
    metadata = bool(is_json or is_html)
    data = False

    if not ok:
        status = "blocked_endpoint_not_found"
        next_action = "Do not fetch; endpoint did not resolve in sample review."
    elif candidate["intended_use"] in {
        "provider_metadata_review",
        "dataset_metadata_review",
        "api_metadata_review",
        "api_dataset_metadata_review",
        "api_series_sample_review",
    }:
        status = "metadata_review_required"
        next_action = "Review DBnomics mirror terms, FAO provider terms, schema, and attribution before approving any full source snapshot."
    else:
        status = "blocked_terms_unclear"
        next_action = "Keep blocked until ChatGPT reviews."

    return {
        "machine_readable": str(machine_readable).lower(),
        "appears_to_be_metadata": str(metadata).lower(),
        "appears_to_be_data": str(data).lower(),
        "provider": "Food and Agriculture Organization of the United Nations",
        "distributor": "DBnomics mirror of FAO data",
        "provider_terms_url": FAO_TERMS_URL,
        "provider_license_name": "CC BY 4.0 unless FAO dataset metadata/webpage specifies otherwise",
        "provider_license_uri": FAO_LICENSE_URI,
        "distributor_terms_url": "https://db.nomics.world/FAO",
        "third_party_exception_possible": "true",
        "raw_snapshot_storage_initial_assessment": "unresolved for DBnomics mirror; FAO terms appear permissive for FAO datasets, but distributor/mirror terms and metadata must be reviewed",
        "derived_values_publication_initial_assessment": "unresolved for DBnomics mirror; likely possible only if FAO provider terms and DBnomics distribution terms are compatible",
        "required_attribution": "At minimum cite FAO as provider and DBnomics as distributor if this mirror is used; preserve FAO CC BY attribution and no-endorsement language.",
        "no_endorsement_caveat": "Do not imply FAO or DBnomics endorsement.",
        "recommended_status": status,
        "recommended_next_action": next_action,
    }

def main():
    rows = []
    for c in CANDIDATES:
        result = probe(c["candidate_url"])
        cls = classify(c, result)
        row = {
            "candidate_source_id": c["candidate_source_id"],
            "source_family": c["source_family"],
            "blocked_layer_ids_it_could_unblock": c["blocked_layer_ids_it_could_unblock"],
            "intended_issue_ids": c["intended_issue_ids"],
            "candidate_url": c["candidate_url"],
            "request_method": "GET sample first 4096 bytes only",
            "http_status": str(result["status"]),
            "content_type": result["content_type"],
            "content_length": result["content_length"],
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
        out.write("# DBnomics FAO endpoint review\n\n")
        out.write(f"Generated: {utc_now()}\n\n")
        out.write("Scope: DBnomics/FAO mirror endpoint metadata review only. No numeric parsing.\n\n")
        for r in rows:
            out.write(f"## {r['candidate_source_id']}\n\n")
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
