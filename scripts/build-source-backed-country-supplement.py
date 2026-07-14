#!/usr/bin/env python3
"""Build and validate PainMap's source-backed country candidate supplement.

The script deliberately updates only the staged country-data candidate package. It
never writes to data/place-measurements.json or marks a candidate country as
canonical. `--refresh` performs network retrieval, records source receipts, and
fills a bounded set of existing candidate measurement stubs. `--check` is fully
offline and validates the committed candidate rows, extracts, decisions, and
package checksums.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE_DIR = ROOT / "data" / "candidates" / "country-data-expansion"
EXTRACT_DIR = CANDIDATE_DIR / "source-extracts"

RELEASE_CANDIDATE_ID = "release-candidate-2026-07-country-context-v0"
TRANSFORM_VERSION = "painmap-country-supplement.2026-07-14.2"
TARGET_ISO3 = ("USA", "CHN", "JPN", "DEU", "GBR", "RUS", "IDN", "MEX")
TARGET_METRICS = (
    "animals_slaughtered_proxy",
    "insecticide_tonnes_proxy",
    "land_area_proxy",
)

OWID_ANIMALS_CSV = "https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv"
OWID_ANIMALS_METADATA = "https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.metadata.json"
OWID_INSECTICIDE_CSV = "https://ourworldindata.org/grapher/insecticide-use.csv"
OWID_INSECTICIDE_METADATA = "https://ourworldindata.org/grapher/insecticide-use.metadata.json"
WORLD_BANK_LAND_AREA = (
    "https://api.worldbank.org/v2/country/all/indicator/AG.LND.TOTL.K2"
    "?format=json&per_page=20000&date=1990:2026"
)

PUBLIC_CONTEXT_DATASET_ID = "painmap-human-mortality-context-v1"
PUBLIC_CONTEXT_JSON = ROOT / "data" / "pain-driver-context.json"
PUBLIC_CONTEXT_CSV = ROOT / "data" / "pain-driver-context.csv"
PUBLIC_CONTEXT_SCHEMA = ROOT / "schemas" / "pain-driver-context.schema.json"
PUBLIC_CONTEXT_SOURCE_ID = "world-bank-who-mortality-context"
PUBLIC_CONTEXT_LICENSE_ID = "cc-by-4.0"
PUBLIC_CONTEXT_LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"
PUBLIC_CONTEXT_UNIT = "deaths per 100,000 population"

# These indicators share a rate unit and a WHO-to-World-Bank provenance path. They
# may therefore be ranked descriptively within this family. They must never be
# combined with animal counts, land area, insecticide tonnage, or pain-intensity
# estimates into one score.
PUBLIC_CONTEXT_INDICATORS = (
    {
        "indicator_id": "air-pollution-mortality",
        "indicator_code": "SH.STA.AIRP.P5",
        "indicator_name": "Mortality attributed to household and ambient air pollution",
        "definition": "Modeled mortality rate attributed to household and ambient air pollution.",
        "source_page": "https://data.worldbank.org/indicator/SH.STA.AIRP.P5",
    },
    {
        "indicator_id": "unsafe-wash-mortality",
        "indicator_code": "SH.STA.WASH.P5",
        "indicator_name": "Mortality attributed to unsafe water, sanitation and hygiene",
        "definition": "Modeled mortality rate attributed to unsafe water, sanitation and hygiene services.",
        "source_page": "https://data.worldbank.org/indicator/SH.STA.WASH.P5",
    },
    {
        "indicator_id": "road-traffic-mortality",
        "indicator_code": "SH.STA.TRAF.P5",
        "indicator_name": "Road traffic mortality",
        "definition": "Estimated road traffic mortality rate.",
        "source_page": "https://data.worldbank.org/indicator/SH.STA.TRAF.P5",
    },
    {
        "indicator_id": "suicide-mortality",
        "indicator_code": "SH.STA.SUIC.P5",
        "indicator_name": "Suicide mortality",
        "definition": "Age-standardized suicide mortality rate.",
        "source_page": "https://data.worldbank.org/indicator/SH.STA.SUIC.P5",
    },
)


def world_bank_indicator_url(indicator_code: str) -> str:
    return (
        f"https://api.worldbank.org/v2/country/all/indicator/{indicator_code}"
        "?format=json&per_page=20000&date=2000:2026"
    )

USER_AGENT = "PainMap-source-candidate/2026-07-14 (+https://painmap.org/)"
CSV_TIMEOUT_SECONDS = 90


class CandidateDataError(RuntimeError):
    """Raised when a source or candidate contract cannot be validated."""


@dataclass(frozen=True)
class Download:
    url: str
    payload: bytes
    headers: dict[str, str]

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.payload).hexdigest()

    @property
    def size(self) -> int:
        return len(self.payload)


@dataclass(frozen=True)
class CountryValue:
    iso3: str
    country_name: str
    year: int
    value: float
    components: dict[str, float] | None = None


def fail(message: str) -> None:
    raise CandidateDataError(message)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def json_load(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def json_bytes(value: Any) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def json_write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(json_bytes(value))


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def composite_checksum(downloads: Iterable[Download]) -> str:
    digest = hashlib.sha256()
    for item in downloads:
        url = item.url.encode("utf-8")
        digest.update(len(url).to_bytes(8, "big"))
        digest.update(url)
        digest.update(len(item.payload).to_bytes(8, "big"))
        digest.update(item.payload)
    return digest.hexdigest()


def fetch(url: str) -> Download:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json,text/csv,text/plain,*/*",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=CSV_TIMEOUT_SECONDS) as response:
            payload = response.read()
            headers = {
                key.lower(): value
                for key, value in response.headers.items()
                if key.lower() in {"content-type", "last-modified", "etag", "content-length"}
            }
    except (urllib.error.URLError, TimeoutError) as error:
        fail(f"Failed to fetch {url}: {error}")
    if not payload:
        fail(f"Fetched empty payload from {url}")
    return Download(url=url, payload=payload, headers=headers)


def decode_text(download: Download) -> str:
    try:
        return download.payload.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        fail(f"Source {download.url} is not UTF-8 text: {error}")


def finite_number(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def normalize_number(value: float) -> int | float:
    rounded = round(value)
    if abs(value - rounded) < 1e-9:
        return int(rounded)
    return round(value, 6)


def csv_rows(download: Download) -> tuple[list[str], list[dict[str, str]]]:
    reader = csv.DictReader(io.StringIO(decode_text(download)))
    if not reader.fieldnames:
        fail(f"CSV source {download.url} has no header")
    rows = list(reader)
    if not rows:
        fail(f"CSV source {download.url} has no rows")
    return list(reader.fieldnames), rows


def source_payload_receipt(download: Download) -> dict[str, Any]:
    return {
        "url": download.url,
        "sha256": download.sha256,
        "byte_size": download.size,
        "response_headers": download.headers,
    }


def metadata_summary(download: Download) -> dict[str, Any]:
    try:
        metadata = json.loads(decode_text(download))
    except json.JSONDecodeError as error:
        fail(f"Metadata source {download.url} is invalid JSON: {error}")

    chart = metadata.get("chart") if isinstance(metadata, dict) else None
    dataset = metadata.get("dataset") if isinstance(metadata, dict) else None
    columns = metadata.get("columns") if isinstance(metadata, dict) else None
    return {
        "chart": chart if isinstance(chart, dict) else {},
        "dataset": dataset if isinstance(dataset, dict) else {},
        "columns": columns if isinstance(columns, dict) else {},
    }


def current_place_registry() -> dict[str, dict[str, Any]]:
    place_index = json_load(ROOT / "v1" / "places" / "index.json")
    result: dict[str, dict[str, Any]] = {}
    for item in place_index.get("items", []):
        iso3 = str(item.get("iso3") or "").upper()
        if item.get("geometry_level") == "country" and len(iso3) == 3:
            result[iso3] = item
    missing = [iso3 for iso3 in TARGET_ISO3 if iso3 not in result]
    if missing:
        fail(f"Target countries missing from PainMap place index: {', '.join(missing)}")
    return result


def latest_owid_animals(download: Download, valid_iso3: set[str]) -> dict[str, CountryValue]:
    fieldnames, rows = csv_rows(download)
    standard = {"Entity", "Code", "Year"}
    data_columns = [column for column in fieldnames if column not in standard]
    if not data_columns:
        fail("OWID land-animal CSV contains no data columns")

    total_columns = [
        column
        for column in data_columns
        if "land animals slaughtered" in column.lower()
        or column.lower().strip() in {"animals slaughtered for meat", "land animals"}
    ]
    latest: dict[str, CountryValue] = {}

    for row in rows:
        iso3 = str(row.get("Code") or "").strip().upper()
        if iso3 not in valid_iso3:
            continue
        year_value = finite_number(row.get("Year"))
        if year_value is None:
            continue
        year = int(year_value)

        components: dict[str, float] = {}
        if total_columns:
            value = finite_number(row.get(total_columns[0]))
            if value is not None:
                components[total_columns[0]] = value
        else:
            for column in data_columns:
                number = finite_number(row.get(column))
                if number is not None and number >= 0:
                    components[column] = number
            value = sum(components.values()) if components else None

        if value is None or value <= 0:
            continue
        existing = latest.get(iso3)
        if existing is None or year > existing.year:
            latest[iso3] = CountryValue(
                iso3=iso3,
                country_name=str(row.get("Entity") or iso3),
                year=year,
                value=value,
                components=components,
            )

    return latest


def latest_owid_insecticide(download: Download, valid_iso3: set[str]) -> dict[str, CountryValue]:
    fieldnames, rows = csv_rows(download)
    standard = {"Entity", "Code", "Year"}
    data_columns = [column for column in fieldnames if column not in standard]
    preferred = [
        column
        for column in data_columns
        if "insecticide" in column.lower() and ("tonne" in column.lower() or "agricultural use" in column.lower())
    ]
    if preferred:
        value_column = preferred[0]
    elif len(data_columns) == 1:
        value_column = data_columns[0]
    else:
        fail(f"Could not identify insecticide value column from: {data_columns}")

    latest: dict[str, CountryValue] = {}
    for row in rows:
        iso3 = str(row.get("Code") or "").strip().upper()
        if iso3 not in valid_iso3:
            continue
        year_value = finite_number(row.get("Year"))
        value = finite_number(row.get(value_column))
        if year_value is None or value is None or value <= 0:
            continue
        year = int(year_value)
        existing = latest.get(iso3)
        if existing is None or year > existing.year:
            latest[iso3] = CountryValue(
                iso3=iso3,
                country_name=str(row.get("Entity") or iso3),
                year=year,
                value=value,
                components={value_column: value},
            )
    return latest


def latest_world_bank_land_area(download: Download, valid_iso3: set[str]) -> dict[str, CountryValue]:
    try:
        payload = json.loads(decode_text(download))
    except json.JSONDecodeError as error:
        fail(f"World Bank land-area payload is invalid JSON: {error}")
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        fail("World Bank land-area payload has an unexpected response shape")

    latest: dict[str, CountryValue] = {}
    for row in payload[1]:
        if not isinstance(row, dict):
            continue
        iso3 = str(row.get("countryiso3code") or "").strip().upper()
        if iso3 not in valid_iso3:
            continue
        value = finite_number(row.get("value"))
        year_value = finite_number(row.get("date"))
        if value is None or value <= 0 or year_value is None:
            continue
        year = int(year_value)
        existing = latest.get(iso3)
        country = row.get("country") if isinstance(row.get("country"), dict) else {}
        if existing is None or year > existing.year:
            latest[iso3] = CountryValue(
                iso3=iso3,
                country_name=str(country.get("value") or iso3),
                year=year,
                value=value,
                components={"AG.LND.TOTL.K2": value},
            )
    return latest


def world_bank_indicator_series(
    download: Download,
    valid_iso3: set[str],
    indicator_code: str,
) -> dict[str, dict[int, CountryValue]]:
    """Parse a World Bank Indicators API response into country-year values."""
    try:
        payload = json.loads(decode_text(download))
    except json.JSONDecodeError as error:
        fail(f"World Bank {indicator_code} payload is invalid JSON: {error}")
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        fail(f"World Bank {indicator_code} payload has an unexpected response shape")

    series: dict[str, dict[int, CountryValue]] = {}
    for row in payload[1]:
        if not isinstance(row, dict):
            continue
        iso3 = str(row.get("countryiso3code") or "").strip().upper()
        if iso3 not in valid_iso3:
            continue
        value = finite_number(row.get("value"))
        year_value = finite_number(row.get("date"))
        if value is None or value < 0 or year_value is None:
            continue
        year = int(year_value)
        indicator = row.get("indicator") if isinstance(row.get("indicator"), dict) else {}
        returned_code = str(indicator.get("id") or indicator_code)
        if returned_code and returned_code != indicator_code:
            continue
        country = row.get("country") if isinstance(row.get("country"), dict) else {}
        series.setdefault(iso3, {})[year] = CountryValue(
            iso3=iso3,
            country_name=str(country.get("value") or iso3),
            year=year,
            value=value,
            components={indicator_code: value},
        )
    return series


def ensure_targets(values: dict[str, CountryValue], source_label: str) -> None:
    missing = [iso3 for iso3 in TARGET_ISO3 if iso3 not in values]
    if missing:
        fail(f"{source_label} has no positive latest observation for: {', '.join(missing)}")


def write_extract(
    file_name: str,
    *,
    source_id: str,
    fetched_at: str,
    downloads: list[Download],
    values: dict[str, CountryValue],
    selection_rule: str,
    metadata: dict[str, Any] | None = None,
) -> tuple[Path, dict[str, Any]]:
    rows = []
    for iso3 in TARGET_ISO3:
        record = values[iso3]
        rows.append(
            {
                "iso3": record.iso3,
                "country_name": record.country_name,
                "reference_year": record.year,
                "raw_value": normalize_number(record.value),
                "components": {
                    key: normalize_number(value)
                    for key, value in sorted((record.components or {}).items())
                },
            }
        )

    extract = {
        "generated_at": fetched_at,
        "release_candidate_id": RELEASE_CANDIDATE_ID,
        "source_id": source_id,
        "selection_rule": selection_rule,
        "source_payloads": [source_payload_receipt(download) for download in downloads],
        "source_payload_composite_sha256": composite_checksum(downloads),
        "source_payload_total_bytes": sum(item.size for item in downloads),
        "metadata_summary": metadata or {},
        "target_country_count": len(rows),
        "rows": rows,
    }
    path = EXTRACT_DIR / file_name
    json_write(path, extract)
    return path, extract


def extract_receipt(path: Path) -> dict[str, Any]:
    return {
        "extract_path": path.relative_to(ROOT).as_posix(),
        "extract_checksum_algorithm": "sha256",
        "extract_checksum": sha256_path(path),
        "extract_byte_size": path.stat().st_size,
    }


def replace_snapshot(payload: dict[str, Any], source_id: str, replacement: dict[str, Any]) -> None:
    rows = payload.setdefault("rows", [])
    replaced = False
    for index, row in enumerate(rows):
        if row.get("source_id") == source_id:
            rows[index] = replacement
            replaced = True
            break
    if not replaced:
        rows.append(replacement)


def snapshot_row(
    *,
    source_snapshot_id: str,
    source_id: str,
    upstream_url: str,
    fetched_at: str,
    reference_period: str,
    downloads: list[Download],
    license_id: str,
    attribution: str,
    notes: str,
    extract_path: Path,
    redistribution_permitted: str = "candidate extract only; final release requires license review",
    snapshot_storage_note: str = "compact selected-row extract committed; full upstream payload referenced by checksum",
) -> dict[str, Any]:
    return {
        "source_snapshot_id": source_snapshot_id,
        "source_id": source_id,
        "upstream_url": upstream_url,
        "retrieval_timestamp": fetched_at,
        "source_vintage_or_reference_period": reference_period,
        "media_type": downloads[0].headers.get("content-type", "application/octet-stream").split(";", 1)[0],
        "checksum_algorithm": "sha256",
        "checksum": composite_checksum(downloads),
        "byte_size": sum(item.size for item in downloads),
        "license_id": license_id,
        "attribution": attribution,
        "retrieval_metadata": {
            "status": "captured_and_parsed",
            "user_agent": USER_AGENT,
            "payloads": [source_payload_receipt(download) for download in downloads],
        },
        "notes": notes,
        "reproducible_from_static_url_or_api_query": "yes; URLs and checksums recorded",
        "redistribution_permitted": redistribution_permitted,
        "snapshot_can_be_stored_directly_or_only_referenced": snapshot_storage_note,
        **extract_receipt(extract_path),
    }


def find_measurement(rows: list[dict[str, Any]], iso3: str, metric_id: str) -> dict[str, Any]:
    matches = [row for row in rows if row.get("iso3") == iso3 and row.get("metric_id") == metric_id]
    if len(matches) != 1:
        fail(f"Expected one candidate row for {iso3}/{metric_id}; found {len(matches)}")
    return matches[0]


def update_candidate_measurements(
    *,
    fetched_at: str,
    animal_values: dict[str, CountryValue],
    insecticide_values: dict[str, CountryValue],
    land_values: dict[str, CountryValue],
    animal_snapshot_id: str,
    insecticide_snapshot_id: str,
    land_snapshot_id: str,
) -> None:
    path = CANDIDATE_DIR / "proposed-country-measurements.json"
    payload = json_load(path)
    rows = payload.get("rows", [])

    for iso3 in TARGET_ISO3:
        animal = animal_values[iso3]
        row = find_measurement(rows, iso3, "animals_slaughtered_proxy")
        row.update(
            {
                "value_type": "annual_count",
                "raw_value": normalize_number(animal.value),
                "normalized_value": "",
                "display_value": f"{animal.value:,.0f} land animals slaughtered for meat ({animal.year})",
                "unit_label": "animals/year",
                "ranking_mode": "total_burden_proxy",
                "rank_value": normalize_number(animal.value),
                "reference_period": str(animal.year),
                "reference_period_semantics": "Latest positive country observation in the captured OWID/FAO chart; country reference years may differ.",
                "source_vintage": f"FAOSTAT via Our World in Data; observation year {animal.year}; retrieved {fetched_at[:10]}",
                "method_id": "method.animals_slaughtered_proxy",
                "method_version": "v1-source-row-total-of-reported-land-animal-species",
                "transform_version": TRANSFORM_VERSION,
                "source_ids": "owid-land-animals-slaughtered",
                "source_snapshot_ids": animal_snapshot_id,
                "license_id": "owid-cc-by-third-party-terms",
                "attribution": "Food and Agriculture Organization of the United Nations, processed by Our World in Data.",
                "uncertainty_class": "low",
                "caveat": "Annual slaughter count is a scale proxy, not a direct estimate of pain intensity, duration, husbandry conditions, or net welfare.",
                "coverage_status": "candidate_source_backed_manual_review",
                "coverage_reason": "Numeric source row and checksum receipt captured; manual license, method, and UX review remain required.",
                "missing_inputs": "final original-provider license review; manual method review; manual UX review; remaining canonical source groups",
                "promotion_decision": "manual_review_required_not_promoted",
            }
        )

        insecticide = insecticide_values[iso3]
        row = find_measurement(rows, iso3, "insecticide_tonnes_proxy")
        row.update(
            {
                "value_type": "annual_mass",
                "raw_value": normalize_number(insecticide.value),
                "normalized_value": "",
                "display_value": f"{insecticide.value:,.2f} tonnes agricultural insecticide use ({insecticide.year})",
                "unit_label": "tonnes insecticide/year",
                "ranking_mode": "pressure_proxy",
                "rank_value": normalize_number(insecticide.value),
                "reference_period": str(insecticide.year),
                "reference_period_semantics": "Latest positive country observation in the captured OWID/FAO chart; country reference years may differ.",
                "source_vintage": f"FAOSTAT via Our World in Data; observation year {insecticide.year}; retrieved {fetched_at[:10]}",
                "method_id": "method.insecticide_tonnes_proxy",
                "method_version": "v1-source-row-agricultural-insecticide-tonnes",
                "transform_version": TRANSFORM_VERSION,
                "source_ids": "owid-insecticide-use",
                "source_snapshot_ids": insecticide_snapshot_id,
                "license_id": "owid-cc-by-third-party-terms",
                "attribution": "Food and Agriculture Organization of the United Nations, processed by Our World in Data.",
                "uncertainty_class": "very-low",
                "caveat": "Insecticide tonnage is a human-pressure proxy. It is not a count of insects exposed, harmed, or killed and does not encode toxicity or application context.",
                "coverage_status": "candidate_source_backed_manual_review",
                "coverage_reason": "Numeric source row and checksum receipt captured; manual license, method, and UX review remain required.",
                "missing_inputs": "final original-provider license review; manual method review; manual UX review; remaining canonical source groups",
                "promotion_decision": "manual_review_required_not_promoted",
            }
        )

        land = land_values[iso3]
        row = find_measurement(rows, iso3, "land_area_proxy")
        row.update(
            {
                "value_type": "area",
                "raw_value": normalize_number(land.value),
                "normalized_value": "",
                "display_value": f"{land.value:,.2f} sq km land area ({land.year})",
                "unit_label": "sq km",
                "ranking_mode": "pressure_proxy",
                "rank_value": normalize_number(land.value),
                "reference_period": str(land.year),
                "reference_period_semantics": "Latest positive country observation returned by World Bank indicator AG.LND.TOTL.K2.",
                "source_vintage": f"World Bank WDI AG.LND.TOTL.K2; observation year {land.year}; retrieved {fetched_at[:10]}",
                "method_id": "method.land_area_proxy",
                "method_version": "v1-source-row-world-bank-land-area",
                "transform_version": TRANSFORM_VERSION,
                "source_ids": "world-bank-wdi-api",
                "source_snapshot_ids": land_snapshot_id,
                "license_id": "world-bank-terms",
                "attribution": "World Bank Group, World Development Indicators / Indicators API.",
                "uncertainty_class": "very-low",
                "caveat": "Land area is a geographic denominator and coarse wild-animal scale proxy, not a direct estimate of animal abundance, pain, or welfare.",
                "coverage_status": "candidate_source_backed_manual_review",
                "coverage_reason": "Numeric source row and checksum receipt captured; manual method and UX review remain required.",
                "missing_inputs": "manual method review; manual UX review; remaining canonical source groups",
                "promotion_decision": "manual_review_required_not_promoted",
            }
        )

    payload["generated_at"] = fetched_at
    payload["warning"] = (
        "Twenty-four source-backed candidate rows are populated for eight countries. "
        "They remain non-canonical and require manual source, license, method, and UX review before release promotion."
    )
    payload["source_backed_candidate_summary"] = {
        "country_count": len(TARGET_ISO3),
        "measurement_count": len(TARGET_ISO3) * len(TARGET_METRICS),
        "countries": list(TARGET_ISO3),
        "metrics": list(TARGET_METRICS),
        "publication_status": "candidate_only_manual_review_required",
    }
    json_write(path, payload)
    write_csv_from_json_rows(path, CANDIDATE_DIR / "proposed-country-measurements.csv")


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        for row in rows:
            serialized = {
                key: json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else value
                for key, value in row.items()
            }
            writer.writerow(serialized)


def write_csv_from_json_rows(json_path: Path, csv_path: Path) -> None:
    payload = json_load(json_path)
    rows = payload.get("rows", [])
    if not rows:
        fail(f"Cannot write CSV for empty rows in {json_path}")
    fieldnames = list(rows[0].keys())
    for row in rows[1:]:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    write_csv(csv_path, fieldnames, rows)


def update_promotion_decisions(fetched_at: str) -> None:
    path = CANDIDATE_DIR / "country-promotion-decisions.json"
    payload = json_load(path)
    for row in payload.get("rows", []):
        if row.get("iso3") not in TARGET_ISO3:
            continue
        row.update(
            {
                "current_status": "boundary_index_only_in_active_release",
                "candidate_status": "source_backed_partial_manual_review",
                "promote_to_canonical": False,
                "blocking_reasons": [
                    "candidate rows require manual source and method review",
                    "OWID original-provider terms require final license review",
                    "remaining canonical country-profile source groups are incomplete",
                    "candidate package has not been promoted into the immutable release",
                ],
                "next_action": "Review the three captured source groups, complete remaining source groups, then create a new immutable release rather than mutating the current release.",
            }
        )
    payload["generated_at"] = fetched_at
    payload["source_backed_partial_country_count"] = len(TARGET_ISO3)
    json_write(path, payload)
    write_csv_from_json_rows(path, CANDIDATE_DIR / "country-promotion-decisions.csv")


def update_country_source_coverage(
    fetched_at: str,
    animal_values: dict[str, CountryValue],
    insecticide_values: dict[str, CountryValue],
    land_values: dict[str, CountryValue],
) -> None:
    path = CANDIDATE_DIR / "country-source-coverage.csv"
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)
    for row in rows:
        iso3 = row.get("iso3")
        if iso3 not in TARGET_ISO3:
            continue
        source_group = row.get("source_group")
        if source_group == "identity_boundary":
            row.update(
                {
                    "input_status": "present_in_current_place_registry",
                    "source_vintage": "PainMap 2026-05-31.atlas.2 place index",
                    "license_id": "natural-earth-public-domain",
                    "notes": "Country ISO3 mapped to an indexed PainMap country boundary; candidate place_id remains candidate scoped.",
                }
            )
        elif source_group == "wdi_population_land_agriculture":
            value = land_values[iso3]
            row.update(
                {
                    "input_status": "partial_present_land_area_snapshot_captured",
                    "source_vintage": f"AG.LND.TOTL.K2 observation {value.year}; retrieved {fetched_at[:10]}",
                    "license_id": "world-bank-terms",
                    "notes": "Land-area input captured and QAed; population and agricultural-land inputs remain pending.",
                }
            )
        elif source_group == "owid_land_animals_slaughtered":
            value = animal_values[iso3]
            row.update(
                {
                    "input_status": "present_source_snapshot_captured_manual_review",
                    "source_vintage": f"latest positive observation {value.year}; retrieved {fetched_at[:10]}",
                    "license_id": "owid-cc-by-third-party-terms",
                    "notes": "Numeric source row captured; original-provider license and method review remain required.",
                }
            )
        elif source_group == "owid_insecticide_use":
            value = insecticide_values[iso3]
            row.update(
                {
                    "input_status": "present_source_snapshot_captured_manual_review",
                    "source_vintage": f"latest positive observation {value.year}; retrieved {fetched_at[:10]}",
                    "license_id": "owid-cc-by-third-party-terms",
                    "notes": "Numeric source row captured; original-provider license and proxy-method review remain required.",
                }
            )
    write_csv(path, fieldnames, rows)


def update_country_gap_ledger(fetched_at: str) -> None:
    json_path = CANDIDATE_DIR / "country-gap-ledger.json"
    payload = json_load(json_path)
    for row in payload.get("rows", []):
        if row.get("iso3") not in TARGET_ISO3:
            continue
        row.update(
            {
                "painmap_place_id_status": "mapped_to_current_place_registry",
                "current_coverage_status": "boundary_index_only",
                "current_visible_country_fields_layers": "factory-farmed-animals; insects-insecticide-proxy; wild-animal-land-proxy-denominator (candidate only)",
                "missing_required_inputs": "remaining aquatic-animal sources; population/agricultural-land context; welfare-range source review; manual license/method/UX review",
                "proposed_promotion_status_after_research": "source_backed_partial_candidate__not_promoted",
                "reason_if_still_not_promotable": "Three source groups now have numeric rows and checksum receipts, but the canonical country-profile gate and manual release review are incomplete.",
            }
        )
    payload["generated_at"] = fetched_at
    payload["source_backed_partial_country_count"] = len(TARGET_ISO3)
    json_write(json_path, payload)
    write_csv_from_json_rows(json_path, CANDIDATE_DIR / "country-gap-ledger.csv")


def update_source_registry(
    fetched_at: str,
    latest_animals: int,
    latest_insecticide: int,
    latest_land: int,
    human_context_coverage: dict[str, Any],
) -> None:
    path = CANDIDATE_DIR / "source-registry-additions.json"
    payload = json_load(path)
    updates = {
        "owid-land-animals-slaughtered": {
            "source_vintage": f"latest target-country observations through {latest_animals}; captured {fetched_at[:10]}",
            "last_review_date": fetched_at[:10],
            "redistribution_note": "Compact selected-row extract and upstream payload checksum captured. Final release still requires original FAO/OWID provider-terms review.",
        },
        "owid-insecticide-use": {
            "source_vintage": f"latest target-country observations through {latest_insecticide}; captured {fetched_at[:10]}",
            "last_review_date": fetched_at[:10],
            "redistribution_note": "Compact selected-row extract and upstream payload checksum captured. Final release still requires original FAO/OWID provider-terms review.",
        },
        "world-bank-wdi-api": {
            "source_vintage": f"AG.LND.TOTL.K2 latest target-country observations through {latest_land}; captured {fetched_at[:10]}",
            "last_review_date": fetched_at[:10],
            "redistribution_note": "Compact selected-row extract and API payload checksum captured under the existing World Bank terms reference.",
        },
    }
    for row in payload.get("rows", []):
        source_id = row.get("source_id")
        if source_id in updates:
            row.update(updates[source_id])
    public_source_row = {
        "source_id": PUBLIC_CONTEXT_SOURCE_ID,
        "label": "WHO mortality indicators via World Bank Indicators API",
        "publisher": "World Bank / World Health Organization",
        "evidence_kind": "authoritative_international_dataset_proxy_context",
        "upstream_url": "https://api.worldbank.org/v2/country/all/indicator/{indicator}",
        "source_vintage": f"latest common country year where available; captured {fetched_at[:10]}",
        "license_id": PUBLIC_CONTEXT_LICENSE_ID,
        "attribution": "World Health Organization, via World Bank Indicators API",
        "review_cadence": "annual",
        "last_review_date": fetched_at[:10],
        "next_review_due": f"{int(fetched_at[:4]) + 1}{fetched_at[4:10]}",
        "redistribution_note": "Indicator pages identify the dataset license as CC BY 4.0. Preserve WHO and World Bank attribution and the indicator-level source links.",
        "notes": (
            f"Public non-canonical context supplement with {human_context_coverage['observation_count']} observations across "
            f"{human_context_coverage['countries_with_any_observation']} PainMap-indexed countries. Mortality is not a direct pain measure."
        ),
    }
    existing_public = next((row for row in payload.get("rows", []) if row.get("source_id") == PUBLIC_CONTEXT_SOURCE_ID), None)
    if existing_public is None:
        payload.setdefault("rows", []).append(public_source_row)
    else:
        existing_public.update(public_source_row)
    payload["generated_at"] = fetched_at
    json_write(path, payload)
    write_csv_from_json_rows(path, CANDIDATE_DIR / "source-registry-additions.csv")


def update_license_registry(fetched_at: str) -> None:
    path = CANDIDATE_DIR / "license-registry-additions.json"
    payload = json_load(path)
    license_row = {
        "license_id": PUBLIC_CONTEXT_LICENSE_ID,
        "label": "Creative Commons Attribution 4.0 International",
        "license_uri": PUBLIC_CONTEXT_LICENSE_URI,
        "redistribution_status": "permitted_with_attribution",
        "notes": "Applies to the selected World Bank indicator pages used by the WHO mortality-context supplement; preserve source-level attribution.",
    }
    existing = next((row for row in payload.get("rows", []) if row.get("license_id") == PUBLIC_CONTEXT_LICENSE_ID), None)
    if existing is None:
        payload.setdefault("rows", []).append(license_row)
    else:
        existing.update(license_row)
    payload["generated_at"] = fetched_at
    json_write(path, payload)
    write_csv_from_json_rows(path, CANDIDATE_DIR / "license-registry-additions.csv")


def update_method_notes(fetched_at: str) -> None:
    path = CANDIDATE_DIR / "assumptions-method-notes.json"
    payload = json_load(path)
    payload["generated_at"] = fetched_at
    payload["status"] = "release_candidate_partial_source_backed_rows_not_published"
    payload["source_backed_candidate_summary"] = {
        "countries": list(TARGET_ISO3),
        "metrics": list(TARGET_METRICS),
        "measurement_count": len(TARGET_ISO3) * len(TARGET_METRICS),
        "promotion_status": "manual_review_required_not_promoted",
    }
    json_write(path, payload)

    md = f"""# PainMap country candidate method notes

