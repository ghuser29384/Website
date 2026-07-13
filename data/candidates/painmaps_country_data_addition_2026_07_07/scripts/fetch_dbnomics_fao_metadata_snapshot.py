#!/usr/bin/env python3
import hashlib
import json
import ssl
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SNAPSHOT_DIR = Path("fetched-source-snapshots")
SNAPSHOT_DIR.mkdir(exist_ok=True)

URL = "https://api.db.nomics.world/v22/datasets/FAO/QCL"
SNAPSHOT_ID = "snapshot.release-candidate-2026-07-07.country-context.v0.dbnomics-fao-qcl-dataset-metadata.1"
LOCAL_PATH = SNAPSHOT_DIR / f"{SNAPSHOT_ID}.json"

MANIFEST_JSON = Path("dbnomics-fao-metadata-source-snapshots.json")
SUMMARY_MD = Path("dbnomics-fao-qcl-metadata-snapshot-review.md")

FAO_TERMS_URL = "https://www.fao.org/contact-us/terms/db-terms-of-use/en/"
FAO_LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"
DBNOMICS_PROVIDER_URL = "https://db.nomics.world/FAO"
DBNOMICS_API_URL = "https://api.db.nomics.world/v22/apidocs"

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def fetch():
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        URL,
        headers={
            "User-Agent": "Painmaps source-snapshot review; FAO/QCL metadata only; contact project maintainer",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
        body = r.read()
        return {
            "status": getattr(r, "status", ""),
            "content_type": r.headers.get("Content-Type", ""),
            "content_length": r.headers.get("Content-Length", ""),
            "final_url": r.geturl(),
            "body": body,
        }

def main():
    started = now_iso()
    result = fetch()
    retrieved = now_iso()
    body = result["body"]

    # Validate JSON before writing manifest.
    parsed = json.loads(body.decode("utf-8"))

    LOCAL_PATH.write_bytes(body)
    checksum = hashlib.sha256(body).hexdigest()

    dataset = None
    provider = None

    # DBnomics v22 response shape has datasets.docs[0] and provider.
    datasets = parsed.get("datasets", {}).get("docs", [])
    if datasets:
        dataset = datasets[0]
    provider = parsed.get("provider") or {}

    dimension_codes = dataset.get("dimensions_codes_order", []) if dataset else []
    dimensions_labels = dataset.get("dimensions_labels", {}) if dataset else {}
    element_labels = (dataset.get("dimensions_values_labels", {}) or {}).get("element", {}) if dataset else {}
    area_labels = (dataset.get("dimensions_values_labels", {}) or {}).get("area", {}) if dataset else {}
    item_labels = (dataset.get("dimensions_values_labels", {}) or {}).get("item", {}) if dataset else {}

    manifest = {
        "source_snapshot_id": SNAPSHOT_ID,
        "source_id": "dbnomics-fao-qcl-dataset-metadata",
        "source_family": "dbnomics-fao-qcl",
        "upstream_url": URL,
        "final_url": result["final_url"],
        "retrieval_started_at": started,
        "retrieval_timestamp": retrieved,
        "http_status": result["status"],
        "content_type": result["content_type"],
        "content_length_header": result["content_length"],
        "media_type": "application/json",
        "checksum_algorithm": "sha256",
        "checksum": checksum,
        "byte_size": len(body),
        "local_path": str(LOCAL_PATH),
        "provider": "Food and Agriculture Organization of the United Nations",
        "distributor": "DBnomics",
        "provider_terms_url": FAO_TERMS_URL,
        "provider_license_name": "CC BY 4.0 unless FAO dataset metadata/webpage specifies otherwise",
        "provider_license_uri": FAO_LICENSE_URI,
        "distributor_provider_page": DBNOMICS_PROVIDER_URL,
        "distributor_api_docs": DBNOMICS_API_URL,
        "required_attribution": "At minimum cite FAO as provider and DBnomics as distributor if this mirror is used; preserve FAO attribution and no-endorsement language.",
        "no_endorsement_caveat": "Do not imply FAO or DBnomics endorsement.",
        "third_party_exception_possible": True,
        "storage_status": "stored_local_for_review_not_commit_approved",
        "parse_status": "metadata_review_required",
        "allowed_use_scope": "metadata/distribution review only; no numeric parsing; no country promotion",
        "blocked_layer_ids_it_could_unblock": ["factory-farmed-animals"],
        "intended_issue_ids": ["issue.factory-farmed-animals"],
        "dataset_code": dataset.get("code") if dataset else None,
        "dataset_name": dataset.get("name") if dataset else None,
        "provider_code": dataset.get("provider_code") if dataset else provider.get("code"),
        "provider_name": dataset.get("provider_name") if dataset else provider.get("name"),
        "updated_at": dataset.get("updated_at") if dataset else None,
        "indexed_at": dataset.get("indexed_at") if dataset else None,
        "nb_series": dataset.get("nb_series") if dataset else None,
        "dimensions_codes_order": dimension_codes,
        "dimensions_labels": dimensions_labels,
        "has_element_5320_producing_animals_slaughtered": element_labels.get("5320") == "Producing Animals/Slaughtered",
        "element_5320_label": element_labels.get("5320"),
        "area_count": len(area_labels),
        "item_count": len(item_labels),
        "review_notes": [
            "Snapshot is metadata/distribution evidence only.",
            "Do not parse observations until source, license, attribution, and series-query design are reviewed.",
            "DBnomics is a distributor/mirror; FAO remains underlying provider.",
            "FAO terms and any DBnomics distribution terms must be preserved in source registry before data use.",
        ],
    }

    MANIFEST_JSON.write_text(json.dumps([manifest], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    with SUMMARY_MD.open("w", encoding="utf-8") as out:
        out.write("# DBnomics FAO/QCL metadata source snapshot review\n\n")
        out.write("## Scope\n\n")
        out.write("Metadata/distribution snapshot only. No numeric observations parsed.\n\n")
        out.write("## Snapshot\n\n")
        out.write(f"- source_snapshot_id: `{SNAPSHOT_ID}`\n")
        out.write(f"- URL: `{URL}`\n")
        out.write(f"- local_path: `{LOCAL_PATH}`\n")
        out.write(f"- HTTP status: `{result['status']}`\n")
        out.write(f"- Content-Type: `{result['content_type']}`\n")
        out.write(f"- byte_size: `{len(body)}`\n")
        out.write(f"- sha256: `{checksum}`\n\n")
        out.write("## Dataset metadata\n\n")
        out.write(f"- dataset_code: `{manifest['dataset_code']}`\n")
        out.write(f"- dataset_name: `{manifest['dataset_name']}`\n")
        out.write(f"- provider_name: `{manifest['provider_name']}`\n")
        out.write(f"- nb_series: `{manifest['nb_series']}`\n")
        out.write(f"- dimensions: `{manifest['dimensions_codes_order']}`\n")
        out.write(f"- element_5320_label: `{manifest['element_5320_label']}`\n")
        out.write(f"- area_count: `{manifest['area_count']}`\n")
        out.write(f"- item_count: `{manifest['item_count']}`\n\n")
        out.write("## Decision status\n\n")
        out.write("- parse_status: `metadata_review_required`\n")
        out.write("- allowed_use_scope: metadata/distribution review only; no numeric parsing; no country promotion\n")

    print(f"wrote {LOCAL_PATH}")
    print(f"wrote {MANIFEST_JSON}")
    print(f"wrote {SUMMARY_MD}")
    print("dataset_code:", manifest["dataset_code"])
    print("dataset_name:", manifest["dataset_name"])
    print("provider_name:", manifest["provider_name"])
    print("nb_series:", manifest["nb_series"])
    print("element_5320_label:", manifest["element_5320_label"])
    print("area_count:", manifest["area_count"])
    print("item_count:", manifest["item_count"])
    print("sha256:", checksum)

if __name__ == "__main__":
    main()
