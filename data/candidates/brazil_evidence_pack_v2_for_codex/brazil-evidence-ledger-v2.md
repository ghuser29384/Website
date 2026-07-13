# Brazil evidence ledger v2

## Status

Brazil (`BRA`) is already a live PainMap canonical country profile, but the broader country-context expansion remains candidate-only. This pack does **not** create final Painmaps measurements.

## Source families reviewed

### PainMap live profile

Brazil is one of the current canonical country profiles in the frozen PainMap release. Existing live rows remain proxy/priority-overlay; they are not direct country welfare evidence.

### World Bank WDI

The prior local workflow parsed WDI context rows candidate-only. WDI should remain denominator/context evidence only:

- `SP.POP.TOTL`: population denominator.
- `AG.LND.TOTL.K2`: land-area context.
- `AG.LND.AGRI.K2`: agricultural-land context.

### DBnomics / FAO QCL

DBnomics FAO/QCL metadata confirms:

- Dataset: `QCL`.
- Dataset name: `Production: Crops and livestock products`.
- Provider: FAO.
- Dimensions: `element`, `area`, `item`.
- Brazil area code: `21`.
- Element `5320`: `Producing Animals/Slaughtered`.
- QCL includes derivative/offal/fat/aggregate items, so do **not** fetch all `5320` series blindly.

Brazil candidate series are listed in `brazil-target-series.csv`. They must be validated metadata-only before any observation pilot.

### DBnomics / FAO RP

DBnomics FAO/RP metadata confirms:

- Dataset: `RP`.
- Dataset name: `Land, Inputs and Sustainability: Pesticides Use`.
- Provider: FAO.
- Dimensions: `element`, `area`, `item`.
- Brazil area code: `21`.
- Item `1309`: `Insecticides`.
- Element `5157`: `Agricultural Use`.

Brazil candidate series: `21.1309.5157`.

## Fish and crustaceans remain blocked

Do not parse farmed fish, wild-caught fish, or farmed crustacean values from OWID/Fishcount. Fishcount access was unauthorized in local workflow and OWID mirrors third-party source data whose provider-license/storage terms remain unresolved.

## What Codex should do next

1. Validate the 14 Brazil QCL metadata URLs with `observations=false&metadata=true`.
2. Validate the Brazil RP insecticide metadata URL with `observations=false&metadata=true`.
3. If all metadata validations pass, fetch tiny pilot observations for these same Brazil series into staging-only artifacts.
4. Do not promote Brazil, regenerate final release artifacts, or create ranking-like outputs.