Generated: {fetched_at}

This package now contains **24 source-backed candidate rows** across **8 countries**: {', '.join(TARGET_ISO3)}.

The populated contracts are:

- `animals_slaughtered_proxy`: latest positive OWID/FAO land-animal slaughter row, summed across the chart's reported species columns when no total column is supplied.
- `insecticide_tonnes_proxy`: latest positive OWID/FAO agricultural insecticide-use row in tonnes.
- `land_area_proxy`: latest positive World Bank `AG.LND.TOTL.K2` land-area row in square kilometres.

These are context proxies, not direct pain measurements. Country reference years may differ. No row is promoted to the active immutable release, and all eight countries remain subject to manual source, license, method, comparability, and UX review.

## Promotion gate

1. Confirm the original provider terms recorded through OWID metadata and attribution.
2. Review aggregation semantics for land-animal species columns.
3. Confirm proxy labels and comparison warnings in the UI.
4. Complete the remaining canonical country-profile source groups.
5. Publish only through a new immutable PainMap release.
"""
    (CANDIDATE_DIR / "assumptions-method-notes.md").write_text(md, encoding="utf-8")


def update_reports(fetched_at: str, snapshot_ids: list[str], human_context_coverage: dict[str, Any]) -> None:
    summary = {
        "release_candidate_id": RELEASE_CANDIDATE_ID,
        "generated_at": fetched_at,
        "country_count": len(TARGET_ISO3),
        "measurement_count": len(TARGET_ISO3) * len(TARGET_METRICS),
        "countries": list(TARGET_ISO3),
        "metrics": list(TARGET_METRICS),
        "source_snapshot_ids": snapshot_ids,
        "active_release_modified": False,
        "promoted_to_canonical": 0,
        "publication_status": "candidate_only_manual_review_required",
        "public_context_dataset": {
            "dataset_id": PUBLIC_CONTEXT_DATASET_ID,
            "canonical_release": False,
            "json_path": PUBLIC_CONTEXT_JSON.relative_to(ROOT).as_posix(),
            "csv_path": PUBLIC_CONTEXT_CSV.relative_to(ROOT).as_posix(),
            "schema_path": PUBLIC_CONTEXT_SCHEMA.relative_to(ROOT).as_posix(),
            **human_context_coverage,
        },
    }
    json_write(CANDIDATE_DIR / "source-backed-country-summary.json", summary)

    release_summary_path = CANDIDATE_DIR / "release-coverage-summary.json"
    release_summary = json_load(release_summary_path)
    release_summary.update(
        {
            "generated_at": fetched_at,
            "promoted_to_canonical_in_this_package": 0,
            "left_partial_or_candidate": len(TARGET_ISO3),
            "left_boundary_only_no_data_unknown": release_summary.get("total_country_or_territory_rows", 249) - len(TARGET_ISO3),
            "blocked_by_missing_source_snapshot_or_unfetched_values": release_summary.get("total_country_or_territory_rows", 249) - len(TARGET_ISO3),
            "source_backed_partial_candidate_countries": list(TARGET_ISO3),
            "source_backed_measurement_rows": len(TARGET_ISO3) * len(TARGET_METRICS),
            "captured_source_snapshot_count": len(snapshot_ids),
            "ready_for_publication": False,
            "reason_not_ready": "Eight countries now have three captured source groups, but manual license/method/UX review and remaining canonical source groups are incomplete.",
        }
    )
    observations = release_summary.setdefault("current_live_site_static_observations", {})
    observations["machine_artifacts_fetched"] = "yes; repository release artifacts reconciled with the current place index"
    json_write(release_summary_path, release_summary)

    readme = f"""# PainMap country data addition package

