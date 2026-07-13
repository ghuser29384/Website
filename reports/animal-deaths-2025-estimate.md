# 2025 estimate: top causes of animal deaths (world + country model)

## What this run delivers
- A source-backed **2025 world estimate** for major food-system animal-death causes.
- A transparent **country model** for 2025 deaths using each country's share of world population.
- Rankings for each geography by:
1. total deaths,
2. per-animal death intensity,
3. best-case deaths reduced per dollar.

## Scope and definitions
- Causes modeled:
1. `Land animals slaughtered for meat`
2. `Wild-caught finfish`
3. `Farmed finfish slaughtered`
4. `Farmed decapod crustaceans slaughtered` (shrimp/prawn/crab/crayfish/lobster in aquaculture)
- Units are annual individual deaths (not welfare-adjusted years).
- 2025 is estimated from latest source years (mostly 2022, plus longer-run fish estimates) with conservative carry-forward assumptions.

## Source anchors used in this run
1. OWID reports **83 billion** land animals slaughtered globally in 2022 (FAO-based).
2. Mood & Brooke (Animal Welfare, 2024) estimate **1.1-2.2 trillion** wild finfish annually (2000-2019 average midpoint 1.6 trillion; 2019 at 980-1,900 billion).
3. Fishcount (2025 update) estimates **130 billion** farmed finfish slaughtered in 2022 (range 86-180 billion).
4. Fishcount (2025 update) estimates **310-950 billion** farmed decapods slaughtered in 2022 (midpoint 630 billion).
5. ACE (2025) gives intervention cost-effectiveness ranges for animal welfare campaigns (hens/chickens, shrimp, fish).
6. Worldostats 2025 country table provides country shares of world population (world total shown: 8,231,613,070).

## 2025 world estimate used
Assumptions from source anchors:
- Land animals: 83b (2022) carried to **85b** in 2025.
- Wild finfish: midpoint anchor **1.6t** used for 2025 (kept near historical midpoint due high volatility + no robust 2025 count series in individuals).
- Farmed finfish: 130b (2022) carried to **136b** in 2025.
- Farmed decapods: 630b (2022 midpoint) carried to **790b** in 2025.

World 2025 totals (model midpoint):
- `Land`: **85,000,000,000**
- `Wild finfish`: **1,600,000,000,000**
- `Farmed finfish`: **136,000,000,000**
- `Farmed decapods`: **790,000,000,000**
- `Total`: **2,611,000,000,000**

## Ranking metric (1): total deaths caused (world)
1. `Wild finfish` (1.60t)
2. `Farmed decapods` (0.79t)
3. `Farmed finfish` (0.136t)
4. `Land animals` (0.085t)

## Ranking metric (2): per-animal deaths caused
Definition used here:
- Cause share of total annual counted deaths in that geography.

World shares:
- `Wild finfish`: **61.3%**
- `Farmed decapods`: **30.3%**
- `Farmed finfish`: **5.2%**
- `Land animals`: **3.3%**

Under the country allocation model below, these percentages are the same in each country.

## Country model for 2025
Country death count by cause is allocated by population share:

`country_deaths(cause) = world_deaths(cause) * country_share_of_world_population_2025`

This lets any country in the world be estimated from the 2025 population-share table.

