#!/usr/bin/env python3
import csv
import hashlib
import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

OUT_CSV = Path("official-fao-access-path-discovery.csv")
OUT_JSON = Path("official-fao-access-path-discovery.json")
OUT_MD = Path("official-fao-access-path-discovery.md")
OUT_SNIPPETS = Path("official-fao-access-path-discovery-snippets.txt")

APPROVED_SEEDS = [
    "https://www.fao.org/contact-us/terms/db-terms-of-use/en/",
    "https://www.fao.org/faostat/en/#data/QCL",
    "https://www.fao.org/faostat/en/#data/RP",
    "https://www.fao.org/faostat/en/#data",
    "https://dataexplorer.fao.org/",
    "https://fenixservices.fao.org/faostat/api/v1/",
    "https://fenixservices.fao.org/faostat/api/v1/Definitions/DomainCodes/DomainCodes",
]

OFFICIAL_FAO_HOST_SUFFIXES = (
    "fao.org",
)

SEARCH_TERMS = [
    "QCL", "RP", "Crops_Livestock_Products", "Pesticides_Use",
    "5320", "5157", "bulk", "download", "api", "faostat",
    "dataexplorer", "fenix", "domain", "dataset",
]

FIELDS = [
    "candidate_id",
    "seed_url",
    "resolved_url",
    "http_status",
    "content_type",
    "byte_size",
    "sha256",
    "is_official_fao_domain",
    "resource_type",
    "contains_qcl",
    "contains_rp",
    "contains_download",
    "contains_api",
    "contains_bulk",
    "contains_fenix",
    "candidate_endpoint_or_reference",
    "candidate_endpoint_type",
    "candidate_supports_qcl",
    "candidate_supports_rp",
    "candidate_supports_metadata_only",
    "candidate_supports_data_download",
    "recommended_status",
    "recommended_next_action",
    "error",
]

MAX_BODY_BYTES = 750_000
MAX_JS_FETCHES = 30
MAX_DISCOVERED_REFERENCE_ROWS = 200


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def is_official_fao_url(url):
    try:
        host = urllib.parse.urlparse(url).hostname or ""
    except Exception:
        return False
    return any(host == suffix or host.endswith("." + suffix) for suffix in OFFICIAL_FAO_HOST_SUFFIXES)