Generated: {fetched_at}

This remains a conservative release-candidate package, not a publishable data release.

It now includes 24 source-backed candidate measurements for {len(TARGET_ISO3)} boundary-indexed countries ({', '.join(TARGET_ISO3)}), plus compact source extracts and upstream payload checksums. The populated metrics are land-animal slaughter counts, agricultural insecticide use, and land area.

The site also exposes a separate non-canonical human mortality-linked context dataset with {human_context_coverage['observation_count']} observations across {human_context_coverage['countries_with_any_observation']} PainMap-indexed countries. It ranks only within the selected deaths-per-100,000 family.

Start with `source-backed-country-summary.json`, `final-report.md`, `source-extracts/`, `country-promotion-decisions.json`, and `codex-pr-checklist.md`. No candidate row is canonical, and the active immutable release is unchanged.
"""
    (CANDIDATE_DIR / "README.md").write_text(readme, encoding="utf-8")

    report = f"""# PainMap source-backed country data supplement

Generated: {fetched_at}

## Added data

- 8 countries: {', '.join(TARGET_ISO3)}.
- 24 populated candidate rows across land-animal slaughter, insecticide-use, and land-area contracts.
- 4 captured source receipts with upstream URLs, retrieval timestamps, payload checksums, byte counts, and committed compact extracts.
- A separate public WHO/World Bank mortality-linked context export with {human_context_coverage['observation_count']} observations across {human_context_coverage['countries_with_any_observation']} PainMap-indexed countries.
- Current PainMap ISO3 mappings reconciled against `v1/places/index.json`.

