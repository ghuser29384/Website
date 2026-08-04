#!/usr/bin/env python3
"""Build and validate PainMap's public human health-pressure context supplement.

This dataset is deliberately a proxy/context surface. It does not estimate pain
intensity, duration, prevalence, disability, or total welfare burden, and it
never creates a cross-domain composite score. `--refresh` retrieves current
World Bank Indicators API rows, records payload receipts, writes public JSON,
CSV, schema, and documentation surfaces, and updates the PainMap data index.
`--check` is fully offline and validates the committed outputs.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
DATASET_ID = "painmap-human-health-pressure-context-v1"
SOURCE_ID = "world-bank-health-pressure-context"
TRANSFORM_VERSION = "painmap-health-pressure-context.2026-07-14.1"
JSON_PATH = ROOT / "data" / "human-health-pressure-context.json"
CSV_PATH = ROOT / "data" / "human-health-pressure-context.csv"
SCHEMA_PATH = ROOT / "schemas" / "human-health-pressure-context.schema.json"
SOURCE_EXTRACT_PATH = ROOT / "data" / "source-extracts" / "world-bank-health-pressure-context.json"
LANDING_PATH = ROOT / "data" / "health-pressures" / "index.html"
PAIN_DRIVERS_INDEX_PATH = ROOT / "data" / "pain-drivers.json"
PAIN_DRIVERS_PAGE_PATH = ROOT / "data" / "pain-drivers" / "index.html"
DATA_PAGE_PATH = ROOT / "data" / "index.html"
ROUTES_PATH = ROOT / "data" / "routes.json"
PACKAGE_PATH = ROOT / "package.json"
README_PATH = ROOT / "README.md"
DEPLOYMENT_RECEIPT_PATH = ROOT / "data" / "pain-driver-deployment.json"
PLACE_INDEX_PATH = ROOT / "v1" / "places" / "index.json"

USER_AGENT = "PainMap-health-pressure-context/2026-07-14 (+https://painmaps.org/)"
LICENSE_ID = "world-bank-terms"
LICENSE_URI = "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets"
API_DATE_RANGE = "2010:2026"
LANDING_TITLE = "Human Health-Pressure Context | PainMap"
LANDING_DESCRIPTION = "Country-level disease, violence, nutrition, maternal-health, and environmental pressure indicators relevant to investigating pain, with explicit provenance and comparison limits."
CANONICAL_ORIGIN = "https://painmaps.org"
PUBLIC_ORIGIN = "https://painmaps.org"
RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}


INDICATORS: tuple[dict[str, Any], ...] = (
    {
        "indicator_id": "diabetes-prevalence",
        "indicator_code": "SH.STA.DIAB.ZS",
        "indicator_name": "Diabetes prevalence",
        "unit_label": "percent of population ages 20–79",
        "domain": "chronic-metabolic-disease",
        "minimum_country_count": 150,
        "pain_relevance": "Diabetes can cause painful neuropathy and vascular complications. Prevalence is a disease-context proxy, not a measure of pain prevalence or severity.",
        "fallback_source_organization": "International Diabetes Federation, distributed through the World Bank Indicators API",
        "fallback_definition": "Age-standardized prevalence of type 1 or type 2 diabetes among people ages 20–79.",
    },
    {
        "indicator_id": "tuberculosis-incidence",
        "indicator_code": "SH.TBS.INCD",
        "indicator_name": "Tuberculosis incidence",
        "unit_label": "cases per 100,000 population",
        "domain": "infectious-disease",
        "minimum_country_count": 170,
        "pain_relevance": "Tuberculosis can involve prolonged painful illness and treatment complications. Incidence is an episode-risk proxy, not a pain measurement.",
        "fallback_source_organization": "World Health Organization, distributed through the World Bank Indicators API",
        "fallback_definition": "Estimated number of new and relapse tuberculosis cases arising in a year per 100,000 population.",
    },
    {
        "indicator_id": "malaria-incidence",
        "indicator_code": "SH.MLR.INCD.P3",
        "indicator_name": "Malaria incidence",
        "unit_label": "cases per 1,000 population at risk",
        "domain": "infectious-disease",
        "minimum_country_count": 70,
        "pain_relevance": "Malaria causes acute febrile illness that may include severe aches and complications. Incidence is an episode-risk proxy, not a pain-duration estimate.",
        "fallback_source_organization": "World Health Organization, distributed through the World Bank Indicators API",
        "fallback_definition": "Estimated malaria cases per 1,000 population at risk in a year.",
    },
    {
        "indicator_id": "hiv-prevalence",
        "indicator_code": "SH.DYN.AIDS.ZS",
        "indicator_name": "HIV prevalence",
        "unit_label": "percent of population ages 15–49",
        "domain": "infectious-disease",
        "minimum_country_count": 100,
        "pain_relevance": "HIV and associated conditions can produce painful symptoms and treatment burdens. Prevalence is a disease-context proxy, not a pain estimate.",
        "fallback_source_organization": "UNAIDS, distributed through the World Bank Indicators API",
        "fallback_definition": "Percentage of people ages 15–49 living with HIV.",
    },
    {
        "indicator_id": "maternal-mortality",
        "indicator_code": "SH.STA.MMRT",
        "indicator_name": "Maternal mortality ratio",
        "unit_label": "deaths per 100,000 live births",
        "domain": "maternal-health",
        "minimum_country_count": 170,
        "pain_relevance": "Maternal mortality is a severe obstetric-outcome proxy. It does not capture nonfatal labor pain, obstetric injury, morbidity, or access to analgesia.",
        "fallback_source_organization": "WHO, UNICEF, UNFPA and World Bank Group",
        "fallback_definition": "Modeled pregnancy-related deaths during pregnancy or within 42 days of termination per 100,000 live births.",
    },
    {
        "indicator_id": "intentional-homicide",
        "indicator_code": "VC.IHR.PSRC.P5",
        "indicator_name": "Intentional homicides",
        "unit_label": "deaths per 100,000 population",
        "domain": "interpersonal-violence",
        "minimum_country_count": 100,
        "pain_relevance": "Homicide is a lethal-violence proxy. It omits nonfatal assault, injury severity, fear, bereavement, and other pain-related consequences.",
        "fallback_source_organization": "United Nations Office on Drugs and Crime, distributed through the World Bank Indicators API",
        "fallback_definition": "Unlawful deaths intentionally inflicted on a person per 100,000 population.",
    },
    {
        "indicator_id": "undernourishment-prevalence",
        "indicator_code": "SN.ITK.DEFC.ZS",
        "indicator_name": "Prevalence of undernourishment",
        "unit_label": "percent of population",
        "domain": "nutrition-and-deprivation",
        "minimum_country_count": 100,
        "pain_relevance": "Undernourishment is a deprivation and disease-risk proxy relevant to hunger and associated illness. It does not directly measure subjective suffering.",
        "fallback_source_organization": "Food and Agriculture Organization of the United Nations, distributed through the World Bank Indicators API",
        "fallback_definition": "Share of the population whose habitual food consumption is insufficient to provide dietary energy needed for a normal active life.",
    },
    {
        "indicator_id": "pm25-exposure",
        "indicator_code": "EN.ATM.PM25.MC.M3",
        "indicator_name": "PM2.5 mean annual exposure",
        "unit_label": "micrograms per cubic meter",
        "domain": "environmental-exposure",
        "minimum_country_count": 180,
        "pain_relevance": "PM2.5 exposure is an upstream environmental health-risk proxy. It is not a measure of pain, symptoms, or individual exposure histories.",
        "fallback_source_organization": "Global Burden of Disease collaborators, distributed through the World Bank Indicators API",
        "fallback_definition": "Population-weighted mean annual exposure to ambient particulate matter smaller than 2.5 micrometers.",
    },
)

INDICATOR_BY_ID = {entry["indicator_id"]: entry for entry in INDICATORS}
INDICATOR_BY_CODE = {entry["indicator_code"]: entry for entry in INDICATORS}


class HealthPressureDataError(RuntimeError):
    """Raised when a source or publication contract cannot be validated."""


@dataclass(frozen=True)
class Download:
    url: str
    payload: bytes
    headers: dict[str, str]
    status: int
    attempts: int

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.payload).hexdigest()

    @property
    def size(self) -> int:
        return len(self.payload)


@dataclass(frozen=True)
class LatestValue:
    iso3: str
    place_name: str
    year: int
    value: float


def fail(message: str) -> None:
    raise HealthPressureDataError(message)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize_number(value: float) -> int | float:
    rounded = round(value)
    if abs(value - rounded) < 1e-9:
        return int(rounded)
    return round(value, 6)


def finite_number(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number if math.isfinite(number) else None
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    # The World Bank API normally returns numeric values. Inequality-coded values
    # such as '<2.5' are not silently coerced because doing so changes semantics.
    if text.startswith(("<", ">")):
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def fetch(url: str, *, attempts: int = 7, timeout: int = 90) -> Download:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json,text/plain,*/*",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                payload = response.read()
                status_value = getattr(response, "status", None)
                status = int(status_value or 200)
                if not payload:
                    raise HealthPressureDataError(f"Fetched empty payload from {url}")
                headers = {
                    key.lower(): value
                    for key, value in response.headers.items()
                    if key.lower() in {"content-type", "last-modified", "etag", "content-length"}
                }
                return Download(url=url, payload=payload, headers=headers, status=status, attempts=attempt)
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code not in RETRYABLE_STATUS or attempt == attempts:
                break
        except (urllib.error.URLError, TimeoutError, HealthPressureDataError) as error:
            last_error = error
            if attempt == attempts:
                break
        time.sleep(min(2 ** (attempt - 1), 20))
    fail(f"Failed to fetch {url} after {attempts} attempts: {last_error}")


def decode_json(download: Download) -> Any:
    try:
        return json.loads(download.payload.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        fail(f"Invalid JSON from {download.url}: {error}")


def world_bank_data_url(code: str) -> str:
    return (
        f"https://api.worldbank.org/v2/country/all/indicator/{code}"
        f"?format=json&per_page=20000&date={API_DATE_RANGE}"
    )


def world_bank_metadata_url(code: str) -> str:
    return f"https://api.worldbank.org/v2/indicator/{code}?format=json"


def place_registry() -> dict[str, dict[str, Any]]:
    payload = load_json(PLACE_INDEX_PATH)
    registry: dict[str, dict[str, Any]] = {}
    for item in payload.get("items", []):
        if item.get("geometry_level") != "country":
            continue
        iso3 = str(item.get("iso3") or item.get("place_id") or "").upper().strip()
        if len(iso3) != 3:
            continue
        registry[iso3] = item
    if len(registry) < 200:
        fail(f"PainMap country registry unexpectedly contains only {len(registry)} countries")
    return registry


def parse_latest_values(download: Download, registry: dict[str, dict[str, Any]], code: str) -> dict[str, LatestValue]:
    payload = decode_json(download)
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        fail(f"World Bank {code} payload has unexpected response shape")
    latest: dict[str, LatestValue] = {}
    for row in payload[1]:
        if not isinstance(row, dict):
            continue
        iso3 = str(row.get("countryiso3code") or "").upper().strip()
        if iso3 not in registry:
            continue
        value = finite_number(row.get("value"))
        year_value = finite_number(row.get("date"))
        if value is None or value < 0 or year_value is None:
            continue
        year = int(year_value)
        existing = latest.get(iso3)
        if existing is None or year > existing.year:
            place = registry[iso3]
            latest[iso3] = LatestValue(
                iso3=iso3,
                place_name=str(place.get("place_name") or row.get("country", {}).get("value") or iso3),
                year=year,
                value=value,
            )
    return latest


def metadata_record(download: Download | None, config: dict[str, Any], error: str | None = None) -> dict[str, Any]:
    row: dict[str, Any] = {}
    if download is not None:
        payload = decode_json(download)
        if isinstance(payload, list) and len(payload) > 1 and isinstance(payload[1], list) and payload[1]:
            candidate = payload[1][0]
            if isinstance(candidate, dict):
                row = candidate
    return {
        "metadata_status": "retrieved" if row else "static_fallback",
        "metadata_error": error,
        "name": row.get("name") or config["indicator_name"],
        "source_organization": row.get("sourceOrganization") or config["fallback_source_organization"],
        "source_note": row.get("sourceNote") or config["fallback_definition"],
        "source_id": row.get("source", {}).get("id") if isinstance(row.get("source"), dict) else None,
        "source_name": row.get("source", {}).get("value") if isinstance(row.get("source"), dict) else None,
        "topic": row.get("topics"),
    }


def payload_receipt(download: Download) -> dict[str, Any]:
    return {
        "url": download.url,
        "status": download.status,
        "attempts": download.attempts,
        "sha256": download.sha256,
        "byte_size": download.size,
        "response_headers": download.headers,
    }


def rank_values(values: dict[str, LatestValue]) -> dict[str, tuple[int, float]]:
    ordered = sorted(values.values(), key=lambda row: (-row.value, row.iso3))
    count = len(ordered)
    result: dict[str, tuple[int, float]] = {}
    prior_value: float | None = None
    prior_rank = 0
    for index, row in enumerate(ordered, start=1):
        if prior_value is None or not math.isclose(row.value, prior_value, rel_tol=0.0, abs_tol=1e-12):
            prior_rank = index
            prior_value = row.value
        percentile = 100.0 if count == 1 else round((count - prior_rank) / (count - 1) * 100, 2)
        result[row.iso3] = (prior_rank, percentile)
    return result


def build_schema() -> dict[str, Any]:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://painmaps.org/schemas/human-health-pressure-context.schema.json",
        "title": "PainMap human health-pressure context",
        "type": "object",
        "required": [
            "dataset_id", "generated_at", "canonical_release", "comparison_policy",
            "coverage", "indicators", "place_summaries", "observations"
        ],
        "properties": {
            "dataset_id": {"const": DATASET_ID},
            "generated_at": {"type": "string", "format": "date-time"},
            "canonical_release": {"const": False},
            "comparison_policy": {"type": "object"},
            "coverage": {"type": "object"},
            "indicators": {"type": "array", "minItems": len(INDICATORS)},
            "place_summaries": {"type": "array"},
            "observations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": [
                        "observation_id", "place_id", "iso3", "place_name", "indicator_id",
                        "indicator_code", "indicator_name", "domain", "raw_value", "unit_label",
                        "reference_year", "global_rank_within_indicator", "indicator_country_count",
                        "adverse_percentile_within_indicator", "comparison_direction", "source_id",
                        "source_snapshot_id", "source_vintage", "extraction_timestamp", "license_id",
                        "data_license_uri", "evidence_kind", "uncertainty_class", "pain_relevance", "caveat"
                    ],
                    "properties": {
                        "observation_id": {"type": "string"},
                        "place_id": {"type": "string"},
                        "iso3": {"type": "string", "pattern": "^[A-Z]{3}$"},
                        "place_name": {"type": "string"},
                        "indicator_id": {"enum": [entry["indicator_id"] for entry in INDICATORS]},
                        "indicator_code": {"enum": [entry["indicator_code"] for entry in INDICATORS]},
                        "raw_value": {"type": "number", "minimum": 0},
                        "reference_year": {"type": "integer", "minimum": 2010, "maximum": 2026},
                        "global_rank_within_indicator": {"type": "integer", "minimum": 1},
                        "indicator_country_count": {"type": "integer", "minimum": 1},
                        "adverse_percentile_within_indicator": {"type": "number", "minimum": 0, "maximum": 100},
                        "comparison_direction": {"const": "higher_value_more_adverse_context"},
                        "evidence_kind": {"const": "proxy"},
                        "uncertainty_class": {"enum": ["low", "very-low"]},
                    },
                },
            },
        },
    }


def csv_bytes(observations: list[dict[str, Any]]) -> bytes:
    fields = [
        "observation_id", "place_id", "iso3", "place_name", "indicator_id", "indicator_code",
        "indicator_name", "domain", "raw_value", "unit_label", "reference_year",
        "global_rank_within_indicator", "indicator_country_count", "adverse_percentile_within_indicator",
        "comparison_direction", "source_id", "source_snapshot_id", "source_vintage",
        "extraction_timestamp", "license_id", "data_license_uri", "evidence_kind",
        "uncertainty_class", "pain_relevance", "caveat"
    ]
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    writer.writerows(observations)
    return buffer.getvalue().encode("utf-8")


def upsert_block(path: Path, start_marker: str, end_marker: str, block: str, anchor: str) -> None:
    text = path.read_text(encoding="utf-8")
    rendered = f"{start_marker}\n{block.rstrip()}\n{end_marker}"
    if start_marker in text and end_marker in text:
        before, remainder = text.split(start_marker, 1)
        _, after = remainder.split(end_marker, 1)
        text = before + rendered + after
    else:
        if anchor not in text:
            fail(f"Could not find insertion anchor in {path.relative_to(ROOT)}: {anchor!r}")
        text = text.replace(anchor, rendered + "\n\n" + anchor, 1)
    path.write_text(text, encoding="utf-8")


def ensure_html_distribution(path: Path, content_url: str, encoding_format: str) -> None:
    text = path.read_text(encoding="utf-8")
    if content_url in text:
        return
    anchor = '        "distribution": [\n'
    if anchor not in text:
        return
    entry = f'          {{ "@type": "DataDownload", "encodingFormat": "{encoding_format}", "contentUrl": "{content_url}" }},\n'
    path.write_text(text.replace(anchor, anchor + entry, 1), encoding="utf-8")


def indicator_table_rows(indicator_summaries: list[dict[str, Any]]) -> str:
    rows = []
    for row in indicator_summaries:
        rows.append(
            "                <tr>"
            f"<th scope=\"row\">{html.escape(row['indicator_name'])}</th>"
            f"<td>{html.escape(row['domain'].replace('-', ' '))}</td>"
            f"<td>{html.escape(row['unit_label'])}</td>"
            f"<td>{row['country_count']}</td>"
            f"<td>{row['reference_year_min']}–{row['reference_year_max']}</td>"
            "</tr>"
        )
    return "\n".join(rows)


def build_landing_page(dataset: dict[str, Any]) -> str:
    coverage = dataset["coverage"]
    table_rows = indicator_table_rows(dataset["indicators"])
    breadcrumb_json = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "@id": f"{CANONICAL_ORIGIN}/data/health-pressures/#breadcrumbs",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "PainMap", "item": CANONICAL_ORIGIN},
                {"@type": "ListItem", "position": 2, "name": "Data", "item": f"{CANONICAL_ORIGIN}/data/"},
                {"@type": "ListItem", "position": 3, "name": "Human Health-Pressure Context", "item": f"{CANONICAL_ORIGIN}/data/health-pressures/"},
            ],
        },
        separators=(",", ":"),
        ensure_ascii=False,
    )
    dataset_jsonld = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": "PainMap human health-pressure context",
            "description": LANDING_DESCRIPTION,
            "url": f"{CANONICAL_ORIGIN}/data/health-pressures/",
            "license": LICENSE_URI,
            "creator": {"@type": "Organization", "name": "PainMap", "url": f"{CANONICAL_ORIGIN}/"},
            "distribution": [
                {"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": f"{PUBLIC_ORIGIN}/data/human-health-pressure-context.json"},
                {"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": f"{PUBLIC_ORIGIN}/data/human-health-pressure-context.csv"},
                {"@type": "DataDownload", "encodingFormat": "application/schema+json", "contentUrl": f"{PUBLIC_ORIGIN}/schemas/human-health-pressure-context.schema.json"},
            ],
        },
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return f'''<!doctype html>
<html lang="en" data-brand="evidence-field-v1">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preload" as="style" href="/styles.css?v=93e0a5d87fc250eb">
    <link rel="modulepreload" href="/script.js?v=94dce133b6afba83">
    <link rel="preconnect" href="https://www.geoboundaries.org" crossorigin>
    <link rel="preconnect" href="https://api.worldbank.org" crossorigin>
    <link rel="preconnect" href="https://api.worldpop.org" crossorigin>
    <link rel="preconnect" href="https://ourworldindata.org" crossorigin>
    <link rel="preconnect" href="https://media.githubusercontent.com" crossorigin>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; connect-src 'self' https://www.geoboundaries.org https://media.githubusercontent.com https://api.worldbank.org https://api.worldpop.org https://ourworldindata.org; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>{LANDING_TITLE}</title>
    <meta name="description" content="{LANDING_DESCRIPTION}">
    <link rel="canonical" href="{CANONICAL_ORIGIN}/data/health-pressures/">
    <meta property="og:title" content="{LANDING_TITLE}">
    <meta property="og:description" content="{LANDING_DESCRIPTION}">
    <meta property="og:image" content="{CANONICAL_ORIGIN}/assets/social-card.svg">
    <meta property="og:type" content="article">
    <meta property="og:url" content="{CANONICAL_ORIGIN}/data/health-pressures/">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{LANDING_TITLE}">
    <meta name="twitter:description" content="{LANDING_DESCRIPTION}">
    <meta name="twitter:image" content="{CANONICAL_ORIGIN}/assets/social-card.svg">
    <link rel="stylesheet" href="/styles.css?v=93e0a5d87fc250eb" integrity="sha384-247i4QQKs5xcO5DRVdCYNDn8SIksDDkmOncbjyJb10IWhCroxw7XbgJgLD7gwiez" crossorigin="anonymous">
    <link rel="icon" href="/assets/brand/painmap-favicon.svg" type="image/svg+xml">
    <meta name="theme-color" content="#F2F0E8" data-painmap-brand="evidence-field-v1">
    <link rel="stylesheet" href="/brand.css?v=2cb1b100c5a8e940" integrity="sha384-xDZWchas6IQgiOcloxbhriO2lst0kxyCjuT6IklryzcwBBfTdy23hW0khCOj4DtU" crossorigin="anonymous" data-painmap-brand="evidence-field-v1">
    <link rel="stylesheet" href="/assets/brand/brand-components.css?v=6fa78d873b7e24a7" integrity="sha384-1g3zTZ0UzEa5XrGAg8U1zygr+TixbkwDs8CWzt5x1tRgSCSmJc103Ef3opXZuH4d" crossorigin="anonymous" data-painmap-brand="evidence-field-v1">
    <script type="application/ld+json">{dataset_jsonld}</script>
    <script type="application/ld+json" data-painmap-jsonld="breadcrumbs">{breadcrumb_json}</script>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="shell route-page">
      <header class="site-header" aria-label="Primary navigation">
        <a class="brand" href="/" aria-label="PainMap home"><img class="brand-mark" src="/assets/brand/painmap-symbol-primary.svg" width="44" height="44" alt=""><span>PainMap</span></a>
        <nav class="site-nav" aria-label="Site sections">
          <a href="/atlas/">Atlas</a><a href="/places/">Places</a><a href="/compare/">Compare</a><a href="/events/">Events</a><a href="/methods/">Methods</a><a href="/data/">Data</a><a href="/api/">API</a><a href="/about/">About</a>
        </nav>
      </header>
      <nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">PainMap</a></li><li><a href="/data/">Data</a></li><li><span aria-current="page">Human Health-Pressure Context</span></li></ol></nav>
      <main id="main-content" class="route-page">
        <section class="route-panel route-hero" aria-labelledby="page-title">
          <div><p class="label">Current public proxy supplement</p><h1 id="page-title">Human health pressures relevant to pain by place</h1></div>
          <p class="route-copy">{coverage['observation_count']} latest observations cover {coverage['countries_with_any_observation']} PainMap-indexed countries across {coverage['indicator_count']} indicators. Values remain separated by metric, unit, method, and year.</p>
        </section>
        <section class="route-panel" aria-labelledby="coverage-title">
          <div class="section-intro"><p class="label">Coverage</p><h2 id="coverage-title">Disease, violence, nutrition, maternal health, and environmental exposure</h2></div>
          <p>These indicators are contextual evidence about conditions that may generate or accompany pain. They are not measurements of pain intensity, duration, prevalence, disability, or total suffering.</p>
          <div class="data-table-wrap">
            <table class="route-table">
              <caption>Current indicator coverage and unit families.</caption>
              <thead><tr><th scope="col">Indicator</th><th scope="col">Domain</th><th scope="col">Unit</th><th scope="col">Countries</th><th scope="col">Latest-year range</th></tr></thead>
              <tbody>
{table_rows}
              </tbody>
            </table>
          </div>
          <div class="route-actions"><a class="solid-button" href="/data/human-health-pressure-context.json">Download JSON</a><a class="ghost-link" href="/data/human-health-pressure-context.csv">Download CSV</a><a class="ghost-link" href="/schemas/human-health-pressure-context.schema.json">JSON Schema</a><a class="ghost-link" href="/data/source-extracts/world-bank-health-pressure-context.json">Source receipt</a></div>
        </section>
        <section class="route-panel" aria-labelledby="comparison-title">
          <div class="section-intro"><p class="label">Comparison rules</p><h2 id="comparison-title">Rank only within the same indicator</h2></div>
          <p>Each observation includes a rank and adverse percentile calculated only among countries with the same indicator. Cross-indicator addition, averaging, or universal ranking is prohibited because percentage prevalence, incidence rates, mortality rates, and pollutant concentrations are not commensurable.</p>
        </section>
        <section class="route-panel" aria-labelledby="method-title">
          <div class="section-intro"><p class="label">Provenance</p><h2 id="method-title">Latest non-null World Bank API observation</h2></div>
          <p>For every country and indicator, PainMap selects the latest numeric observation from 2010 through 2026, records the observation year, source organization, API URL, retrieval timestamp, response metadata, payload checksum, transform version, unit, caveat, and coverage count.</p>
        </section>
      </main>
    </div>
    <script src="/route-table-labels.js?v=4fc546df01614183" defer></script>
  </body>
</html>
'''


def update_public_surfaces(dataset: dict[str, Any], extract: dict[str, Any]) -> None:
    generated_at = dataset["generated_at"]
    coverage = dataset["coverage"]
    indicators = dataset["indicators"]

    index = load_json(PAIN_DRIVERS_INDEX_PATH)
    index["generated_at"] = generated_at
    index["comparison_policy"]["reason"] = (
        "Mortality rates, disease prevalence, incidence rates, violence rates, pollutant concentrations, "
        "animal counts, insecticide mass, and land area use incompatible units and represent different relationships to pain."
    )
    allowed = index["comparison_policy"].setdefault("allowed", [])
    rule = "Within-indicator comparison across places when method, unit, and latest-observation selection semantics match."
    if rule not in allowed:
        allowed.append(rule)
    index["datasets"] = [row for row in index.get("datasets", []) if row.get("dataset_id") != DATASET_ID]
    index["datasets"].append(
        {
            "dataset_id": DATASET_ID,
            "label": "Human health-pressure context",
            "evidence_kind": "proxy",
            "publication_status": "public_context_supplement",
            "observation_count": coverage["observation_count"],
            "country_count": coverage["countries_with_any_observation"],
            "indicator_count": coverage["indicator_count"],
            "indicators": [row["indicator_name"] for row in indicators],
            "units": sorted({row["unit_label"] for row in indicators}),
            "json_url": "https://painmaps.org/data/human-health-pressure-context.json",
            "csv_url": "https://painmaps.org/data/human-health-pressure-context.csv",
            "schema_url": "https://painmaps.org/schemas/human-health-pressure-context.schema.json",
            "landing_page_url": "https://painmaps.org/data/health-pressures/",
            "source_extract_url": "https://painmaps.org/data/source-extracts/world-bank-health-pressure-context.json",
            "attribution": "Underlying publishers identified in World Bank indicator metadata; distributed through the World Bank Indicators API.",
            "license": "World Bank dataset terms and source-specific attribution requirements",
            "caveat": "These are pain-relevant health-pressure proxies, not direct pain measurements. Cross-indicator composite ranking is disabled.",
        }
    )
    write_json(PAIN_DRIVERS_INDEX_PATH, index)

    route_payload = load_json(ROUTES_PATH)
    route_payload["routes"] = [row for row in route_payload.get("routes", []) if row.get("path") != "/data/health-pressures/"]
    data_index = next((i for i, row in enumerate(route_payload["routes"]) if row.get("path") == "/data/"), len(route_payload["routes"]) - 1)
    route_payload["routes"].insert(
        data_index + 1,
        {
            "path": "/data/health-pressures/",
            "file": "data/health-pressures/index.html",
            "key": "data-health-pressures",
            "title": LANDING_TITLE,
            "description": LANDING_DESCRIPTION,
            "jsonLdType": "Dataset",
        },
    )
    write_json(ROUTES_PATH, route_payload)

    package = load_json(PACKAGE_PATH)
    scripts = package.setdefault("scripts", {})
    scripts["health-pressure:data:refresh"] = "python3 scripts/build-human-health-pressure-context.py --refresh"
    scripts["health-pressure:data:check"] = "python3 scripts/build-human-health-pressure-context.py --check"
    check = scripts.get("check", "")
    if "health-pressure:data:check" not in check:
        check = check.replace("npm run build:data", "npm run build:data && npm run health-pressure:data:check", 1)
    scripts["check"] = check
    write_json(PACKAGE_PATH, package)

    LANDING_PATH.parent.mkdir(parents=True, exist_ok=True)
    LANDING_PATH.write_text(build_landing_page(dataset), encoding="utf-8")

    table_rows = indicator_table_rows(indicators)
    pain_drivers_block = f'''        <section class="route-panel" aria-labelledby="health-pressure-title">
          <div class="section-intro"><p class="label">Human health-pressure context</p><h2 id="health-pressure-title">{coverage['observation_count']} latest observations across {coverage['countries_with_any_observation']} countries</h2></div>
          <p>Eight World Bank API indicator families add disease, violence, nutrition, maternal-health, and environmental context. Every value is labeled as proxy evidence and may be ranked only within its own indicator.</p>
          <div class="route-grid"><article class="route-card"><p class="issue-tag">Coverage</p><h3>{coverage['indicator_count']} indicator families</h3><p>{coverage['countries_with_complete_indicator_set']} countries have all eight latest observations; other countries retain explicit gaps.</p></article><article class="route-card"><p class="issue-tag">Interpretation</p><h3>No pain total</h3><p>Prevalence, incidence, mortality, violence, nutrition, and exposure values cannot be added or averaged into a universal pain score.</p></article></div>
          <div class="route-actions"><a class="solid-button" href="/data/health-pressures/">Open health-pressure guide</a><a class="ghost-link" href="/data/human-health-pressure-context.json">JSON</a><a class="ghost-link" href="/data/human-health-pressure-context.csv">CSV</a><a class="ghost-link" href="/schemas/human-health-pressure-context.schema.json">schema</a></div>
        </section>'''
    upsert_block(
        PAIN_DRIVERS_PAGE_PATH,
        "        <!-- HEALTH_PRESSURE_CONTEXT_START -->",
        "        <!-- HEALTH_PRESSURE_CONTEXT_END -->",
        pain_drivers_block,
        '        <section class="route-panel" aria-labelledby="rules-title">',
    )
    ensure_html_distribution(PAIN_DRIVERS_PAGE_PATH, "https://painmaps.org/data/human-health-pressure-context.json", "application/json")
    ensure_html_distribution(PAIN_DRIVERS_PAGE_PATH, "https://painmaps.org/data/human-health-pressure-context.csv", "text/csv")

    data_row = f'''                <tr>
                  <th scope="row"><a href="/data/health-pressures/">Human health-pressure context</a></th>
                  <td>Source-backed proxy context</td>
                  <td>Latest numeric country observations retrieved {generated_at[:10]}</td>
                  <td>Low confidence for pain inference; compare only within the same indicator</td>
                  <td><a href="/data/human-health-pressure-context.json">JSON</a>, <a href="/data/human-health-pressure-context.csv">CSV</a>, <a href="/schemas/human-health-pressure-context.schema.json">schema</a>, <a href="/data/source-extracts/world-bank-health-pressure-context.json">source receipt</a></td>
                </tr>'''
    upsert_block(
        DATA_PAGE_PATH,
        "                <!-- HEALTH_PRESSURE_CONTEXT_ROW_START -->",
        "                <!-- HEALTH_PRESSURE_CONTEXT_ROW_END -->",
        data_row,
        "                <tr>\n                  <th scope=\"row\"><a href=\"/dataset/place-measurements/\">Place measurements</a></th>",
    )
    ensure_html_distribution(DATA_PAGE_PATH, "https://painmaps.org/data/human-health-pressure-context.json", "application/json")
    ensure_html_distribution(DATA_PAGE_PATH, "https://painmaps.org/data/human-health-pressure-context.csv", "text/csv")

    readme_block = f'''## Human health-pressure context supplement

The live site publishes {coverage['observation_count']} latest source-backed proxy observations across {coverage['countries_with_any_observation']} PainMap-indexed countries and {coverage['indicator_count']} indicator families:

- [Human health-pressure guide](https://painmaps.org/data/health-pressures/)
- [JSON](https://painmaps.org/data/human-health-pressure-context.json)
- [CSV](https://painmaps.org/data/human-health-pressure-context.csv)
- [JSON Schema](https://painmaps.org/schemas/human-health-pressure-context.schema.json)
- [Source receipt](https://painmaps.org/data/source-extracts/world-bank-health-pressure-context.json)

The supplement covers diabetes prevalence, tuberculosis and malaria incidence, HIV prevalence, maternal mortality, intentional homicide, undernourishment, and PM2.5 exposure. All rows are proxy context rather than direct pain measurements. Rankings and adverse percentiles are calculated only within the same indicator; cross-indicator composite scoring is disabled.'''
    upsert_block(
        README_PATH,
        "<!-- HEALTH_PRESSURE_CONTEXT_README_START -->",
        "<!-- HEALTH_PRESSURE_CONTEXT_README_END -->",
        readme_block,
        "Run the release artifact builder before checks:",
    )

    receipt = load_json(DEPLOYMENT_RECEIPT_PATH) if DEPLOYMENT_RECEIPT_PATH.exists() else {}
    receipt["published_at"] = generated_at
    receipt["health_pressure_context"] = {
        "dataset_id": DATASET_ID,
        "observations": coverage["observation_count"],
        "countries": coverage["countries_with_any_observation"],
        "countries_with_all_indicators": coverage["countries_with_complete_indicator_set"],
        "indicators": coverage["indicator_count"],
        "json_url": "https://painmaps.org/data/human-health-pressure-context.json",
        "csv_url": "https://painmaps.org/data/human-health-pressure-context.csv",
        "landing_page": "https://painmaps.org/data/health-pressures/",
        "source_receipt": "https://painmaps.org/data/source-extracts/world-bank-health-pressure-context.json",
        "comparison_policy": "Within-indicator comparison only; no cross-domain composite score.",
    }
    write_json(DEPLOYMENT_RECEIPT_PATH, receipt)


def build_refresh() -> dict[str, Any]:
    generated_at = utc_now()
    registry = place_registry()
    observations: list[dict[str, Any]] = []
    indicator_summaries: list[dict[str, Any]] = []
    source_indicators: list[dict[str, Any]] = []
    values_by_indicator: dict[str, dict[str, LatestValue]] = {}

    for config in INDICATORS:
        code = config["indicator_code"]
        data_download = fetch(world_bank_data_url(code))
        values = parse_latest_values(data_download, registry, code)
        if len(values) < config["minimum_country_count"]:
            fail(
                f"{code} coverage {len(values)} is below minimum {config['minimum_country_count']}"
            )

        metadata_download: Download | None = None
        metadata_error: str | None = None
        try:
            metadata_download = fetch(world_bank_metadata_url(code), attempts=5, timeout=60)
        except HealthPressureDataError as error:
            metadata_error = str(error)
        metadata = metadata_record(metadata_download, config, metadata_error)

        ranks = rank_values(values)
        snapshot_id = f"snapshot.world-bank-health-pressure.{code.lower()}.{generated_at[:10]}"
        years = [row.year for row in values.values()]
        indicator_summary = {
            "indicator_id": config["indicator_id"],
            "indicator_code": code,
            "indicator_name": metadata["name"],
            "domain": config["domain"],
            "unit_label": config["unit_label"],
            "country_count": len(values),
            "reference_year_min": min(years),
            "reference_year_max": max(years),
            "comparison_direction": "higher_value_more_adverse_context",
            "source_snapshot_id": snapshot_id,
            "source_organization": metadata["source_organization"],
            "source_note": metadata["source_note"],
            "pain_relevance": config["pain_relevance"],
            "caveat": "Proxy/context indicator only. It does not directly measure pain intensity, duration, prevalence, disability, or total suffering.",
        }
        indicator_summaries.append(indicator_summary)
        values_by_indicator[config["indicator_id"]] = values

        source_entry = {
            **indicator_summary,
            "data_payload": payload_receipt(data_download),
            "metadata_payload": payload_receipt(metadata_download) if metadata_download else None,
            "metadata_status": metadata["metadata_status"],
            "metadata_error": metadata["metadata_error"],
            "license_id": LICENSE_ID,
            "data_license_uri": LICENSE_URI,
            "selection_rule": f"Latest non-null numeric PainMap country observation in {API_DATE_RANGE}.",
        }
        source_indicators.append(source_entry)

        for iso3, value in values.items():
            rank, percentile = ranks[iso3]
            place = registry[iso3]
            observations.append(
                {
                    "observation_id": f"{DATASET_ID}:{iso3}:{config['indicator_id']}:{value.year}",
                    "place_id": str(place.get("place_id") or iso3),
                    "iso3": iso3,
                    "place_name": value.place_name,
                    "indicator_id": config["indicator_id"],
                    "indicator_code": code,
                    "indicator_name": metadata["name"],
                    "domain": config["domain"],
                    "raw_value": normalize_number(value.value),
                    "unit_label": config["unit_label"],
                    "reference_year": value.year,
                    "global_rank_within_indicator": rank,
                    "indicator_country_count": len(values),
                    "adverse_percentile_within_indicator": percentile,
                    "comparison_direction": "higher_value_more_adverse_context",
                    "source_id": SOURCE_ID,
                    "source_snapshot_id": snapshot_id,
                    "source_vintage": f"{metadata['source_organization']}; observation year {value.year}; retrieved {generated_at[:10]}",
                    "extraction_timestamp": generated_at,
                    "transform_version": TRANSFORM_VERSION,
                    "license_id": LICENSE_ID,
                    "data_license_uri": LICENSE_URI,
                    "attribution": metadata["source_organization"],
                    "evidence_kind": "proxy",
                    "uncertainty_class": "low",
                    "pain_relevance": config["pain_relevance"],
                    "caveat": "Proxy/context indicator only. It does not directly measure pain intensity, duration, prevalence, disability, or total suffering.",
                }
            )

    observations.sort(key=lambda row: (row["indicator_id"], row["global_rank_within_indicator"], row["iso3"]))
    place_map: dict[str, list[dict[str, Any]]] = {}
    for row in observations:
        place_map.setdefault(row["iso3"], []).append(row)
    place_summaries = []
    for iso3, rows in sorted(place_map.items()):
        place_summaries.append(
            {
                "place_id": rows[0]["place_id"],
                "iso3": iso3,
                "place_name": rows[0]["place_name"],
                "available_indicator_count": len(rows),
                "available_indicator_ids": sorted(row["indicator_id"] for row in rows),
                "earliest_reference_year": min(row["reference_year"] for row in rows),
                "latest_reference_year": max(row["reference_year"] for row in rows),
                "cross_indicator_ranking_enabled": False,
            }
        )

    coverage_by_indicator = {row["indicator_id"]: row["country_count"] for row in indicator_summaries}
    complete_count = sum(1 for rows in place_map.values() if len(rows) == len(INDICATORS))
    all_years = [row["reference_year"] for row in observations]
    coverage = {
        "painmap_indexed_country_count": len(registry),
        "countries_with_any_observation": len(place_map),
        "countries_with_complete_indicator_set": complete_count,
        "observation_count": len(observations),
        "indicator_count": len(INDICATORS),
        "coverage_by_indicator": coverage_by_indicator,
        "reference_year_min": min(all_years),
        "reference_year_max": max(all_years),
    }
    if coverage["countries_with_any_observation"] < 180:
        fail("Health-pressure dataset covers fewer than 180 PainMap countries")
    if coverage["observation_count"] < 900:
        fail("Health-pressure dataset contains fewer than 900 observations")

    dataset = {
        "$schema": "https://painmaps.org/schemas/human-health-pressure-context.schema.json",
        "dataset_id": DATASET_ID,
        "title": "PainMap human health-pressure context",
        "generated_at": generated_at,
        "canonical_release": False,
        "publication_status": "public_context_supplement",
        "purpose": "Add source-backed disease, violence, nutrition, maternal-health, and environmental context relevant to investigating pain by place without treating proxies as direct pain measurements.",
        "method": {
            "selection_rule": f"Latest non-null numeric observation per PainMap country and indicator in {API_DATE_RANGE}.",
            "transform_version": TRANSFORM_VERSION,
            "ranking_rule": "Descending rank and adverse percentile calculated independently within each indicator.",
            "missing_value_rule": "Missing, nonnumeric, inequality-coded, negative, aggregate, or non-country rows are excluded without imputation.",
        },
        "comparison_policy": {
            "overall_cross_domain_ranking_enabled": False,
            "within_place_cross_indicator_ranking_enabled": False,
            "allowed": "Compare countries only within the same indicator when unit, method, and selection semantics match.",
            "reason": "The indicator families use incompatible units and represent different causal and evidential relationships to pain.",
        },
        "source": {
            "source_id": SOURCE_ID,
            "publisher_path": "Underlying organizations identified in World Bank metadata; values distributed through the World Bank Indicators API.",
            "api_base": "https://api.worldbank.org/v2/",
            "license_id": LICENSE_ID,
            "data_license_uri": LICENSE_URI,
            "source_receipt_url": "https://painmaps.org/data/source-extracts/world-bank-health-pressure-context.json",
        },
        "coverage": coverage,
        "indicators": indicator_summaries,
        "place_summaries": place_summaries,
        "observations": observations,
    }

    extract = {
        "source_id": SOURCE_ID,
        "generated_at": generated_at,
        "dataset_id": DATASET_ID,
        "selection_rule": f"Latest non-null numeric PainMap country observation in {API_DATE_RANGE}; no imputation.",
        "license_id": LICENSE_ID,
        "data_license_uri": LICENSE_URI,
        "transform_version": TRANSFORM_VERSION,
        "indicator_count": len(source_indicators),
        "observation_count": len(observations),
        "country_count": len(place_map),
        "indicators": source_indicators,
    }

    write_json(JSON_PATH, dataset)
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    CSV_PATH.write_bytes(csv_bytes(observations))
    write_json(SCHEMA_PATH, build_schema())
    write_json(SOURCE_EXTRACT_PATH, extract)
    update_public_surfaces(dataset, extract)
    return dataset


def check_outputs() -> dict[str, Any]:
    required = [JSON_PATH, CSV_PATH, SCHEMA_PATH, SOURCE_EXTRACT_PATH, LANDING_PATH]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        fail(f"Missing health-pressure outputs: {', '.join(missing)}")

    dataset = load_json(JSON_PATH)
    if dataset.get("dataset_id") != DATASET_ID:
        fail("Unexpected health-pressure dataset_id")
    if dataset.get("canonical_release") is not False:
        fail("Health-pressure context must remain non-canonical")
    if dataset.get("comparison_policy", {}).get("overall_cross_domain_ranking_enabled") is not False:
        fail("Cross-domain ranking must remain disabled")

    observations = dataset.get("observations")
    if not isinstance(observations, list) or len(observations) < 900:
        fail("Health-pressure observation array is missing or unexpectedly sparse")
    ids = [row.get("observation_id") for row in observations]
    if len(ids) != len(set(ids)):
        fail("Duplicate health-pressure observation_id values")

    valid_ids = set(INDICATOR_BY_ID)
    by_indicator: dict[str, list[dict[str, Any]]] = {}
    for row in observations:
        indicator_id = row.get("indicator_id")
        if indicator_id not in valid_ids:
            fail(f"Unknown indicator_id: {indicator_id}")
        if row.get("evidence_kind") != "proxy":
            fail(f"Non-proxy evidence kind in {row.get('observation_id')}")
        if row.get("comparison_direction") != "higher_value_more_adverse_context":
            fail(f"Unexpected comparison direction in {row.get('observation_id')}")
        value = finite_number(row.get("raw_value"))
        if value is None or value < 0:
            fail(f"Invalid raw value in {row.get('observation_id')}")
        rank = row.get("global_rank_within_indicator")
        count = row.get("indicator_country_count")
        percentile = finite_number(row.get("adverse_percentile_within_indicator"))
        if not isinstance(rank, int) or not isinstance(count, int) or rank < 1 or rank > count:
            fail(f"Invalid rank in {row.get('observation_id')}")
        if percentile is None or not 0 <= percentile <= 100:
            fail(f"Invalid percentile in {row.get('observation_id')}")
        by_indicator.setdefault(indicator_id, []).append(row)

    for config in INDICATORS:
        rows = by_indicator.get(config["indicator_id"], [])
        if len(rows) < config["minimum_country_count"]:
            fail(f"Committed {config['indicator_id']} coverage is below minimum")
        declared = {row.get("indicator_country_count") for row in rows}
        if declared != {len(rows)}:
            fail(f"Inconsistent indicator_country_count for {config['indicator_id']}")
        ordered = sorted(rows, key=lambda row: (-float(row["raw_value"]), row["iso3"]))
        if ordered[0]["global_rank_within_indicator"] != 1:
            fail(f"Top row for {config['indicator_id']} is not rank 1")

    with CSV_PATH.open("r", encoding="utf-8", newline="") as handle:
        csv_count = sum(1 for _ in csv.DictReader(handle))
    if csv_count != len(observations):
        fail(f"CSV row count {csv_count} does not match JSON {len(observations)}")

    extract = load_json(SOURCE_EXTRACT_PATH)
    if extract.get("observation_count") != len(observations):
        fail("Source receipt observation count does not match dataset")
    if len(extract.get("indicators", [])) != len(INDICATORS):
        fail("Source receipt indicator count mismatch")
    for row in extract["indicators"]:
        receipt = row.get("data_payload") or {}
        checksum = str(receipt.get("sha256") or "")
        if len(checksum) != 64 or any(character not in "0123456789abcdef" for character in checksum):
            fail(f"Invalid data payload checksum for {row.get('indicator_code')}")

    routes = load_json(ROUTES_PATH)
    if not any(row.get("path") == "/data/health-pressures/" for row in routes.get("routes", [])):
        fail("Health-pressure landing route is not registered")
    pain_index = load_json(PAIN_DRIVERS_INDEX_PATH)
    if not any(row.get("dataset_id") == DATASET_ID for row in pain_index.get("datasets", [])):
        fail("Health-pressure dataset is missing from pain-drivers index")

    summary = {
        "dataset_id": DATASET_ID,
        "generated_at": dataset["generated_at"],
        "observation_count": len(observations),
        "country_count": dataset["coverage"]["countries_with_any_observation"],
        "complete_country_count": dataset["coverage"]["countries_with_complete_indicator_set"],
        "indicator_count": len(INDICATORS),
        "json_sha256": sha256_path(JSON_PATH),
        "csv_sha256": sha256_path(CSV_PATH),
        "schema_sha256": sha256_path(SCHEMA_PATH),
        "source_extract_sha256": sha256_path(SOURCE_EXTRACT_PATH),
    }
    print(json.dumps(summary, indent=2))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--refresh", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        if args.refresh:
            dataset = build_refresh()
            print(
                f"Built {dataset['coverage']['observation_count']} human health-pressure observations "
                f"across {dataset['coverage']['countries_with_any_observation']} countries."
            )
        check_outputs()
    except HealthPressureDataError as error:
        print(f"Health-pressure data error: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
