#!/usr/bin/env python3
"""Parse reviewed World Bank WDI snapshots into context-only staging artifacts."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


RELEASE_CANDIDATE_ID = "release-candidate-2026-07-07.country-context.v0"
WDI_SOURCE_ID = "world-bank-wdi-api"
ALLOWED_INDICATORS = {"SP.POP.TOTL", "AG.LND.TOTL.K2", "AG.LND.AGRI.K2"}

PARSED_FIELDS = [
    "candidate_row_id",
    "release_candidate_id",
    "release_id",
    "place_id",
    "iso3",
    "country_name",
    "layer_id",
    "issue_id",
    "metric_id",
    "indicator_id",
    "indicator_name",
    "row_role",
    "evidence_kind",
    "value_type",
    "raw_value",
    "normalized_value",
    "display_value",
    "unit_label",
    "ranking_mode",
    "rank_value",
    "reference_period",
    "reference_period_semantics",
    "source_vintage",
    "method_id",
    "method_version",
    "transform_version",
    "source_ids",
    "source_snapshot_ids",
    "license_id",
    "attribution",
    "uncertainty_class",
    "caveat",
    "comparability_group_id",
    "evidence_compatibility_rule",
    "coverage_status",
    "coverage_reason",
    "missing_inputs",
    "promotion_decision",
    "allowed_use_scope",
    "source_file_checksum",
    "source_file_checksum_algorithm",
    "source_file_byte_size",
    "retrieval_timestamp",
]

COVERAGE_FIELDS = [
    "iso3",
    "country_name",
    "has_population_total",
    "population_reference_period",
    "has_land_area",
    "land_area_reference_period",
    "has_agricultural_land",
    "agricultural_land_reference_period",
    "wdi_context_complete",
    "missing_wdi_context_inputs",
    "context_row_count",
    "coverage_status_after_wdi_parse",
    "promotion_decision_after_wdi_parse",
]

BLOCKED_FIELDS = [
    "source_snapshot_id",
    "source_id",
    "parse_status",
    "affected_layer_ids",
    "affected_issue_ids",
    "affected_country_count",
    "affected_measurement_stub_count",
    "block_reason",
    "required_to_unblock",
]

INDICATOR_CONFIG = {
    "SP.POP.TOTL": {
        "layer_id": "country-context-population",
        "issue_id": "issue.human-context",
        "metric_id": "population_total",
        "indicator_name": "Population, total",
        "row_role": "country_context_denominator",
        "evidence_kind": "direct_context",
        "value_type": "count",
        "unit_label": "people",
        "comparability_group_id": "context-denominator-population",
        "evidence_compatibility_rule": "comparable only as WDI country context denominator, not as pain/suffering estimate",
        "coverage_reason": "WDI context denominator parsed from latest non-null value; not a canonical pain/suffering profile",
    },
    "AG.LND.TOTL.K2": {
        "layer_id": "country-context-land-area",
        "issue_id": "issue.wild-animals",
        "metric_id": "land_area_sq_km",
        "indicator_name": "Land area (sq. km)",
        "row_role": "country_context_land_denominator",
        "evidence_kind": "direct_context",
        "value_type": "area",
        "unit_label": "sq km",
        "comparability_group_id": "context-denominator-land-area",
        "evidence_compatibility_rule": "comparable only as WDI land-area context denominator, not as wild-animal suffering estimate",
        "coverage_reason": "WDI land-area context parsed from latest non-null value; not a canonical pain/suffering profile",
    },
    "AG.LND.AGRI.K2": {
        "layer_id": "country-context-agricultural-land",
        "issue_id": "issue.wild-animals",
        "metric_id": "agricultural_land_sq_km",
        "indicator_name": "Agricultural land (sq. km)",
        "row_role": "country_context_agricultural_land_denominator",
        "evidence_kind": "direct_context",
        "value_type": "area",
        "unit_label": "sq km",
        "comparability_group_id": "context-denominator-agricultural-land",
        "evidence_compatibility_rule": "comparable only as WDI agricultural-land context denominator, not as animal suffering estimate",
        "coverage_reason": "WDI agricultural-land context parsed from latest non-null value; not a canonical pain/suffering profile",
    },
}

INDICATOR_TO_COVERAGE = {
    "SP.POP.TOTL": ("has_population_total", "population_reference_period", "population_total"),
    "AG.LND.TOTL.K2": ("has_land_area", "land_area_reference_period", "land_area_sq_km"),
    "AG.LND.AGRI.K2": (
        "has_agricultural_land",
        "agricultural_land_reference_period",
        "agricultural_land_sq_km",
    ),
}

BLOCKED_ANIMAL_INPUTS = [
    "owid-land-animals-slaughtered",
    "owid-farmed-fish-killed",
    "owid-wild-caught-fish",
    "owid-farmed-crustaceans",
    "owid-insecticide-use-fao",
    "fishcount-farmed-fish",
    "fishcount-farmed-decapods",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: csv_value(row.get(field)) for field in fields})


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


def fail(message: str) -> None:
    print(f"WDI_CONTEXT_PARSE_FAILED: {message}", file=sys.stderr)
    sys.exit(1)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def numeric_year(value: Any) -> int:
    text = str(value)
    if not re.fullmatch(r"\d{4}", text):
        fail(f"unexpected WDI reference period {value!r}")
    return int(text)


def display_value(raw_value: int | float, unit_label: str) -> str:
    if unit_label == "people":
        return f"{int(round(float(raw_value))):,} people"
    if unit_label == "sq km":
        rounded = round(float(raw_value), 2)
        if rounded.is_integer():
            return f"{int(rounded):,} sq km"
        return f"{rounded:,.2f} sq km"
    return f"{raw_value} {unit_label}"


def source_indicator_from_url(url: str) -> str | None:
    match = re.search(r"/indicator/([^?]+)", url)
    return match.group(1) if match else None


def latest_non_null_by_iso(rows: list[dict[str, Any]], ledger_iso3: set[str]) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    for row in rows:
        iso3 = row.get("countryiso3code")
        if not iso3 or iso3 not in ledger_iso3:
            continue
        value = row.get("value")
        if value is None:
            continue
        year = numeric_year(row.get("date"))
        previous = latest.get(iso3)
        if previous is None or year > numeric_year(previous["date"]):
            latest[iso3] = row
    return latest


def load_wdi_snapshot(candidate_dir: Path, snapshot: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    local_path = snapshot.get("local_path")
    if not local_path:
        fail(f"{snapshot['source_snapshot_id']} missing local_path")
    path = candidate_dir / local_path
    if not path.exists():
        fail(f"{snapshot['source_snapshot_id']} missing local file {local_path}")
    if path.stat().st_size != int(snapshot["byte_size"]):
        fail(f"{snapshot['source_snapshot_id']} byte size mismatch")
    checksum = sha256_file(path)
    if checksum != snapshot["checksum"]:
        fail(f"{snapshot['source_snapshot_id']} checksum mismatch")
    payload = read_json(path)
    if (
        not isinstance(payload, list)
        or len(payload) != 2
        or not isinstance(payload[0], dict)
        or not isinstance(payload[1], list)
    ):
        fail(f"{snapshot['source_snapshot_id']} is not a World Bank V2 [metadata, rows] response")
    return payload[0], payload[1]


def make_candidate_row_id(iso3: str, indicator_id: str) -> str:
    safe_indicator = indicator_id.lower().replace(".", "-")
    return f"wdi-context-{iso3.lower()}-{safe_indicator}"


def build_parsed_rows(
    candidate_dir: Path,
    snapshots: list[dict[str, Any]],
    review_by_snapshot: dict[str, dict[str, str]],
    ledger_by_iso3: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    parsed_rows: list[dict[str, Any]] = []
    ledger_iso3 = set(ledger_by_iso3)
    for snapshot in snapshots:
        review = review_by_snapshot.get(snapshot["source_snapshot_id"])
        if not review:
            fail(f"{snapshot['source_snapshot_id']} missing source/license review")
        if snapshot["source_id"] != WDI_SOURCE_ID:
            fail(f"non-WDI snapshot selected for parsing: {snapshot['source_snapshot_id']}")
        if snapshot.get("fetch_status") != "ok":
            fail(f"{snapshot['source_snapshot_id']} fetch_status is not ok")
        if review.get("parse_status") != "parse_eligible":
            fail(f"{snapshot['source_snapshot_id']} parse_status is not parse_eligible")
        indicator_from_url = source_indicator_from_url(snapshot.get("upstream_url", ""))
        if indicator_from_url not in ALLOWED_INDICATORS:
            fail(f"{snapshot['source_snapshot_id']} has unexpected indicator URL {indicator_from_url}")

        metadata, rows = load_wdi_snapshot(candidate_dir, snapshot)
        indicators_in_rows = {row.get("indicator", {}).get("id") for row in rows}
        if indicators_in_rows != {indicator_from_url}:
            fail(f"{snapshot['source_snapshot_id']} contains unexpected indicators {indicators_in_rows}")
        indicator_id = indicator_from_url
        config = INDICATOR_CONFIG[indicator_id]
        latest_rows = latest_non_null_by_iso(rows, ledger_iso3)

        for iso3 in sorted(latest_rows):
            if iso3 not in ledger_by_iso3:
                fail(f"{snapshot['source_snapshot_id']} produced non-ledger ISO3 {iso3}")
            source_row = latest_rows[iso3]
            raw_value = source_row.get("value")
            if raw_value is None:
                continue
            reference_period = str(source_row["date"])
            ledger_row = ledger_by_iso3[iso3]
            row = {
                "candidate_row_id": make_candidate_row_id(iso3, indicator_id),
                "release_candidate_id": RELEASE_CANDIDATE_ID,
                "release_id": ledger_row.get("release_id") or RELEASE_CANDIDATE_ID,
                "place_id": iso3,
                "iso3": iso3,
                "country_name": ledger_row.get("display_name") or source_row.get("country", {}).get("value") or iso3,
                "indicator_id": indicator_id,
                "raw_value": raw_value,
                "normalized_value": None,
                "display_value": display_value(raw_value, config["unit_label"]),
                "ranking_mode": "none",
                "rank_value": None,
                "reference_period": reference_period,
                "reference_period_semantics": "latest_non_null_wdi_year",
                "source_vintage": reference_period,
                "method_id": "method.wdi-country-context-latest-non-null",
                "method_version": "method.wdi-country-context-latest-non-null.v0",
                "transform_version": "transform.wdi-country-context-latest-non-null.v0",
                "source_ids": [WDI_SOURCE_ID],
                "source_snapshot_ids": [snapshot["source_snapshot_id"]],
                "license_id": review["license_id"],
                "attribution": review["required_attribution"],
                "uncertainty_class": "context_only",
                "caveat": "Context denominator from World Bank WDI; not a pain/suffering measurement and not sufficient for country profile promotion.",
                "coverage_status": "partial_context_only",
                "missing_inputs": BLOCKED_ANIMAL_INPUTS,
                "promotion_decision": "not_promoted_context_only",
                "allowed_use_scope": review["allowed_use_scope"],
                "source_file_checksum": snapshot["checksum"],
                "source_file_checksum_algorithm": snapshot["checksum_algorithm"],
                "source_file_byte_size": snapshot["byte_size"],
                "retrieval_timestamp": snapshot["retrieval_timestamp"],
            }
            row.update(config)
            parsed_rows.append(row)

        if metadata.get("lastupdated"):
            print(f"{snapshot['source_snapshot_id']} WDI lastupdated={metadata['lastupdated']}")
        print(f"{snapshot['source_snapshot_id']} parsed_rows={len(latest_rows)}")
    return parsed_rows


def build_coverage_rows(
    parsed_rows: list[dict[str, Any]], ledger_rows: list[dict[str, str]]
) -> list[dict[str, Any]]:
    by_iso3: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for row in parsed_rows:
        by_iso3[row["iso3"]][row["indicator_id"]] = row

    coverage_rows: list[dict[str, Any]] = []
    for ledger_row in ledger_rows:
        iso3 = ledger_row["iso3"]
        indicator_rows = by_iso3.get(iso3, {})
        missing_indicators = [indicator for indicator in sorted(ALLOWED_INDICATORS) if indicator not in indicator_rows]
        row: dict[str, Any] = {
            "iso3": iso3,
            "country_name": ledger_row.get("display_name") or iso3,
            "has_population_total": False,
            "population_reference_period": None,
            "has_land_area": False,
            "land_area_reference_period": None,
            "has_agricultural_land": False,
            "agricultural_land_reference_period": None,
            "wdi_context_complete": len(missing_indicators) == 0,
            "missing_wdi_context_inputs": missing_indicators,
            "context_row_count": len(indicator_rows),
            "coverage_status_after_wdi_parse": "partial_context_only"
            if indicator_rows
            else ledger_row.get("current_coverage_status", "blocked_no_wdi_context"),
            "promotion_decision_after_wdi_parse": "not_promoted_context_only",
        }
        for indicator_id, parsed_row in indicator_rows.items():
            has_field, period_field, _metric = INDICATOR_TO_COVERAGE[indicator_id]
            row[has_field] = True
            row[period_field] = parsed_row["reference_period"]
        coverage_rows.append(row)
    return coverage_rows


def required_to_unblock(parse_status: str) -> str:
    if parse_status == "blocked_license_unclear":
        return (
            "Record underlying provider license URI, redistribution terms, storage permission, "
            "and required attribution; then repeat source/license review."
        )
    if parse_status == "blocked_unauthorized":
        return "Obtain authorized access or a license-compatible alternate source; do not bypass 401/access controls."
    return "Resolve parse_status blocker and repeat source/license review."


def build_blocked_rows(
    review_rows: list[dict[str, str]], impact_by_snapshot: dict[str, dict[str, str]]
) -> list[dict[str, Any]]:
    blocked_rows: list[dict[str, Any]] = []
    for review in review_rows:
        parse_status = review.get("parse_status", "")
        if parse_status == "parse_eligible":
            continue
        source_snapshot_id = review["source_snapshot_id"]
        impact = impact_by_snapshot.get(source_snapshot_id, {})
        block_reason = review.get("block_reason") or parse_status
        blocked_rows.append(
            {
                "source_snapshot_id": source_snapshot_id,
                "source_id": review["source_id"],
                "parse_status": parse_status,
                "affected_layer_ids": impact.get("affected_layer_ids", ""),
                "affected_issue_ids": impact.get("affected_issue_ids", ""),
                "affected_country_count": impact.get("affected_country_count", ""),
                "affected_measurement_stub_count": impact.get("affected_measurement_stub_count", ""),
                "block_reason": block_reason,
                "required_to_unblock": required_to_unblock(parse_status),
            }
        )
    return blocked_rows


def build_source_registry(wdi_reviews: list[dict[str, str]], wdi_snapshots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    providers = sorted({review["provider"] for review in wdi_reviews if review.get("provider")})
    return [
        {
            "source_id": WDI_SOURCE_ID,
            "label": "World Bank World Development Indicators API",
            "publisher": "World Bank",
            "provider_detail": providers,
            "upstream_api_urls": [snapshot["upstream_url"] for snapshot in wdi_snapshots],
            "terms_url": "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
            "summary_terms_url": "https://data.worldbank.org/summary-terms-of-use",
            "license_id": "cc-by-4.0-world-bank-wdi",
            "license_uri": "https://creativecommons.org/licenses/by/4.0/",
            "required_attribution": "The World Bank: World Development Indicators; include data-provider attribution as indicated in indicator metadata; do not imply World Bank endorsement.",
            "no_endorsement_caveat": "Do not claim or imply that The World Bank endorses Painmaps or this use of WDI data.",
            "redistribution_storage_note": "Reviewed WDI indicator evidence records CC BY 4.0 and permits storing these reviewed raw snapshots and publishing derived context-only values with attribution and no-endorsement caveat.",
            "review_date": "2026-07-07",
            "next_review_due": "2027-07-07",
            "allowed_use_scope": "Context-only country denominators and land-context layers; not pain/suffering measurements, rankings, or country promotion.",
        }
    ]


def build_license_registry(wdi_reviews: list[dict[str, str]]) -> list[dict[str, Any]]:
    return [
        {
            "license_id": "cc-by-4.0-world-bank-wdi",
            "label": "World Bank WDI CC BY 4.0 with World Bank dataset terms",
            "status": "reviewed_context_only",
            "license_uri": "https://creativecommons.org/licenses/by/4.0/",
            "terms_url": "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
            "summary_terms_url": "https://data.worldbank.org/summary-terms-of-use",
            "required_attribution": "The World Bank: World Development Indicators; include data-provider attribution; indicate changes where applicable.",
            "no_endorsement_caveat": "Do not claim or imply World Bank endorsement and do not use World Bank name, logos, or trademarks to imply endorsement.",
            "redistribution_storage_note": "Context-only staging rows may be stored and derived from the three reviewed WDI snapshots; production release still needs registry integration review.",
            "review_evidence": sorted({review["review_evidence"] for review in wdi_reviews if review.get("review_evidence")}),
            "review_date": "2026-07-07",
            "next_review_due": "2027-07-07",
        }
    ]


def validate_outputs(
    parsed_rows: list[dict[str, Any]],
    coverage_rows: list[dict[str, Any]],
    blocked_rows: list[dict[str, Any]],
    review_by_snapshot: dict[str, dict[str, str]],
    ledger_iso3: set[str],
) -> None:
    blocked_source_ids = {
        review["source_id"] for review in review_by_snapshot.values() if review.get("parse_status") != "parse_eligible"
    }
    blocked_snapshot_ids = {
        snapshot_id for snapshot_id, review in review_by_snapshot.items() if review.get("parse_status") != "parse_eligible"
    }

    for row in parsed_rows:
        if row["iso3"] not in ledger_iso3:
            fail(f"parsed row uses non-ledger ISO3 {row['iso3']}")
        if row["source_ids"] != [WDI_SOURCE_ID]:
            fail(f"{row['candidate_row_id']} uses non-WDI source_ids")
        if any(source_id in blocked_source_ids for source_id in row["source_ids"]):
            fail(f"{row['candidate_row_id']} uses blocked source")
        if any(snapshot_id in blocked_snapshot_ids for snapshot_id in row["source_snapshot_ids"]):
            fail(f"{row['candidate_row_id']} uses blocked snapshot")
        if row["indicator_id"] not in ALLOWED_INDICATORS:
            fail(f"{row['candidate_row_id']} uses unexpected indicator")
        if row["promotion_decision"] != "not_promoted_context_only":
            fail(f"{row['candidate_row_id']} has promotion-like decision")
        if row["ranking_mode"] != "none" or row["rank_value"] is not None:
            fail(f"{row['candidate_row_id']} has ranking output")
        if row["evidence_kind"] != "direct_context":
            fail(f"{row['candidate_row_id']} has non-context evidence kind")
        for field in [
            "reference_period",
            "source_vintage",
            "source_snapshot_ids",
            "source_file_checksum",
            "source_file_checksum_algorithm",
            "source_file_byte_size",
            "retrieval_timestamp",
        ]:
            if row.get(field) in ("", None, []):
                fail(f"{row['candidate_row_id']} missing {field}")

    if not blocked_rows:
        fail("blocked-source-decisions would be empty")
    if any(row["source_id"] == WDI_SOURCE_ID for row in blocked_rows):
        fail("WDI appears in blocked-source-decisions")
    if any(not row["block_reason"] for row in blocked_rows):
        fail("blocked source missing block_reason")
    if any(row["promotion_decision_after_wdi_parse"] != "not_promoted_context_only" for row in coverage_rows):
        fail("coverage row has promotion-like decision")


def main() -> None:
    candidate_dir = Path(__file__).resolve().parents[1]
    source_snapshots = read_json(candidate_dir / "source-snapshots.fetched.json")
    review_rows = read_csv(candidate_dir / "source-license-access-review.csv")
    ledger_rows = read_csv(candidate_dir / "country-gap-ledger.csv")
    impact_rows = read_json(candidate_dir / "snapshot-dependency-impact.json")

    review_by_snapshot = {row["source_snapshot_id"]: row for row in review_rows}
    ledger_by_iso3 = {row["iso3"]: row for row in ledger_rows}
    impact_by_snapshot = {row["source_snapshot_id"]: row for row in impact_rows}

    wdi_snapshots = [
        snapshot
        for snapshot in source_snapshots
        if snapshot.get("source_id") == WDI_SOURCE_ID
        and source_indicator_from_url(snapshot.get("upstream_url", "")) in ALLOWED_INDICATORS
    ]
    if len(wdi_snapshots) != 3:
        fail(f"expected exactly 3 WDI snapshots, found {len(wdi_snapshots)}")

    wdi_reviews = [review_by_snapshot[snapshot["source_snapshot_id"]] for snapshot in wdi_snapshots]
    parsed_rows = build_parsed_rows(candidate_dir, wdi_snapshots, review_by_snapshot, ledger_by_iso3)
    coverage_rows = build_coverage_rows(parsed_rows, ledger_rows)
    blocked_rows = build_blocked_rows(review_rows, impact_by_snapshot)
    source_registry = build_source_registry(wdi_reviews, wdi_snapshots)
    license_registry = build_license_registry(wdi_reviews)

    validate_outputs(parsed_rows, coverage_rows, blocked_rows, review_by_snapshot, set(ledger_by_iso3))

    write_csv(candidate_dir / "parsed-wdi-country-context.csv", parsed_rows, PARSED_FIELDS)
    write_json(candidate_dir / "parsed-wdi-country-context.json", parsed_rows)
    write_csv(candidate_dir / "wdi-country-context-coverage.csv", coverage_rows, COVERAGE_FIELDS)
    write_json(candidate_dir / "wdi-country-context-coverage.json", coverage_rows)
    write_csv(candidate_dir / "blocked-source-decisions.csv", blocked_rows, BLOCKED_FIELDS)
    write_json(candidate_dir / "blocked-source-decisions.json", blocked_rows)
    write_json(candidate_dir / "source-registry-additions.wdi-reviewed.json", source_registry)
    write_json(candidate_dir / "license-registry-additions.wdi-reviewed.json", license_registry)

    print("parsed_rows:", len(parsed_rows))
    print("coverage_rows:", len(coverage_rows))
    print("blocked_rows:", len(blocked_rows))
    print("parsed indicators:", dict(Counter(row["indicator_id"] for row in parsed_rows)))
    print(
        "coverage status:",
        dict(Counter(row["coverage_status_after_wdi_parse"] for row in coverage_rows)),
    )
    print("WDI context-only parse completed")


if __name__ == "__main__":
    main()