## Country estimates (top 20 by population share)
| Country | Land | Wild finfish | Farmed finfish | Farmed decapods | Total |
|---|---:|---:|---:|---:|---:|
| India | 15,113,000,000 | 284,480,000,000 | 24,180,800,000 | 140,462,000,000 | 464,235,800,000 |
| China | 14,620,000,000 | 275,200,000,000 | 23,392,000,000 | 135,880,000,000 | 449,092,000,000 |
| United States | 3,587,000,000 | 67,520,000,000 | 5,739,200,000 | 33,338,000,000 | 110,184,200,000 |
| Indonesia | 2,949,500,000 | 55,520,000,000 | 4,719,200,000 | 27,413,000,000 | 90,601,700,000 |
| Pakistan | 2,635,000,000 | 49,600,000,000 | 4,216,000,000 | 24,490,000,000 | 80,941,000,000 |
| Nigeria | 2,456,500,000 | 46,240,000,000 | 3,930,400,000 | 22,831,000,000 | 75,457,900,000 |
| Brazil | 2,201,500,000 | 41,440,000,000 | 3,522,400,000 | 20,461,000,000 | 67,624,900,000 |
| Bangladesh | 1,810,500,000 | 34,080,000,000 | 2,896,800,000 | 16,827,000,000 | 55,614,300,000 |
| Russia | 1,487,500,000 | 28,000,000,000 | 2,380,000,000 | 13,825,000,000 | 45,692,500,000 |
| Ethiopia | 1,402,500,000 | 26,400,000,000 | 2,244,000,000 | 13,035,000,000 | 43,081,500,000 |
| Mexico | 1,360,000,000 | 25,600,000,000 | 2,176,000,000 | 12,640,000,000 | 41,776,000,000 |
| Japan | 1,275,000,000 | 24,000,000,000 | 2,040,000,000 | 11,850,000,000 | 39,165,000,000 |
| Egypt | 1,224,000,000 | 23,040,000,000 | 1,958,400,000 | 11,376,000,000 | 37,598,400,000 |
| Philippines | 1,207,000,000 | 22,720,000,000 | 1,931,200,000 | 11,218,000,000 | 37,076,200,000 |
| DR Congo | 1,164,500,000 | 21,920,000,000 | 1,863,200,000 | 10,823,000,000 | 35,770,700,000 |
| Vietnam | 1,045,500,000 | 19,680,000,000 | 1,672,800,000 | 9,717,000,000 | 32,115,300,000 |
| Iran | 952,000,000 | 17,920,000,000 | 1,523,200,000 | 8,848,000,000 | 29,243,200,000 |
| Turkey | 909,500,000 | 17,120,000,000 | 1,455,200,000 | 8,453,000,000 | 27,937,700,000 |
| Germany | 867,000,000 | 16,320,000,000 | 1,387,200,000 | 8,058,000,000 | 26,632,200,000 |
| Thailand | 739,500,000 | 13,920,000,000 | 1,183,200,000 | 6,873,000,000 | 22,715,700,000 |

For any other country in the world, apply the same formula using its 2025 world-population share.

## Ranking metric (3): deaths decreased per dollar spent (best known)
Using ACE 2025 ranges:
- Shrimp electrical stunning advocacy: **~1,100-2,200 animals per $**.
- Egg-laying hen campaigns: **~12-160 hen-years per $**.
- Broiler campaigns: **~0.2-90 chicken-years per $**.
- Farmed fish stunning commitments: **~2-36 animals per $**.

Best-case ordering by deaths reduced per dollar:
1. `Farmed decapods (shrimp-focused interventions)`
2. `Land birds (hen/broiler interventions)`
3. `Farmed finfish interventions`
4. `Wild-caught finfish` (insufficient similarly robust per-$ intervention estimates in the loaded source set)

## Important limitations
- Country results above are **allocation estimates** using population share, not country-specific slaughter/fisheries microdata by species.
- Real country cause mixes differ (e.g., stronger fish capture in coastal countries, stronger land-animal slaughter in some large producers).
- Wild-caught fish counts exclude unknown unrecorded capture; uncertainty remains large.
- “Per-dollar” values are intervention-dependent and may become less favorable as low-hanging opportunities are exhausted.

## Sources
1. OWID data insight (May 31, 2024): 83b land animals in 2022: https://ourworldindata.org/data-insights/billions-of-chickens-ducks-and-pigs-are-slaughtered-for-meat-every-year
2. OWID grapher metadata (updated 2026; FAO-based land-animal series): https://ourworldindata.org/grapher/hypothetical-land-animals-slaughtered
3. Mood & Brooke (2024), Animal Welfare / PubMed: wild fish 1.1-2.2t average annual (2000-2019): https://pubmed.ncbi.nlm.nih.gov/38510420/
4. Fishcount farmed finfish (2025 update; 2022 = 130b): https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-fish-slaughtered-each-year
5. Fishcount farmed decapods (2025 update; 2022 midpoint 630b): https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans
6. ACE corporate outreach evidence (Sept 24, 2025) cost-effectiveness ranges: https://animalcharityevaluators.org/blog/better-for-animals-the-evidence-behind-corporate-outreach-for-welfare-improvements/
7. Worldostats 2025 country population-share table: https://worldostats.com/
