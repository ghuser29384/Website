#!/usr/bin/env python3
"""Fetch release-candidate country-context sources for PainMap.
Run locally with internet access. This script does not publish values; it creates source snapshots and checksums.
"""
from __future__ import annotations
import hashlib, json, os, sys, time, urllib.request
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / "fetched-source-snapshots"
OUT.mkdir(exist_ok=True)
MANIFEST = json.loads((BASE / "source-snapshots.json").read_text())

USER_AGENT = "PainMap release-candidate source fetcher/0.1 (+https://painmaps.org/)"

def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def main() -> int:
    results=[]
    for row in MANIFEST:
        url=row["upstream_url"]
        sid=row["source_snapshot_id"].replace(":","_").replace("/","_")
        ext=".csv" if ".csv" in url else ".json" if ".json" in url else ".html"
        try:
            data=fetch(url)
            digest=hashlib.sha256(data).hexdigest()
            p=OUT / f"{sid}{ext}"
            p.write_bytes(data)
            row.update({"retrieval_timestamp":time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),"checksum":digest,"byte_size":len(data),"local_path":str(p.relative_to(BASE)),"fetch_status":"ok"})
        except Exception as e:
            row.update({"fetch_status":"error","error":repr(e)})
        results.append(row)
    (BASE / "source-snapshots.fetched.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(json.dumps({"snapshots":len(results),"ok":sum(1 for r in results if r.get('fetch_status')=='ok')}, indent=2))
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
