# Assumptions and method notes

{
  "generated_at": "2026-07-04T16:35:05+00:00",
  "release_candidate_id": "release-candidate-2026-07-country-context-v0",
  "status": "release_candidate_no_numeric_values_published",
  "layer_contracts": [
    {
      "layer_id": "human-context-denominators",
      "issue_id": "issue.human-context",
      "metric_id": "population_land_context",
      "evidence_kind": "context",
      "unit_label": "people / sq km / hectares depending metric",
      "ranking_mode": "none",
      "comparability_group_id": "human-context-denominators",
      "evidence_compatibility_rule": "display-only denominators, not an animal-pain ranking"
    },
    {
      "layer_id": "factory-farmed-animals",
      "issue_id": "issue.factory-farmed-animals",
      "metric_id": "animals_slaughtered_proxy",
      "evidence_kind": "proxy",
      "unit_label": "animals/year or proxy count",
      "ranking_mode": "total_burden_proxy",
      "comparability_group_id": "animal-count-proxy-total",
      "evidence_compatibility_rule": "compare only with same metric, source vintage, and species aggregation rule"
    },
    {
      "layer_id": "farmed-fish",
      "issue_id": "issue.farmed-fish",
      "metric_id": "farmed_fish_killed_proxy",
      "evidence_kind": "proxy",
      "unit_label": "fish/year estimate or proxy count",
      "ranking_mode": "total_burden_proxy",
      "comparability_group_id": "aquatic-animal-count-proxy-total",
      "evidence_compatibility_rule": "compare only with same fish estimate methodology and reference period"
    },
    {
      "layer_id": "wild-caught-fish",
      "issue_id": "issue.wild-caught-fish",
      "metric_id": "wild_caught_fish_proxy",
      "evidence_kind": "proxy",
      "unit_label": "fish/year estimate or proxy count",
      "ranking_mode": "total_burden_proxy",
      "comparability_group_id": "aquatic-animal-count-proxy-total",
      "evidence_compatibility_rule": "compare only with same wild-caught estimate methodology and reference period"
    },
    {
      "layer_id": "farmed-crustaceans",
      "issue_id": "issue.farmed-crustaceans",
      "metric_id": "farmed_crustaceans_proxy",
      "evidence_kind": "proxy",
      "unit_label": "crustaceans/year estimate or proxy count",
      "ranking_mode": "total_burden_proxy",
      "comparability_group_id": "aquatic-animal-count-proxy-total",
      "evidence_compatibility_rule": "compare only with same crustacean estimate methodology and reference period"
    },
    {
      "layer_id": "insects-insecticide-proxy",
      "issue_id": "issue.insects",
      "metric_id": "insecticide_tonnes_proxy",
      "evidence_kind": "proxy",
      "unit_label": "tonnes insecticide/year",
      "ranking_mode": "pressure_proxy",
      "comparability_group_id": "insecticide-pressure-proxy",
      "evidence_compatibility_rule": "proxy for potential insect exposure pressure, not a count of insects harmed"
    },
    {
      "layer_id": "wild-animal-land-proxy-denominator",
      "issue_id": "issue.non-insect-wild-animals",
      "metric_id": "land_area_proxy",
      "evidence_kind": "proxy",
      "unit_label": "sq km / hectares",
      "ranking_mode": "pressure_proxy",
      "comparability_group_id": "land-area-pressure-proxy",
      "evidence_compatibility_rule": "denominator/proxy only; do not compare as direct wild animal suffering"
    }
  ],
  "promotion_gate": [
    "source snapshots captured",
    "licenses verified",
    "reference periods clear",
    "methods defined",
    "values QAed",
    "evidence kind not overstated",
    "comparability rules clear"
  ],
  "ui_caveats": [
    "This country card is a context proxy, not a direct measurement of total pain.",
    "Do not compare countries unless the same layer, unit, evidence kind, ranking mode, and reference period are shown.",
    "Boundary-only/no-data countries are shown for geographic orientation, not ranked pain estimates.",
    "Fishcount and other derived estimate sources require license review before values can be redistributed in PainMap artifacts."
  ]
}