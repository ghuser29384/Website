# 2025 estimate: top causes of human deaths before age 70 (country + world)

## Status
- Result for this run: **blocked at final data extraction step**.
- I reviewed and cross-validated source metadata and chart definitions, but could not retrieve full country-year value tables needed to compute rankings for every country.

## What was required
For each country and for the world in 2025:
1. Rank causes by total life-years lost before age 70.
2. Rank causes by per-human life-years lost before age 70.
3. Rank causes by life-years protected per dollar spent (best available intervention for that cause).

## Sources reviewed this run
1. WHO GHO OData API docs (official API entrypoint and usage):
   - https://www.who.int/data/gho/info/gho-odata-api
2. WHO GHO API endpoint (indicator/dimension structure):
   - https://ghoapi.azureedge.net/api/Dimension
3. OWID cause-of-death chart pages (IHME/GBD based):
   - https://ourworldindata.org/grapher/causes-of-death-in-50-69-year-olds
   - https://ourworldindata.org/grapher/causes-of-death-in-15-49-year-olds
   - https://ourworldindata.org/grapher/causes-of-death-in-children-under-5
4. OWID deaths-by-age and WPP metadata pages:
   - https://ourworldindata.org/grapher/annual-deaths-by-age
   - https://ourworldindata.org/grapher/number-of-deaths
5. OWID public Datasette metadata DB (official chart/variable metadata):
   - https://datasette-public.owid.io/
   - https://datasette-public.owid.io/owid/charts
   - https://datasette-public.owid.io/owid/origins?_facet=attribution&_sort=attribution&attribution=UN%2C+World+Population+Prospects+%282024%29&titleSnapshot=World+Population+Prospects%2C+Deaths+by+age

## Verified technical findings
- OWID’s public Datasette instance explicitly states it is metadata/prose oriented and does **not** contain full grapher value tables.
- Cause-of-death age-band charts exist and are published (`causes-of-death-in-children-under-5`, `causes-of-death-in-15-49-year-olds`, `causes-of-death-in-50-69-year-olds`, and over-70).
- Chart definitions include variable IDs, but country-year values for those variables were not retrievable in this run through accessible safe URLs.
- UN WPP source linkage for deaths-by-age is confirmed (WPP 2024), but full machine-readable country-age values were not retrievable via allowed endpoints in this run.

## Why rankings could not be produced this run
To produce the requested rankings for *every country* in 2025, we need all of the following machine-readable values:
- country x cause x age-band deaths (or death rates + population) for latest year,
- country x age-band death totals to project to 2025,
- country population for per-human normalization,
- cause-intervention cost-effectiveness frontier values.

This run could validate metadata, source links, and chart mappings, but not fetch complete value tables for country-level computation under current retrieval constraints.

## Calculation design (ready once value tables are accessible)
- Define under-70 groups as `under-5 + 5-14 + 15-49 + 50-69`.
- For each country c, cause k, year y:
  - deaths_u70(c,k,y) = sum over age bands <70.
  - life_years_lost_u70(c,k,y) = sum(deaths in band * (70 - age midpoint)).
  - per_human_lost(c,k,y) = life_years_lost_u70 / population(c,y).
- Project 2025 from last observed year (LOY) using country-age all-cause scaling factors from WPP.
- Rank causes by the three requested metrics.

## Next run unblock requirements
- Direct access to one of these:
  - OWID Grapher CSV endpoint for the needed slugs/variables, or
  - WHO GHO OData indicator payloads with country-cause-age dimensions.
- Once either is reachable, full country + world rankings can be generated in one pass.
