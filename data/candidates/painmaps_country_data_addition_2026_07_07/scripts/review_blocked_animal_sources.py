#!/usr/bin/env python3
"""Review blocked animal-layer sources for license/access unblocking.

This script produces review artifacts only. It does not parse numeric values,
fetch remote sources, promote countries, or update production release artifacts.
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


FIELDS = [
    "source_snapshot_id",
    "source_id",
    "affected_layer_ids",
    "affected_issue_ids",
    "fetch_status",
    "current_parse_status",
    "owid_metadata_file",
    "grapher_slug",
    "title",
    "underlying_provider",
    "underlying_source_url",
    "underlying_license_name",
    "underlying_license_uri",
    "owid_citation",
    "provider_citation",
    "can_store_raw_snapshot",
    "can_publish_derived_values",
    "can_publish_derived_country_values",
    "required_attribution",
    "no_endorsement_or_provider_caveat",
    "evidence_found",
    "remaining_uncertainty",
    "recommended_parse_status",
    "recommended_allowed_use_scope",
    "block_reason_if_still_blocked",
    "next_action",
]

ALLOWED_RECOMMENDATIONS = {
    "parse_eligible_after_license_update",
    "blocked_license_unclear",
    "blocked_provider_terms_unclear",
    "blocked_storage_unclear",
    "blocked_unauthorized",
    "blocked_manual_permission_required",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: csv_value(row.get(field, "")) for field in FIELDS})


def write_json(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def csv_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return str(value)


def truthy(value: Any) -> bool:
    return str(value).strip().lower() in {"true", "yes", "1", "permitted", "allowed"}


def compact(value: Any, limit: int = 1600) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def grapher_slug(url: str) -> str:
    match = re.search(r"/grapher/([^?]+)", url or "")
    if not match:
        return ""
    slug = match.group(1)
    return re.sub(r"\.(csv|json|metadata\.json)$", "", slug)


def walk_strings(value: Any, prefix: str = "") -> list[tuple[str, str]]:
    strings: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            next_prefix = f"{prefix}.{key}" if prefix else str(key)
            strings.extend(walk_strings(child, next_prefix))
    elif isinstance(value, list):
        for idx, child in enumerate(value):
            strings.extend(walk_strings(child, f"{prefix}[{idx}]"))
    elif isinstance(value, (str, int, float, bool)) and str(value).strip():
        strings.append((prefix, str(value)))
    return strings


def first_matching_string(metadata: Any, key_patterns: list[str], value_patterns: list[str] | None = None) -> str:
    key_res = [re.compile(pattern, re.I) for pattern in key_patterns]
    value_res = [re.compile(pattern, re.I) for pattern in (value_patterns or [])]
    for key, value in walk_strings(metadata):
        if any(pattern.search(key) for pattern in key_res):
            if not value_res or any(pattern.search(value) for pattern in value_res):
                return compact(value)
    if value_res:
        for _key, value in walk_strings(metadata):
            if any(pattern.search(value) for pattern in value_res):
                return compact(value)
    return ""


def metadata_snippets(metadata: Any) -> list[str]:
    snippets: list[str] = []
    interesting = [
        ("title", [r"title|name"]),
        ("license", [r"licen[cs]e"]),
        ("citation", [r"citation|attribution"]),
        ("source", [r"source|provider|publisher|producer"]),
    ]
    for label, patterns in interesting:
        found = first_matching_string(metadata, patterns)
        if found:
            snippets.append(f"{label}: {found}")
    for _key, value in walk_strings(metadata):
        if re.search(r"processed by Our World in Data|minor processing by Our World in Data|major processing by Our World in Data", value, re.I):
            snippets.append(f"owid_processing: {compact(value)}")
            break
    return snippets


def find_local_metadata(candidate_dir: Path, snapshot: dict[str, Any], storage: dict[str, str]) -> tuple[str, Any | None, str]:
    possible_paths: list[Path] = []
    for raw_path in [
        snapshot.get("local_path"),
        storage.get("original_local_path"),
    ]:
        if raw_path:
            possible_paths.append(candidate_dir / str(raw_path))

    sid = snapshot.get("source_snapshot_id", "")
    source_id = snapshot.get("source_id", "")
    for path in candidate_dir.rglob("*.json"):
        name = path.name.lower()
        if sid.lower() in name or source_id.lower() in name:
            possible_paths.append(path)

    seen: set[Path] = set()
    for path in possible_paths:
        if path in seen:
            continue
        seen.add(path)
        if path.exists() and path.suffix == ".json":
            try:
                return str(path.relative_to(candidate_dir)), read_json(path), "local metadata JSON found"
            except Exception as exc:  # pragma: no cover - defensive artifact script
                return str(path.relative_to(candidate_dir)), None, f"metadata JSON unreadable: {exc}"

    original = storage.get("original_local_path") or snapshot.get("local_path") or ""
    if original:
        return "", None, f"no local metadata JSON available; original path `{original}` is not present"
    return "", None, "no local metadata JSON path recorded"


def infer_title(snapshot: dict[str, Any], review: dict[str, str], metadata: Any | None) -> str:
    if metadata is not None:
        title = first_matching_string(metadata, [r"title|name"])
        if title:
            return title
    return snapshot.get("label") or review.get("source_id") or ""


def infer_license_name(review: dict[str, str], metadata: Any | None) -> str:
    if metadata is not None:
        found = first_matching_string(metadata, [r"licen[cs]e"], [r"cc|creative commons|license|terms"])
        if found:
            return found
    return review.get("license_id", "")


def infer_source_url(review: dict[str, str], metadata: Any | None) -> str:
    if metadata is not None:
        found = first_matching_string(metadata, [r"source.*url|url"], [r"https?://"])
        if found:
            return found
    return ""


def recommendation(review: dict[str, str], snapshot: dict[str, Any], metadata: Any | None) -> tuple[str, str, str, str]:
    source_id = review.get("source_id", "")
    sid = review.get("source_snapshot_id", "")
    joined = f"{source_id} {sid}".lower()
    license_uri = review.get("license_uri", "").strip()
    can_store = truthy(review.get("can_store_raw_snapshot"))
    can_publish = truthy(review.get("can_publish_derived_values"))
    fetch_status = str(snapshot.get("fetch_status") or review.get("fetch_status") or "").lower()
    access_status = str(review.get("access_status") or "").lower()

    if "fishcount" in joined or "unauthorized" in access_status or fetch_status == "error":
        return (
            "blocked_unauthorized",
            "No parsing, raw-snapshot storage, or derived publication until authorized access and license-compatible permission or alternate source exists.",
            "source fetch returned 401 Unauthorized; do not bypass access controls",
            "Seek explicit permission or a license-compatible alternate public source; do not retry with cookies or spoofed headers.",
        )

    if "owid" in joined:
        metadata_claims_owid_original = False
        if metadata is not None:
            metadata_text = "\n".join(value for _key, value in walk_strings(metadata))
            metadata_claims_owid_original = bool(re.search(r"Our World in Data.+original|produced by Our World in Data", metadata_text, re.I))
        if license_uri and can_store and can_publish and (metadata_claims_owid_original or review.get("is_third_party_via_owid", "").lower() != "true"):
            return (
                "parse_eligible_after_license_update",
                "Candidate-only parsing after source/license tables are updated; no country promotion and no production release integration before ChatGPT review.",
                "",
                "Update source-license-access-review and source/license registry staging before any numeric parse.",
            )
        if not license_uri:
            return (
                "blocked_provider_terms_unclear",
                "Metadata/provenance review only; no numeric parsing or derived publication until provider license URI, redistribution terms, storage permission, and attribution are recorded.",
                "OWID metadata points to third-party/original provider data, but no underlying provider license URI is recorded.",
                "Record underlying provider license URI, redistribution terms, raw-snapshot storage permission, and required attribution; then repeat unblock review.",
            )
        if not can_store:
            return (
                "blocked_storage_unclear",
                "Metadata/provenance review only; no numeric parsing or raw snapshot storage until storage permission is recorded.",
                "Underlying license information may exist, but raw-snapshot storage permission is not recorded as permitted.",
                "Record raw snapshot storage terms or use reference-only workflow before parsing.",
            )
        if not can_publish:
            return (
                "blocked_license_unclear",
                "Metadata/provenance review only; no derived country values until redistribution/publication permission is recorded.",
                "Derived publication permission is not recorded as permitted.",
                "Record redistribution and derived-country-value publication permission before parsing.",
            )

    return (
        "blocked_manual_permission_required",
        "Metadata/provenance review only.",
        review.get("block_reason") or "Manual source/license review is required before parsing.",
        review.get("next_action") or "Repeat manual review.",
    )


def build_review_rows(candidate_dir: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    review_rows = read_csv(candidate_dir / "source-license-access-review.csv")
    snapshots = read_json(candidate_dir / "source-snapshots.fetched.json")
    blocked_rows = read_csv(candidate_dir / "blocked-source-decisions.csv")
    storage_rows = read_csv(candidate_dir / "raw-snapshot-storage-disposition.csv")

    review_by_sid = {row["source_snapshot_id"]: row for row in review_rows}
    snapshot_by_sid = {row["source_snapshot_id"]: row for row in snapshots}
    blocked_by_sid = {row["source_snapshot_id"]: row for row in blocked_rows}
    storage_by_sid = {row["source_snapshot_id"]: row for row in storage_rows}

    output: list[dict[str, Any]] = []
    metadata_summary: dict[str, Any] = {}

    for blocked in blocked_rows:
        sid = blocked["source_snapshot_id"]
        review = review_by_sid.get(sid, {})
        snapshot = snapshot_by_sid.get(sid, {})
        storage = storage_by_sid.get(sid, {})
        metadata_file, metadata, metadata_note = find_local_metadata(candidate_dir, snapshot, storage)
        status, allowed_scope, block_reason, next_action = recommendation(review, snapshot, metadata)
        if status not in ALLOWED_RECOMMENDATIONS:
            raise ValueError(f"{sid} produced invalid status {status}")

        source_id = blocked.get("source_id") or review.get("source_id", "")
        source_is_owid = "owid" in f"{source_id} {sid}".lower()
        source_is_fishcount = "fishcount" in f"{source_id} {sid}".lower()
        snippets = metadata_snippets(metadata) if metadata is not None else []
        if not snippets:
            snippets = [
                compact(review.get("review_evidence")),
                compact(review.get("redistribution_note")),
                metadata_note,
            ]
        snippets = [snippet for snippet in snippets if snippet]

        row = {
            "source_snapshot_id": sid,
            "source_id": source_id,
            "affected_layer_ids": blocked.get("affected_layer_ids", ""),
            "affected_issue_ids": blocked.get("affected_issue_ids", ""),
            "fetch_status": snapshot.get("fetch_status") or review.get("fetch_status", ""),
            "current_parse_status": review.get("parse_status") or blocked.get("parse_status", ""),
            "owid_metadata_file": metadata_file if source_is_owid else "",
            "grapher_slug": grapher_slug(snapshot.get("upstream_url") or review.get("upstream_url", "")),
            "title": infer_title(snapshot, review, metadata),
            "underlying_provider": review.get("underlying_provider_if_any") or review.get("provider") or ("Fishcount" if source_is_fishcount else ""),
            "underlying_source_url": infer_source_url(review, metadata),
            "underlying_license_name": infer_license_name(review, metadata),
            "underlying_license_uri": review.get("license_uri", ""),
            "owid_citation": review.get("required_attribution", "") if source_is_owid else "",
            "provider_citation": review.get("required_attribution", ""),
            "can_store_raw_snapshot": str(truthy(review.get("can_store_raw_snapshot"))).lower(),
            "can_publish_derived_values": str(truthy(review.get("can_publish_derived_values"))).lower(),
            "can_publish_derived_country_values": str(status == "parse_eligible_after_license_update").lower(),
            "required_attribution": review.get("required_attribution", ""),
            "no_endorsement_or_provider_caveat": (
                "Do not imply Our World in Data or underlying-provider endorsement; follow provider license and attribution terms."
                if source_is_owid
                else "Do not bypass Fishcount access controls; do not imply permission without explicit authorization."
            ),
            "evidence_found": " | ".join(snippets),
            "remaining_uncertainty": remaining_uncertainty(review, metadata_note, source_is_owid, source_is_fishcount),
            "recommended_parse_status": status,
            "recommended_allowed_use_scope": allowed_scope,
            "block_reason_if_still_blocked": block_reason,
            "next_action": next_action,
        }
        output.append(row)
        metadata_summary[sid] = {
            "metadata_file": metadata_file,
            "metadata_note": metadata_note,
            "snippets": snippets[:8],
        }

    return output, metadata_summary


def remaining_uncertainty(review: dict[str, str], metadata_note: str, is_owid: bool, is_fishcount: bool) -> str:
    if is_fishcount:
        return "Authorized access and license-compatible redistribution/storage permission are missing."
    if is_owid:
        missing = []
        if not review.get("license_uri"):
            missing.append("underlying provider license URI")
        if not truthy(review.get("can_store_raw_snapshot")):
            missing.append("raw snapshot storage permission")
        if not truthy(review.get("can_publish_derived_values")):
            missing.append("derived-country-value redistribution permission")
        if "no local metadata" in metadata_note:
            missing.append("local metadata JSON for reinspection")
        return "; ".join(missing) or "manual OWID/provider terms review required"
    return review.get("block_reason") or "manual review required"


def write_summary(path: Path, rows: list[dict[str, Any]], metadata_summary: dict[str, Any]) -> None:
    counts = Counter(row["recommended_parse_status"] for row in rows)
    lines: list[str] = [
        "# Animal source unblock review summary",
        "",
        "Purpose: review blocked OWID/Fishcount animal-layer sources for possible license/access unblocking. No numeric parsing, no country promotion, no production release regeneration.",
        "",
        "## Summary counts",
        "",
    ]
    for status, count in sorted(counts.items()):
        lines.append(f"- `{status}`: {count}")
    lines.extend(["", "## Potentially unblocked sources", ""])
    potentially = [row for row in rows if row["recommended_parse_status"] == "parse_eligible_after_license_update"]
    if not potentially:
        lines.append("- None. No blocked animal-layer source has enough local provider license/storage evidence to become parse-eligible.")
    else:
        for row in potentially:
            lines.append(
                f"- `{row['source_snapshot_id']}`: provider `{row['underlying_provider']}`, license `{row['underlying_license_uri']}`, scope `{row['recommended_allowed_use_scope']}`"
            )

    lines.extend(["", "## Still blocked sources", ""])
    for row in rows:
        if row["recommended_parse_status"] == "parse_eligible_after_license_update":
            continue
        lines.append(f"### {row['source_snapshot_id']}")
        lines.append("")
        lines.append(f"- source_id: `{row['source_id']}`")
        lines.append(f"- affected layers: `{row['affected_layer_ids']}`")
        lines.append(f"- current parse status: `{row['current_parse_status']}`")
        lines.append(f"- recommended parse status: `{row['recommended_parse_status']}`")
        lines.append(f"- underlying provider: {row['underlying_provider'] or 'not recorded'}")
        lines.append(f"- underlying license URI: {row['underlying_license_uri'] or 'not recorded'}")
        lines.append(f"- can store raw snapshot: `{row['can_store_raw_snapshot']}`")
        lines.append(f"- can publish derived values: `{row['can_publish_derived_values']}`")
        lines.append(f"- block reason: {row['block_reason_if_still_blocked']}")
        lines.append(f"- next action: {row['next_action']}")
        lines.append("")
        lines.append("Relevant local evidence:")
        for snippet in metadata_summary.get(row["source_snapshot_id"], {}).get("snippets", []):
            lines.append(f"- {snippet}")
        note = metadata_summary.get(row["source_snapshot_id"], {}).get("metadata_note")
        if note:
            lines.append(f"- metadata file status: {note}")
        lines.append("")

    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def validate_rows(rows: list[dict[str, Any]]) -> None:
    for row in rows:
        status = row["recommended_parse_status"]
        sid = row["source_snapshot_id"]
        if status not in ALLOWED_RECOMMENDATIONS:
            raise ValueError(f"{sid} invalid recommended_parse_status {status}")
        joined = f"{row['source_id']} {sid}".lower()
        if "fishcount" in joined and status != "blocked_unauthorized":
            raise ValueError(f"{sid} Fishcount must remain blocked_unauthorized")
        if "owid" in joined and status == "parse_eligible_after_license_update":
            for key in [
                "underlying_provider",
                "underlying_license_uri",
                "required_attribution",
                "evidence_found",
                "recommended_allowed_use_scope",
            ]:
                if not str(row.get(key, "")).strip():
                    raise ValueError(f"{sid} parse-eligible OWID row missing {key}")
            if row.get("can_publish_derived_country_values") != "true":
                raise ValueError(f"{sid} parse-eligible OWID row lacks country publication permission")


def main() -> None:
    candidate_dir = Path(__file__).resolve().parents[1]
    rows, metadata_summary = build_review_rows(candidate_dir)
    validate_rows(rows)
    write_csv(candidate_dir / "animal-source-unblock-review.csv", rows)
    write_json(candidate_dir / "animal-source-unblock-review.json", rows)
    write_summary(candidate_dir / "animal-source-unblock-summary.md", rows, metadata_summary)

    print("rows:", len(rows))
    print("recommended_parse_status:", dict(sorted(Counter(row["recommended_parse_status"] for row in rows).items())))
    print("potentially_unblocked:", sum(row["recommended_parse_status"] == "parse_eligible_after_license_update" for row in rows))
    print("fishcount_blocked_unauthorized:", sum(row["recommended_parse_status"] == "blocked_unauthorized" for row in rows))
    print("animal source unblock review completed")


if __name__ == "__main__":
    main()