def safe_get(url, max_bytes=MAX_BODY_BYTES):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Painmaps official FAO endpoint discovery; metadata only"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
            body = r.read(max_bytes + 1)
            truncated = len(body) > max_bytes
            if truncated:
                body = body[:max_bytes]
            return {
                "ok": True,
                "status": getattr(r, "status", ""),
                "content_type": r.headers.get("Content-Type", ""),
                "content_length": r.headers.get("Content-Length", ""),
                "resolved_url": r.geturl(),
                "body": body,
                "truncated": truncated,
                "error": "",
            }
    except urllib.error.HTTPError as e:
        body = e.read(4096) if hasattr(e, "read") else b""
        return {
            "ok": False,
            "status": e.code,
            "content_type": e.headers.get("Content-Type", "") if e.headers else "",
            "content_length": e.headers.get("Content-Length", "") if e.headers else "",
            "resolved_url": url,
            "body": body,
            "truncated": False,
            "error": repr(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": "",
            "content_type": "",
            "content_length": "",
            "resolved_url": url,
            "body": b"",
            "truncated": False,
            "error": repr(e),
        }


def text_from_body(body):
    return body.decode("utf-8", "ignore")


def contains(text, token):
    return token.lower() in text.lower()


def extract_refs(text, base_url):
    refs = set()

    def add_joined(ref):
        try:
            refs.add(urllib.parse.urljoin(base_url, ref))
        except ValueError:
            return

    # Absolute URLs.
    for m in re.finditer(r'https://[^\s"\'<>\\)]+', text):
        refs.add(m.group(0).rstrip(".,;)]}"))

    # src/href attributes.
    for m in re.finditer(r'(?:src|href)=["\']([^"\']+)["\']', text, flags=re.I):
        add_joined(m.group(1))

    # Relative API/data-looking strings.
    for m in re.finditer(r'["\']([^"\']*(?:api|download|bulk|faostat|fenix|data)[^"\']*)["\']', text, flags=re.I):
        ref = m.group(1)
        if not ref.startswith(("http://", "https://", "data:", "javascript:")):
            add_joined(ref)

    return sorted(refs)


def resource_type_for(url, content_type):
    lower = (url + " " + content_type).lower()
    if ".js" in lower or "javascript" in lower:
        return "javascript"
    if "json" in lower or "/api/" in lower:
        return "api_or_json"
    if "html" in lower or url.endswith("/") or "#" in url:
        return "html"
    if "zip" in lower:
        return "download_zip_reference"
    if "csv" in lower:
        return "download_csv_reference"
    return "other"


def candidate_type_for(ref):
    lower = ref.lower()
    if lower.endswith(".zip") or "bulk" in lower or "download" in lower:
        return "download_candidate_unfetched"
    if "/api/" in lower or "api" in lower or "fenixservices" in lower:
        return "api_or_metadata_candidate"
    if lower.endswith(".js"):
        return "javascript_reference"
    if "dataexplorer" in lower or "faostat" in lower:
        return "page_or_app_reference"
    return "reference"


def classify_row(url, result, text, candidate_ref=""):
    official = is_official_fao_url(url if not candidate_ref else candidate_ref)
    resource_type = resource_type_for(url if not candidate_ref else candidate_ref, result.get("content_type", ""))
    target = candidate_ref or url
    combined = (text or "") + " " + target

    contains_qcl = contains(combined, "QCL") or contains(combined, "Crops_Livestock")
    contains_rp = contains(combined, "RP") or contains(combined, "Pesticides_Use") or contains(combined, "pesticides")
    contains_download = contains(combined, "download")
    contains_api = contains(combined, "api")
    contains_bulk = contains(combined, "bulk")
    contains_fenix = contains(combined, "fenix")

    if not official:
        status = "blocked_not_official_fao"
        next_action = "Ignore; not an official FAO domain."
    elif candidate_ref:
        ctype = candidate_type_for(candidate_ref)
        if ctype == "download_candidate_unfetched":
            status = "official_download_endpoint_candidate_unfetched"
            next_action = "Do not fetch yet; report to ChatGPT for approval as a source-snapshot candidate."
        elif ctype in {"api_or_metadata_candidate", "javascript_reference", "page_or_app_reference"}:
            status = "official_metadata_endpoint_candidate"
            next_action = "Candidate official FAO metadata/API/app reference; report to ChatGPT before fetching further."
        else:
            status = "manual_review_required"
            next_action = "Official FAO reference found but relevance is unclear; review manually."
    elif not result.get("ok"):
        status = "blocked_unreachable"
        next_action = "Do not use; endpoint did not resolve."
    elif resource_type in {"api_or_json", "javascript"}:
        status = "official_metadata_endpoint_candidate"
        next_action = "Small official metadata/API/JS response inspected; report to ChatGPT."
    elif resource_type == "html":
        status = "official_page_only"
        next_action = "Official HTML/app page inspected; use only for endpoint discovery."
    else:
        status = "manual_review_required"
        next_action = "Official FAO resource inspected but relevance remains unclear."

    return {
        "is_official_fao_domain": str(official).lower(),
        "resource_type": resource_type,
        "contains_qcl": str(bool(contains_qcl)).lower(),
        "contains_rp": str(bool(contains_rp)).lower(),
        "contains_download": str(bool(contains_download)).lower(),
        "contains_api": str(bool(contains_api)).lower(),
        "contains_bulk": str(bool(contains_bulk)).lower(),
        "contains_fenix": str(bool(contains_fenix)).lower(),
        "candidate_endpoint_type": candidate_type_for(candidate_ref) if candidate_ref else "fetched_seed_resource",
        "candidate_supports_qcl": str(bool(contains_qcl)).lower(),
        "candidate_supports_rp": str(bool(contains_rp)).lower(),
        "candidate_supports_metadata_only": str(status in {"official_metadata_endpoint_candidate", "official_page_only"}).lower(),
        "candidate_supports_data_download": str(status == "official_download_endpoint_candidate_unfetched").lower(),
        "recommended_status": status,
        "recommended_next_action": next_action,
    }


def main():
    rows = []
    snippets = []
    js_queue = deque()
    seen_refs = set()

    def add_row(candidate_id, seed_url, result, text, candidate_ref=""):
        body = result.get("body", b"")
        sha = hashlib.sha256(body).hexdigest() if body else ""
        cls = classify_row(result.get("resolved_url") or seed_url, result, text, candidate_ref=candidate_ref)
        row = {
            "candidate_id": candidate_id,
            "seed_url": seed_url,
            "resolved_url": result.get("resolved_url", seed_url),
            "http_status": str(result.get("status", "")),
            "content_type": result.get("content_type", ""),
            "byte_size": str(len(body)),
            "sha256": sha,
            "candidate_endpoint_or_reference": candidate_ref,
            "error": result.get("error", ""),
            **cls,
        }
        rows.append(row)

    for idx, seed in enumerate(APPROVED_SEEDS, start=1):
        result = safe_get(seed)
        body = result.get("body", b"")
        text = text_from_body(body)
        add_row(f"seed-{idx:03d}", seed, result, text)
        snippets.append(f"\n\n### seed-{idx:03d} {seed}\nstatus={result.get('status')} content_type={result.get('content_type')}\n{text[:5000]}")

        if result.get("ok"):
            refs = extract_refs(text, result.get("resolved_url", seed))
            for ref in refs:
                if ref in seen_refs:
                    continue
                seen_refs.add(ref)
                if not is_official_fao_url(ref):
                    continue
                ctype = candidate_type_for(ref)
                # Record references, but do not fetch downloads/large data files.
                dummy = {
                    "ok": True,
                    "status": "reference_only",
                    "content_type": "",
                    "content_length": "",
                    "resolved_url": ref,
                    "body": b"",
                    "truncated": False,
                    "error": "",
                }
                add_row(f"ref-{len(rows)+1:03d}", seed, dummy, "", candidate_ref=ref)
                if ctype == "javascript_reference" and len(js_queue) < MAX_JS_FETCHES:
                    js_queue.append((seed, ref))
                if len(rows) > MAX_DISCOVERED_REFERENCE_ROWS:
                    break

    # Fetch same-origin JS/assets only if small enough under safe_get limit.
    js_count = 0
    while js_queue and js_count < MAX_JS_FETCHES:
        seed, js_url = js_queue.popleft()
        js_count += 1
        result = safe_get(js_url)
        text = text_from_body(result.get("body", b""))
        add_row(f"js-{js_count:03d}", seed, result, text)
        snippets.append(f"\n\n### js-{js_count:03d} {js_url}\nstatus={result.get('status')} content_type={result.get('content_type')}\n{text[:5000]}")
        if result.get("ok"):
            for ref in extract_refs(text, result.get("resolved_url", js_url)):
                if ref in seen_refs:
                    continue
                seen_refs.add(ref)
                if not is_official_fao_url(ref):
                    continue
                dummy = {
                    "ok": True,
                    "status": "reference_only",
                    "content_type": "",
                    "content_length": "",
                    "resolved_url": ref,
                    "body": b"",
                    "truncated": False,
                    "error": "",
                }
                add_row(f"ref-{len(rows)+1:03d}", js_url, dummy, "", candidate_ref=ref)
                if len(rows) > MAX_DISCOVERED_REFERENCE_ROWS:
                    break

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)

    OUT_JSON.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    OUT_SNIPPETS.write_text("\n".join(snippets) + "\n", encoding="utf-8")

    with OUT_MD.open("w", encoding="utf-8") as out:
        out.write("# Official FAO access-path discovery\n\n")
        out.write(f"Generated: {now_iso()}\n\n")
        out.write("Scope: official FAO HTML/JS/API metadata discovery only. No numeric parsing and no large data downloads.\n\n")
        counts = {}
        for r in rows:
            counts[r["recommended_status"]] = counts.get(r["recommended_status"], 0) + 1
        out.write("## Status counts\n\n")
        for k, v in sorted(counts.items()):
            out.write(f"- `{k}`: {v}\n")
        out.write("\n## Candidate endpoints/references\n\n")
        for r in rows:
            if r["candidate_endpoint_or_reference"] or r["recommended_status"] != "official_page_only":
                out.write(f"### {r['candidate_id']}\n\n")
                out.write(f"- seed_url: `{r['seed_url']}`\n")
                out.write(f"- resolved_url: `{r['resolved_url']}`\n")
                out.write(f"- candidate_endpoint_or_reference: `{r['candidate_endpoint_or_reference']}`\n")
                out.write(f"- status: `{r['recommended_status']}`\n")
                out.write(f"- type: `{r['candidate_endpoint_type']}`\n")
                out.write(f"- supports_qcl: `{r['candidate_supports_qcl']}`\n")
                out.write(f"- supports_rp: `{r['candidate_supports_rp']}`\n")
                out.write(f"- next_action: {r['recommended_next_action']}\n\n")

    print(f"wrote {OUT_CSV}")
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")
    print(f"wrote {OUT_SNIPPETS}")
    print("rows:", len(rows))
    counts = {}
    for r in rows:
        counts[r["recommended_status"]] = counts.get(r["recommended_status"], 0) + 1
    print("recommended_status:", counts)

if __name__ == "__main__":
    main()
