# Manual FAO source acquisition request for Painmaps Brazil evidence

## Purpose

Automated source discovery failed to find a stable official FAO data endpoint for Brazil QCL/RP observations. DBnomics returned metadata but no observations. This request asks the user to manually export/download official FAO data through FAOSTAT or FAODATA Explorer, then place the files in a candidate-only staging directory for Codex validation.

## Required official source only

Use only official FAO/FAOSTAT/FAODATA Explorer interfaces:

- https://www.fao.org/faostat/en/#data/QCL
- https://www.fao.org/faostat/en/#data/RP
- https://dataexplorer.fao.org/

Do not use OWID.  
Do not use Fishcount.  
Do not use unofficial mirrors.

## Requested export 1: Brazil QCL slaughter context

Dataset/domain:

- FAOSTAT / Crops and livestock products / QCL

Country/area:

- Brazil

Element:

- Producing Animals/Slaughtered

Items:

- Meat of cattle with the bone, fresh or chilled
- Meat of sheep, fresh or chilled
- Meat of goat, fresh or chilled
- Meat of pig with the bone, fresh or chilled
- Horse meat, fresh or chilled

Optional if available in official FAO UI and clearly present:

- Meat of chickens, fresh or chilled
- Meat of ducks, fresh or chilled
- Meat of geese, fresh or chilled
- Meat of turkeys, fresh or chilled
- Meat of buffalo, fresh or chilled
- Meat of asses, fresh or chilled
- Meat of mules, fresh or chilled
- Meat of camels, fresh or chilled
- Meat of rabbits and hares, fresh or chilled

Do not include offal, fat, aggregate meat, live-animal stocks, milk, eggs, wool, skins, or other derivative/non-slaughter items.

Preferred export format:

- CSV, TSV, XLSX, or JSON.
- Include all years available.
- Include all source metadata if export offers it.
- Preserve original filename.

## Requested export 2: Brazil RP insecticide proxy

Dataset/domain:

- FAOSTAT / Pesticides Use / RP

Country/area:

- Brazil

Element:

- Agricultural Use

Item:

- Insecticides

Preferred export format:

- CSV, TSV, XLSX, or JSON.
- Include all years available.
- Preserve source metadata if export offers it.

## Where to place files

Place manually downloaded files here:

```text
data/candidates/brazil_evidence_pack_v2_for_codex/manual-source-inputs/
```

Suggested filenames:

- `faostat-qcl-brazil-producing-animals-slaughtered-manual-export.[csv|tsv|xlsx|json]`
- `faostat-rp-brazil-insecticides-agricultural-use-manual-export.[csv|tsv|xlsx|json]`

## Metadata to record

For each file, record:

- local filename,
- original source URL/page,
- download timestamp,
- dataset/domain,
- filters used,
- file format,
- whether export includes metadata,
- any license/terms text visible at download time,
- any attribution text visible at download time,
- any caveat shown by FAO UI.

## Source/legal notes to preserve

The current review basis is FAO's Statistical Database Terms of Use. Codex must still validate the downloaded file's visible terms and metadata before extraction. Record any dataset-specific exception, attribution instruction, caveat, or third-party notice visible in the official FAO UI or exported metadata.

## Data status

These files remain candidate-only.  
Codex must validate source identity, terms, filters, schema, checksums, reference periods, and units before any value extraction.  
No Brazil country promotion.  
No production release regeneration.