## Publication decision

**No country was promoted.** All rows remain candidate scoped. The active `2026-05-31.atlas.2` release and canonical `data/place-measurements.json` are unchanged.

## Remaining blockers

- Final review of the original FAO/OWID provider terms and attribution.
- Manual review of species aggregation, proxy semantics, country-year comparability, and UI caveats.
- Completion of remaining canonical source groups, especially aquatic-animal inputs and population/agricultural-land context.
- A new immutable release build and release note if promotion is approved.

## Required UI caveats

1. “This country card is a context proxy, not a direct measurement of total pain.”
2. “Country reference years may differ; compare only rows with the same metric, unit, method version, and reference-period semantics.”
3. “Insecticide tonnage is not a count of insects harmed, and land area is not a census of wild animals.”
4. “Candidate data is excluded from default rankings until release review and promotion.”
"""
    (CANDIDATE_DIR / "final-report.md").write_text(report, encoding="utf-8")

    release_notes = f"""# Draft release note: source-backed country candidate data

Generated: {fetched_at}

PainMap now stages 24 source-backed animal/geographic candidate measurements for {len(TARGET_ISO3)} countries. The rows cover land-animal slaughter counts, agricultural insecticide use, and land area. They include compact extracts, retrieval metadata, and upstream payload checksums.

