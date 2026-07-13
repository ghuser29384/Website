#!/usr/bin/env python3
"""Validate manually supplied FAOSTAT exports without extracting values."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "manual-source-inputs"
CSV_OUT = ROOT / "manual-fao-source-file-validation.csv"
JSON_OUT = ROOT / "manual-fao-source-file-validation.json"
MD_OUT = ROOT / "manual-fao-source-file-validation.md"

FIELDS = [
    "manual_file_id",
    "local_path",
    "file_name",
    "file_extension",
    "byte_size",
    "checksum_algorithm",
    "checksum",
    "detected_format",
    "detected_dataset",
    "detected_country_filter",
    "detected_element_filter",
    "detected_item_filter_summary",
    "detected_year_range",
    "detected_unit_fields",
    "detected_value_fields",
    "header_columns",
    "row_count",
    "validation_status",
    "validation_errors",
    "candidate_use_scope",
]

EXPECTED = {
    "QCL": {
        "dataset_terms": ("qcl", "crops and livestock products", "livestock"),
        "element_terms": ("producing animals", "slaughtered"),
        "item_terms": ("meat of", "slaughter"),
    },
    "RP": {
        "dataset_terms": ("rp", "pesticides", "pesticide use"),
        "element_terms": ("agricultural use", "use"),
        "item_terms": ("insecticide",),
    },
}
REQUIRED_FIELD_GROUPS = {
    "country": ("country", "country/area", "area", "area name"),
    "item": ("item", "item name", "series"),
    "element": ("element", "element name", "measure"),
    "period": ("year", "period", "date"),
    "unit": ("unit", "unit name"),
    "value": ("value", "value numeric", "observation value"),
}
SCOPE = "candidate-only source validation; no numeric extraction; no country promotion"


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def csv_headers_and_count(path: Path) -> tuple[list[str], int]:
    with path.open("r", newline="", encoding="utf-8-sig", errors="replace") as handle:
        reader = csv.reader(handle)
        headers = next(reader, [])
        return [cell.strip() for cell in headers], sum(1 for _ in reader)


def xlsx_headers_and_count(path: Path) -> tuple[list[str], int]:
    # Read worksheet XML structure only; never materialize cell values.
    with zipfile.ZipFile(path) as archive:
        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        sheet = next(iter(workbook.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet")), None)
        if sheet is None:
            return [], 0
        rels = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = None
        for rel in rels:
            if rel.attrib.get("Id") == rel_id:
                target = rel.attrib.get("Target")
                break
        if not target:
            return [], 0
        sheet_path = "xl/" + target.lstrip("/") if not target.startswith("xl/") else target
        root = ElementTree.fromstring(archive.read(sheet_path))
        dimension = next(iter(root.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}dimension")), None)
        ref = dimension.attrib.get("ref", "") if dimension is not None else ""
        end_row = re.search(r"[0-9]+$", ref.split(":")[-1])
        return [], max(0, int(end_row.group()) - 1) if end_row else 0


def classify(columns: list[str], filename: str) -> tuple[str, dict[str, str], list[str]]:
    haystack = norm(" ".join(columns) + " " + filename)
    found = {}
    for group, alternatives in REQUIRED_FIELD_GROUPS.items():
        found[group] = next((col for col in columns if any(term in norm(col) for term in alternatives)), "")
    dataset = ""
    if any(term in haystack for term in EXPECTED["QCL"]["dataset_terms"]):
        dataset = "QCL"
    elif any(term in haystack for term in EXPECTED["RP"]["dataset_terms"]):
        dataset = "RP"
    errors = []
    if not columns:
        errors.append("missing header row")
    if "faostat" not in haystack and "fao" not in haystack:
        errors.append("official FAOSTAT/FAO provenance is not identifiable from filename or headers")
    if not dataset:
        errors.append("QCL or RP dataset is not identifiable from filename or headers")
    for group, column in found.items():
        if not column:
            errors.append(f"missing required {group} column")
    status = "validated_source_file_candidate" if not errors else "manual_review_required"
    if not columns:
        status = "blocked_unknown_format"
    elif any("missing required" in error for error in errors):
        status = "blocked_missing_required_columns"
    elif any("official" in error for error in errors):
        status = "blocked_not_official_fao_export"
    return dataset or "unknown", found, errors + (["header-only inspection; values were not parsed"] if columns else [])


def validate_file(path: Path) -> dict[str, str]:
    extension = path.suffix.lower()
    headers: list[str] = []
    row_count = 0
    detected_format = "unknown"
    errors: list[str] = []
    try:
        if extension in {".csv", ".tsv"}:
            headers, row_count = csv_headers_and_count(path)
            detected_format = "tsv" if extension == ".tsv" else "csv"
        elif extension == ".xlsx":
            headers, row_count = xlsx_headers_and_count(path)
            detected_format = "xlsx"
        elif extension == ".json":
            detected_format = "json"
            errors.append("JSON requires manual review because header-only schema inspection is not sufficient")
        else:
            errors.append("unsupported file extension")
    except (OSError, UnicodeError, ValueError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        errors.append(f"format inspection failed: {type(exc).__name__}")

    dataset, found, classification_errors = classify(headers, path.name)
    errors.extend(classification_errors)
    if "unsupported file extension" in errors:
        status = "blocked_unknown_format"
    elif any("missing required" in error for error in errors):
        status = "blocked_missing_required_columns"
    elif any("official" in error for error in errors):
        status = "blocked_not_official_fao_export"
    elif any("manual review" in error.lower() for error in errors):
        status = "manual_review_required"
    else:
        status = "validated_source_file_candidate"

    return {
        "manual_file_id": hashlib.sha256(str(path).encode()).hexdigest()[:16],
        "local_path": str(path),
        "file_name": path.name,
        "file_extension": extension,
        "byte_size": str(path.stat().st_size),
        "checksum_algorithm": "SHA-256",
        "checksum": sha256(path),
        "detected_format": detected_format,
        "detected_dataset": dataset,
        "detected_country_filter": found["country"],
        "detected_element_filter": found["element"],
        "detected_item_filter_summary": found["item"],
        "detected_year_range": found["period"],
        "detected_unit_fields": found["unit"],
        "detected_value_fields": found["value"],
        "header_columns": " | ".join(headers),
        "row_count": str(row_count),
        "validation_status": status,
        "validation_errors": " ; ".join(dict.fromkeys(errors)),
        "candidate_use_scope": SCOPE,
    }


def write_outputs(rows: list[dict[str, str]]) -> None:
    with CSV_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_directory": str(INPUT_DIR),
        "inspection_policy": "headers and file metadata only; numeric values were not parsed",
        "candidate_use_scope": SCOPE,
        "files": rows,
    }
    JSON_OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Manual FAO source-file validation",
        "",
        f"Generated: {payload['generated_at']}",
        f"Input directory: `{INPUT_DIR}`",
        "",
        "## Policy",
        "",
        "This validation inspects file metadata and headers only. It does not parse numeric values, create evidence rows, promote Brazil, or regenerate release artifacts.",
        "",
        "## Summary",
        "",
        f"Files found: {len(rows)}",
        "",
    ]
    if not rows:
        lines.append("No manually supplied FAOSTAT files were found.")
    else:
        lines.extend(["| File | Dataset | Status | Errors |", "|---|---|---|---|"])
        for row in rows:
            lines.append(f"| {row['file_name']} | {row['detected_dataset']} | {row['validation_status']} | {row['validation_errors']} |")
    lines.extend(["", "## Data status", "", "No numeric extraction. No evidence card. No production rows. No release regeneration.", ""])
    MD_OUT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = [validate_file(path) for path in sorted(INPUT_DIR.iterdir()) if path.is_file()]
    write_outputs(rows)
    print(f"Validated manual files: {len(rows)}")
    print(f"Wrote: {CSV_OUT.name}, {JSON_OUT.name}, {MD_OUT.name}")
    if not rows:
        print("MANUAL_FAO_SOURCE_VALIDATION_BLOCKED: no files supplied")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
