# 2026 estimate: animal suffering by country and world

As of April 23, 2026, the site now estimates and ranks animal suffering in three buckets for every country and for the world:

1. `Factory-farmed animals`
2. `Non-insect wild animals`
3. `Insects`

The country and world cards are live model outputs, not a frozen table. They pull the latest available country rows from Our World in Data and World Bank sources at runtime, then rank the three buckets by:

1. `Total amount of suffering caused`
2. `Per-animal suffering caused`
3. `Amount of suffering decreased per dollar spent on this cause`

## What each bucket means

### Factory-farmed animals
- Built from OWID country rows for land animals slaughtered for meat, farmed fish killed, and farmed crustaceans killed.
- The live model combines chickens, pigs, ducks/geese/turkeys, bovines, farmed fish, and farmed crustaceans.
- Per-animal weights use the existing Rethink Priorities sentience and welfare-range medians already documented in the site.
- Per-dollar weights still use rough tractability anchors from chicken, pig, fish, and shrimp welfare work, so this order should be read as intervention guidance rather than a settled CE table.

### Non-insect wild animals
- Built from OWID / Fishcount wild-caught fish estimates plus the existing land-area-based wild-bird proxy.
- This is deliberately conservative: it still omits most wild mammals, reptiles, amphibians, and marine vertebrates.
- In practice, this bucket is usually dominated by wild-caught fish rather than birds.

### Insects
- `Total` ranking uses the existing land-area-based terrestrial arthropod estimate from Rosenberg et al. as an insect-heavy lower bound.
- `Improvement per dollar` uses the existing direct insecticide benchmark from Wild Animal Initiative rather than pretending the whole insect bucket is equally tractable.
- The model does not add the direct insecticide estimate to the wider wild-arthropod estimate, because that would double count a subset of insects.

## How the three ranking modes are computed

### Total suffering caused
- Formula: `animals counted or estimated * welfare proxy`
- This is a burden proxy, not a welfare-footprint hour estimate and not a moral-weight-adjusted DALY equivalent.
- The point is comparative ordering, not false precision.

### Per-animal suffering caused
- Formula: `total burden proxy / animals counted or estimated`
- For aggregated buckets, the site now uses a weighted average of the member species or sub-estimates.
- This makes the three bucket cards comparable even when a bucket contains several source series.

### Suffering decreased per dollar
- Formula: `total burden proxy * tractability factor`
- These tractability factors are deliberately rough:
- Factory-farmed animals are anchored to chicken, pig, fish, and shrimp welfare literature.
- Non-insect wild animals are heavily discounted because there is still little scalable, measured intervention evidence.
- Insects are anchored to direct insecticide reform rather than the whole insect bucket.

## Source-backed world picture today

These are the main global anchors behind the world card ordering:

- OWID reports `83 billion` land animals slaughtered for meat worldwide in `2022`.
- Fishcount's updated paper-backed wild-fish estimate is `1.1-2.2 trillion` fish caught annually on average for `2000-2019`, with species, country, and year estimates extended through `2003-2022`.
- Mood et al. estimate `78-171 billion` farmed fish killed in `2019`, midpoint `124 billion`.
- Fishcount estimates `310-950 billion` farmed decapod crustaceans killed in `2022`, midpoint `630 billion`.
- Callaghan et al. estimate roughly `50 billion` wild birds globally.
- Rosenberg et al. estimate roughly `1e19` soil arthropods globally.
- Wild Animal Initiative estimates roughly `3.5 quadrillion` insects directly affected each year on about `100 million` acres of U.S. farmland treated with lethal insecticides.

Given those anchors, the live world ranking should usually behave as follows:

- `Total suffering caused`: insects first by a very large margin; the second and third places are typically non-insect wild animals and factory-farmed animals, with the exact order depending heavily on the fish and crustacean rows loaded by the live data.
- `Per-animal suffering caused`: the order is sensitive to the live species mix, because birds and pigs carry higher per-being welfare proxies than shrimp or insects.
- `Suffering decreased per dollar`: insects usually rank above non-insect wild animals in the current proxy because the site anchors tractability to direct insecticide reform, while factory-farmed animals remain strong because shrimp and chicken interventions have much better measured CE evidence than wild-animal work.

## What changed in the site

- The animal panel no longer shows a grab bag of detailed cards when the automation brief asks for three causes.
- Countries now rank the three requested buckets directly.
- The world view now also shows an animal-only ranking instead of hiding the animal section unless a country is selected.
- The source footer now includes the added wild-caught-fish and Fishcount links used by the updated model.

## Important caveats

- This is still a proxy model, not a complete welfare-footprint atlas.
- Country wild-animal coverage is still conservative.
- The insect bucket is the least empirically secure and the most scale-sensitive.
- The per-dollar ranking is especially rough and should not be mistaken for a clean charity-ranking table.
- Live country results depend on the latest available rows in OWID and World Bank rather than a manually frozen 2026 spreadsheet.

## Core sources reviewed for this update

1. Our World in Data, "More than 80 billion land animals are slaughtered for meat every year" (2024): https://ourworldindata.org/data-insights/billions-of-chickens-ducks-and-pigs-are-slaughtered-for-meat-every-year
2. Our World in Data, "Animal Welfare": https://ourworldindata.org/animal-welfare
3. Fishcount, "Numbers of fish caught from the wild each year": https://fishcount.org.uk/fish-count-estimates-2/numbers-of-fish-caught-from-the-wild-each-year
4. Mood et al. 2023, "Estimating global numbers of farmed fishes killed for food annually from 1990 to 2019": https://pmc.ncbi.nlm.nih.gov/articles/PMC10936281/
5. Fishcount, "Numbers of farmed decapod crustaceans": https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans
6. Wild Animal Initiative, "Improving pest management for wild insect welfare": https://www.wildanimalinitiative.org/library/humane-insecticides
7. World Bank, land area and agricultural land indicators: https://data.worldbank.org/indicator/AG.LND.TOTL.K2 and https://data.worldbank.org/indicator/AG.LND.AGRI.K2
8. Callaghan et al. 2021, global bird abundance: https://pmc.ncbi.nlm.nih.gov/articles/PMC8166167/
9. Rosenberg et al. 2023, global soil arthropods: https://pmc.ncbi.nlm.nih.gov/articles/PMC9897674/
10. Fish Welfare Initiative, "How FWI Calculates Cost-Effectiveness": https://www.fishwelfareinitiative.org/post/cost-effectiveness
11. Shrimp Welfare Project, "(Shr)Impact": https://www.shrimpwelfareproject.org/shrimpact
12. Rethink Priorities, "Historical farmed animal welfare ballot initiatives": https://rethinkpriorities.org/research-area/a-cost-effectiveness-analysis-of-historical-farmed-animal-welfare-ballot-initiatives/