A separate public context export adds {human_context_coverage['observation_count']} WHO/World Bank mortality-rate observations across {human_context_coverage['countries_with_any_observation']} PainMap-indexed countries. Its within-place ranks compare only the selected deaths-per-100,000 indicators; they are not total-pain rankings and are not combined with animal proxies.

This is **not a canonical data release**. Candidate animal rows remain excluded from canonical measurements, API profiles, default rankings, and snapshot-mode country cards until manual review and a new immutable release are completed.
"""
    (CANDIDATE_DIR / "release-notes-draft.md").write_text(release_notes, encoding="utf-8")

    checklist = """# PR checklist: source-backed country candidate supplement

- [x] Reconcile target ISO3 identifiers with the current PainMap place registry.
- [x] Capture source payload receipts with retrieval timestamps, checksums, and byte sizes.
- [x] Commit compact selected-row extracts for the populated metrics.
- [x] Populate only verified numeric source rows; leave all other stubs unchanged.
- [x] Keep every candidate country non-canonical and excluded from active-release rankings.
- [x] Add an offline validation command for candidate rows, extracts, decisions, package hashes, and the public context export.
- [x] Preserve CC BY 4.0 license and WHO/World Bank attribution for the public mortality-context rows.
- [ ] Complete original-provider license review for OWID/FAO-backed rows.
- [ ] Review land-animal aggregation, proxy semantics, and country-year comparability.
- [ ] Complete remaining canonical source groups.
- [ ] Approve UX caveats and publish through a new immutable release.
"""
    (CANDIDATE_DIR / "codex-pr-checklist.md").write_text(checklist, encoding="utf-8")


def update_package_manifest(fetched_at: str) -> None:
    path = CANDIDATE_DIR / "package-manifest.json"
    payload = json_load(path)
    existing_names = [str(row.get("file") or "") for row in payload.get("files", []) if row.get("file")]
    new_names = [
        "source-backed-country-summary.json",
        "source-extracts/owid-land-animals-slaughtered.json",
        "source-extracts/owid-insecticide-use.json",
        "source-extracts/world-bank-land-area.json",
        "source-extracts/world-bank-who-mortality-context.json",
    ]
    names = sorted(set(existing_names + new_names))
    files = []
    for name in names:
        file_path = CANDIDATE_DIR / name
        if not file_path.is_file():
            fail(f"Candidate manifest input is missing: {file_path}")
        files.append({"file": name, "sha256": sha256_path(file_path), "bytes": file_path.stat().st_size})
    payload["generated_at"] = fetched_at
    payload["files"] = files
    json_write(path, payload)


def public_context_schema() -> dict[str, Any]:
    observation_required = [
        "observation_id",
        "place_id",
        "iso3",
        "place_name",
        "indicator_id",
        "indicator_code",
        "indicator_name",
        "raw_value",
        "unit_label",
        "reference_year",
        "within_place_rank",
        "comparison_basis",
        "source_id",
        "source_snapshot_id",
        "extraction_timestamp",
        "license_id",
        "data_license_uri",
        "evidence_kind",
        "uncertainty_class",
        "caveat",
    ]
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://painmap.org/schemas/pain-driver-context.schema.json",
        "title": "PainMap human mortality-linked context",
        "description": "A non-canonical context dataset. Ranks are only within a compatible human mortality-rate family and are not total-pain scores.",
        "type": "object",
        "required": [
            "dataset_id",
            "generated_at",
            "canonical_release",
            "comparison_rules",
            "sources",
            "coverage",
            "place_summaries",
            "observations",
        ],
        "properties": {
            "dataset_id": {"const": PUBLIC_CONTEXT_DATASET_ID},
            "generated_at": {"type": "string"},
            "canonical_release": {"const": False},
            "comparison_rules": {"type": "array", "minItems": 3, "items": {"type": "string"}},
            "sources": {"type": "array", "minItems": len(PUBLIC_CONTEXT_INDICATORS), "items": {"type": "object"}},
            "coverage": {"type": "object"},
            "place_summaries": {"type": "array", "items": {"type": "object"}},
            "observations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": observation_required,
                    "properties": {
                        "raw_value": {"type": "number", "minimum": 0},
                        "unit_label": {"const": PUBLIC_CONTEXT_UNIT},
                        "within_place_rank": {"type": "integer", "minimum": 1},
                        "evidence_kind": {"const": "proxy"},
                        "source_id": {"const": PUBLIC_CONTEXT_SOURCE_ID},
                        "license_id": {"const": PUBLIC_CONTEXT_LICENSE_ID},
                    },
                },
            },
        },
    }


def dense_rank(values: list[tuple[str, CountryValue]]) -> dict[str, int]:
    ranks: dict[str, int] = {}
    last_value: float | None = None
    current_rank = 0
    for index, (indicator_id, record) in enumerate(values, start=1):
        if last_value is None or abs(record.value - last_value) > 1e-12:
            current_rank = index
            last_value = record.value
        ranks[indicator_id] = current_rank
    return ranks


def write_public_context(
    *,
    fetched_at: str,
    place_registry: dict[str, dict[str, Any]],
    downloads_by_indicator: dict[str, Download],
    source_snapshot_id: str,
) -> tuple[dict[str, Any], Path]:
    valid_iso3 = set(place_registry)
    indicator_by_id = {row["indicator_id"]: row for row in PUBLIC_CONTEXT_INDICATORS}
    series_by_indicator: dict[str, dict[str, dict[int, CountryValue]]] = {}
    for indicator in PUBLIC_CONTEXT_INDICATORS:
        indicator_id = indicator["indicator_id"]
        series_by_indicator[indicator_id] = world_bank_indicator_series(
            downloads_by_indicator[indicator_id],
            valid_iso3,
            indicator["indicator_code"],
        )

    observations: list[dict[str, Any]] = []
    place_summaries: list[dict[str, Any]] = []
    missing_by_indicator = {indicator_id: 0 for indicator_id in indicator_by_id}
    coverage_by_indicator = {indicator_id: 0 for indicator_id in indicator_by_id}
    year_values_by_indicator: dict[str, list[int]] = {indicator_id: [] for indicator_id in indicator_by_id}

    for iso3, place in sorted(place_registry.items(), key=lambda item: (str(item[1].get("place_name") or item[0]), item[0])):
        per_indicator_series = {
            indicator_id: series_by_indicator[indicator_id].get(iso3, {})
            for indicator_id in indicator_by_id
        }
        present_series = {key: value for key, value in per_indicator_series.items() if value}
        if not present_series:
            for indicator_id in indicator_by_id:
                missing_by_indicator[indicator_id] += 1
            continue

        common_years: set[int] = set()
        if len(present_series) == len(indicator_by_id):
            year_sets = [set(values) for values in present_series.values()]
            common_years = set.intersection(*year_sets) if year_sets else set()

        selected: dict[str, CountryValue] = {}
        if common_years:
            selected_year = max(common_years)
            comparison_basis = "latest_common_year"
            for indicator_id, values in present_series.items():
                selected[indicator_id] = values[selected_year]
        else:
            selected_year = None
            comparison_basis = "latest_available_mixed_years"
            for indicator_id, values in present_series.items():
                latest_year = max(values)
                selected[indicator_id] = values[latest_year]

        ranked = sorted(selected.items(), key=lambda item: (-item[1].value, item[0]))
        ranks = dense_rank(ranked)
        top_indicator_id, top_record = ranked[0]
        source_years = sorted({record.year for record in selected.values()})
        missing_indicator_ids = [indicator_id for indicator_id in indicator_by_id if indicator_id not in selected]
        place_name = str(place.get("place_name") or top_record.country_name or iso3)

        place_summaries.append(
            {
                "place_id": str(place.get("place_id") or iso3),
                "iso3": iso3,
                "place_name": place_name,
                "observation_count": len(selected),
                "indicator_count_expected": len(indicator_by_id),
                "comparison_basis": comparison_basis,
                "common_reference_year": selected_year,
                "source_years": source_years,
                "missing_indicator_ids": missing_indicator_ids,
                "top_indicator_id": top_indicator_id,
                "top_indicator_name": indicator_by_id[top_indicator_id]["indicator_name"],
                "top_rate_per_100k": normalize_number(top_record.value),
                "top_rank_scope": "Highest rate among the selected mortality-linked indicators only; not a total-pain ranking.",
            }
        )

        for indicator_id, record in ranked:
            indicator = indicator_by_id[indicator_id]
            coverage_by_indicator[indicator_id] += 1
            year_values_by_indicator[indicator_id].append(record.year)
            observations.append(
                {
                    "observation_id": f"{PUBLIC_CONTEXT_DATASET_ID}:{iso3}:{indicator_id}:{record.year}",
                    "place_id": str(place.get("place_id") or iso3),
                    "iso3": iso3,
                    "place_name": place_name,
                    "geometry_level": "country",
                    "indicator_id": indicator_id,
                    "indicator_code": indicator["indicator_code"],
                    "indicator_name": indicator["indicator_name"],
                    "indicator_definition": indicator["definition"],
                    "context_family": "human_mortality_linked_context",
                    "evidence_kind": "proxy",
                    "value_type": "rate",
                    "raw_value": normalize_number(record.value),
                    "unit_label": PUBLIC_CONTEXT_UNIT,
                    "reference_year": record.year,
                    "within_place_rank": ranks[indicator_id],
                    "rank_direction": "higher_rate_ranks_first",
                    "comparison_basis": comparison_basis,
                    "comparison_scope": "selected_human_mortality_rate_indicators_only",
                    "source_id": PUBLIC_CONTEXT_SOURCE_ID,
                    "source_snapshot_id": source_snapshot_id,
                    "source_indicator_page": indicator["source_page"],
                    "source_api_url": downloads_by_indicator[indicator_id].url,
                    "source_vintage": f"World Health Organization estimate via World Bank Indicators API; observation year {record.year}",
                    "extraction_timestamp": fetched_at,
                    "method_id": "method.human_mortality_linked_context",
                    "method_version": "v1-latest-common-year-else-latest-available",
                    "transform_version": TRANSFORM_VERSION,
                    "license_id": PUBLIC_CONTEXT_LICENSE_ID,
                    "data_license_uri": PUBLIC_CONTEXT_LICENSE_URI,
                    "attribution": "World Health Organization, via World Bank Indicators API.",
                    "uncertainty_class": "low",
                    "caveat": "Mortality is a severe-outcome context proxy. It does not measure pain intensity, duration, prevalence, disability, non-fatal suffering, or total welfare burden.",
                }
            )

        for indicator_id in missing_indicator_ids:
            missing_by_indicator[indicator_id] += 1

    observations.sort(key=lambda row: (row["place_name"], row["within_place_rank"], row["indicator_id"]))
    place_summaries.sort(key=lambda row: (row["place_name"], row["iso3"]))
    countries_with_all = sum(1 for row in place_summaries if row["observation_count"] == len(indicator_by_id))
    countries_with_common_year = sum(1 for row in place_summaries if row["comparison_basis"] == "latest_common_year")

    sources = []
    for indicator in PUBLIC_CONTEXT_INDICATORS:
        indicator_id = indicator["indicator_id"]
        years = year_values_by_indicator[indicator_id]
        download = downloads_by_indicator[indicator_id]
        sources.append(
            {
                **indicator,
                "publisher": "World Bank",
                "data_provider": "World Health Organization",
                "unit_label": PUBLIC_CONTEXT_UNIT,
                "api_url": download.url,
                "retrieval_timestamp": fetched_at,
                "payload_sha256": download.sha256,
                "payload_byte_size": download.size,
                "observed_country_count": coverage_by_indicator[indicator_id],
                "reference_year_min": min(years) if years else None,
                "reference_year_max": max(years) if years else None,
                "license_id": PUBLIC_CONTEXT_LICENSE_ID,
                "data_license_uri": PUBLIC_CONTEXT_LICENSE_URI,
            }
        )

    dataset = {
        "$schema": "https://painmap.org/schemas/pain-driver-context.schema.json",
        "dataset_id": PUBLIC_CONTEXT_DATASET_ID,
        "title": "Human mortality-linked pain-driver context",
        "description": "Country context for selected severe human outcomes plausibly associated with pain and suffering. This is not a direct pain measurement and is not a universal ranking.",
        "generated_at": fetched_at,
        "canonical_release": False,
        "release_mode": "current_public_context_supplement",
        "source_snapshot_id": source_snapshot_id,
        "comparison_rules": [
            "Compare values only within this human mortality-rate family; all included observations use deaths per 100,000 population.",
            "Within-place ranks identify the highest rate among the selected indicators only. They do not identify the largest cause of all pain or suffering.",
            "A latest common reference year is used when all selected indicators overlap for a country; otherwise each indicator uses its latest available year and the row is labeled mixed-year.",
            "Do not compare or aggregate these rates with animal counts, insecticide tonnage, land area, pain-duration estimates, or welfare weights.",
        ],
        "license": {
            "license_id": PUBLIC_CONTEXT_LICENSE_ID,
            "license_uri": PUBLIC_CONTEXT_LICENSE_URI,
            "attribution": "World Health Organization, via World Bank Indicators API.",
        },
        "sources": sources,
        "coverage": {
            "painmap_indexed_country_count": len(place_registry),
            "countries_with_any_observation": len(place_summaries),
            "countries_with_all_indicators": countries_with_all,
            "countries_ranked_at_latest_common_year": countries_with_common_year,
            "countries_using_mixed_latest_years": len(place_summaries) - countries_with_common_year,
            "observation_count": len(observations),
            "indicator_count": len(PUBLIC_CONTEXT_INDICATORS),
            "coverage_by_indicator": coverage_by_indicator,
            "missing_country_count_by_indicator": missing_by_indicator,
        },
        "place_summaries": place_summaries,
        "observations": observations,
    }
    json_write(PUBLIC_CONTEXT_SCHEMA, public_context_schema())
    json_write(PUBLIC_CONTEXT_JSON, dataset)
    csv_fields = [
        "observation_id",
        "place_id",
        "iso3",
        "place_name",
        "indicator_id",
        "indicator_code",
        "indicator_name",
        "raw_value",
        "unit_label",
        "reference_year",
        "within_place_rank",
        "comparison_basis",
        "source_id",
        "source_snapshot_id",
        "source_vintage",
        "extraction_timestamp",
        "license_id",
        "data_license_uri",
        "uncertainty_class",
        "caveat",
    ]
    write_csv(PUBLIC_CONTEXT_CSV, csv_fields, observations)

    extract = {
        "generated_at": fetched_at,
        "release_candidate_id": RELEASE_CANDIDATE_ID,
        "source_id": PUBLIC_CONTEXT_SOURCE_ID,
        "selection_rule": "PainMap-indexed country rows; latest common year across the four indicators when available, otherwise latest non-null observation per indicator.",
        "source_payloads": [source_payload_receipt(downloads_by_indicator[row["indicator_id"]]) for row in PUBLIC_CONTEXT_INDICATORS],
        "source_payload_composite_sha256": composite_checksum([downloads_by_indicator[row["indicator_id"]] for row in PUBLIC_CONTEXT_INDICATORS]),
        "source_payload_total_bytes": sum(download.size for download in downloads_by_indicator.values()),
        "coverage": dataset["coverage"],
        "rows": [
            {
                "iso3": row["iso3"],
                "country_name": row["place_name"],
                "indicator_id": row["indicator_id"],
                "indicator_code": row["indicator_code"],
                "reference_year": row["reference_year"],
                "raw_value": row["raw_value"],
                "unit_label": row["unit_label"],
            }
            for row in observations
        ],
    }
    extract_path = EXTRACT_DIR / "world-bank-who-mortality-context.json"
    json_write(extract_path, extract)
    return dataset["coverage"], extract_path


def update_data_page(fetched_at: str) -> None:
    path = ROOT / "data" / "index.html"
    html = path.read_text(encoding="utf-8")
    if "https://painmap.org/data/pain-driver-context.json" not in html:
        marker = '          { "@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": "https://painmap.org/releases/2026-05-31/diff.json" }'
        replacement = (
            '          { "@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": "https://painmap.org/data/pain-driver-context.json" },\n'
            '          { "@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": "https://painmap.org/data/pain-driver-context.csv" },\n'
            + marker
        )
        if marker not in html:
            fail("Could not locate data-page JSON-LD distribution insertion point")
        html = html.replace(marker, replacement, 1)

    if 'href="/data/pain-driver-context.json"' not in html:
        marker = '''                <tr>
                  <th scope="row"><a href="/v1/adm1/index.json">ADM1 poverty-context overlay</a></th>'''
        new_row = f'''                <tr>
                  <th scope="row"><a href="/data/pain-driver-context.json">Human mortality-linked context</a></th>
                  <td>Proxy context; within-family ranking only</td>
                  <td>WHO estimates via World Bank API; refreshed {fetched_at[:10]}</td>
                  <td>Low confidence for pain inference; mortality does not measure pain intensity or duration</td>
                  <td><a href="/data/pain-driver-context.json">JSON</a>, <a href="/data/pain-driver-context.csv">CSV</a>, <a href="/schemas/pain-driver-context.schema.json">schema</a></td>
                </tr>
{marker}'''
        if marker not in html:
            fail("Could not locate data-page export table insertion point")
        html = html.replace(marker, new_row, 1)
    path.write_text(html, encoding="utf-8")


def update_root_readme() -> None:
    path = ROOT / "README.md"
    text = path.read_text(encoding="utf-8")
    bullet = "- Human mortality-linked context supplement: `data/pain-driver-context.json`, `data/pain-driver-context.csv`, `schemas/pain-driver-context.schema.json`"
    if bullet not in text:
        marker = "- Canonical measurements: `data/place-measurements.json`"
        if marker not in text:
            fail("Could not locate README data-contract insertion point")
        text = text.replace(marker, marker + "\n" + bullet, 1)
    note = (
        "The human mortality-linked context supplement ranks only within a compatible deaths-per-100,000 family. "
        "It is explicitly non-canonical and must not be aggregated with animal-scale proxies or interpreted as a total-pain score."
    )
    if note not in text:
        marker = "`npm run candidate:data:check` validates the staged source-backed country supplement offline, including selected-row extracts, source receipts, non-promotion decisions, and package hashes. `npm run candidate:data:refresh` performs the reviewed network-retrieval step."
        if marker in text:
            text = text.replace(marker, marker + "\n\n" + note, 1)
    path.write_text(text, encoding="utf-8")


def refresh() -> None:
    fetched_at = utc_now()
    place_registry = current_place_registry()
    valid_iso3 = set(place_registry)

    animals_csv = fetch(OWID_ANIMALS_CSV)
    animals_metadata_download = fetch(OWID_ANIMALS_METADATA)
    insecticide_csv = fetch(OWID_INSECTICIDE_CSV)
    insecticide_metadata_download = fetch(OWID_INSECTICIDE_METADATA)
    land_area_download = fetch(WORLD_BANK_LAND_AREA)
    human_context_downloads = {
        indicator["indicator_id"]: fetch(world_bank_indicator_url(indicator["indicator_code"]))
        for indicator in PUBLIC_CONTEXT_INDICATORS
    }

    animal_values = latest_owid_animals(animals_csv, valid_iso3)
    insecticide_values = latest_owid_insecticide(insecticide_csv, valid_iso3)
    land_values = latest_world_bank_land_area(land_area_download, valid_iso3)
    ensure_targets(animal_values, "OWID land-animal slaughter source")
    ensure_targets(insecticide_values, "OWID insecticide source")
    ensure_targets(land_values, "World Bank land-area source")

    animal_extract_path, _ = write_extract(
        "owid-land-animals-slaughtered.json",
        source_id="owid-land-animals-slaughtered",
        fetched_at=fetched_at,
        downloads=[animals_csv, animals_metadata_download],
        values=animal_values,
        selection_rule="Latest positive observation per PainMap ISO3; use a supplied total column when present, otherwise sum all reported numeric species columns in the chart row.",
        metadata=metadata_summary(animals_metadata_download),
    )
    insecticide_extract_path, _ = write_extract(
        "owid-insecticide-use.json",
        source_id="owid-insecticide-use",
        fetched_at=fetched_at,
        downloads=[insecticide_csv, insecticide_metadata_download],
        values=insecticide_values,
        selection_rule="Latest positive agricultural insecticide-use observation in tonnes per PainMap ISO3.",
        metadata=metadata_summary(insecticide_metadata_download),
    )
    land_extract_path, _ = write_extract(
        "world-bank-land-area.json",
        source_id="world-bank-wdi-api",
        fetched_at=fetched_at,
        downloads=[land_area_download],
        values=land_values,
        selection_rule="Latest positive AG.LND.TOTL.K2 observation returned by the World Bank API per PainMap ISO3.",
    )

    animal_snapshot_id = f"snapshot.owid-land-animals-slaughtered.{fetched_at[:10]}"
    insecticide_snapshot_id = f"snapshot.owid-insecticide-use.{fetched_at[:10]}"
    land_snapshot_id = f"snapshot.world-bank-wdi-land-area.{fetched_at[:10]}"
    human_context_snapshot_id = f"snapshot.world-bank-who-mortality-context.{fetched_at[:10]}"
    human_context_coverage, human_context_extract_path = write_public_context(
        fetched_at=fetched_at,
        place_registry=place_registry,
        downloads_by_indicator=human_context_downloads,
        source_snapshot_id=human_context_snapshot_id,
    )
    update_data_page(fetched_at)
    update_root_readme()

    snapshots_path = CANDIDATE_DIR / "source-snapshots.json"
    snapshots = json_load(snapshots_path)
    replace_snapshot(
        snapshots,
        "owid-land-animals-slaughtered",
        snapshot_row(
            source_snapshot_id=animal_snapshot_id,
            source_id="owid-land-animals-slaughtered",
            upstream_url=OWID_ANIMALS_CSV,
            fetched_at=fetched_at,
            reference_period=f"latest positive target-country observations through {max(value.year for value in animal_values.values())}",
            downloads=[animals_csv, animals_metadata_download],
            license_id="owid-cc-by-third-party-terms",
            attribution="Food and Agriculture Organization of the United Nations, processed by Our World in Data",
            notes="Country land-animal slaughter scale proxy; compact selected-row extract committed, full upstream CSV and metadata recorded by checksum.",
            extract_path=animal_extract_path,
        ),
    )
    replace_snapshot(
        snapshots,
        "owid-insecticide-use",
        snapshot_row(
            source_snapshot_id=insecticide_snapshot_id,
            source_id="owid-insecticide-use",
            upstream_url=OWID_INSECTICIDE_CSV,
            fetched_at=fetched_at,
            reference_period=f"latest positive target-country observations through {max(value.year for value in insecticide_values.values())}",
            downloads=[insecticide_csv, insecticide_metadata_download],
            license_id="owid-cc-by-third-party-terms",
            attribution="Food and Agriculture Organization of the United Nations, processed by Our World in Data",
            notes="Agricultural insecticide-use pressure proxy; compact selected-row extract committed, full upstream CSV and metadata recorded by checksum.",
            extract_path=insecticide_extract_path,
        ),
    )
    replace_snapshot(
        snapshots,
        "world-bank-wdi-api",
        snapshot_row(
            source_snapshot_id=land_snapshot_id,
            source_id="world-bank-wdi-api",
            upstream_url=WORLD_BANK_LAND_AREA,
            fetched_at=fetched_at,
            reference_period=f"AG.LND.TOTL.K2 latest positive target-country observations through {max(value.year for value in land_values.values())}",
            downloads=[land_area_download],
            license_id="world-bank-terms",
            attribution="World Bank Group, World Development Indicators / Indicators API",
            notes="Land-area denominator and coarse wild-animal context proxy; compact selected-row extract committed, full API payload recorded by checksum.",
            extract_path=land_extract_path,
        ),
    )
    human_context_download_list = [human_context_downloads[row["indicator_id"]] for row in PUBLIC_CONTEXT_INDICATORS]
    replace_snapshot(
        snapshots,
        PUBLIC_CONTEXT_SOURCE_ID,
        snapshot_row(
            source_snapshot_id=human_context_snapshot_id,
            source_id=PUBLIC_CONTEXT_SOURCE_ID,
            upstream_url="https://api.worldbank.org/v2/country/all/indicator/{indicator}",
            fetched_at=fetched_at,
            reference_period=(
                "Latest common country year when available, otherwise latest non-null observation per indicator; "
                f"{human_context_coverage['observation_count']} observations across "
                f"{human_context_coverage['countries_with_any_observation']} PainMap-indexed countries"
            ),
            downloads=human_context_download_list,
            license_id=PUBLIC_CONTEXT_LICENSE_ID,
            attribution="World Health Organization, via World Bank Indicators API",
            notes="Public non-canonical mortality-linked context dataset; ranks only within the compatible deaths-per-100,000 family.",
            extract_path=human_context_extract_path,
            redistribution_permitted="yes under CC BY 4.0 with World Health Organization and World Bank attribution",
            snapshot_storage_note="compact selected-row extract committed; full upstream API payloads referenced by checksums",
        ),
    )
    snapshots["generated_at"] = fetched_at
    snapshots["note"] = "Four source receipts captured: three bounded animal/geographic candidate inputs plus one global WHO/World Bank mortality-context family."
    json_write(snapshots_path, snapshots)

    update_candidate_measurements(
        fetched_at=fetched_at,
        animal_values=animal_values,
        insecticide_values=insecticide_values,
        land_values=land_values,
        animal_snapshot_id=animal_snapshot_id,
        insecticide_snapshot_id=insecticide_snapshot_id,
        land_snapshot_id=land_snapshot_id,
    )
    update_promotion_decisions(fetched_at)
    update_country_source_coverage(fetched_at, animal_values, insecticide_values, land_values)
    update_country_gap_ledger(fetched_at)
    update_source_registry(
        fetched_at,
        max(value.year for value in animal_values.values()),
        max(value.year for value in insecticide_values.values()),
        max(value.year for value in land_values.values()),
        human_context_coverage,
    )
    update_license_registry(fetched_at)
    update_method_notes(fetched_at)
    update_reports(
        fetched_at,
        [animal_snapshot_id, insecticide_snapshot_id, land_snapshot_id, human_context_snapshot_id],
        human_context_coverage,
    )
    update_package_manifest(fetched_at)
    check(require_no_temporary_scaffolding=False)


def extract_values(file_name: str) -> dict[str, dict[str, Any]]:
    payload = json_load(EXTRACT_DIR / file_name)
    return {str(row.get("iso3")): row for row in payload.get("rows", [])}


def check(require_no_temporary_scaffolding: bool = True) -> None:
    errors: list[str] = []

    def expect(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    place_registry = current_place_registry()
    measurements = json_load(CANDIDATE_DIR / "proposed-country-measurements.json")
    rows = measurements.get("rows", [])
    populated = [
        row
        for row in rows
        if row.get("iso3") in TARGET_ISO3 and row.get("metric_id") in TARGET_METRICS and str(row.get("raw_value", "")).strip()
    ]
    expect(len(populated) == len(TARGET_ISO3) * len(TARGET_METRICS), "Expected exactly 24 populated bounded candidate rows")

    extract_map = {
        "animals_slaughtered_proxy": extract_values("owid-land-animals-slaughtered.json"),
        "insecticide_tonnes_proxy": extract_values("owid-insecticide-use.json"),
        "land_area_proxy": extract_values("world-bank-land-area.json"),
    }
    expected_source = {
        "animals_slaughtered_proxy": "owid-land-animals-slaughtered",
        "insecticide_tonnes_proxy": "owid-insecticide-use",
        "land_area_proxy": "world-bank-wdi-api",
    }

    for iso3 in TARGET_ISO3:
        expect(iso3 in place_registry, f"{iso3} is missing from current place registry")
        for metric_id in TARGET_METRICS:
            matches = [row for row in rows if row.get("iso3") == iso3 and row.get("metric_id") == metric_id]
            expect(len(matches) == 1, f"Expected one candidate row for {iso3}/{metric_id}")
            if len(matches) != 1:
                continue
            row = matches[0]
            raw_value = finite_number(row.get("raw_value"))
            expect(raw_value is not None and raw_value > 0, f"{iso3}/{metric_id} raw_value must be positive")
            expect(row.get("release_id") == RELEASE_CANDIDATE_ID, f"{iso3}/{metric_id} must remain candidate scoped")
            expect(row.get("coverage_status") == "candidate_source_backed_manual_review", f"{iso3}/{metric_id} must remain candidate only")
            expect(row.get("promotion_decision") == "manual_review_required_not_promoted", f"{iso3}/{metric_id} must not be promoted")
            expect(bool(str(row.get("source_snapshot_ids") or "").strip()), f"{iso3}/{metric_id} missing source snapshot")
            expect(row.get("source_ids") == expected_source[metric_id], f"{iso3}/{metric_id} source_id mismatch")
            expect(bool(str(row.get("license_id") or "").strip()), f"{iso3}/{metric_id} missing license_id")
            expect(bool(str(row.get("reference_period") or "").strip()), f"{iso3}/{metric_id} missing reference period")
            extract_row = extract_map[metric_id].get(iso3)
            expect(extract_row is not None, f"{iso3}/{metric_id} missing extract row")
            if extract_row is not None and raw_value is not None:
                extract_value = finite_number(extract_row.get("raw_value"))
                expect(extract_value is not None and abs(raw_value - extract_value) < 1e-6, f"{iso3}/{metric_id} does not match committed extract")

    snapshots = json_load(CANDIDATE_DIR / "source-snapshots.json")
    snapshot_by_source = {row.get("source_id"): row for row in snapshots.get("rows", [])}
    for source_id in ("owid-land-animals-slaughtered", "owid-insecticide-use", "world-bank-wdi-api", PUBLIC_CONTEXT_SOURCE_ID):
        snapshot = snapshot_by_source.get(source_id)
        expect(snapshot is not None, f"Missing captured snapshot for {source_id}")
        if not snapshot:
            continue
        expect(str(snapshot.get("retrieval_timestamp") or "").endswith("Z"), f"{source_id} retrieval timestamp missing")
        expect(len(str(snapshot.get("checksum") or "")) == 64, f"{source_id} checksum must be sha256")
        extract_path_value = snapshot.get("extract_path")
        extract_path = ROOT / str(extract_path_value or "")
        expect(bool(extract_path_value) and extract_path.is_file(), f"{source_id} extract path missing")
        if extract_path.is_file():
            expect(sha256_path(extract_path) == snapshot.get("extract_checksum"), f"{source_id} extract checksum mismatch")
            expect(extract_path.stat().st_size == snapshot.get("extract_byte_size"), f"{source_id} extract byte count mismatch")

    decisions = json_load(CANDIDATE_DIR / "country-promotion-decisions.json")
    decision_by_iso = {row.get("iso3"): row for row in decisions.get("rows", [])}
    for iso3 in TARGET_ISO3:
        decision = decision_by_iso.get(iso3)
        expect(decision is not None, f"Missing promotion decision for {iso3}")
        if decision:
            expect(decision.get("promote_to_canonical") is False, f"{iso3} must not be promoted")
            expect(decision.get("candidate_status") == "source_backed_partial_manual_review", f"{iso3} decision status mismatch")
            expect(bool(decision.get("blocking_reasons")), f"{iso3} must retain blocking reasons")

    manifest = json_load(CANDIDATE_DIR / "package-manifest.json")
    for item in manifest.get("files", []):
        name = str(item.get("file") or "")
        file_path = CANDIDATE_DIR / name
        expect(file_path.is_file(), f"Manifest file missing: {name}")
        if file_path.is_file():
            expect(sha256_path(file_path) == item.get("sha256"), f"Manifest checksum mismatch: {name}")
            expect(file_path.stat().st_size == item.get("bytes"), f"Manifest byte count mismatch: {name}")

    public_context = json_load(PUBLIC_CONTEXT_JSON)
    public_observations = public_context.get("observations", [])
    public_summaries = public_context.get("place_summaries", [])
    public_coverage = public_context.get("coverage", {})
    expect(public_context.get("dataset_id") == PUBLIC_CONTEXT_DATASET_ID, "Public context dataset id mismatch")
    expect(public_context.get("canonical_release") is False, "Public context dataset must remain non-canonical")
    expect(len(public_observations) >= 400, "Expected broad global public context coverage (at least 400 observations)")
    expect(public_coverage.get("countries_with_any_observation", 0) >= 150, "Expected public context coverage for at least 150 countries")
    expect(public_coverage.get("observation_count") == len(public_observations), "Public context observation count mismatch")
    expect(PUBLIC_CONTEXT_CSV.is_file(), "Public context CSV is missing")
    expect(PUBLIC_CONTEXT_SCHEMA.is_file(), "Public context schema is missing")
    summary_by_iso = {row.get("iso3"): row for row in public_summaries}
    observations_by_iso: dict[str, list[dict[str, Any]]] = {}
    for row in public_observations:
        iso3 = str(row.get("iso3") or "")
        observations_by_iso.setdefault(iso3, []).append(row)
        expect(row.get("unit_label") == PUBLIC_CONTEXT_UNIT, f"{iso3} public context unit mismatch")
        expect(row.get("source_id") == PUBLIC_CONTEXT_SOURCE_ID, f"{iso3} public context source mismatch")
        expect(row.get("license_id") == PUBLIC_CONTEXT_LICENSE_ID, f"{iso3} public context license mismatch")
        expect(row.get("evidence_kind") == "proxy", f"{iso3} public context evidence kind mismatch")
        expect(finite_number(row.get("raw_value")) is not None, f"{iso3} public context raw value missing")
        expect(isinstance(row.get("within_place_rank"), int) and row.get("within_place_rank") >= 1, f"{iso3} public context rank invalid")
    for iso3, place_rows in observations_by_iso.items():
        sorted_rows = sorted(place_rows, key=lambda row: (-float(row["raw_value"]), str(row["indicator_id"])))
        expect(sorted_rows[0].get("within_place_rank") == 1, f"{iso3} highest public context rate must rank first")
        place_summary = summary_by_iso.get(iso3)
        expect(place_summary is not None, f"{iso3} public context summary missing")
        if place_summary:
            expect(place_summary.get("observation_count") == len(place_rows), f"{iso3} public context summary count mismatch")
            expect(place_summary.get("top_indicator_id") == sorted_rows[0].get("indicator_id"), f"{iso3} public context top indicator mismatch")

    public_extract = json_load(EXTRACT_DIR / "world-bank-who-mortality-context.json")
    expect(len(public_extract.get("rows", [])) == len(public_observations), "Public source extract row count mismatch")
    license_registry = json_load(CANDIDATE_DIR / "license-registry-additions.json")
    expect(
        any(row.get("license_id") == PUBLIC_CONTEXT_LICENSE_ID and row.get("redistribution_status") == "permitted_with_attribution" for row in license_registry.get("rows", [])),
        "Public context CC BY 4.0 license registry row is missing",
    )
    data_page = (ROOT / "data" / "index.html").read_text(encoding="utf-8")
    expect("/data/pain-driver-context.json" in data_page, "Public context JSON is not linked from the data page")
    expect("/schemas/pain-driver-context.schema.json" in data_page, "Public context schema is not linked from the data page")

    summary = json_load(CANDIDATE_DIR / "source-backed-country-summary.json")
    expect(summary.get("measurement_count") == 24, "Source-backed summary measurement count must be 24")
    expect(summary.get("promoted_to_canonical") == 0, "Source-backed summary must record zero promotions")
    expect(summary.get("active_release_modified") is False, "Source-backed summary must preserve active release")
    context_summary = summary.get("public_context_dataset") or {}
    expect(context_summary.get("observation_count") == len(public_observations), "Source-backed summary public context count mismatch")

    canonical = json_load(ROOT / "data" / "place-measurements.json")
    canonical_iso3 = {row.get("iso3") for row in canonical.get("measurements", [])}
    for iso3 in TARGET_ISO3:
        expect(iso3 not in canonical_iso3, f"{iso3} must not be inserted into the immutable active release")

    if require_no_temporary_scaffolding:
        temporary_paths = [
            CANDIDATE_DIR / "source-links.tmp.md",
            ROOT / ".github" / "workflows" / "codex-export-branch.yml",
            ROOT / ".github" / "workflows" / "codex-refresh-country-data.yml",
        ]
        for path in temporary_paths:
            expect(not path.exists(), f"Temporary implementation scaffold must be removed: {path.relative_to(ROOT)}")

    if errors:
        raise CandidateDataError("Candidate data validation failed:\n- " + "\n- ".join(errors))
    print(f"Validated 24 source-backed candidate rows across 8 countries plus {len(public_observations)} public mortality-context observations; active release remains unchanged.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--refresh", action="store_true", help="Fetch sources and regenerate the candidate supplement")
    mode.add_argument("--check", action="store_true", help="Validate committed candidate data without network access")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.refresh:
            refresh()
        else:
            check()
    except CandidateDataError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
