#!/usr/bin/env python3
import csv
import hashlib
import json
import ssl
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

DECISION_CSV = Path("brazil-series-validation-decision.csv")
TARGET_CSV = Path("brazil-target-series.csv")
SNAPSHOT_DIR = Path("fetched-source-snapshots/brazil-validated-subset")
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

OUT_PILOT_CSV = Path("brazil-validated-subset-pilot-observations.csv")
OUT_PILOT_JSON = Path("brazil-validated-subset-pilot-observations.json")
OUT_UNAVAILABLE_CSV = Path("brazil-unavailable-series.csv")
OUT_UNAVAILABLE_JSON = Path("brazil-unavailable-series.json")
OUT_SNAPSHOTS_JSON = Path("brazil-pilot-source-snapshots.json")
OUT_SUMMARY_MD = Path("brazil-validated-subset-pilot-summary.md")

FAO_TERMS_URL = "https://www.fao.org/contact-us/terms/db-terms-of-use/en/"
FAO_LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"

PILOT_FIELDS = [
    "candidate_row_id", "country_iso3", "country_name", "series_code",
    "layer_id", "issue_id", "item_code", "item_label", "element_code", "element_label",
    "evidence_kind", "row_role", "raw_value", "unit_label", "reference_period",
    "reference_period_semantics", "source_id", "source_snapshot_id", "source_url",
    "retrieval_timestamp", "checksum_algorithm", "checksum", "byte_size", "license_id",
    "attribution", "legal_status", "method_status", "coverage_status", "promotion_decision", "caveat",
]

UNAVAILABLE_FIELDS = [
    "series_code", "country_iso3", "country_name", "item_code", "item_label",
    "element_code", "element_label", "http_status", "metadata_validation_status",
    "availability_status", "promotion_decision", "next_action", "reason",
]

SNAPSHOT_FIELDS = [
    "source_snapshot_id", "series_code", "source_id", "source_url", "local_path",
    "retrieval_timestamp", "http_status", "content_type", "checksum_algorithm", "checksum", "byte_size",
    "legal_status", "allowed_use_scope", "provider", "distributor", "license_uri", "terms_url",
]

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def pick(row, *names, default=""):
    for n in names:
        v = row.get(n)
        if v not in (None, ""):
            return v
    return default

def read_csv(path):
    if not path.exists():
        return []
    return list(csv.DictReader(path.open(newline="", encoding="utf-8")))

def series_code_from(row):
    return pick(row, "series_code", "inferred_series_code", "target_series_code", "response_series_code")

def make_observation_url(row, target_by_series):
    series = series_code_from(row)
    target = target_by_series.get(series, {})
    # Prefer explicit pilot/observation URL if target pack provides one.
    url = pick(target, "pilot_observation_url", "observation_url", "series_url", "source_url")
    if not url:
        url = pick(row, "metadata_only_url", "source_url", "inferred_series_url")
    if not url and series:
        # Decide dataset from series pattern / target metadata.
        dataset = pick(row, "dataset_code", default=pick(target, "dataset_code", default="QCL"))
        url = f"https://api.db.nomics.world/v22/series/FAO/{dataset}/{series}"

    parsed = urllib.parse.urlparse(url)
    q = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    q["observations"] = "true"
    q["metadata"] = "true"
    return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(q)))

