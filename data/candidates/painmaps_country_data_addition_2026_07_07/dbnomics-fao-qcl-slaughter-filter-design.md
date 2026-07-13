# DBnomics FAO/QCL slaughter filter design

Generated: 2026-07-08T14:14:12.689689Z

## Scope

Design-only filter and inferred series-query plan for DBnomics FAO/QCL element 5320. No DBnomics series observations were fetched or parsed.

## Dataset metadata

- dataset_code: `QCL`
- dataset_name: `Production: Crops and livestock products`
- provider_name: `Food and Agriculture Organization of the United Nations`
- element_code: `5320`
- element_label: `Producing Animals/Slaughtered`
- dimensions: `['element', 'area', 'item']`

## Primary meat item whitelist

- `867`: Meat of cattle with the bone, fresh or chilled
- `947`: Meat of buffalo, fresh or chilled
- `977`: Meat of sheep, fresh or chilled
- `1017`: Meat of goat, fresh or chilled
- `1035`: Meat of pig with the bone, fresh or chilled
- `1058`: Meat of chickens, fresh or chilled
- `1069`: Meat of ducks, fresh or chilled
- `1073`: Meat of geese, fresh or chilled
- `1080`: Meat of turkeys, fresh or chilled
- `1097`: Horse meat, fresh or chilled
- `1108`: Meat of asses, fresh or chilled
- `1111`: Meat of mules, fresh or chilled
- `1127`: Meat of camels, fresh or chilled
- `1141`: Meat of rabbits and hares, fresh or chilled

## Manual-review animal items

- `1089`: Meat of pigeons and other birds n.e.c., fresh, chilled or frozen
- `1151`: Meat of other domestic rodents, fresh or chilled
- `1158`: Meat of other domestic camelids, fresh or chilled
- `1163`: Game meat, fresh, chilled or frozen
- `1166`: Other meat n.e.c. (excluding mammals), fresh, chilled or frozen
- `1176`: Snails, fresh, chilled, frozen, dried, salted or in brine, except sea snails

## Item classification summary

- `candidate_primary_meat_item`: 14
- `excluded_non_primary_or_aggregate_or_derivative`: 281
- `manual_review_required`: 6

## Series-query plan summary

- total query-plan rows: `3430`
- area-scope counts:
  - `all_qcl_area_codes_from_metadata`: 3430
- first-fetch-scope counts:
  - `candidate_validation_scope`: 14
  - `deferred_full_area_scope_after_review`: 3416

## Double-counting risk

All element-5320 series must not be fetched blindly because QCL contains offal, fat, live-animal, derivative, aggregate, and other item labels that may duplicate or distort slaughter counts. This design limits the initial candidate query plan to the explicit primary-meat whitelist and leaves ambiguous animal items in manual review.

## Candidate next fetch scope

`14` inferred query-plan rows are marked `first_fetch_scope=candidate_validation_scope`. All series URLs remain inferred and were not fetched.

## Decision status

- method_status: `candidate_filter_design_only_not_parse_eligible`
- query_plan_status: `candidate_query_plan_only_no_fetch`
- allowed_use_scope: filter design only; no numeric parsing; no country promotion
