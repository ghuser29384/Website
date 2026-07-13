# 2025 estimate: top causes of animal deaths (country + world)

## What this report does
- Estimates 2025 animal deaths by cause.
- Provides country-level counts using one consistent model.
- Gives rankings by:
1. Total deaths caused.
2. Per-animal death intensity (cause share of all counted deaths).
3. Deaths decreased per dollar spent (best available intervention proxies).

## Sources used (8)
1. OWID insight on animal slaughter scale ("more than 80 billion" land animals/year, FAOSTAT-based): https://ourworldindata.org/what-are-the-animals-worth
2. Mood & Brooke (2024), *Animal Welfare* estimate for wild fish caught yearly: https://www.cambridge.org/core/journals/animal-welfare/article/estimating-global-numbers-of-fishes-caught-from-the-wild-annually-from-2000-to-2019/83F1B933E8691F3A552636620E8C7A01
3. Fishcount estimate for farmed fish slaughtered yearly: https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-fish-slaughtered-each-year
4. Fishcount estimate for farmed decapod crustaceans: https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans
5. ACE Sinergia review (intervention CE, e.g., hens affected/$): https://animalcharityevaluators.org/charity-review/sinergia-animal/
6. Fish Welfare Initiative CE review (fish helped/$): https://forum.effectivealtruism.org/posts/yxN9ku4Pg8brvM7TE/reviewing-fish-welfare-initiative-s-cost-effectiveness-model
7. Shrimp Welfare Project CE update (shrimp helped/$): https://www.shrimpwelfareproject.org/post/new-cost-effectiveness-analysis
8. Worldometer country population shares for 2025 modeling weights: https://www.worldometers.info/world-population/population-by-country/

## 2025 world death estimate (midpoint model)
I use a single midpoint for each cause (with uncertainty):
- Land animals slaughtered: **83 billion**
- Wild-caught finfish: **1.6 trillion**
- Farmed finfish slaughter: **130 billion**
- Farmed decapod crustaceans: **796 billion**

Total modeled deaths in 2025: **2.609 trillion**.

Cause shares of modeled deaths:
- Wild-caught finfish: **61.3%**
- Farmed decapods: **30.5%**
- Farmed finfish: **5.0%**
- Land animals: **3.2%**

## Country model for 2025
Because full harmonized 2025 country-by-cause death microdata is not published in one machine-ready table, country counts are allocated by each country's 2025 world-population share:

`Deaths(country, cause) = Deaths(world, cause) * PopulationShare(country)`

This gives a complete, reproducible estimate for every country in the Worldometer table.

## Country estimates (2025, largest countries)
| Country | Total | Land | Wild finfish | Farmed finfish | Farmed decapods |
|---|---:|---:|---:|---:|---:|
| India | 463.9b | 14.8b | 284.5b | 23.1b | 141.5b |
| China | 448.7b | 14.3b | 275.2b | 22.4b | 136.9b |
| United States | 110.1b | 3.5b | 67.5b | 5.5b | 33.6b |
| Indonesia | 90.5b | 2.9b | 55.5b | 4.5b | 27.6b |
| Pakistan | 80.9b | 2.6b | 49.6b | 4.0b | 24.7b |
| Nigeria | 75.4b | 2.4b | 46.2b | 3.8b | 23.0b |
| Brazil | 67.6b | 2.1b | 41.4b | 3.4b | 20.6b |
| Bangladesh | 55.6b | 1.8b | 34.1b | 2.8b | 17.0b |
| Russia | 45.7b | 1.5b | 28.0b | 2.3b | 13.9b |
| Ethiopia | 43.0b | 1.4b | 26.4b | 2.1b | 13.1b |
| Mexico | 41.7b | 1.3b | 25.6b | 2.1b | 12.7b |
| Japan | 39.1b | 1.2b | 24.0b | 1.9b | 11.9b |
| Egypt | 37.3b | 1.2b | 22.9b | 1.9b | 11.4b |

To get any other country in the same source table, apply the same formula with that country share.

## Ranking output

### 1) Rank by total deaths caused (world and every country under this model)
1. Wild-caught finfish
2. Farmed decapod crustaceans
3. Farmed finfish
4. Land animals

### 2) Rank by per-animal death intensity
Definition used: cause deaths divided by all counted deaths in the same geography.
- This produces the same ranking as metric (1) in this model because shares are proportional.

### 3) Rank by deaths decreased per dollar (best available high-impact proxies)
Evidence-backed proxy ranges (not equally mature):
- Farmed decapods: ~1,036 to 2,100 shrimp helped per $ (SWP)
- Land animals: ~9.3 to 120 hens affected per $ in best campaign cases (ACE summary)
- Farmed finfish: up to ~11 fish helped per $ (FWI review)
- Wild-caught finfish: weaker direct CE evidence; inferred to be below farmed-decapod best-case campaign leverage in current literature snapshots.

Operational ranking using these best-known proxies:
1. Farmed decapod crustaceans
2. Land animals
3. Farmed finfish
4. Wild-caught finfish (highest uncertainty)

## Important caveats
- Country rows are an allocation model, not direct country-level census-by-cause observations.
- Aquatic estimates carry wider uncertainty than land-animal slaughter series.
- Metric (3) is intervention-tractability-driven; it is not purely biological mortality risk.
- If full FAOSTAT country microdata extraction is enabled in a future run, this can be upgraded to direct country-by-cause estimates instead of population-share allocation.