def fetch(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Painmaps Brazil candidate pilot evidence fetch; review-stage only"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
        body = r.read()
        return {
            "status": getattr(r, "status", ""),
            "content_type": r.headers.get("Content-Type", ""),
            "body": body,
            "final_url": r.geturl(),
        }

def find_latest_value(payload):
    docs = payload.get("series", {}).get("docs", [])
    if not docs:
        return None, None
    doc = docs[0]

    values = doc.get("values") or doc.get("Values")
    periods = doc.get("period") or doc.get("periods") or doc.get("Period") or doc.get("Periods")

    pairs = []
    if isinstance(values, dict):
        for k, v in values.items():
            if v not in (None, "", "NA"):
                pairs.append((str(k), v))
    elif isinstance(values, list) and isinstance(periods, list):
        for p, v in zip(periods, values):
            if v not in (None, "", "NA"):
                pairs.append((str(p), v))

    # DBnomics variants sometimes store observations separately.
    obs = doc.get("observations") or payload.get("observations")
    if not pairs and isinstance(obs, dict):
        for k, v in obs.items():
            if isinstance(v, dict):
                val = v.get("value") or v.get("Value")
            else:
                val = v
            if val not in (None, "", "NA"):
                pairs.append((str(k), val))

    if not pairs:
        return None, None

    def year_key(p):
        try:
            return int(str(p)[:4])
        except Exception:
            return -10**9

    pairs.sort(key=lambda x: year_key(x[0]))
    return pairs[-1]

def classify_row(row, target):
    series = series_code_from(row)
    if series == "21.1309.5157" or pick(row, "dataset_code", default=pick(target, "dataset_code")).upper() == "RP":
        return {
            "layer_id": "fao_rp_brazil_insecticide_proxy_context",
            "issue_id": "issue.insect-welfare",
            "evidence_kind": "proxy_context",
            "row_role": "brazil_country_insecticide_proxy_candidate",
            "unit_label": pick(target, "unit_label", default="tonnes or source-reported unit"),
            "caveat": "FAO/RP insecticide-use proxy via DBnomics metadata/distribution path; not direct insect suffering evidence; candidate-only pending legal, source, method, and UX review.",
            "source_id": "dbnomics-fao-rp-brazil-insecticide-pilot",
        }
    return {
        "layer_id": "fao_qcl_brazil_slaughter_context",
        "issue_id": "issue.factory-farmed-animals",
        "evidence_kind": "direct_context",
        "row_role": "brazil_country_animal_slaughter_context_candidate",
        "unit_label": "head",
        "caveat": "FAO/QCL producing-animals/slaughtered context via DBnomics metadata/distribution path; not a welfare or suffering estimate; candidate-only pending legal, source, method, and UX review.",
        "source_id": "dbnomics-fao-qcl-brazil-slaughter-pilot",
    }

def main():
    decisions = read_csv(DECISION_CSV)
    targets = read_csv(TARGET_CSV)
    target_by_series = {series_code_from(r): r for r in targets if series_code_from(r)}

    eligible = [r for r in decisions if r.get("validation_decision") == "pilot_observation_eligible"]
    unavailable = [r for r in decisions if r.get("validation_decision") == "unavailable_exact_series_code"]
    blocked_other = [r for r in decisions if r.get("validation_decision") not in {"pilot_observation_eligible", "unavailable_exact_series_code"}]

    pilot_rows = []
    snapshot_rows = []

    for idx, r in enumerate(eligible, start=1):
        series = series_code_from(r)
        target = target_by_series.get(series, {})
        source_url = make_observation_url(r, target_by_series)
        retrieved_at = now_iso()
        result = fetch(source_url)
        body = result["body"]
        payload = json.loads(body.decode("utf-8"))
        period, value = find_latest_value(payload)
        missing_observation = period is None or value is None
        if missing_observation:
            period = ""
            value = ""

        checksum = hashlib.sha256(body).hexdigest()
        snapshot_id = f"snapshot.release-candidate-2026-07-09.brazil-evidence.v2.{series.replace('.', '-')}.json"
        local_path = SNAPSHOT_DIR / snapshot_id
        local_path.write_bytes(body)

        info = classify_row(r, target)
        item_code = pick(r, "item_code", "response_dimensions_item", default=pick(target, "item_code"))
        item_label = pick(r, "item_label", default=pick(target, "item_label"))
        element_code = pick(r, "element_code", "response_dimensions_element", default=pick(target, "element_code"))
        element_label = pick(r, "element_label", default=pick(target, "element_label"))

        pilot_rows.append({
            "candidate_row_id": f"brazil-pilot-{idx:03d}",
            "country_iso3": "BRA",
            "country_name": "Brazil",
            "series_code": series,
            "layer_id": info["layer_id"],
            "issue_id": info["issue_id"],
            "item_code": item_code,
            "item_label": item_label,
            "element_code": element_code,
            "element_label": element_label,
            "evidence_kind": info["evidence_kind"],
            "row_role": info["row_role"],
            "raw_value": str(value),
            "unit_label": info["unit_label"],
            "reference_period": str(period),
            "reference_period_semantics": "latest_non_null_dbnomics_fao_year",
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
            "caveat": (
                info["caveat"]
                + (" Latest non-null observation was not present in the fetched DBnomics response." if missing_observation else "")
            ),
        })

        snapshot_rows.append({
            "source_snapshot_id": snapshot_id,
            "series_code": series,
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

    unavailable_rows = []
    for r in unavailable:
        series = series_code_from(r)
        target = target_by_series.get(series, {})
        unavailable_rows.append({
            "series_code": series,
            "country_iso3": "BRA",
            "country_name": "Brazil",
            "item_code": pick(r, "item_code", "response_dimensions_item", default=pick(target, "item_code")),
            "item_label": pick(r, "item_label", default=pick(target, "item_label")),
            "element_code": pick(r, "element_code", "response_dimensions_element", default=pick(target, "element_code")),
            "element_label": pick(r, "element_label", default=pick(target, "element_label")),
            "http_status": pick(r, "http_status"),
            "metadata_validation_status": pick(r, "metadata_validation_status"),
            "availability_status": "unavailable_exact_series_code",
            "promotion_decision": "blocked_series_not_available",
            "next_action": "do not infer; if needed, inspect FAO/DBnomics metadata for alternate item code or leave category absent",
            "reason": pick(r, "validation_decision_reason", default="Exact DBnomics/FAO series unavailable; keep absent."),
        })

    for r in blocked_other:
        series = series_code_from(r)
        target = target_by_series.get(series, {})
        unavailable_rows.append({
            "series_code": series,
            "country_iso3": "BRA",
            "country_name": "Brazil",
            "item_code": pick(r, "item_code", "response_dimensions_item", default=pick(target, "item_code")),
            "item_label": pick(r, "item_label", default=pick(target, "item_label")),
            "element_code": pick(r, "element_code", "response_dimensions_element", default=pick(target, "element_code")),
            "element_label": pick(r, "element_label", default=pick(target, "element_label")),
            "http_status": pick(r, "http_status"),
            "metadata_validation_status": pick(r, "metadata_validation_status"),
            "availability_status": "blocked_metadata_validation_failed",
            "promotion_decision": "blocked_metadata_validation_failed",
            "next_action": "do not infer; review metadata failure before any retry",
            "reason": pick(r, "validation_decision_reason", default="Metadata validation did not pass."),
        })

    with OUT_PILOT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=PILOT_FIELDS)
        w.writeheader()
        w.writerows(pilot_rows)
    OUT_PILOT_JSON.write_text(json.dumps(pilot_rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    with OUT_UNAVAILABLE_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=UNAVAILABLE_FIELDS)
        w.writeheader()
        w.writerows(unavailable_rows)
    OUT_UNAVAILABLE_JSON.write_text(json.dumps(unavailable_rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    OUT_SNAPSHOTS_JSON.write_text(json.dumps(snapshot_rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    with OUT_SUMMARY_MD.open("w", encoding="utf-8") as out:
        out.write("# Brazil validated-subset pilot summary\n\n")
        out.write("Candidate-only pilot observations for metadata-validated Brazil series. No production release integration.\n\n")
        out.write(f"- pilot rows: {len(pilot_rows)}\n")
        out.write(f"- unavailable rows: {len(unavailable_rows)}\n\n")
        out.write("## Pilot rows\n\n")
        for r in pilot_rows:
            out.write(f"- `{r['series_code']}` — {r['item_label']} — {r['raw_value']} {r['unit_label']} ({r['reference_period']}) — {r['evidence_kind']}\n")
        out.write("\n## Unavailable rows\n\n")
        for r in unavailable_rows:
            out.write(f"- `{r['series_code']}` — {r['item_label']} — {r['availability_status']}\n")

    print("pilot_rows:", len(pilot_rows))
    print("pilot_rows_missing_latest_observation:", sum(1 for r in pilot_rows if not r["raw_value"] or not r["reference_period"]))
    print("unavailable_rows:", len(unavailable_rows))
    print("wrote", OUT_PILOT_CSV)
    print("wrote", OUT_UNAVAILABLE_CSV)
    print("wrote", OUT_SNAPSHOTS_JSON)

if __name__ == "__main__":
    main()
