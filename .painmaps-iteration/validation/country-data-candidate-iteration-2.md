# Country data candidate validation — iteration 2

## Purpose
Repair local TLS trust/path resolution and retry source snapshot fetching. No production data promotion.

## Git state
?? .painmaps-iteration/
?? about/painmap_country_data_addition_package.zip
?? data/candidates/painmaps_country_data_addition_2026_07_07/

## Candidate package location
/Users/HenryZhu/Library/Mobile Documents/com~apple~CloudDocs/painmap/bestthingsyoucando/data/candidates/painmaps_country_data_addition_2026_07_07

## HTTPS verification
Single-source urllib + ssl.create_default_context() test succeeded with HTTP 200.

## Fetch log
{
  "snapshots": 15,
  "ok": 13
}

## Fetch summary
snapshots: 15
status_counts: {'ok': 13, 'error': 2}

Successful snapshots:
- snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.1 https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=20000
  checksum: sha256 f958560b78db644282c7147853e0d1a7eff6e324625db44dbd719c0571fceaf4
  byte_size: 3512287
  retrieval_timestamp: 2026-07-07T10:23:47Z
- snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.2 https://api.worldbank.org/v2/country/all/indicator/AG.LND.TOTL.K2?format=json&per_page=20000
  checksum: sha256 fa2511c12343943bacc2bbfe901c64853525a388c599ba0c915a5637a1ae3f80
  byte_size: 3556710
  retrieval_timestamp: 2026-07-07T10:23:50Z
- snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.3 https://api.worldbank.org/v2/country/all/indicator/AG.LND.AGRI.K2?format=json&per_page=20000
  checksum: sha256 68d32178d5806c1d34cd29f34159fe7742668aea1d981f20d60a045943f24eee
  byte_size: 3696853
  retrieval_timestamp: 2026-07-07T10:23:54Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.1 https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv?csvType=full&useColumnShortNames=false
  checksum: sha256 1954b498f4cf29e18b5389959da20a13bed22d44a9f658db69e2d4ca6fb0ccdf
  byte_size: 1102112
  retrieval_timestamp: 2026-07-07T10:23:57Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.2 https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.metadata.json?csvType=full&useColumnShortNames=false
  checksum: sha256 0bee3e0bb858ebe54b767a3aeccde165808ed5fa4cfe735b4fb6c22c8ad1f116
  byte_size: 11815
  retrieval_timestamp: 2026-07-07T10:23:58Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.1 https://ourworldindata.org/grapher/farmed-fish-killed.csv?csvType=full&useColumnShortNames=false
  checksum: sha256 cd27b75f61af6fbebb12fed01cda2d1655f0f5d84690299455bb114ffb501354
  byte_size: 29395
  retrieval_timestamp: 2026-07-07T10:24:00Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.2 https://ourworldindata.org/grapher/farmed-fish-killed.metadata.json?csvType=full&useColumnShortNames=false
  checksum: sha256 3c794f096ce7bacd88119724dd9248523e36ba90a06c2e3d9f3859d2bf7c7e68
  byte_size: 4835
  retrieval_timestamp: 2026-07-07T10:24:00Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.1 https://ourworldindata.org/grapher/wild-caught-fish.csv?csvType=full&useColumnShortNames=false
  checksum: sha256 41c60a6411b644028d7392a5acc98745f0288cc2b6fb8a9cf7172bdf594d84d5
  byte_size: 13475
  retrieval_timestamp: 2026-07-07T10:24:02Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.2 https://ourworldindata.org/grapher/wild-caught-fish.metadata.json?csvType=full&useColumnShortNames=false
  checksum: sha256 9443a464a68a404edcd4266aa014adc9e91054444e7a60e53d2935921a1b63f6
  byte_size: 4006
  retrieval_timestamp: 2026-07-07T10:24:03Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.1 https://ourworldindata.org/grapher/farmed-crustaceans.csv?csvType=full&useColumnShortNames=false
  checksum: sha256 ec497f2d0d9371c69d54b3d1aad15e376d0966547bbe2e238b9bdea316222906
  byte_size: 14004
  retrieval_timestamp: 2026-07-07T10:24:04Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.2 https://ourworldindata.org/grapher/farmed-crustaceans.metadata.json?csvType=full&useColumnShortNames=false
  checksum: sha256 acac734f35cb7dfd8eb2eed948a1e2e53e33a40594bc048d3184da4a8e863d04
  byte_size: 3437
  retrieval_timestamp: 2026-07-07T10:24:06Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.1 https://ourworldindata.org/grapher/insecticide-use.csv?v=1&csvType=full&useColumnShortNames=false
  checksum: sha256 7928a819d2bf54eb9d8373ceed422bf8de149caabb3dcdbf7ef669a590c12651
  byte_size: 197013
  retrieval_timestamp: 2026-07-07T10:24:08Z
- snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.2 https://ourworldindata.org/grapher/insecticide-use.metadata.json?v=1&csvType=full&useColumnShortNames=false
  checksum: sha256 9693fd4135842dc5ba61a9113a7d89b4ad1292bb80772d97d6dee21bf96b1687
  byte_size: 1355
  retrieval_timestamp: 2026-07-07T10:24:09Z

Failed snapshots:
- snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-fish.1 https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-fish-slaughtered-each-year
  error: <HTTPError 401: 'Unauthorized'>
- snapshot.release-candidate-2026-07-07.country-context.v0.fishcount-farmed-decapods.1 https://fishcount.org.uk/fish-count-estimates-2/numbers-of-farmed-decapod-crustaceans
  error: <HTTPError 401: 'Unauthorized'>

## Files created
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.1.csv
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-crustaceans.2.json
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.1.csv
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-farmed-fish-killed.2.json
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.1.csv
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-insecticide-use-fao.2.json
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.1.csv
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-land-animals-slaughtered.2.json
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.1.csv
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.owid-wild-caught-fish.2.json
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.1.html
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.2.html
fetched-source-snapshots/snapshot.release-candidate-2026-07-07.country-context.v0.world-bank-wdi-api.3.html

## Data promotion status
No numeric data parsed. No release artifacts regenerated. No countries promoted.

## Next question for ChatGPT
Given these fetch results, which exact source snapshots should Codex license-review and parse next, and which should remain blocked?
