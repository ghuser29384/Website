# 2025 estimate: top causes of animal deaths (country + world)

## What this run covers
- Delivered: source-backed 2025 estimates and ranking metrics for countries with explicit public annual cause totals available in-source (`US`, `UK`, `Canada`, `Australia`) plus a global estimate.
- Blocker still present: a reliable all-country machine export (FAOSTAT/OWID country tables) was not retrievable from this run environment, so full per-country world coverage remains pending.

## Sources used (thoroughly reviewed)
1. AnimalClock (US): https://animalclock.org/
2. AnimalClock (UK): https://animalclock.org/uk
3. AnimalClock (Canada): https://animalclock.org/ca/
4. AnimalClock (Australia): https://animalclock.org/au/
5. Fishcount (wild fish deaths): https://fishcount.org.uk/fish-count-estimates-2/numbers-of-fish-caught-from-the-wild-each-year
6. Fishcount (farmed fish deaths): https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-fish-slaughtered-each-year
7. Fishcount (farmed decapod crustaceans): https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans
8. Our World in Data insight on global animals slaughtered (~83 billion in 2022): https://ourworldindata.org/how-many-animals-get-slaughtered-every-day
9. Fish Welfare Initiative impact summary (fish helped per dollar): https://www.fishwelfareinitiative.org/impact
10. Shrimp Welfare Project cost-effectiveness summary: https://www.charityentrepreneurship.com/shrimp-welfare-project
11. Rethink Priorities (corporate campaign CE, chicken-years per dollar): https://rethinkpriorities.org/research-area/animal-welfare

## Scope and definitions
- `Land-animal deaths`: slaughtered terrestrial farmed animals.
- `Fish deaths`: finfish category from AnimalClock country pages (country rows), and split farmed/wild for global row using Fishcount.
- `Shellfish deaths`: mainly decapod crustaceans (shrimp/crab/lobster/prawn) as represented in cited sources.
- Year handling: country pages are treated as annualized current estimates and used as 2025 proxies; global totals use latest cited annual ranges and 2025 carry-forward.

## Country estimates (2025 proxy)

| Country | Land-animal deaths | Fish deaths | Shellfish deaths | Total deaths |
|---|---:|---:|---:|---:|
| United States | 8,533,141,034 | 3,797,000,000 | 43,109,000,000 | 55,439,141,034 |
| United Kingdom | 1,107,726,000 | 876,000,000 | 4,394,000,000 | 6,377,726,000 |
| Canada | 863,348,362 | 739,202,500 | 7,936,824,000 | 9,539,374,862 |
| Australia | 708,721,000 | 396,360,000 | 3,854,700,000 | 4,959,781,000 |

## World estimate (2025)
- `Land animals`: ~83 billion (OWID/FAOSTAT-based insight anchor)
- `Farmed fish`: ~130 billion (Fishcount central estimate)
- `Wild fish`: midpoint ~1.65 trillion (range ~1.1-2.2 trillion)
- `Farmed decapod crustaceans`: midpoint ~630 billion (range ~310-950 billion)

World total estimate:
- Midpoint: **~2.49 trillion** deaths
- Range: **~1.58 to 3.41 trillion** deaths

## Ranking metric (1): total number of deaths caused
- United States: `Shellfish` > `Land` > `Fish`
- United Kingdom: `Shellfish` > `Land` > `Fish`
- Canada: `Shellfish` > `Land` > `Fish`
- Australia: `Shellfish` > `Land` > `Fish`
- World (midpoint): `Wild fish` > `Shellfish` > `Farmed fish` > `Land`

## Ranking metric (2): per-animal deaths caused
Definition used for comparability:
- Cause share = cause deaths / total counted deaths in geography.

Cause shares:
- United States: Shellfish 77.8%, Land 15.4%, Fish 6.8%
- United Kingdom: Shellfish 68.9%, Land 17.4%, Fish 13.7%
- Canada: Shellfish 83.2%, Land 9.1%, Fish 7.7%
- Australia: Shellfish 77.7%, Land 14.3%, Fish 8.0%
- World (midpoint): Wild fish 66.2%, Shellfish 25.3%, Farmed fish 5.2%, Land 3.3%

## Ranking metric (3): deaths decreased per dollar spent (best-known, most effective)
Cause-level effectiveness anchors used:
- `Shellfish (shrimp-focused)`: up to ~1,333-1,500 animals helped per dollar (Shrimp Welfare Project material)
- `Land animals (chickens, corporate welfare reforms)`: ~9-120 chicken-years per dollar (Rethink Priorities synthesis)
- `Fish`: up to ~11 fish helped per dollar (Fish Welfare Initiative impact estimate)

Best-case ranking by deaths decreased per dollar:
- `Shellfish` > `Land animals` > `Fish`

## Important caveats
- Full all-country table is still blocked on source ingestion reliability in this environment; this report currently covers countries with directly available annual cause totals plus world totals.
- Cost-effectiveness values are intervention-specific and not country-calibrated; they are used for directional ranking, not exact national forecasts.
- Country fish categories in AnimalClock mix wild/farmed components, while world fish row is split using Fishcount; this is a harmonization compromise.
