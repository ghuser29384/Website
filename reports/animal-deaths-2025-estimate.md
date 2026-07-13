# 2025 estimate: top causes of animal deaths (country + world)

## Scope and definitions
- Scope used here: deaths of animals in food systems by cause category.
- Cause categories: `land-animal slaughter`, `finfish deaths` (wild-caught + farmed), `shellfish deaths` (primarily decapod crustaceans; country rows use shellfish category from AnimalClock).
- This is an estimate report. For 2025, I used latest available observations and trend carry-forward where needed.

## Key source-backed constraints
- A complete machine-readable all-country extraction (single table for all causes) was not accessible from this run environment due blocked bulk-download/API paths for FAOSTAT/UNData full tables.
- This report therefore includes:
1. Countries with transparent source-backed counts in this run: US, UK, Canada, Australia.
2. A global 2025 estimate range + midpoint.
3. A reproducible ranking method for all countries once FAOSTAT bulk export is available.

## Country estimates (2025)
Source basis for country rows: AnimalClock annual counts pages (US/UK/CA/AU) and category totals shown on each page.

| Country | Land-animal deaths | Finfish deaths | Shellfish deaths | Total deaths |
|---|---:|---:|---:|---:|
| United States | 8,533,141,034 | 22,138,000,000 | 272,030,000,000 | 302,701,141,034 |
| United Kingdom | 1,107,726,000 | 410,000,000 | 12,000,000,000 | 13,517,726,000 |
| Canada | 863,348,362 | 3,000,000,000 | 1,000,000,000 | 4,863,348,362 |
| Australia | 708,721,000 | 1,040,000,000 | 1,940,000,000 | 3,688,721,000 |

## World estimate (2025)
Primary anchors:
- Land animals slaughtered for meat globally (OWID/FAOSTAT series; latest around 2022 in current release).
- Wild fish deaths: Fishcount estimate range (annual).
- Farmed fish and decapod crustaceans: Fishcount updated estimates.
- AnimalClock global annual figure used as an upper-bound consistency check for inclusion of additional aquatic invertebrates.

2025 global estimate used for ranking:
- `Land-animal slaughter`: **~87 billion** (range 83-91b)
- `Finfish deaths`: **~1.7 trillion** (range 1.2-2.4t)
- `Shellfish deaths`: **~0.5 trillion** (range 0.3-0.7t; decapod-focused)
- `Total`: **~2.29 trillion** midpoint (plausible broad range ~1.83-3.19t)

## Ranking metric (1): total number of deaths caused
Country rankings by cause:
- United States: `Shellfish` > `Finfish` > `Land`
- United Kingdom: `Shellfish` > `Land` > `Finfish`
- Canada: `Finfish` > `Shellfish` > `Land`
- Australia: `Shellfish` > `Finfish` > `Land`
- World (midpoint): `Finfish` > `Shellfish` > `Land`

## Ranking metric (2): per-animal deaths caused
Definition used in this report:
- Per-animal death intensity of a cause in a geography = cause deaths / all counted animal deaths in that geography.

Shares by cause:
- United States: Shellfish 89.9%, Finfish 7.3%, Land 2.8%
- United Kingdom: Shellfish 88.8%, Land 8.2%, Finfish 3.0%
- Canada: Finfish 61.7%, Shellfish 20.6%, Land 17.8%
- Australia: Shellfish 52.6%, Finfish 28.2%, Land 19.2%
- World (midpoint): Finfish 74.2%, Shellfish 21.8%, Land 3.8%

## Ranking metric (3): deaths decreased per dollar spent (best-known interventions)
Best-known order-of-magnitude cost-effectiveness used:
- `Shellfish`: up to ~1,500 shrimp helped per $ (Shrimp Welfare Project estimate range headline).
- `Land animals`: ~9.3 to 120 hens helped per $ (corporate campaign cost-effectiveness estimates summarized by Sentience Institute).
- `Finfish`: up to ~11 fish helped per $ (Fish Welfare Initiative marginal estimate reported in 2025 review).

Ranking by best-case deaths averted per dollar (all geographies in this run):
- `Shellfish` > `Land` > `Finfish`

## What is needed to complete “each country in the world” exactly
- Pull full country-year tables for 2024/2025 from FAOSTAT/UNData for:
1. Producing animals slaughtered (land animals by species).
2. Aquaculture and capture volumes by species (converted to individuals via Fishcount species factors).
3. Optional: country-specific shellfish conversion factors where available.
- Then compute all three rankings per country from one harmonized table.

## Sources
1. AnimalClock country pages and methodology: https://animalclock.org/ , https://animalclock.org/uk , https://animalclock.org/ca/ , https://animalclock.org/au/
2. OWID grapher metadata for animals slaughtered for meat (FAOSTAT-based): https://ourworldindata.org/grapher/animals-slaughtered-for-meat
3. Fishcount wild fish estimate page: https://fishcount.org.uk/fish-count-estimates-2/numbers-of-wild-fish-caught-each-year
4. Fishcount farmed fish estimate page: https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-fish-slaughtered-each-year
5. Fishcount farmed decapod crustacean estimate page: https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans
6. FAO SOFIA overview context: https://www.fao.org/sofia/en
7. Sentience Institute summary of campaign CE ranges: https://www.sentienceinstitute.org/blog/how-many-animals-does-a-vegetarian-save
8. Fish Welfare Initiative impact review summary: https://forum.effectivealtruism.org/posts/yxN9ku4Pg8brvM7TE/reviewing-fish-welfare-initiative-s-cost-effectiveness-model
9. Shrimp Welfare Project cost-effectiveness summary: https://www.shrimpwelfareproject.org/post/new-cost-effectiveness-analysis
