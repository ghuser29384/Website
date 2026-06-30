const d3 = window.d3;
const topojsonFeature = window.topojson?.feature;

if (!d3 || !topojsonFeature) {
  throw new Error("PainMap vendor libraries failed to load.");
}

const COUNTRY_DATA_URL = "data/natural-earth-countries.geojson";
const COUNTRY_DATA_FALLBACK_URL = "data/countries-lite.geojson";
const COVERAGE_DATA_URL = "v1/coverage.json";
const RELEASE_MODES_DATA_URL = "/data/release-modes.json";
const PLACE_INDEX_URL = "v1/places/index.json";
const GSAP_ADM1_DATA_URL = "data/gsap-adm1-2023.json";
const RELEASE_ID = "2026-05-31.atlas.2";
const ISSUE_TRACKER_TEMPLATE_URL = "https://github.com/ghuser29384/Website/issues/new";
const TELEMETRY_ENDPOINT = document.documentElement.dataset.telemetryEndpoint || "";
const reducedMotionMediaQuery = window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)")
  : null;
let reducedMotionPreference = Boolean(reducedMotionMediaQuery?.matches);

if (reducedMotionMediaQuery) {
  document.documentElement.dataset.reducedMotion = reducedMotionPreference ? "reduce" : "no-preference";
}

const prefersReducedMotion = () => reducedMotionPreference;

const handleReducedMotionPreferenceChange = (event) => {
  reducedMotionPreference = Boolean(event?.matches);
  document.documentElement.dataset.reducedMotion = reducedMotionPreference ? "reduce" : "no-preference";

  if (!reducedMotionPreference) {
    return;
  }

  if (typeof svg !== "undefined" && svg?.interrupt) {
    svg.interrupt();
  }

  if (typeof projection === "object" && projection && typeof projection.rotate === "function" && typeof renderGlobe === "function") {
    const rotate = projection.rotate();
    projection.rotate([rotate[0], rotate[1], 0]);
    renderGlobe();
  }
};

if (reducedMotionMediaQuery) {
  if (typeof reducedMotionMediaQuery.addEventListener === "function") {
    reducedMotionMediaQuery.addEventListener("change", handleReducedMotionPreferenceChange);
  } else {
    reducedMotionMediaQuery.addListener(handleReducedMotionPreferenceChange);
  }
}
const RELEASE_MODES = {
  snapshot: {
    label: "Snapshot",
    status:
      "Snapshot mode is active. The atlas is using immutable release artifacts and local static assets.",
    topbarNote:
      "Snapshot mode reads the frozen release contract first: place index, coverage status, schemas, checksums, and local boundary assets. Live public-source rows stay off until the Live overlay tab is selected.",
  },
  live: {
    label: "Live overlay",
    status:
      "Live overlay mode is active. Public upstream rows may load in the browser and remain outside the frozen release measurements.",
    topbarNote:
      "Live overlay mode keeps the atlas place-first while adding current public-source context from World Bank, OWID, geoBoundaries, and WorldPop where available. These overlays are labeled separately from release rows.",
  },
};

function normalizeReleaseMode(value) {
  return value === "live" ? "live" : "snapshot";
}

function parseReleaseModesPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }

  const modes = {};
  const list = Array.isArray(rawPayload.modes) ? rawPayload.modes : [];

  for (const mode of list) {
    if (!mode || typeof mode !== "object") {
      continue;
    }

    const modeId = normalizeReleaseMode(mode.id);
    if (!modeId) {
      continue;
    }

    modes[modeId] = {
      label: String(mode.label || RELEASE_MODES[modeId].label),
      status: String(mode.status || mode.replay_rule || ""),
      topbarNote:
        typeof mode.network_behavior === "string" && mode.network_behavior.trim()
          ? String(mode.network_behavior)
          : "Live overlay mode keeps current public-source context separate from frozen release rows.",
      badge: mode.badge,
      cache_rule: mode.cache_rule,
      replay_rule: mode.replay_rule,
      network_behavior: mode.network_behavior,
      included_surfaces: mode.included_surfaces || [],
      upstream_sources: mode.upstream_sources || [],
    };
  }

  if (!modes.snapshot) {
    modes.snapshot = RELEASE_MODES.snapshot;
  }

  if (!modes.live) {
    modes.live = RELEASE_MODES.live;
  }

  return {
    release_id: String(rawPayload.release_id || RELEASE_ID),
    generated_at: String(rawPayload.generated_at || ""),
    default_mode: normalizeReleaseMode(rawPayload.default_mode),
    local_event_name: rawPayload.local_event_name || "release_mode_selected",
    modes,
    ui_contract: rawPayload.ui_contract || null,
  };
}

function getReleaseModeConfig(mode) {
  const key = normalizeReleaseMode(mode);
  return state.releaseModeContract?.modes?.[key] || RELEASE_MODES[key] || RELEASE_MODES.snapshot;
}

function isModeContractSupported(mode) {
  const key = normalizeReleaseMode(mode);
  return Boolean(state.releaseModeContract?.modes?.[key] || RELEASE_MODES[key]);
}

function releaseModeTelemetryEventName() {
  return (state.releaseModeContract?.local_event_name || "release_mode_selected").trim();
}

const GLOBE_ROTATION = [-18, -14, 0];
const width = 900;
const height = 900;
const ATLAS_BASE_SCALE = 180;
const GLOBE_BASE_SCALE = 388;
const ATLAS_MAX_SCALE = ATLAS_BASE_SCALE * 4.8;
const GLOBE_MAX_SCALE = GLOBE_BASE_SCALE * 3.25;
const EARTH_RADIUS_KM = 6371.0088;
const WORLDPOP_YEAR = 2020;
const ISSUE_DATA_DATE_RANGE = "2010:2025";
const ISSUE_CONTEXT_INDICATORS = [
  "SP.POP.TOTL",
  "SP.DYN.CBRT.IN",
  "AG.LND.TOTL.K2",
  "AG.LND.AGRI.K2",
  "SP.DYN.LE00.IN",
];
const TERRESTRIAL_SOIL_ARTHROPODS_PER_SQKM = 6.7e10;
const GLOBAL_LAND_AREA_SQKM = 1.489e8;
const GLOBAL_WILD_BIRD_ESTIMATE = 5e10;
const WILD_BIRDS_PER_SQKM = GLOBAL_WILD_BIRD_ESTIMATE / GLOBAL_LAND_AREA_SQKM;
const WORLD_RANK_LIMIT = 10;
const SERVICE_WORKER_SCRIPT = "/service-worker.js";
const STATIC_WORLD_ANIMAL_ISSUES = [
  {
    id: "fallback-factory-farmed",
    worldKind: "animal-suffering",
    tag: "Animal category · Fallback",
    title: "Factory-farmed animals",
    metric: "Public export row: factory-farmed animals",
    body: "Canonical release fallback for farmed-animal burden while live OWID/Fishcount rows are unavailable.",
    source:
      "Source: PainMap place-measurements release artifact, OWID/Fishcount-style country and world animal rows, Rethink Priorities welfare-range assumptions. Data vintage: 2026-05-31.atlas.2 fallback.",
    ranking: {
      improvement: { score: 3, raw: 3000, metric: "static tractability-adjusted burden proxy" },
      total: { score: 3, raw: 3000, metric: "static total burden proxy" },
      "per-being": { score: 0.35, raw: 0.35, metric: "static welfare-range proxy" },
    },
  },
  {
    id: "fallback-wild-insects",
    worldKind: "animal-suffering",
    tag: "Animal category · Fallback",
    title: "Insects",
    metric: "Public export row: wild and human-affected insects",
    body: "Canonical release fallback for insect scale using land-area and insecticide-source assumptions.",
    source:
      "Source: PainMap place-measurements release artifact, World Bank land-area indicators, OWID insecticide-use data, Wild Animal Initiative benchmark. Data vintage: 2026-05-31.atlas.2 fallback.",
    ranking: {
      improvement: { score: 2.4, raw: 250, metric: "static tractability-adjusted insect proxy" },
      total: { score: 3.4, raw: 6000, metric: "static total insect burden proxy" },
      "per-being": { score: 0.08, raw: 0.08, metric: "static sentience and welfare-range proxy" },
    },
  },
];
const STATIC_WORLD_SUFFERING_ISSUES = [
  {
    id: "fallback-human-burden",
    worldKind: "human-suffering",
    tag: "Human burden · Fallback",
    title: "Human suffering burden indicators",
    metric: "Public export row: World Bank indicator proxy",
    body: "Canonical release fallback for human burden while live World Bank WLD rows are unavailable.",
    source:
      "Source: PainMap place-measurements release artifact and World Bank indicator API. Data vintage: World Bank 2010:2025 latest non-null window.",
    ranking: {
      improvement: { score: 2.8, raw: 800, metric: "static global-health tractability proxy" },
      total: { score: 2.7, raw: 650, metric: "static total human burden proxy" },
      "per-being": { score: 0.45, raw: 0.45, metric: "static per-being severity proxy" },
    },
  },
  ...STATIC_WORLD_ANIMAL_ISSUES,
];
const CANONICAL_PROFILE_COUNTRIES = new Set(["BRA", "IND"]);
const COVERAGE_STATUS = {
  canonicalProfile: "canonical_country_profile",
  canonicalMeasurement: "canonical_measurements",
  boundaryOnly: "boundary_index_only",
  adm1Overlay: "adm1_context_overlay",
  noData: "no_data",
};
const COVERAGE_STATUS_TEXT = {
  [COVERAGE_STATUS.canonicalProfile]: "canonical profile",
  [COVERAGE_STATUS.boundaryOnly]: "boundary-only release index",
  [COVERAGE_STATUS.adm1Overlay]: "ADM1 context overlay",
  [COVERAGE_STATUS.noData]: "no release coverage",
};
const COVERAGE_STATUS_LABEL = {
  [COVERAGE_STATUS.canonicalProfile]: "canonical country profile (release measurements available)",
  [COVERAGE_STATUS.boundaryOnly]: "boundary-indexed country; no country measurement rows",
  [COVERAGE_STATUS.adm1Overlay]: "ADM1 context overlay with release-backed boundary index",
  [COVERAGE_STATUS.noData]: "release coverage unavailable",
};
const COVERAGE_STATUS_BADGE_LABEL = {
  [COVERAGE_STATUS.canonicalProfile]: "canonical profile",
  [COVERAGE_STATUS.boundaryOnly]: "boundary-only",
  [COVERAGE_STATUS.adm1Overlay]: "ADM1 context",
  [COVERAGE_STATUS.noData]: "no coverage",
};
const COVERAGE_STATUS_CLASS = {
  [COVERAGE_STATUS.canonicalProfile]: "has-release-measurements is-low-confidence",
  [COVERAGE_STATUS.boundaryOnly]: "is-boundary-only is-very-low-confidence",
  [COVERAGE_STATUS.adm1Overlay]: "is-boundary-only is-very-low-confidence",
  [COVERAGE_STATUS.noData]: "is-boundary-only is-very-low-confidence",
};
const COVERAGE_MISSING_HINT = {
  [COVERAGE_STATUS.canonicalProfile]: "Missing inputs: none for current release coverage.",
  [COVERAGE_STATUS.boundaryOnly]:
    "Missing canonical country-level measurement rows for this country in this release.",
  [COVERAGE_STATUS.adm1Overlay]:
    "Missing canonical country-level measurements; ADM1 context is available only as an overlay.",
  [COVERAGE_STATUS.noData]: "No indexed rows are available for this place in this release.",
};
const COVERAGE_PROMOTION_HINT = {
  [COVERAGE_STATUS.canonicalProfile]: "Already publishable as a canonical country profile in this snapshot.",
  [COVERAGE_STATUS.boundaryOnly]:
    "Add country measurement rows with release-reviewed methods, sources, and provenance to promote.",
  [COVERAGE_STATUS.adm1Overlay]:
    "Add country-level measurement rows in a future release to promote beyond ADM1 context coverage.",
  [COVERAGE_STATUS.noData]:
    "Create a release-indexed country profile in a future release for this place.",
};

const RELEASE_COVERAGE_FALLBACK = {
  release_id: RELEASE_ID,
  generated_at: "2026-05-31",
  last_release_date: "2026-05-31",
  coverage_status: {
    places_indexed: 2114,
    country_boundaries_indexed: 239,
    canonical_country_profiles: 2,
    canonical_place_profiles: 3,
    release_measurements: 8,
    evidence_layer_coverage: {
      direct: 0,
      modeled: 0,
      proxy: 6,
      priority_overlay: 2,
      boundary: 239,
      adm1_context_overlay: 1874,
      no_data: 0,
    },
    adm1_boundaries: {
      status: "runtime_boundary_overlay_with_static_context_index",
      release_scoped_count: 0,
      static_context_count: 1874,
      static_page_count: 120,
      source:
        "geoBoundaries ADM1 loaded on demand by selected country; World Bank GSAP ADM1 poverty context is vendored as a static overlay index",
    },
  },
  known_sparse_areas: [
    {
      area: "Boundary-only countries",
      status: "237 country places have Natural Earth boundaries but no canonical measurement rows in this release.",
    },
    {
      area: "ADM1 measurements",
      status:
        "1874 ADM1 poverty-context rows are indexed as a labeled static overlay, and 120 high-priority ADM1 pages are pre-rendered. No ADM1 rows are canonical pain measurements in this release.",
    },
    {
      area: "Direct evidence by place",
      status:
        "Direct welfare evidence is not yet represented as country or ADM1 measurement rows; current country rows are proxy and priority-overlay records.",
    },
    {
      area: "Release/live split",
      status:
        "Immutable release artifacts are available; homepage live public-source overlays are labeled separately and remain outside the frozen release rows.",
    },
  ],
  default_ranking_readiness: {
    ready: false,
    enabled: false,
    reason:
      "Coverage is sparse: only 2 canonical country profiles are present across 239 country boundary entries.",
    release_note_url: "/updates/",
    rule: "default_ranking_readiness = canonical_country_profiles >= 10 and canonical_ratio >= 0.35 and (direct + proxy + priority_overlay + release_measurements) >= 10",
  },
};
const INSECT_WELFARE_PROXY = {
  sentience: { median: 0.226, low: 0.002, high: 0.573 },
  welfareRange: { median: 0.029, low: 0, high: 0.244 },
};
const US_2017_INSECTICIDE_USE_TONNES = 72534;
const WAI_US_TREATED_AGRICULTURAL_LAND_SQKM = 4.5e5;
const WAI_US_INSECTS_AFFECTED_2017 = 3.5e15;
const WAI_INSECTS_PER_TREATED_SQKM =
  WAI_US_INSECTS_AFFECTED_2017 / WAI_US_TREATED_AGRICULTURAL_LAND_SQKM;
const WAI_US_EQUIVALENT_TREATED_SQKM_PER_TONNE =
  WAI_US_TREATED_AGRICULTURAL_LAND_SQKM / US_2017_INSECTICIDE_USE_TONNES;
const GLOBE_MODES = {
  suffering: {
    label: "Top Causes of Suffering by Country",
    topbarNote:
      "PainMap begins as a place-first atlas: choose a country or province, inspect pain-source layers, and keep source, vintage, evidence kind, and uncertainty beside visible values.",
    globeCopy:
      "Atlas layer: compare country-level human, farmed-animal, wild-animal, and insect suffering burdens while keeping event-level pain evidence linked to the same source registry.",
    humanSectionLabel: "Human suffering",
    animalSectionLabel: "Animal suffering causes",
    showAnimals: true,
    rankingModes: {
      improvement: {
        label: "Available decrease in suffering per dollar",
        copy:
          "Whole World combines human severity proxies with animal welfare-range proxies. Human tractability is anchored to recurring GiveWell, Giving What We Can, and The Life You Can Save priorities; animal tractability uses welfare-focused anchors from chicken, fish, and shrimp intervention literature, while wild-animal interventions stay heavily discounted.",
      },
      total: {
        label: "Total amount of suffering caused",
        copy:
          "Whole World uses affected-person proxies for humans and sentience-adjusted or welfare-range-weighted counts for animals, including wild terrestrial arthropod and wild-bird estimates plus a direct human-caused insect estimate.",
      },
      "per-being": {
        label: "Amount of suffering suffered per being",
        copy:
          "Whole World uses a human severity proxy per affected person and animal welfare-range or sentience medians per animal. Bentham's Bulldog's arguments about pain in simpler animals still make the current animal per-being numbers conservative rather than aggressive.",
      },
    },
  },
  death: {
    label: "Top Causes of Death by Country",
    topbarNote:
      "Death mode keeps the atlas place-first while switching the layer stack toward human life-years lost and explicit mortality source metadata.",
    globeCopy:
      "Atlas layer: compare country-level death burdens while keeping evidence kind, source vintage, and uncertainty attached to the visible rankings.",
    humanSectionLabel: "Human deaths",
    animalSectionLabel: "",
    showAnimals: false,
    rankingModes: {
      improvement: {
        label: "Available increase in life-years per dollar",
        copy:
          "Whole World uses tractability-adjusted life-years. Human causes are anchored to established global-health intervention priorities; animal death causes are discounted harder because most measured animal interventions reduce suffering more directly than they extend lives.",
      },
      total: {
        label: "Total number of life-years taken away",
        copy:
          "Whole World multiplies death counts by remaining-life proxies. Human causes use World Bank death counts plus WHO-style age-profile anchors; animal causes use slaughter counts plus conservative remaining-lifespan proxies.",
      },
      "per-being": {
        label: "Number of life-years taken away per being",
        copy:
          "Whole World compares how much life a typical death removes. Human causes use life expectancy minus a rough age-at-death anchor; animal causes use conservative species-typical remaining-lifespan proxies.",
      },
    },
  },
};
const SUFFERING_ISSUE_MODELS = [
  {
    id: "SH.DYN.MORT",
    title: "Preventable child mortality",
    support: ["GiveWell", "Giving What We Can", "The Life You Can Save"],
    weight: 1.25,
    totalBurden: (value, context) => (value / 1000) * context.births,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 1000) * context.births)} under-5 deaths per year proxy`,
    score: (value) => Math.min(100, (value / 80) * 100),
    metric: (value) => `${value.toFixed(1)} under-5 deaths per 1,000 live births`,
    body: (value, country) => {
      if (value >= 60) {
        return `${country} still shows a very high burden of preventable child death relative to low-mortality settings.`;
      }

      if (value >= 25) {
        return `${country} still faces materially elevated under-5 mortality in the latest available country reading.`;
      }

      return `${country} is below the highest-burden range here, but preventable child death still remains part of the tracked issue set.`;
    },
  },
  {
    id: "SH.MLR.INCD.P3",
    title: "Malaria burden",
    support: ["GiveWell", "Giving What We Can", "The Life You Can Save"],
    weight: 1.22,
    totalBurden: (value, context) => (value / 1000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 1000) * context.population)} malaria cases proxy`,
    score: (value) => Math.min(100, (value / 200) * 100),
    metric: (value) => `${value.toFixed(1)} malaria cases per 1,000 people at risk`,
    body: (value, country) => {
      if (value >= 100) {
        return `${country} remains in the highest malaria-burden range in this model rather than facing only residual transmission.`;
      }

      if (value >= 20) {
        return `${country} still shows substantial malaria exposure in the latest available national data.`;
      }

      return `${country} looks lower-burden on malaria than the worst-hit countries, though the issue remains tracked because it is so prominent in the source set.`;
    },
  },
  {
    id: "SH.STA.STNT.ZS",
    title: "Child undernutrition",
    support: ["GiveWell", "Giving What We Can", "The Life You Can Save"],
    weight: 1.12,
    totalBurden: (value, context) => (value / 100) * context.under5Population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100) * context.under5Population)} children stunted proxy`,
    proxy: "Country-level proxy for micronutrient and vitamin A related child-health burden.",
    score: (value) => Math.min(100, (value / 45) * 100),
    metric: (value) => `${value.toFixed(1)}% of children under 5 are stunted`,
    body: (value, country) => {
      if (value >= 30) {
        return `${country} still shows a very heavy child undernutrition burden rather than an isolated nutrition shortfall.`;
      }

      if (value >= 15) {
        return `${country} still faces a meaningful child undernutrition burden in the latest available reading.`;
      }

      return `${country} looks comparatively lower on this nutrition proxy than the highest-burden countries in the data set.`;
    },
  },
  {
    id: "SH.IMM.IDPT",
    title: "Routine immunization gap",
    support: ["GiveWell", "Giving What We Can", "The Life You Can Save"],
    weight: 1.05,
    totalBurden: (value, context) => ((100 - value) / 100) * context.births,
    totalMetric: (value, context) =>
      `${formatCompactNumber(((100 - value) / 100) * context.births)} missed childhood immunizations proxy`,
    proxy:
      "Country-level proxy for missed routine childhood vaccination, using DPT coverage among children ages 12-23 months.",
    score: (value) => Math.min(100, (Math.max(0, 100 - value) / 35) * 100),
    metric: (value) => `${Math.max(0, 100 - value).toFixed(1)}% miss basic DPT immunization`,
    body: (value, country) => {
      const gap = Math.max(0, 100 - value);

      if (gap >= 15) {
        return `${country} still shows a large routine-vaccination gap rather than near-universal childhood coverage.`;
      }

      if (gap >= 5) {
        return `${country} still has a meaningful immunization shortfall in the latest available country data.`;
      }

      return `${country} is closer to broad routine-vaccine coverage than the higher-burden countries in this model.`;
    },
  },
  {
    id: "SI.POV.DDAY",
    title: "Severe income poverty",
    support: ["Giving What We Can", "The Life You Can Save"],
    weight: 0.92,
    totalBurden: (value, context) => (value / 100) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100) * context.population)} people in severe poverty`,
    proxy: "This uses the World Bank's $3.00 a day poverty line in 2021 PPP terms as a cross-country cash-poverty signal.",
    score: (value) => Math.min(100, (value / 35) * 100),
    metric: (value) => `${value.toFixed(1)}% live below $3.00 a day (2021 PPP)`,
    body: (value, country) => {
      if (value >= 20) {
        return `A large share of people in ${country} still live in severe income poverty in the latest comparable reading.`;
      }

      if (value >= 5) {
        return `${country} still shows non-trivial severe poverty exposure rather than only edge-case deprivation.`;
      }

      return `${country} looks comparatively lower on this cash-poverty measure than the highest-burden countries in the set.`;
    },
  },
  {
    id: "SH.STA.MMRT",
    title: "Maternal mortality risk",
    support: ["Giving What We Can", "The Life You Can Save"],
    weight: 0.82,
    totalBurden: (value, context) => (value / 100000) * context.births,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.births)} maternal deaths per year proxy`,
    score: (value) => Math.min(100, (value / 350) * 100),
    metric: (value) => `${value.toFixed(0)} maternal deaths per 100,000 live births`,
    body: (value, country) => {
      if (value >= 200) {
        return `${country} still shows a very high maternal mortality burden, which usually signals wider health-system weakness.`;
      }

      if (value >= 70) {
        return `${country} still faces a substantial maternal health burden in the latest available reading.`;
      }

      return `${country} is below the highest-burden range on maternal mortality, though the issue still remains morally significant.`;
    },
  },
  {
    id: "SH.STA.BASS.ZS",
    title: "Sanitation and diarrheal risk",
    support: ["Giving What We Can", "The Life You Can Save"],
    weight: 0.78,
    totalBurden: (value, context) => ((100 - value) / 100) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber(((100 - value) / 100) * context.population)} people lacking basic sanitation`,
    proxy: "Country-level proxy for diarrheal and WASH-related burden, using access to at least basic sanitation.",
    score: (value) => Math.min(100, (Math.max(0, 100 - value) / 50) * 100),
    metric: (value) => `${Math.max(0, 100 - value).toFixed(1)}% lack at least basic sanitation`,
    body: (value, country) => {
      const gap = Math.max(0, 100 - value);

      if (gap >= 30) {
        return `${country} still has a large sanitation gap, which points to persistent environmental and infectious-disease risk.`;
      }

      if (gap >= 10) {
        return `${country} still has a meaningful sanitation shortfall rather than near-universal basic coverage.`;
      }

      return `${country} appears closer to universal basic sanitation than the higher-burden countries in this tracked set.`;
    },
  },
  {
    id: "SN.ITK.MSFI.ZS",
    title: "Food insecurity",
    priorityLabel: "Cross-country burden",
    prioritySource:
      "Broader burden layer: direct deprivation signal from the World Bank country indicator set.",
    weight: 0.88,
    totalBurden: (value, context) => (value / 100) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100) * context.population)} people in moderate or severe food insecurity`,
    proxy:
      "Country-level deprivation proxy using the share of people facing moderate or severe food insecurity.",
    score: (value) => Math.min(100, (value / 55) * 100),
    metric: (value) => `${value.toFixed(1)}% face moderate or severe food insecurity`,
    body: (value, country) => {
      if (value >= 35) {
        return `${country} still shows a very large food-security burden rather than only marginal nutrition stress.`;
      }

      if (value >= 15) {
        return `${country} still faces a substantial food-security shortfall in the latest comparable reading.`;
      }

      return `${country} looks lower on this food-insecurity measure than the highest-burden countries, but the issue is still tracked because it maps directly onto deprivation.`;
    },
  },
  {
    id: "EN.ATM.PM25.MC.M3",
    title: "Air pollution exposure",
    priorityLabel: "Cross-country burden",
    prioritySource:
      "Broader burden layer: chronic environmental health exposure from the World Bank country indicator set.",
    weight: 0.84,
    totalBurden: (value, context) => (value / 100) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100) * context.population)} exposure-weighted people proxy`,
    proxy: "Country-level proxy for chronic air-pollution burden using mean annual PM2.5 exposure.",
    score: (value) => Math.min(100, (value / 80) * 100),
    metric: (value) => `${value.toFixed(1)} ug/m3 annual PM2.5 exposure`,
    body: (value, country) => {
      if (value >= 50) {
        return `${country} remains in a very high PM2.5 exposure range, pointing to a large chronic pollution burden rather than only isolated hot spots.`;
      }

      if (value >= 20) {
        return `${country} still has materially elevated air-pollution exposure in the latest available reading.`;
      }

      return `${country} is lower on this air-pollution measure than the worst-affected countries, though the burden is still morally relevant.`;
    },
  },
  {
    id: "EG.CFT.ACCS.ZS",
    title: "Dirty household fuel use",
    priorityLabel: "Cross-country burden",
    prioritySource:
      "Broader burden layer: household energy deprivation and smoke exposure from the World Bank indicator set.",
    weight: 0.82,
    totalBurden: (value, context) => ((100 - value) / 100) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber(((100 - value) / 100) * context.population)} people lacking clean cooking access`,
    proxy:
      "Country-level proxy using access to clean fuels and technologies for cooking; the burden is concentrated in households still relying on dirtier fuels.",
    score: (value) => Math.min(100, (Math.max(0, 100 - value) / 70) * 100),
    metric: (value) => `${Math.max(0, 100 - value).toFixed(1)}% lack clean cooking access`,
    body: (value, country) => {
      const gap = Math.max(0, 100 - value);

      if (gap >= 50) {
        return `${country} still has a very large household-fuel burden, which usually means heavy indoor smoke exposure and drudgery remain widespread.`;
      }

      if (gap >= 20) {
        return `${country} still shows a meaningful clean-cooking access shortfall in the latest available data.`;
      }

      return `${country} is closer to broad clean-cooking access than the higher-burden countries on this measure.`;
    },
  },
  {
    id: "SH.H2O.BASW.ZS",
    title: "Unsafe drinking water",
    priorityLabel: "Cross-country burden",
    prioritySource:
      "Broader burden layer: basic service deprivation from the World Bank country indicator set.",
    weight: 0.8,
    totalBurden: (value, context) => ((100 - value) / 100) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber(((100 - value) / 100) * context.population)} people lacking basic drinking water`,
    proxy: "Country-level proxy using access to at least basic drinking water services.",
    score: (value) => Math.min(100, (Math.max(0, 100 - value) / 45) * 100),
    metric: (value) => `${Math.max(0, 100 - value).toFixed(1)}% lack basic drinking water services`,
    body: (value, country) => {
      const gap = Math.max(0, 100 - value);

      if (gap >= 25) {
        return `${country} still shows a large drinking-water access gap rather than near-universal basic service.`;
      }

      if (gap >= 10) {
        return `${country} still has a meaningful drinking-water shortfall in the latest country reading.`;
      }

      return `${country} is lower on this drinking-water gap than the highest-burden countries in the set.`;
    },
  },
  {
    id: "SH.TBS.INCD",
    title: "Tuberculosis burden",
    priorityLabel: "Cross-country burden",
    prioritySource:
      "Broader burden layer: infectious-disease burden from the World Bank country indicator set.",
    weight: 0.83,
    totalBurden: (value, context) => (value / 100000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.population)} new TB cases per year proxy`,
    score: (value) => Math.min(100, (value / 300) * 100),
    metric: (value) => `${value.toFixed(1)} new TB cases per 100,000 people`,
    body: (value, country) => {
      if (value >= 200) {
        return `${country} still shows a very heavy tuberculosis burden rather than only sporadic transmission.`;
      }

      if (value >= 75) {
        return `${country} still faces a substantial tuberculosis burden in the latest available reading.`;
      }

      return `${country} is lower on tuberculosis incidence than the worst-hit countries, though the disease still remains part of the tracked burden set.`;
    },
  },
  {
    id: "VC.IHR.PSRC.P5",
    title: "Homicide and interpersonal violence",
    priorityLabel: "Violence burden",
    prioritySource:
      "Broader burden layer: direct violence indicator from the World Bank country set.",
    weight: 0.74,
    totalBurden: (value, context) => (value / 100000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.population)} homicide deaths per year proxy`,
    score: (value) => Math.min(100, (value / 25) * 100),
    metric: (value) => `${value.toFixed(1)} intentional homicides per 100,000 people`,
    body: (value, country) => {
      if (value >= 15) {
        return `${country} is in a very high homicide range in the latest comparable reading, pointing to a large direct violence burden.`;
      }

      if (value >= 5) {
        return `${country} still shows a substantial interpersonal-violence burden on this homicide measure.`;
      }

      return `${country} is lower on this homicide measure than the highest-violence countries in the data set.`;
    },
  },
  {
    id: "VC.BTL.DETH",
    title: "War deaths",
    priorityLabel: "Conflict burden",
    prioritySource:
      "Broader burden layer: direct conflict indicator from the World Bank country set.",
    weight: 0.93,
    totalBurden: (value) => value,
    totalMetric: (value) => `${formatCompactNumber(value)} battle-related deaths`,
    score: (value, context) => Math.min(100, (per100kRate(value, context.population) / 40) * 100),
    metric: (value) => `${formatCompactNumber(value)} battle-related deaths`,
    body: (value, country, context) => {
      const rate = per100kRate(value, context.population);

      if (rate >= 15) {
        return `${country} is in a very high conflict-death range rather than seeing only residual or legacy violence.`;
      }

      if (value >= 1000) {
        return `${country} still shows a substantial direct war-death burden in the latest available data.`;
      }

      return `${country} is lower on recent battle deaths than the worst-affected countries, though conflict harm remains tracked here when present.`;
    },
  },
  {
    id: "VC.IDP.NWCV",
    title: "Conflict displacement",
    priorityLabel: "Conflict burden",
    prioritySource:
      "Broader burden layer: direct conflict-displacement indicator from the World Bank country set.",
    weight: 0.88,
    totalBurden: (value) => value,
    totalMetric: (value) => `${formatCompactNumber(value)} new conflict displacements`,
    score: (value, context) => Math.min(100, (per100kRate(value, context.population) / 5000) * 100),
    metric: (value) => `${formatCompactNumber(value)} new conflict displacements`,
    body: (value, country, context) => {
      const rate = per100kRate(value, context.population);

      if (rate >= 1500) {
        return `${country} shows a very high displacement shock rather than only isolated movement.`;
      }

      if (value >= 10000) {
        return `${country} still has a large conflict-displacement burden in the latest available year.`;
      }

      return `${country} is lower on recent conflict displacement than the worst-affected countries in the data set, though the issue remains morally severe when it appears.`;
    },
  },
];

const DEATH_MODELS = [
  {
    id: "SH.DYN.MORT",
    title: "Under-5 deaths",
    priorityLabel: "Preventable deaths",
    prioritySource:
      "Death atlas: child survival proxy derived from the World Bank country indicator set.",
    weight: 1.08,
    typicalAgeAtDeath: 1,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 1, reflecting UNICEF's emphasis that many under-5 deaths are concentrated in infancy and the first few years.",
    totalBurden: (value, context) => (value / 1000) * context.births,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 1000) * context.births)} under-5 deaths per year proxy`,
    score: (value) => Math.min(100, (value / 80) * 100),
    metric: (value) => `${value.toFixed(1)} under-5 deaths per 1,000 live births`,
    body: (value, country) => {
      if (value >= 60) {
        return `${country} remains in a very high under-5 death range, so preventable child mortality is still one of the country's main death burdens.`;
      }

      if (value >= 25) {
        return `${country} still shows materially elevated child mortality in the latest available reading.`;
      }

      return `${country} is below the highest child-death range in this model, though under-5 death is still tracked because the stakes remain large.`;
    },
  },
  {
    id: "SH.STA.MMRT",
    title: "Maternal deaths",
    priorityLabel: "Preventable deaths",
    prioritySource:
      "Death atlas: maternal mortality indicator from the World Bank country set.",
    weight: 0.88,
    typicalAgeAtDeath: 29,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 29 as a rough childbearing-age anchor informed by WHO maternal mortality framing.",
    totalBurden: (value, context) => (value / 100000) * context.births,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.births)} maternal deaths per year proxy`,
    score: (value) => Math.min(100, (value / 350) * 100),
    metric: (value) => `${value.toFixed(0)} maternal deaths per 100,000 live births`,
    body: (value, country) => {
      if (value >= 200) {
        return `${country} still shows a very high maternal mortality burden, which makes childbirth itself a major cause of preventable death.`;
      }

      if (value >= 70) {
        return `${country} still faces a substantial maternal-death burden in the latest available reading.`;
      }

      return `${country} is lower on maternal mortality than the worst-hit countries, though it remains a tracked death cause.`;
    },
  },
  {
    id: "SH.STA.AIRP.P5",
    title: "Air pollution deaths",
    priorityLabel: "Environmental deaths",
    prioritySource:
      "Death atlas: direct mortality indicator from the World Bank country set.",
    weight: 0.92,
    typicalAgeAtDeath: 61,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 61, reflecting WHO's older-adult cardiovascular and respiratory profile for air-pollution deaths.",
    totalBurden: (value, context) => (value / 100000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.population)} deaths attributed to air pollution`,
    score: (value) => Math.min(100, (value / 200) * 100),
    metric: (value) => `${value.toFixed(1)} air-pollution deaths per 100,000 people`,
    body: (value, country) => {
      if (value >= 120) {
        return `${country} is in a very high air-pollution death range, making environmental exposure one of its most important mortality drivers.`;
      }

      if (value >= 50) {
        return `${country} still shows a substantial air-pollution death burden in the latest comparable reading.`;
      }

      return `${country} is lower on air-pollution mortality than the worst-affected countries, though the burden remains tracked here.`;
    },
  },
  {
    id: "SH.STA.WASH.P5",
    title: "Unsafe water, sanitation, and hygiene deaths",
    priorityLabel: "Environmental deaths",
    prioritySource:
      "Death atlas: direct WASH mortality indicator from the World Bank country set.",
    weight: 0.98,
    typicalAgeAtDeath: 32,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 32 because WHO's WASH burden is child-heavy but not exclusively concentrated in early childhood.",
    totalBurden: (value, context) => (value / 100000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.population)} deaths attributed to unsafe WASH`,
    score: (value) => Math.min(100, (value / 80) * 100),
    metric: (value) => `${value.toFixed(1)} unsafe WASH deaths per 100,000 people`,
    body: (value, country) => {
      if (value >= 40) {
        return `${country} still shows a very high death burden from unsafe water, sanitation, and hygiene rather than only residual risk.`;
      }

      if (value >= 10) {
        return `${country} still faces a material WASH-related death burden in the latest available data.`;
      }

      return `${country} is lower on unsafe-WASH mortality than the worst-affected countries, though the cause still matters where present.`;
    },
  },
  {
    id: "SH.STA.TRAF.P5",
    title: "Road injury deaths",
    priorityLabel: "Injury deaths",
    prioritySource:
      "Death atlas: direct road-injury mortality indicator from the World Bank country set.",
    weight: 0.71,
    typicalAgeAtDeath: 31,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 31, consistent with WHO's emphasis that road injuries disproportionately kill younger people and are the leading cause of death for ages 5-29.",
    totalBurden: (value, context) => (value / 100000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.population)} road injury deaths`,
    score: (value) => Math.min(100, (value / 35) * 100),
    metric: (value) => `${value.toFixed(1)} road injury deaths per 100,000 people`,
    body: (value, country) => {
      if (value >= 20) {
        return `${country} is in a very high road-death range, making transport injury a major mortality burden.`;
      }

      if (value >= 10) {
        return `${country} still shows a substantial road injury death burden in the latest comparable reading.`;
      }

      return `${country} is lower on road-injury mortality than the worst-affected countries, though the cause remains tracked.`;
    },
  },
  {
    id: "SH.STA.SUIC.P5",
    title: "Suicide deaths",
    priorityLabel: "Violence deaths",
    prioritySource:
      "Death atlas: suicide mortality indicator from the World Bank country set.",
    weight: 0.66,
    typicalAgeAtDeath: 37,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 37 as a rough mid-adult anchor consistent with WHO's global suicide age profile.",
    totalBurden: (value, context) => (value / 100000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.population)} suicide deaths`,
    score: (value) => Math.min(100, (value / 25) * 100),
    metric: (value) => `${value.toFixed(1)} suicide deaths per 100,000 people`,
    body: (value, country) => {
      if (value >= 15) {
        return `${country} is in a very high suicide-death range, so self-harm is one of its major death burdens in this data layer.`;
      }

      if (value >= 8) {
        return `${country} still shows a substantial suicide mortality burden in the latest available reading.`;
      }

      return `${country} is lower on suicide mortality than the highest-burden countries in the set.`;
    },
  },
  {
    id: "VC.IHR.PSRC.P5",
    title: "Homicide deaths",
    priorityLabel: "Violence deaths",
    prioritySource:
      "Death atlas: homicide mortality indicator from the World Bank country set.",
    weight: 0.72,
    typicalAgeAtDeath: 31,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 31 as a rough young-adult violence anchor.",
    totalBurden: (value, context) => (value / 100000) * context.population,
    totalMetric: (value, context) =>
      `${formatCompactNumber((value / 100000) * context.population)} homicide deaths`,
    score: (value) => Math.min(100, (value / 25) * 100),
    metric: (value) => `${value.toFixed(1)} homicide deaths per 100,000 people`,
    body: (value, country) => {
      if (value >= 15) {
        return `${country} is in a very high homicide range, so direct interpersonal violence is one of its leading death burdens in this model.`;
      }

      if (value >= 5) {
        return `${country} still shows a substantial homicide burden in the latest comparable reading.`;
      }

      return `${country} is lower on homicide mortality than the highest-violence countries in the set.`;
    },
  },
  {
    id: "VC.BTL.DETH",
    title: "Battle-related deaths",
    priorityLabel: "Conflict deaths",
    prioritySource:
      "Death atlas: direct conflict death indicator from the World Bank country set.",
    weight: 0.93,
    typicalAgeAtDeath: 30,
    lifeYearsSource:
      "Life-years proxy uses local life expectancy at birth minus about age 30 as a rough conflict-death anchor, since modern war deaths often skew toward younger adults.",
    totalBurden: (value) => value,
    totalMetric: (value) => `${formatCompactNumber(value)} battle-related deaths`,
    score: (value, context) => Math.min(100, (per100kRate(value, context.population) / 40) * 100),
    metric: (value, context) =>
      `${formatCompactNumber(value)} battle deaths · ${per100kRate(value, context.population).toFixed(1)} per 100,000 people`,
    body: (value, country, context) => {
      const rate = per100kRate(value, context.population);

      if (rate >= 15) {
        return `${country} is in a very high conflict-death range rather than seeing only low-level or legacy violence.`;
      }

      if (value >= 1000) {
        return `${country} still shows a large recent battle-death burden in the latest available year.`;
      }

      return `${country} is lower on recent battle deaths than the worst-affected countries, though conflict death still remains one of the tracked causes when present.`;
    },
  },
];

const HUMAN_ISSUE_MODELS = [...SUFFERING_ISSUE_MODELS, ...DEATH_MODELS];
const ISSUE_DATA_URL = (iso) =>
  `https://api.worldbank.org/v2/country/${iso.toLowerCase()}/indicator/${[...new Set([...HUMAN_ISSUE_MODELS.map((indicator) => indicator.id), ...ISSUE_CONTEXT_INDICATORS])].join(";")}?source=2&date=${ISSUE_DATA_DATE_RANGE}&format=json&per_page=400`;
const CONTEXT_DATA_URL = (iso) =>
  `https://api.worldbank.org/v2/country/${iso.toLowerCase()}/indicator/${ISSUE_CONTEXT_INDICATORS.join(";")}?source=2&date=${ISSUE_DATA_DATE_RANGE}&format=json&per_page=400`;
const WORLD_FEATURE = {
  properties: {
    NAME: "World",
    ADMIN: "World",
    NAME_LONG: "World",
    ISO_A3: "WLD",
    CONTINENT: "World",
  },
};
const SUFFERING_MODEL_BY_ID = new Map(SUFFERING_ISSUE_MODELS.map((definition) => [definition.id, definition]));
const DEATH_MODEL_BY_ID = new Map(DEATH_MODELS.map((definition) => [definition.id, definition]));
const HUMAN_MODEL_BY_ID = new Map(HUMAN_ISSUE_MODELS.map((definition) => [definition.id, definition]));

const MORAL_WEIGHT_NOTES = [
  {
    tag: "Prior",
    title: "The site now treats broad animal sentience as the conservative default",
    body:
      "Betting on Ubiquitous Pain argues that behavioral, evolutionary, inductive, probabilistic, and theoretical considerations together make a fairly strong prior for consciousness in many debated species. The site does not force this into a single multiplier, but it now frames skepticism toward fish, decapod, and insect suffering as less default than before.",
  },
  {
    tag: "Assumptions",
    title: "These are burden proxies, not full moral-weight outputs",
    body:
      "The Moral Weight Project treats capacity for welfare as welfare range multiplied by lifespan. This site still does not compute full DALY-equivalents per species; it uses country production counts weighted by sentience-adjusted welfare ranges where possible, sentience-only proxies when that is all the source pack supports, plus clearly marked wild and direct insect estimates where only rough benchmarks are available.",
  },
  {
    tag: "Evidence",
    title: "The welfare table is indirect and incomplete",
    body:
      "The Welfare Range Table relies on many behavioral and cognitive proxies rather than direct access to experience. The project repeatedly warns that many invertebrate and aquatic estimates may be biased downward because too many traits are still marked unknown.",
  },
  {
    tag: "Theories",
    title: "Changing welfare theory may not erase the animal case",
    body:
      "Rethink Priorities argues that moving away from hedonism probably shifts most welfare-range estimates by less than one order of magnitude. That matters, but it is usually not enough on its own to remove animal suffering from the highest-priority set.",
  },
  {
    tag: "Neuron counts",
    title: "Neuron counts are one cautious input, not the rule",
    body:
      "The site follows the conservative RP mixture that includes a neuron-count model, but neuron counts are not treated as the sole proxy for moral weight or pain intensity. Bentham's Bulldog argues that low neuron counts are weak evidence against intense suffering and may even point the wrong way if simpler minds are more dominated by pain.",
  },
  {
    tag: "Intensity",
    title: "Conditional on consciousness, pain may be quite intense",
    body:
      "Betting on Ubiquitous Pain argues that animals often behave as if pain matters urgently, that stronger pain can be more adaptive for less reflective creatures, and that simple minds may have less ability to mentally step away from suffering. The site therefore treats fish, decapod, and insect per-being rankings as conservative rather than as upper bounds.",
  },
  {
    tag: "Subsystems",
    title: "No many-minds multipliers are applied here",
    body:
      "The site does not multiply humans by conscious subsystems or octopuses by nine minds. The cited posts argue that these hypotheses are not yet action-guiding and should not currently drive resource allocation.",
  },
  {
    tag: "Interpretation",
    title: "Animal-friendly conclusions are not a bug by themselves",
    body:
      "The Moral Weight Project explicitly argues against balking at animal-friendly or equality-like results merely because they feel strange. If the implications seem extreme, the pressure point is often the normative assumptions rather than the arithmetic alone.",
  },
  {
    tag: "Wild insects",
    title: "The current insect card is probably a lower bound",
    body:
      "Bentham's Bulldog argues wild insect suffering could dominate the whole picture because insect numbers are enormous and many deaths are likely painful. The site now adds a wild terrestrial arthropod estimate, but even that still omits most country-specific variation in density, climate, and aquatic or marine invertebrates.",
  },
  {
    tag: "Scope",
    title: "The habitat-loss claim is surfaced as a note, not a score",
    body:
      "The reducing-suffering article argues that if wild insect lives are net negative, reducing insect populations can reduce suffering. Because that depends on additional empirical and normative assumptions, the site does not directly rank countries by how much habitat loss or civilization suppresses insect populations.",
  },
  {
    tag: "Counts",
    title: "The wild estimate uses a global arthropod-density benchmark",
    body:
      "The country wild-animal card combines World Bank land area with Rosenberg et al.'s global estimate of about 1e19 soil arthropods, which works out to roughly 6.7e10 terrestrial arthropods per square kilometer of land. That gives the site an explicit scale estimate, but not a country-specific census.",
  },
  {
    tag: "Counts",
    title: "Wild birds use a global abundance benchmark",
    body:
      "The wild bird card scales World Bank land area by a global bird abundance estimate of about 50 billion birds, which works out to a few hundred birds per square kilometer on average. It is a coarse global-average proxy, not a country-specific census.",
  },
  {
    tag: "Direct harm",
    title: "The human-caused insect card is U.S.-calibrated and conservative",
    body:
      "The direct insect card scales Wild Animal Initiative's estimate of about 0.35 x 10^16 insects on U.S. insecticide-treated agricultural land in 2017 by each country's insecticide tonnage, then caps the treated-area-equivalent at reported agricultural land. Wild Animal Initiative notes this is still a minimum because non-target insects are omitted.",
  },
];

const WILD_ANIMAL_CONTEXT_MODELS = [
  {
    id: "wild-terrestrial-arthropods",
    title: "Wild terrestrial arthropod scale",
    improvementFactor: 1e-6,
    model: "wild-proxy",
    sentience: INSECT_WELFARE_PROXY.sentience,
    welfareRange: INSECT_WELFARE_PROXY.welfareRange,
    valueFromContext: (context) => context.landArea * TERRESTRIAL_SOIL_ARTHROPODS_PER_SQKM,
    score: (value) => Math.max(0, Math.min(100, (Math.log10(value + 1) - 12) * 16)),
    metric: (value) => `${formatScaleCount(value)} estimated terrestrial arthropods`,
    perBeingNote:
      "cautious insect welfare proxy median 0.029 applied to a land-area-derived wild arthropod estimate; Bentham's Bulldog argues pain in simple animals may be more intense than this proxy encodes",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} has a very large land area, so even a coarse global-density estimate implies an enormous wild terrestrial arthropod population. If many wild insect lives are net negative, this could dominate the country's whole animal-suffering picture. Bentham's Bulldog also argues the pain of simple creatures may be more totalizing than low-neuron intuitions suggest.`;
      }

      if (score >= 45) {
        return `${country} has enough land area that a global-average arthropod estimate still implies a very large wild terrestrial animal burden, and the article argues these creatures should not be assumed to feel only faint pain.`;
      }

      return `${country} is smaller on this land-area-based wild-animal estimate than the largest countries, but the implied wild arthropod numbers are still extremely large in absolute terms.`;
    },
    source: (context) =>
      `World Bank land area · ${worldBankDate(context.landAreaDate)} combined with Rosenberg et al. 2023 estimate of about 1e19 soil arthropods globally, roughly ${formatCompactNumber(TERRESTRIAL_SOIL_ARTHROPODS_PER_SQKM)} per sq. km of land. This is a coarse global-average estimate rather than a country-specific census.`,
    improvementNote:
      "Per-dollar proxy set extremely low because scalable wild-insect welfare interventions are still exploratory.",
  },
  {
    id: "wild-birds",
    title: "Wild bird abundance (non-insect wild animals)",
    improvementFactor: 0.01,
    model: "wild-bird",
    sentience: { median: 0.904, low: 0.629, high: 0.99 },
    welfareRange: { median: 0.327, low: 0.002, high: 0.856 },
    valueFromContext: (context) => context.landArea * WILD_BIRDS_PER_SQKM,
    score: (value) => Math.max(0, Math.min(100, (Math.log10(value + 1) - 6) * 20)),
    metric: (value) => `${formatScaleCount(value)} estimated wild birds`,
    perBeingNote:
      "bird proxy using chicken welfare-range median 0.327; this is a cautious stand-in for diverse wild bird species",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} has a very large land area, so even a coarse global-density estimate implies an enormous wild bird population. This card treats wild birds as a non-insect wild-animal baseline alongside the insect and farmed-animal estimates.`;
      }

      if (score >= 45) {
        return `${country} has enough land area that a global-average bird estimate still implies a large wild bird population, which can materially add to the country's non-insect wild-animal burden.`;
      }

      return `${country} is smaller on this land-area-based wild bird estimate than the largest countries, but the implied number of birds is still substantial.`;
    },
    source: (context) =>
      `World Bank land area · ${worldBankDate(context.landAreaDate)} combined with Callaghan et al. 2021 estimate of roughly 50 billion birds globally, which implies about ${formatCompactNumber(WILD_BIRDS_PER_SQKM)} birds per sq. km of land. This is a coarse global-average estimate rather than a country-specific census.`,
    improvementNote:
      "Per-dollar proxy set low because there is not yet a mature, scalable wild bird welfare intervention literature.",
  },
];

const ANIMAL_DATASETS = [
  {
    id: "chickens",
    title: "Chickens killed for meat",
    url: "https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv",
    valueKey: "Chickens",
    improvementFactor: 1,
    model: "welfare-range",
    sentience: { median: 0.904, low: 0.629, high: 0.99 },
    welfareRange: { median: 0.327, low: 0.002, high: 0.856 },
    metric: (value) => `${formatCompactNumber(value)} chickens slaughtered for meat in the latest year`,
    improvementNote:
      "Per-dollar proxy anchored to chicken welfare campaign estimates (about 10-280 animals helped per dollar) and hen ballot-initiative cost-effectiveness.",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} kills chickens for meat at very large scale, so broiler confinement, handling, transport, and slaughter are likely among its biggest farmed-animal harms.`;
      }

      if (score >= 45) {
        return `${country} still has a large enough chicken-meat sector that chicken welfare is likely one of its main country-level animal harms.`;
      }

      return `${country} has a smaller chicken slaughter burden than the largest producers, but bird numbers still scale quickly enough to matter morally.`;
    },
    source: (year) =>
      `Our World in Data / UN FAO land animals slaughtered for meat · ${year}. RP Table 4 chicken sentience median 0.904 (0.629-0.99) and Table 7 sentience-adjusted welfare median 0.327 (0.002-0.856).`,
  },
  {
    id: "pigs",
    title: "Pigs killed for meat",
    url: "https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv",
    valueKey: "Pigs",
    improvementFactor: 0.05,
    model: "welfare-range",
    sentience: { median: 0.973, low: 0.737, high: 0.99 },
    welfareRange: { median: 0.512, low: 0.005, high: 1.031 },
    metric: (value) => `${formatCompactNumber(value)} pigs slaughtered for meat in the latest year`,
    improvementNote:
      "Per-dollar proxy discounted using ballot-initiative evidence that hen reforms were about two orders of magnitude more cost-effective than breeding-sow or veal reforms.",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} kills pigs for meat at very large scale, making confinement, transport, and slaughter a first-order animal welfare issue there.`;
      }

      if (score >= 45) {
        return `${country} has a substantial pig-meat industry, so pig welfare is plausibly one of its main country-level animal harms.`;
      }

      return `${country} is not among the very largest pig producers, but pig welfare still remains a material local issue where the industry is present.`;
    },
    source: (year) =>
      `Our World in Data / UN FAO land animals slaughtered for meat · ${year}. RP Table 4 pig sentience median 0.973 (0.737-0.99) and Table 7 sentience-adjusted welfare median 0.512 (0.005-1.031).`,
  },
  {
    id: "other-birds",
    title: "Ducks, geese, and turkeys killed for meat",
    url: "https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv",
    valueKeys: ["Ducks", "Geese", "Turkeys"],
    improvementFactor: 0.9,
    model: "bird-proxy",
    sentience: { median: 0.904, low: 0.629, high: 0.99 },
    welfareRange: { median: 0.327, low: 0.002, high: 0.856 },
    metric: (value) => `${formatCompactNumber(value)} ducks, geese, and turkeys slaughtered for meat`,
    improvementNote:
      "Per-dollar proxy anchored to chicken welfare campaign estimates because the main intervention evidence base is for poultry.",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} kills very large numbers of non-chicken birds for meat. This card uses chicken values as a cautious bird proxy rather than pretending those species have no welfare significance.`;
      }

      if (score >= 45) {
        return `${country} has a material duck, goose, or turkey slaughter burden that should not disappear just because the RP source pack is chicken-heavy.`;
      }

      return `${country} has a smaller non-chicken bird burden than the largest producers, but the card remains because these birds are still numerous in some food systems.`;
    },
    source: (year) =>
      `Our World in Data / UN FAO land animals slaughtered for meat · ${year}. This card uses the RP chicken sentience and welfare-range distributions as a cautious bird proxy because the loaded source pack does not provide duck or turkey-specific medians here.`,
  },
  {
    id: "bovines",
    title: "Bovines killed for meat",
    url: "https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv",
    valueKey: "Cattle",
    improvementFactor: 0.03,
    model: "sentience-only",
    sentience: { median: 0.945, low: 0.712, high: 0.99 },
    metric: (value) => `${formatCompactNumber(value)} bovines slaughtered for meat in the latest year`,
    improvementNote:
      "Per-dollar proxy discounted using ballot-initiative evidence that hen reforms were about two orders of magnitude more cost-effective than veal reforms.",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} kills bovines at very large scale. The current card uses cow sentience directly because the loaded RP distribution pack clearly supports cow sentience but does not provide the matching Table 7 welfare-range output here.`;
      }

      if (score >= 45) {
        return `${country} still shows a substantial bovine slaughter burden. This card is intentionally marked as sentience-only rather than pretending to know more than the source pack supports.`;
      }

      return `${country} is lower on bovine slaughter than the largest producers, but bovine suffering still remains morally weighty where it occurs.`;
    },
    source: (year) =>
      `Our World in Data / UN FAO land animals slaughtered for meat · ${year}. RP Table 4 cow sentience median 0.945 (0.712-0.99). This card is sentience-only because the loaded distributions document did not provide a matching Table 7 cow welfare-range entry here.`,
  },
  {
    id: "fish",
    title: "Farmed fish killed for food",
    url: "https://ourworldindata.org/grapher/farmed-fish-killed.csv",
    valueKey: "Mid-point estimate",
    improvementFactor: 0.22,
    model: "welfare-range",
    sentience: { median: 0.328, low: 0.08, high: 0.911 },
    welfareRange: { median: 0.071, low: 0, high: 0.543 },
    metric: (value) => `${formatCompactNumber(value)} farmed fish killed for food (midpoint estimate)`,
    perBeingNote:
      "sentience-adjusted welfare range median 0.071; Bentham's Bulldog argues fish pain may be more intense than cortex-based intuitions suggest",
    improvementNote:
      "Per-dollar proxy anchored to farmed fish welfare estimates (about 2-36 animals helped per dollar) and Fish Welfare Initiative cost-effectiveness.",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} appears to be a very large farmed-fish producer. Even with lower central welfare-range estimates than pigs or chickens, fish numbers can be so high that they dominate the national animal-suffering picture. Bentham's Bulldog argues objections from brain architecture are weak and that fish behavior is strongly pain-like.`;
      }

      if (score >= 45) {
        return `${country} has a large enough farmed-fish sector that aquatic welfare should be treated as a serious country-specific issue rather than a niche one, especially given the article's case that fish seek pain relief and make pain-reward tradeoffs.`;
      }

      return `${country} shows a smaller fish-farming footprint than the largest producers, but fish welfare still matters because the number of individuals can scale quickly.`;
    },
    source: (year) =>
      `Our World in Data / Fishcount midpoint estimate · ${year}. RP blend from carp and salmon: sentience median about 0.328 (0.08-0.911) and sentience-adjusted welfare median about 0.071 (0-0.543). Bentham's Bulldog argues that fish respond to painkillers, avoid places where they were hurt, and should not be discounted because they lack human-like cortexes.`,
  },
  {
    id: "wild-caught-fish",
    title: "Wild-caught fish",
    url: "https://ourworldindata.org/grapher/wild-caught-fish.csv",
    valueKey: "Mid-point estimate",
    improvementFactor: 0.01,
    model: "welfare-range",
    sentience: { median: 0.328, low: 0.08, high: 0.911 },
    welfareRange: { median: 0.071, low: 0, high: 0.543 },
    metric: (value) => `${formatCompactNumber(value)} wild-caught fish in the latest midpoint estimate`,
    perBeingNote:
      "sentience-adjusted welfare range median 0.071; this uses the same cautious fish blend as the farmed-fish card",
    improvementNote:
      "Per-dollar proxy kept very low because scalable, measured wild-fish welfare interventions remain much thinner than farmed-fish or shrimp campaigns.",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} catches wild fish at extremely large scale. Even with cautious fish-welfare weights, capture fisheries can dominate the country's non-insect wild-animal burden by sheer numbers alone.`;
      }

      if (score >= 45) {
        return `${country} has a large enough capture-fisheries footprint that wild-fish suffering is likely one of its main non-insect wild-animal harms.`;
      }

      return `${country} has a smaller capture-fisheries burden than the largest fishing countries, but wild-fish suffering still matters because the numbers involved rise very quickly.`;
    },
    source: (year) =>
      `Our World in Data / Fishcount midpoint estimate · ${year}. This uses the same cautious fish sentience and welfare-range blend as the farmed-fish card, but applies it to wild-caught fish rather than aquaculture.`,
  },
  {
    id: "crustaceans",
    title: "Shrimp and crustacean farming",
    url: "https://ourworldindata.org/grapher/farmed-crustaceans.csv",
    valueKey: "Mid-point estimate",
    improvementFactor: 6,
    model: "welfare-range",
    sentience: { median: 0.314, low: 0.079, high: 0.87 },
    welfareRange: { median: 0.03, low: 0, high: 0.681 },
    metric: (value) => `${formatCompactNumber(value)} farmed crustaceans killed for food (midpoint estimate)`,
    perBeingNote:
      "sentience-adjusted welfare range median 0.030; Bentham's Bulldog argues decapod pain evidence is stronger than skeptical defaults suggest",
    improvementNote:
      "Per-dollar proxy anchored to shrimp welfare estimates (roughly 1,000-2,100 shrimp helped per dollar-year).",
    body: (value, score, country) => {
      if (score >= 70) {
        return `${country} appears to be a very large crustacean producer. The central welfare-range estimates are lower than for pigs or chickens, but the sheer number of animals can make this one of the country's worst hidden harms. Bentham's Bulldog argues decapods behave like animals in pain across multiple independent criteria.`;
      }

      if (score >= 45) {
        return `${country} has a large enough crustacean sector that shrimp and related welfare concerns should be treated as a live country-level issue, especially given evidence on wound tending, anesthetic response, and pain-reward tradeoffs.`;
      }

      return `${country} has a smaller crustacean footprint than the largest exporters, but this still matters because crustacean numbers can become extremely large.`;
    },
    source: (year) =>
      `Our World in Data midpoint estimate · ${year}. RP blend from shrimp, crayfish, and crabs: sentience median about 0.314 (0.079-0.87) and sentience-adjusted welfare median about 0.03 (0-0.681). Shrimp sentience is approximated in the document from crab-like priors. Bentham's Bulldog also notes evidence that decapods respond to anesthetic, self-administer drugs, and remember painful locations.`,
  },
  {
    id: "insects",
    title: "Human-caused insect suffering estimate",
    url: "https://ourworldindata.org/grapher/insecticide-use.csv",
    valueKey: "Insecticides - Agricultural use (tonnes)",
    improvementFactor: 0.02,
    model: "human-caused-insect",
    sentience: INSECT_WELFARE_PROXY.sentience,
    welfareRange: INSECT_WELFARE_PROXY.welfareRange,
    valueFromRecord: (record, metrics, context) => estimateHumanCausedInsectExposure(record.value, context).insectsAffected,
    perBeingNote:
      "cautious insect welfare proxy median 0.029; Bentham's Bulldog argues insect pain may be more totalizing than this conservative proxy implies",
    improvementNote:
      "Per-dollar proxy kept low because tractable, scaled insect-welfare interventions remain early-stage compared with farmed-animal campaigns.",
    metric: (value, record, context) => {
      const estimate = estimateHumanCausedInsectExposure(record.value, context);
      const coverageNote =
        estimate.treatedShare === null ? "" : ` across about ${formatPercent(estimate.treatedShare)} of agricultural land`;
      return `${formatScaleCount(value)} insects potentially affected by agricultural insecticide use${coverageNote}`;
    },
    body: (value, score, country, record, context) => {
      const estimate = estimateHumanCausedInsectExposure(record.value, context);

      if (score >= 70) {
        return `${country} uses agricultural insecticides at very large scale. A Wild Animal Initiative benchmark implies enormous numbers of insects may be directly affected on human-managed land each year, even before counting broader habitat and food-system effects. Bentham's Bulldog argues classic anti-insect-pain arguments have eroded substantially.`;
      }

      if (score >= 45) {
        return `${country} still shows a substantial direct insect burden from agricultural insecticide use. This estimate is much narrower than the wider wild-insect picture discussed in Bentham's Bulldog and the reducing-suffering literature, and the article argues insect suffering may also be more intense than low-neuron intuitions suggest.`;
      }

      if (estimate.cappedByAgriculturalLand) {
        return `${country} is lower on this direct insect estimate than the heaviest users, but the country still reaches a large human-caused insect footprint. The estimate is conservatively capped at reported agricultural land rather than assuming U.S.-style treatment intensity can scale indefinitely.`;
      }

      return `${country} is lower on this direct insect estimate than the heaviest users, but the implied number of insects affected is still large. This remains only one conservative slice of the wider insect-suffering picture.`;
    },
    source: (year, record, context) => {
      const estimate = estimateHumanCausedInsectExposure(record.value, context);
      const landDate = worldBankDate(context?.agriculturalLandDate);
      const capNote = estimate.cappedByAgriculturalLand
        ? ` The U.S.-equivalent treated area implied by insecticide tonnage was capped at reported agricultural land (${landDate}).`
        : context?.agriculturalLand > 0
          ? ` Reported agricultural land (${landDate}) is used as a ceiling on treated-area-equivalent scale.`
          : "";

      return `Our World in Data / UN FAO insecticide use · ${year}. Wild Animal Initiative estimates about 0.35 x 10^16 insects may be directly affected by insecticide use on about 0.45 x 10^12 m2 of U.S. agricultural land in 2017, and treats that as a minimum because non-target insects are omitted. This card scales that benchmark by country insecticide tonnage using a cautious insect blend from RP distributions: bees Table 4 sentience median 0.422 and Table 7 welfare median 0.071, black soldier flies 0.218 and 0.014, silkworms 0.039 and 0.001. Bentham's Bulldog argues more recent insect-sentience work has substantially weakened older anti-insect-pain arguments and that insect pain may be more totalizing than low-neuron intuitions imply.${capNote}`;
    },
  },
];

const ANIMAL_DEATH_MODELS = {
  chickens: {
    lifeYearsLost: 5,
    typicalLifeSource:
      "Life-years proxy uses a conservative remaining-life estimate for broiler chickens relative to sanctuary-style chicken lifespans around 10-15 years and slaughter in early weeks.",
  },
  pigs: {
    lifeYearsLost: 8,
    typicalLifeSource:
      "Life-years proxy uses a conservative remaining-life estimate for pigs relative to sanctuary-style pig lifespans around 10-15 years and slaughter in the first year.",
  },
  "other-birds": {
    lifeYearsLost: 4,
    typicalLifeSource:
      "Life-years proxy uses a conservative remaining-life estimate for ducks, geese, and turkeys relative to sanctuary-style bird lifespans often around a decade and slaughter in the first year.",
  },
  bovines: {
    lifeYearsLost: 12,
    typicalLifeSource:
      "Life-years proxy uses a conservative remaining-life estimate for bovines relative to sanctuary-style cattle lifespans around 18-22 years and slaughter at young ages.",
  },
  fish: {
    lifeYearsLost: 1.5,
    typicalLifeSource:
      "Life-years proxy uses a conservative remaining-life estimate for farmed fish because the source pack mixes species with very different lifespans and grow-out periods.",
  },
  crustaceans: {
    lifeYearsLost: 0.5,
    typicalLifeSource:
      "Life-years proxy uses a conservative remaining-life estimate for farmed crustaceans because shrimp and related species are harvested quickly and species-specific lifespan data varies widely.",
  },
};

const PAIN_LEVELS = [
  {
    id: "annoying",
    label: "Annoying",
    description: "Discomfort that a human could often keep working through, even if it keeps intruding.",
    humanAnchor: "Closest to background pain or irritation that keeps returning.",
  },
  {
    id: "hurtful",
    label: "Hurtful",
    description: "Pain that clouds focus and makes ordinary activity harder, even if basic tasks remain possible.",
    humanAnchor: "A level where you are still functioning, but the pain is shaping your day.",
  },
  {
    id: "disabling",
    label: "Disabling",
    description: "Pain that takes priority over most behavior and strips away much of normal agency.",
    humanAnchor: "If a human felt this intensely, most normal activity would stop mattering.",
  },
  {
    id: "excruciating",
    label: "Excruciating",
    description: "Agony that is barely tolerable even briefly.",
    humanAnchor: "The Welfare Footprint anchor here is severe burning or scalding.",
  },
];

const PAIN_REVIEW_DATE = "2026-05-31";
const PAIN_SOURCES = {
  intensities: {
    title: "Welfare Footprint Institute: pain intensities",
    url: "https://welfarefootprint.org/technical-definitions/pain-intensities/",
    publisher: "Welfare Footprint Institute",
    type: "institutional method",
  },
  layingHens: {
    title: "Welfare Footprint Institute: laying hens",
    url: "https://welfarefootprint.org/laying-hens/",
    publisher: "Welfare Footprint Institute",
    type: "institutional estimate",
  },
  broilers: {
    title: "Welfare Footprint Institute: broilers",
    url: "https://welfarefootprint.org/broilers/",
    publisher: "Welfare Footprint Institute",
    type: "institutional estimate",
  },
  poultrySlaughter: {
    title: "Welfare Footprint Institute: poultry slaughter",
    url: "https://welfarefootprint.org/research-projects/poultry-slaughter/",
    publisher: "Welfare Footprint Institute",
    type: "institutional estimate",
  },
};

const LONG_PAIN_ROWS = [
  {
    id: "caged-hen",
    label: "Conventional cage instead of aviary",
    meta: "Laying hen, one laying life",
    species: "Laying hen",
    system: "Conventional cage compared with aviary",
    windowLabel: "One laying life",
    estimateKind: "modeled",
    confidence: "moderate",
    sourceType: "institutional estimate",
    lastReviewedAt: PAIN_REVIEW_DATE,
    uncertainty:
      "Point estimate from a public synthesis; the largest uncertainty is how housing-system harms transfer across real farm conditions.",
    assumptions: [
      "The comparison is read as pain averted by moving from a conventional cage to an aviary system.",
      "Pain categories follow Welfare Footprint human-facing intensity definitions.",
      "The estimate is event-level and should not be converted into a whole-species moral weight without extra assumptions.",
    ],
    sources: [PAIN_SOURCES.layingHens, PAIN_SOURCES.intensities],
    unit: "hours",
    values: {
      annoying: 4645,
      hurtful: 2313,
      disabling: 275,
      excruciating: 0,
    },
  },
  {
    id: "broiler-breeder",
    label: "Feed restriction in broiler breeders",
    meta: "Parent bird, one breeder life",
    species: "Broiler breeder chicken",
    system: "Feed restriction in parent birds",
    windowLabel: "One breeder life",
    estimateKind: "modeled",
    confidence: "moderate",
    sourceType: "institutional estimate",
    lastReviewedAt: PAIN_REVIEW_DATE,
    uncertainty:
      "Point estimate from a public synthesis; the model is sensitive to hunger-duration and production-system assumptions.",
    assumptions: [
      "The row treats chronic hunger from restriction as the primary welfare event.",
      "Pain categories follow Welfare Footprint human-facing intensity definitions.",
      "The estimate is for a breeder life, not a broiler raised for meat.",
    ],
    sources: [PAIN_SOURCES.broilers, PAIN_SOURCES.intensities],
    unit: "hours",
    values: {
      annoying: 0,
      hurtful: 4170,
      disabling: 2000,
      excruciating: 0,
    },
  },
  {
    id: "fast-broiler",
    label: "Fast-growing broiler instead of slower-growing BCC breed",
    meta: "Broiler chicken, one life",
    species: "Broiler chicken",
    system: "Fast-growing breed compared with slower-growing BCC breed",
    windowLabel: "One broiler life",
    estimateKind: "modeled",
    confidence: "moderate",
    sourceType: "institutional estimate",
    lastReviewedAt: PAIN_REVIEW_DATE,
    uncertainty:
      "Point estimate from a public synthesis; uncertainty depends on breed, stocking, management, and morbidity assumptions.",
    assumptions: [
      "The comparison isolates fast-growth harms relative to a slower-growing Better Chicken Commitment breed.",
      "Pain categories follow Welfare Footprint human-facing intensity definitions.",
      "The estimate covers one bird life and should not be read as a country-level burden by itself.",
    ],
    sources: [PAIN_SOURCES.broilers, PAIN_SOURCES.intensities],
    unit: "hours",
    values: {
      annoying: 0,
      hurtful: 79,
      disabling: 33,
      excruciating: 25 / 3600,
    },
  },
];

const ACUTE_PAIN_ROWS = [
  {
    id: "co2",
    label: "Multi-stage CO2 stunning",
    meta: "Broiler slaughter, from entry to unconsciousness",
    species: "Broiler chicken",
    system: "Multi-stage CO2 stunning",
    windowLabel: "Entry to unconsciousness",
    estimateKind: "modeled",
    confidence: "moderate",
    sourceType: "institutional estimate",
    lastReviewedAt: PAIN_REVIEW_DATE,
    uncertainty:
      "Point estimate from a public synthesis; uncertainty depends on gas mixture, exposure timing, and behavior before loss of consciousness.",
    assumptions: [
      "The row measures pain from placement in the stunning system until loss of consciousness.",
      "Pain categories follow Welfare Footprint human-facing intensity definitions.",
      "The estimate is acute event pain, not lifetime pain.",
    ],
    sources: [PAIN_SOURCES.poultrySlaughter, PAIN_SOURCES.intensities],
    unit: "seconds",
    values: {
      annoying: 0,
      hurtful: 0,
      disabling: 45,
      excruciating: 0.02,
    },
  },
  {
    id: "electronarcosis",
    label: "High-effectiveness electronarcosis",
    meta: "Broiler slaughter, from entry to unconsciousness",
    species: "Broiler chicken",
    system: "High-effectiveness electronarcosis",
    windowLabel: "Entry to unconsciousness",
    estimateKind: "modeled",
    confidence: "moderate",
    sourceType: "institutional estimate",
    lastReviewedAt: PAIN_REVIEW_DATE,
    uncertainty:
      "Point estimate from a public synthesis; uncertainty depends on handling, electrical parameters, and time-to-unconsciousness assumptions.",
    assumptions: [
      "The row measures pain from placement in the stunning system until loss of consciousness.",
      "Pain categories follow Welfare Footprint human-facing intensity definitions.",
      "The estimate is acute event pain, not lifetime pain.",
    ],
    sources: [PAIN_SOURCES.poultrySlaughter, PAIN_SOURCES.intensities],
    unit: "seconds",
    values: {
      annoying: 0,
      hurtful: 0,
      disabling: 70,
      excruciating: 1.19,
    },
  },
  {
    id: "waterbath-stun-kill",
    label: "Waterbath stun-kill",
    meta: "Broiler slaughter, from entry to unconsciousness",
    species: "Broiler chicken",
    system: "Waterbath stun-kill",
    windowLabel: "Entry to unconsciousness",
    estimateKind: "modeled",
    confidence: "moderate",
    sourceType: "institutional estimate",
    lastReviewedAt: PAIN_REVIEW_DATE,
    uncertainty:
      "Point estimate from a public synthesis; uncertainty depends on shackling, electrical parameters, and slaughter-line timing.",
    assumptions: [
      "The row measures pain from placement in the stunning system until loss of consciousness.",
      "Pain categories follow Welfare Footprint human-facing intensity definitions.",
      "The estimate is acute event pain, not lifetime pain.",
    ],
    sources: [PAIN_SOURCES.poultrySlaughter, PAIN_SOURCES.intensities],
    unit: "seconds",
    values: {
      annoying: 0,
      hurtful: 0,
      disabling: 69,
      excruciating: 2.18,
    },
  },
  {
    id: "low-voltage-waterbath",
    label: "Low-voltage waterbath",
    meta: "Broiler slaughter, from entry to unconsciousness",
    species: "Broiler chicken",
    system: "Low-voltage waterbath",
    windowLabel: "Entry to unconsciousness",
    estimateKind: "modeled",
    confidence: "moderate",
    sourceType: "institutional estimate",
    lastReviewedAt: PAIN_REVIEW_DATE,
    uncertainty:
      "Point estimate from a public synthesis; uncertainty depends on line conditions and the probability of ineffective stunning before unconsciousness.",
    assumptions: [
      "The row measures pain from placement in the stunning system until loss of consciousness.",
      "Pain categories follow Welfare Footprint human-facing intensity definitions.",
      "The estimate is acute event pain, not lifetime pain.",
    ],
    sources: [PAIN_SOURCES.poultrySlaughter, PAIN_SOURCES.intensities],
    unit: "seconds",
    values: {
      annoying: 0,
      hurtful: 0,
      disabling: 93,
      excruciating: 6.4,
    },
  },
];

const PAIN_CALLOUTS = [
  {
    title: "Battery cages create pain that lasts for months",
    body:
      "Moving one laying hen from a conventional cage to an aviary averts about 301 days of negative states, including roughly 11.5 days of disabling pain.",
  },
  {
    title: "Parent birds are harmed so broilers can grow fast",
    body:
      "Feed restriction in broiler breeders adds about 257 days of hurtful or disabling pain over a breeder's life, mostly through chronic hunger.",
  },
  {
    title: "Slaughter methods can stack severe pain into seconds",
    body:
      "A low-voltage waterbath keeps a bird in disabling or excruciating pain for about 99 seconds before unconsciousness, versus about 45 seconds in multi-stage CO2.",
  },
  {
    title: "Fast growth is not just a productivity choice",
    body:
      "Compared with slower-growing Better Chicken Commitment breeds, one fast-growing broiler accumulates at least 112 hours of hurtful or disabling pain, plus brief excruciating pain.",
  },
];

const svg = d3.select("#globe");
const mapStatus = document.getElementById("map-status");
const countrySearchForm = document.getElementById("country-search-form");
const countrySearchInput = document.getElementById("country-search");
const countryOptions = document.getElementById("country-options");
const countrySearchStatus = document.getElementById("country-search-status");
const coveragePlacesIndexed = document.getElementById("coverage-places-indexed");
const coveragePlacesIndexedDetails = document.getElementById("coverage-places-indexed-details");
const coverageCountryProfiles = document.getElementById("coverage-country-profiles");
const coverageCountryProfilesDetails = document.getElementById("coverage-country-profiles-details");
const coverageDirectEvidence = document.getElementById("coverage-direct-place-evidence");
const coverageDirectEvidenceDetails = document.getElementById("coverage-direct-place-evidence-details");
const coverageLastRelease = document.getElementById("coverage-last-release");
const coverageLastReleaseDetails = document.getElementById("coverage-last-release-details");
const coverageDefaultRanking = document.getElementById("coverage-default-ranking");
const coverageDefaultRankingDetails = document.getElementById("coverage-default-ranking-details");
const coverageSparseAreasList = document.getElementById("coverage-sparse-areas");
const coverageLegendCanonical = document.getElementById("coverage-legend-canonical");
const coverageLegendBoundaryOnly = document.getElementById("coverage-legend-boundary-only");
const coverageLegendNoData = document.getElementById("coverage-legend-no-data");
const coverageLegendAdm1Rows = document.getElementById("coverage-legend-adm1-rows");
const coverageLegendRankingMode = document.getElementById("coverage-legend-ranking-mode");
const zoomOutButton = document.getElementById("zoom-out");
const zoomInButton = document.getElementById("zoom-in");
const zoomRange = document.getElementById("zoom-range");
const resetButton = document.getElementById("reset-view");
const mapProjectionModeSelect = document.getElementById("map-projection-mode");
const mapDisclosureSummary = document.querySelector(".globe-disclosure summary");
const topbarNote = document.getElementById("topbar-note");
const releaseModeTabs = Array.from(document.querySelectorAll("[data-release-mode]"));
const releaseModePanels = Array.from(document.querySelectorAll("[data-release-mode-panel]"));
const releaseModeStatus = document.getElementById("release-mode-status");
const selectionMeta = document.getElementById("selection-meta");
const selectionTitle = document.getElementById("selection-title");
const selectionSummary = document.getElementById("selection-summary");
const selectionFootnote = document.getElementById("selection-footnote");
const summaryTopSource = document.getElementById("summary-top-source");
const summaryEvidenceMix = document.getElementById("summary-evidence-mix");
const summaryUncertainty = document.getElementById("summary-uncertainty");
const summaryLastUpdate = document.getElementById("summary-last-update");
const comparePlaceLink = document.getElementById("compare-place-link");
const compareSaveButton = document.getElementById("compare-save-button");
const compareDrawerList = document.getElementById("compare-drawer-list");
const compareDrawerStatus = document.getElementById("compare-drawer-status");
const compareSavedLink = document.getElementById("compare-saved-link");
const compareClearButton = document.getElementById("compare-clear-button");
const atlasLayerExplanation = document.getElementById("atlas-layer-explanation");
const atlasLayerEvidenceKind = document.getElementById("atlas-layer-evidence-kind");
const atlasLayerUncertainty = document.getElementById("atlas-layer-uncertainty");
const atlasLayerVintage = document.getElementById("atlas-layer-vintage");
const atlasLayerSourceCount = document.getElementById("atlas-layer-source-count");
const atlasLayerSourceList = document.getElementById("atlas-layer-source-list");
const mapProvenancePlace = document.getElementById("map-provenance-place");
const mapProvenanceEncoding = document.getElementById("map-provenance-encoding");
const mapProvenanceSource = document.getElementById("map-provenance-source");
const mapProvenanceUncertainty = document.getElementById("map-provenance-uncertainty");
const factLocation = document.getElementById("fact-location");
const factCountrySource = document.getElementById("fact-country-source");
const factAdminSource = document.getElementById("fact-admin-source");
const factCoverageStatus = document.getElementById("fact-coverage-status");
const factIssueSource = document.getElementById("fact-issue-source");
const factUnitCount = document.getElementById("fact-unit-count");
const globeModeSelect = document.getElementById("globe-mode");
const globeModeCopy = document.getElementById("globe-mode-copy");
const rankingTitle = document.getElementById("ranking-title");
const rankingModeSelect = document.getElementById("ranking-mode");
const rankingCopy = document.getElementById("ranking-copy");
const humanSectionLabel = document.getElementById("human-section-label");
const animalSection = document.getElementById("animal-section");
const animalSectionLabel = document.getElementById("animal-section-label");
const issuesRoot = document.getElementById("issues");
const animalIssuesRoot = document.getElementById("animal-issues");
const issuesTableRoot = document.getElementById("issues-table");
const animalIssuesTableRoot = document.getElementById("animal-issues-table");
const painAnchorsRoot = document.getElementById("pain-anchors");
const painLongChartRoot = document.getElementById("pain-long-chart");
const painAcuteChartRoot = document.getElementById("pain-acute-chart");
const painLongTableRoot = document.getElementById("pain-long-table");
const painAcuteTableRoot = document.getElementById("pain-acute-table");
const painCalloutsRoot = document.getElementById("pain-callouts");
const moralWeightGridRoot = document.getElementById("mw-grid");

let mapViewMode = "atlas";
let projection = createMapProjection(mapViewMode);

const path = d3.geoPath(projection);
const graticule = d3.geoGraticule10();

const defs = svg.append("defs");
const spherePath = svg.append("path").attr("class", "sphere");
const graticulePath = svg.append("path").attr("class", "graticule");
const countriesGroup = svg.append("g");
const provincesGroup = svg.append("g");
const outlinePath = svg.append("path").attr("class", "globe-outline");

function addHatchPattern(id, background, stroke, strokeWidth = 1.1) {
  const pattern = defs
    .append("pattern")
    .attr("id", id)
    .attr("width", 8)
    .attr("height", 8)
    .attr("patternUnits", "userSpaceOnUse")
    .attr("patternTransform", "rotate(135)");

  pattern.append("rect").attr("width", 8).attr("height", 8).attr("fill", background);
  pattern
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 8)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth);
}

addHatchPattern("boundary-index-hatch", "#d8e0de", "#8fa5a2");
addHatchPattern("boundary-index-hatch-hover", "#c7d6d3", "#285c66", 1.3);
addHatchPattern("boundary-index-hatch-muted", "#eef2f1", "#b7c6c4", 1);
addHatchPattern("selected-boundary-hatch", "#285c66", "#f6e4df", 1.6);
addHatchPattern("province-proxy-hatch", "rgba(40, 92, 102, 0.1)", "rgba(40, 92, 102, 0.55)", 1.2);
addHatchPattern("selected-province-hatch", "rgba(40, 92, 102, 0.28)", "#285c66", 1.4);

const COMPARE_QUEUE_STORAGE_KEY = "painmap.compareQueue.v1";
const MAX_COMPARE_QUEUE_ITEMS = 4;

const state = {
  countries: [],
  countryIndex: [],
  releaseModeContract: null,
  compareQueue: readCompareQueue(),
  releaseMode: "snapshot",
  globeMode: "suffering",
  rankingMode: "improvement",
  selectedCountry: null,
  selectedProvince: null,
  provinceMeta: null,
  provinceFeatures: [],
  countryIssueData: null,
  provinceIssueData: null,
  globalIssueData: { loading: true, error: null, sufferingIssues: [], deathIssues: [] },
  globalContext: { loading: true, error: null, context: null },
  releaseCoverage: RELEASE_COVERAGE_FALLBACK,
  releaseCoverageLoaded: false,
  placeIndexCoverageStatusByIso: new Map(),
  placeIndexCoverageStatusLoading: false,
  placeIndexCoverageStatusLoaded: false,
  countryCoverageStatusByIso: new Map(
    Array.from(CANONICAL_PROFILE_COUNTRIES, (iso) => [iso, COVERAGE_STATUS.canonicalProfile])
  ),
  countryCoverageStatusLoading: new Set(),
};
let liveOverlayStarted = false;

const animalDataState = {
  loading: true,
  error: null,
  byCountry: new Map(),
  world: null,
};

const provinceCache = new Map();
const issueCache = new Map();
const provinceIssueCache = new Map();
const gsapAdm1State = {
  loading: true,
  error: null,
  byIso: {},
};
let provinceRequestId = 0;
let issueRequestId = 0;
let provinceIssueRequestId = 0;
let justDragged = false;
let currentCountrySearchOptions = [];
let activeCountrySearchIndex = -1;
let hasExplicitCountrySearchSelection = false;

function createMapProjection(mode) {
  if (mode === "globe") {
    return d3
      .geoOrthographic()
      .translate([width / 2, height / 2])
      .scale(GLOBE_BASE_SCALE)
      .clipAngle(90)
      .precision(0.2)
      .rotate(GLOBE_ROTATION);
  }

  return d3
    .geoEqualEarth()
    .translate([width / 2, height / 2])
    .scale(ATLAS_BASE_SCALE)
    .precision(0.2);
}

function currentBaseScale() {
  return mapViewMode === "globe" ? GLOBE_BASE_SCALE : ATLAS_BASE_SCALE;
}

function currentMaxScale() {
  return mapViewMode === "globe" ? GLOBE_MAX_SCALE : ATLAS_MAX_SCALE;
}

function mapViewLabel() {
  return mapViewMode === "globe" ? "globe explorer" : "equal-area atlas view";
}

function setStatus(message) {
  mapStatus.textContent = message;
}

function setSearchStatus(message) {
  if (countrySearchStatus) {
    countrySearchStatus.textContent = message;
  }
}

function isSnapshotMode() {
  return state.releaseMode === "snapshot";
}

function syncReleaseModeUi() {
  const normalizedMode = normalizeReleaseMode(state.releaseMode);
  const modeConfig = getReleaseModeConfig(normalizedMode);

  for (const tab of releaseModeTabs) {
    const tabMode = normalizeReleaseMode(tab.dataset.releaseMode);
    const isAvailable = isModeContractSupported(tabMode);

    if (!isAvailable) {
      tab.hidden = true;
      continue;
    }

    tab.hidden = false;
    const tabConfig = getReleaseModeConfig(tabMode);

    if (tabConfig?.label) {
      tab.textContent = String(tabConfig.label);
    }

    const isSelected = tabMode === normalizedMode;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  }

  for (const panel of releaseModePanels) {
    panel.hidden = normalizeReleaseMode(panel.dataset.releaseModePanel) !== normalizedMode;
  }

  if (releaseModeStatus) {
    releaseModeStatus.textContent = modeConfig.status || modeConfig.replay_rule || `${modeConfig.label || "snapshot"} mode is active.`;
  }

  const activePanel = releaseModePanels.find(
    (panel) => normalizeReleaseMode(panel.dataset.releaseModePanel) === normalizedMode
  );
  if (activePanel) {
    const badge = activePanel.querySelector(".evidence-badge");

    if (badge && modeConfig.badge) {
      badge.textContent = String(modeConfig.badge);
    }
  }
}

function startLiveOverlayData() {
  if (liveOverlayStarted) {
    return;
  }

  liveOverlayStarted = true;
  loadAnimalBurdenData();
  loadGlobalIssueData();
  loadGlobalContext();
  loadGsapAdm1Data();
}

function setReleaseMode(nextMode, shouldRecord = true) {
  const mode = normalizeReleaseMode(nextMode);
  const modeConfig = getReleaseModeConfig(mode);

  if (!isModeContractSupported(mode)) {
    return;
  }

  if (state.releaseMode === mode) {
    setStatus(modeConfig.status || modeConfig.replay_rule || `${modeConfig.label || "snapshot"} mode is active.`);
    syncReleaseModeUi();
    return;
  }

  state.releaseMode = mode;

  if (isSnapshotMode()) {
    state.selectedProvince = null;
    state.provinceIssueData = null;
    state.provinceMeta = null;
    state.provinceFeatures = [];
    populateCountryOptions();
    renderGlobe();
  } else {
    startLiveOverlayData();

    if (state.selectedCountry) {
      state.countryIssueData = { loading: true };
      Promise.all([loadAdm1(state.selectedCountry), loadCountryIssueData(state.selectedCountry)]);
    }
  }

  syncReleaseModeUi();
  renderDetails();
  setStatus(modeConfig.status || modeConfig.replay_rule || `${modeConfig.label || "snapshot"} mode is active.`);

  if (shouldRecord) {
    const eventName = releaseModeTelemetryEventName();
    recordTelemetry(eventName, { mode });
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1e9 ? 1 : 0,
  }).format(Number(value || 0));
}

function formatLifeYears(value) {
  const number = Number(value || 0);

  if (number >= 1000) {
    return formatCompactNumber(number);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: number >= 100 ? 0 : number >= 10 ? 1 : 2,
  }).format(number);
}

function formatScaleCount(value) {
  const number = Number(value || 0);

  if (number >= 1e15) {
    return `${(number / 1e15).toFixed(number >= 1e17 ? 0 : number >= 1e16 ? 1 : 2).replace(/\.?0+$/, "")} quadrillion`;
  }

  if (number >= 1e12) {
    return `${(number / 1e12).toFixed(number >= 1e14 ? 0 : number >= 1e13 ? 1 : 2).replace(/\.?0+$/, "")} trillion`;
  }

  if (number >= 1e9) {
    return `${(number / 1e9).toFixed(number >= 1e11 ? 0 : number >= 1e10 ? 1 : 2).replace(/\.?0+$/, "")} billion`;
  }

  if (number >= 1e6) {
    return `${(number / 1e6).toFixed(number >= 1e8 ? 0 : number >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")} million`;
  }

  if (number >= 1e3) {
    return `${(number / 1e3).toFixed(number >= 1e5 ? 0 : number >= 1e4 ? 1 : 2).replace(/\.?0+$/, "")} thousand`;
  }

  return formatNumber(number);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: value < 0.1 ? 1 : 0,
  }).format(value);
}

function formatPainValue(value, unit) {
  if (unit === "seconds") {
    if (value >= 60) {
      return `${value.toFixed(0)} sec`;
    }

    if (value >= 10) {
      return `${value.toFixed(1).replace(/\.0$/, "")} sec`;
    }

    if (value >= 1) {
      return `${value.toFixed(2).replace(/\.?0+$/, "")} sec`;
    }

    return `${value.toFixed(2).replace(/\.?0+$/, "")} sec`;
  }

  if (value >= 24 * 30) {
    return `${(value / 24).toFixed(0)} days`;
  }

  if (value >= 24) {
    return `${(value / 24).toFixed(1).replace(/\.0$/, "")} days`;
  }

  if (value >= 1) {
    return `${value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, "")} hr`;
  }

  if (value * 60 >= 1) {
    return `${(value * 60).toFixed(0)} min`;
  }

  return `${Math.round(value * 3600)} sec`;
}

function painTotal(values) {
  return PAIN_LEVELS.reduce((sum, level) => sum + (values[level.id] || 0), 0);
}

function clampScale(scale) {
  return Math.max(currentBaseScale(), Math.min(currentMaxScale(), scale));
}

function updateZoomUi() {
  if (!zoomRange) {
    return;
  }

  const baseScale = currentBaseScale();
  zoomRange.max = (currentMaxScale() / baseScale).toFixed(2);
  zoomRange.value = (projection.scale() / baseScale).toFixed(2);
}

function countryName(properties) {
  return (
    properties.NAME_LONG ||
    properties.NAME_EN ||
    properties.ADMIN ||
    properties.NAME ||
    "Unknown country"
  );
}

function countryIso(properties) {
  return properties.ADM0_A3 || properties.ISO_A3 || properties.ISO_A3_EH || null;
}

function splitAliasValues(value) {
  return String(value || "")
    .split(/[,;/|]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function countrySearchAliases(feature, primaryName) {
  const properties = feature?.properties || {};
  const candidates = [
    { type: "official", value: properties.FORMAL_EN },
    { type: "official", value: properties.NAME_FORMAL },
    { type: "local_common", value: properties.ADMIN },
    { type: "local_common", value: properties.NAME_LONG },
    { type: "local_common", value: properties.NAME_EN },
    { type: "local_common", value: properties.NAME },
    { type: "sovereign", value: properties.SOVEREIGNT },
  ];
  const seen = new Set([normalizeSearchText(primaryName)]);
  const aliases = [];

  for (const candidate of candidates) {
    const items = splitAliasValues(candidate.value);
    for (const item of items) {
      const normalized = normalizeSearchText(item);
      if (!normalized) {
        continue;
      }
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      aliases.push({
        value: item,
        normalized,
        type: candidate.type,
      });
    }
  }

  return aliases;
}

function aliasTypeLabel(aliasType) {
  const labels = {
    official: "official name",
    local_common: "local/common name",
    sovereign: "sovereign name",
    iso: "ISO code",
  };

  return labels[aliasType] || "alias";
}

function isAliasMatchType(matchType) {
  return !["exact-name", "iso"].includes(matchType);
}

function countryMatchEntry(entry, normalized) {
  if (!entry || !normalized) {
    return null;
  }

  const isoLower = entry.isoLower || "";
  if (isoLower && isoLower === normalized) {
    return { exact: true, startsWith: false, contains: false, value: entry.iso, type: "iso" };
  }

  if (entry.nameLower === normalized) {
    return { exact: true, startsWith: false, contains: false, value: entry.name, type: "exact-name" };
  }

  const aliases = entry.aliases || [];
  const aliasExact = aliases.find((alias) => alias.normalized === normalized);
  if (aliasExact) {
    return { exact: true, startsWith: false, contains: false, value: aliasExact.value, type: aliasExact.type };
  }

  const startsWith = aliases.find((alias) => alias.normalized && alias.normalized.startsWith(normalized));
  if (startsWith) {
    return {
      exact: false,
      startsWith: true,
      contains: false,
      value: startsWith.value,
      type: startsWith.type,
    };
  }

  const containsAlias = aliases.find((alias) => alias.normalized.includes(normalized));
  if (containsAlias) {
    return {
      exact: false,
      startsWith: false,
      contains: true,
      value: containsAlias.value,
      type: containsAlias.type,
    };
  }

  if (entry.nameLower.startsWith(normalized)) {
    return { exact: false, startsWith: true, contains: false, value: entry.name, type: "exact-name" };
  }

  if (entry.nameLower.includes(normalized)) {
    return { exact: false, startsWith: false, contains: true, value: entry.name, type: "exact-name" };
  }

  return null;
}

function requiresExplicitCountrySelection(match = {}, ambiguousMatchCount = 0) {
  if (!match || !match.type) {
    return false;
  }

  if (!isAliasMatchType(match.type)) {
    return false;
  }

  return ambiguousMatchCount > 1;
}

function bestAliasForCountryOption(entry, match = {}) {
  const matchType = match?.type;
  if (matchType && matchType !== "exact-name" && matchType !== "exact-country" && match.value) {
    return { value: match.value, type: matchType };
  }

  if (entry.primaryAlias) {
    return entry.primaryAlias;
  }

  return entry.aliases?.[0] || null;
}

function countryRegionLabel(properties = {}) {
  const rawValues = [properties.CONTINENT, properties.SUBREGION, properties.REGION_UN, properties.REGION_WB];
  const values = [];

  for (const value of rawValues) {
    const text = String(value || "").trim();

    if (!text) {
      continue;
    }

    if (!values.includes(text)) {
      values.push(text);
    }
  }

  return values.slice(0, 2).join(" / ");
}

function pickAliasValue(primaryValue, candidates) {
  const primaryNormalized = normalizeSearchText(primaryValue || "");

  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (!text) {
      continue;
    }

    if (normalizeSearchText(text) === primaryNormalized) {
      continue;
    }

    return text;
  }

  return "";
}

function provinceAliasForOption(feature, primaryName) {
  const properties = feature?.properties || {};
  return pickAliasValue(primaryName, [
    properties.VARNAME_1,
    properties.NAME_1_ALT,
    properties.NAME_ALT,
    properties.NAME_LOCAL,
    properties.NAME_LONG,
    properties.NAME,
  ]);
}

function buildCountrySearchOptionMeta(entry, coverageStatus) {
  const statusBadge = {
    type: "node",
    node: buildCoverageStatusBadge(coverageStatus),
  };
  const properties = entry.feature?.properties || {};
  const match = entry.lastMatch || {};
  const alias = bestAliasForCountryOption(entry, match);
  const region = countryRegionLabel(properties);
  const localCommonAlias = (entry.aliases || []).find((item) => item.type === "local_common")?.value;
  const missing = countryCoverageMissingText(coverageStatus);
  const promotion = countryCoveragePromotionText(coverageStatus);
  const requiresConfirmation = entry.requiresExplicitSelection;
  const ambiguousMatchCount = Number(entry.ambiguousAliasMatchCount || 0);
  const details = [
    statusBadge,
    " · ",
    "place level: country",
    "parent: World",
    entry.iso ? `iso: ${entry.iso}` : "iso: unavailable",
  ];

  if (region) {
    details.push(`region: ${region}`);
  }

  if (alias) {
    details.push(`alias type: ${aliasTypeLabel(alias.type)} · ${alias.value}`);
  }

  if (localCommonAlias && localCommonAlias !== alias?.value) {
    details.push(`local/common: ${localCommonAlias}`);
  }

  if (missing) {
    details.push(`missing: ${missing}`);
  }

  if (promotion) {
    details.push(`to promote: ${promotion}`);
  }

  if (requiresConfirmation) {
    const aliasType = alias?.type ? aliasTypeLabel(alias.type) : "alias";
    details.push(
      `selection: confirm ${aliasType} match from list${ambiguousMatchCount > 1 ? ` (${ambiguousMatchCount} matching aliases)` : ""}`
    );
  }

  return details;
}

function buildProvinceSearchOptionMeta(countryEntry, feature, coverageStatus) {
  const statusBadge = {
    type: "node",
    node: buildCoverageStatusBadge(coverageStatus),
  };
  const alias = provinceAliasForOption(feature, provinceName(feature));
  const missing = countryCoverageMissingText(coverageStatus);
  const promotion = countryCoveragePromotionText(coverageStatus);
  const details = [
    statusBadge,
    " · ",
    "place level: ADM1",
    `parent: ${countryEntry.name}`,
  ];

  if (alias) {
    details.push(`alias type: local/common · ${alias}`);
  }

  if (missing) {
    details.push(`missing: ${missing}`);
  }

  if (promotion) {
    details.push(`to promote: ${promotion}`);
  }

  return details;
}

const COVERAGE_STATUS_TERM_LINKS = {
  [COVERAGE_STATUS.canonicalProfile]: "canonicalProfiles",
  [COVERAGE_STATUS.boundaryOnly]: "boundaryCoverage",
  [COVERAGE_STATUS.adm1Overlay]: "adm1Overlay",
  [COVERAGE_STATUS.noData]: "noData",
};

function buildCoverageStatusBadge(coverageStatus) {
  const status = normalizeCoverageStatus(coverageStatus);
  const badge = document.createElement("span");
  const link = coverageGlossaryAnchor(COVERAGE_STATUS_TERM_LINKS[status], COVERAGE_STATUS_BADGE_LABEL[status]);
  badge.className = "evidence-badge search-coverage-chip";
  badge.appendChild(link);
  return badge;
}

function appendSearchOptionMeta(node, part) {
  if (part == null) {
    return;
  }

  if (typeof part === "string" || typeof part === "number") {
    node.append(String(part));
    return;
  }

  if (part && part.type === "node" && part.node?.nodeType === 1) {
    node.appendChild(part.node);
    return;
  }

  if (part?.nodeType === 1) {
    node.appendChild(part);
    return;
  }

  if (part?.type === "glossary") {
    node.appendChild(coverageGlossaryAnchor(part.key, part.help || ""));
    if (part.suffix) {
      node.append(part.suffix);
    }
    return;
  }

  node.append(String(part));
}

function setCountrySearchOptionMeta(node, parts) {
  node.textContent = "";
  const safeParts = Array.isArray(parts) ? parts : [parts];
  for (const part of safeParts) {
    appendSearchOptionMeta(node, part);
  }
}

function normalizeCoverageStatus(status) {
  const raw = typeof status === "string" ? status.trim() : "";
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const normalizedAlias = {
    canonical_country_profile: COVERAGE_STATUS.canonicalProfile,
    canonical_profile: COVERAGE_STATUS.canonicalProfile,
    canonical_measurement: COVERAGE_STATUS.canonicalProfile,
    canonical_measurements: COVERAGE_STATUS.canonicalProfile,
    boundary_only: COVERAGE_STATUS.boundaryOnly,
    boundary_index_only: COVERAGE_STATUS.boundaryOnly,
    adm1_context_overlay: COVERAGE_STATUS.adm1Overlay,
    adm1_context: COVERAGE_STATUS.adm1Overlay,
    no_data: COVERAGE_STATUS.noData,
    no_data_places: COVERAGE_STATUS.noData,
    no_data_rows: COVERAGE_STATUS.noData,
    no_release_coverage: COVERAGE_STATUS.noData,
    no_coverage: COVERAGE_STATUS.noData,
  };

  if (Object.prototype.hasOwnProperty.call(normalizedAlias, normalized)) {
    return normalizedAlias[normalized];
  }

  if (Object.values(COVERAGE_STATUS).includes(raw)) {
    return raw;
  }

  return COVERAGE_STATUS.noData;
}

function getCachedPlaceIndexCoverageStatus(iso) {
  if (!iso) {
    return null;
  }

  const normalizedIso = String(iso).trim().toUpperCase();
  return state.placeIndexCoverageStatusByIso.get(normalizedIso) || null;
}

async function loadPlaceIndexCoverageStatuses() {
  if (state.placeIndexCoverageStatusLoaded || state.placeIndexCoverageStatusLoading) {
    return;
  }

  state.placeIndexCoverageStatusLoading = true;

  try {
    const payload = await fetchJson(PLACE_INDEX_URL, 3000);
    const items = Array.isArray(payload?.items) ? payload.items : [];

    for (const item of items) {
      const iso = String(item?.place_id || "").trim().toUpperCase();
      if (!iso) {
        continue;
      }

      const normalized = normalizeCoverageStatus(item?.coverage_status);
      state.placeIndexCoverageStatusByIso.set(iso, normalized);
    }
  } catch (error) {
    // Keep boundary-first fallback if place index fetch fails.
  } finally {
    state.placeIndexCoverageStatusLoaded = true;
    state.placeIndexCoverageStatusLoading = false;
  }
}

function countryCoverageStatus(feature) {
  const iso = countryIso(feature?.properties);

  if (!iso) {
    return COVERAGE_STATUS.noData;
  }

  return normalizeCoverageStatus(state.countryCoverageStatusByIso.get(iso) || COVERAGE_STATUS.boundaryOnly);
}

function countryHasCanonicalProfile(feature) {
  return countryCoverageStatus(feature) === COVERAGE_STATUS.canonicalProfile;
}

function countryCoverageStatusText(status) {
  return COVERAGE_STATUS_TEXT[status] || COVERAGE_STATUS_TEXT[COVERAGE_STATUS.noData];
}

function countryCoverageStatusLabel(status) {
  return COVERAGE_STATUS_LABEL[status] || COVERAGE_STATUS_LABEL[COVERAGE_STATUS.noData];
}

function countryCoverageMissingText(status) {
  return COVERAGE_MISSING_HINT[status] || COVERAGE_MISSING_HINT[COVERAGE_STATUS.noData];
}

function countryCoveragePromotionText(status) {
  return COVERAGE_PROMOTION_HINT[status] || COVERAGE_PROMOTION_HINT[COVERAGE_STATUS.noData];
}

function countryMapCoverage(feature) {
  const status = countryCoverageStatus(feature);

  return {
    className: COVERAGE_STATUS_CLASS[status] || COVERAGE_STATUS_CLASS[COVERAGE_STATUS.boundaryOnly],
    label: countryCoverageStatusLabel(status),
  };
}

function provinceName(feature) {
  const properties = feature.properties || {};
  return (
    properties.shapeName ||
    properties.NAME_1 ||
    properties.name ||
    properties.NAME ||
    properties.PROV_NAME ||
    "Unknown ADM1 unit"
  );
}

function setMapProvenance({ place, encoding, source, uncertainty }) {
  setSummaryText(mapProvenancePlace, place);
  setSummaryText(mapProvenanceEncoding, encoding);
  setSummaryText(mapProvenanceSource, source);
  setSummaryText(mapProvenanceUncertainty, uncertainty);
}

function updateAtlasLayerRail({ explanation, evidenceKind, uncertainty, vintage, sourceCount, sourceList }) {
  setSummaryText(atlasLayerExplanation, explanation);
  setSummaryText(atlasLayerEvidenceKind, evidenceKind);
  setSummaryText(atlasLayerUncertainty, uncertainty);
  setSummaryText(atlasLayerVintage, vintage);
  setSummaryText(atlasLayerSourceCount, sourceCount);
  setSummaryText(atlasLayerSourceList, sourceList);
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameProvinceFeature(left, right) {
  if (!left || !right) {
    return false;
  }

  const leftId = left.properties?.shapeID || left.properties?.shapeISO || provinceName(left);
  const rightId = right.properties?.shapeID || right.properties?.shapeISO || provinceName(right);
  return normalizeSearchText(leftId) === normalizeSearchText(rightId);
}

function findProvince(features, query) {
  return findProvinceCandidates(features, query)[0] || null;
}

function findProvinceCandidates(features, query) {
  const normalized = normalizeSearchText(query);

  if (!normalized || !features?.length) {
    return [];
  }

  const entries = features.map((feature) => {
    const name = provinceName(feature);
    return {
      feature,
      name,
      nameLower: normalizeSearchText(name),
      shapeId: normalizeSearchText(feature.properties?.shapeID || ""),
      shapeIso: normalizeSearchText(feature.properties?.shapeISO || ""),
    };
  });

  const exact = [];
  const startsWith = [];
  const contains = [];

  for (const entry of entries) {
    if (entry.nameLower === normalized || entry.shapeId === normalized || entry.shapeIso === normalized) {
      exact.push(entry);
      continue;
    }

    if (entry.nameLower.startsWith(normalized)) {
      startsWith.push(entry);
      continue;
    }

    if (entry.nameLower.includes(normalized)) {
      contains.push(entry);
      continue;
    }
  }

  return [...exact, ...startsWith, ...contains].map((entry) => entry.feature);
}

function parseProvinceCountryQuery(query) {
  const parts = String(query || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const countryQuery = parts.at(-1);
  const provinceQuery = parts.slice(0, -1).join(", ");

  if (!countryQuery || !provinceQuery) {
    return null;
  }

  return { countryQuery, provinceQuery };
}

function findCountries(query) {
  const normalized = normalizeSearchText(query);

  if (!normalized) {
    return [];
  }

  const exact = [];
  const startsWith = [];
  const contains = [];

  for (const entry of state.countryIndex) {
    const match = countryMatchEntry(entry, normalized);
    if (!match) {
      continue;
    }

    const withMatch = { ...entry, lastMatch: match };

    if (match.exact) {
      exact.push(withMatch);
    } else if (match.startsWith) {
      startsWith.push(withMatch);
    } else if (match.contains) {
      contains.push(withMatch);
    }
  }

  return [...exact, ...startsWith, ...contains];
}

function provinceCacheKey(countryFeature, provinceFeature) {
  const iso = countryIso(countryFeature?.properties) || "UNK";
  const provinceId =
    provinceFeature?.properties?.shapeID ||
    provinceFeature?.properties?.shapeISO ||
    normalizeSearchText(provinceName(provinceFeature));
  return `${iso}:${provinceId}`;
}

function setSummaryText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setFactCoverageStatusText(message, status = null) {
  if (!factCoverageStatus) {
    return;
  }

  const normalizedStatus = normalizeCoverageStatus(status);
  const glossaryKey = normalizedStatus ? COVERAGE_STATUS_TERM_LINKS[normalizedStatus] : null;

  if (glossaryKey) {
    const fallback = COVERAGE_STATUS_BADGE_LABEL[normalizedStatus] || String(message || "");
    factCoverageStatus.textContent = "";
    factCoverageStatus.appendChild(coverageGlossaryAnchor(glossaryKey, fallback));
    return;
  }

  factCoverageStatus.textContent = "";
  if (message == null) {
    return;
  }

  setSummaryText(factCoverageStatus, message);
}


function compareUrlForPlace(placeId) {
  return `/compare/?places=${encodeURIComponent(placeId || "WLD")}`;
}

function compareUrlForPlaces(placeIds) {
  const ids = placeIds.filter(Boolean).slice(0, MAX_COMPARE_QUEUE_ITEMS);

  if (!ids.length) {
    return compareUrlForPlace("WLD");
  }

  return `/compare/?places=${ids.map((placeId) => encodeURIComponent(placeId)).join(",")}`;
}

function currentComparePlaceId(countryFeature = state.selectedCountry, provinceFeature = state.selectedProvince) {
  const iso = countryIso(countryFeature?.properties) || "WLD";

  if (provinceFeature) {
    return `${iso}:${provinceName(provinceFeature)}`;
  }

  return iso;
}

function normalizeCompareQueueItem(item) {
  const placeId = String(item?.placeId || "").trim().slice(0, 96);
  const label = String(item?.label || placeId || "Whole Earth").trim().slice(0, 80);

  if (!placeId) {
    return null;
  }

  return { placeId, label };
}

function readCompareQueue() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(COMPARE_QUEUE_STORAGE_KEY) || "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set();
    return parsed
      .map(normalizeCompareQueueItem)
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item.placeId)) {
          return false;
        }

        seen.add(item.placeId);
        return true;
      })
      .slice(0, MAX_COMPARE_QUEUE_ITEMS);
  } catch {
    return [];
  }
}

function writeCompareQueue() {
  try {
    window.localStorage?.setItem(COMPARE_QUEUE_STORAGE_KEY, JSON.stringify(state.compareQueue));
  } catch {
    // Local persistence is best effort; the drawer still works for the current page session.
  }
}

function compareLabelForPlace(placeId, compareLabel) {
  if (placeId === "WLD") {
    return "Whole Earth";
  }

  const currentId = currentComparePlaceId();

  if (placeId === currentId && state.selectedProvince && state.selectedCountry) {
    return `${provinceName(state.selectedProvince)}, ${countryName(state.selectedCountry.properties)}`;
  }

  if (placeId === currentId && state.selectedCountry) {
    return countryName(state.selectedCountry.properties);
  }

  const fromButton = String(compareLabel || "").replace(/^Compare\s+/i, "").trim();

  if (fromButton) {
    return fromButton === "whole world" ? "Whole Earth" : fromButton;
  }

  return placeId;
}

function syncCompareSaveControl(placeId, compareLabel) {
  if (!compareSaveButton) {
    return;
  }

  const label = compareLabelForPlace(placeId, compareLabel);
  compareSaveButton.dataset.placeId = placeId;
  compareSaveButton.dataset.placeLabel = label;
  compareSaveButton.setAttribute("aria-label", `Save ${label} to the compare queue`);
}

function renderCompareDrawer(statusMessage = "") {
  if (!compareDrawerList || !compareSavedLink || !compareDrawerStatus) {
    return;
  }

  const queue = state.compareQueue;
  compareDrawerList.textContent = "";

  if (!queue.length) {
    compareDrawerStatus.textContent =
      statusMessage || "No saved places yet. Save the current place to build a shareable compare URL.";
    compareSavedLink.href = comparePlaceLink?.href || compareUrlForPlace("WLD");
    compareSavedLink.textContent = "Open current compare";
    compareClearButton?.setAttribute("disabled", "");
    return;
  }

  compareSavedLink.href = compareUrlForPlaces(queue.map((item) => item.placeId));
  compareSavedLink.textContent = `Open saved compare (${queue.length})`;
  compareDrawerStatus.textContent =
    statusMessage || `${queue.length} saved ${queue.length === 1 ? "place" : "places"}. Share URL keeps evidence, uncertainty, and release context attached.`;
  compareClearButton?.removeAttribute("disabled");

  for (const item of queue) {
    const row = document.createElement("div");
    row.className = "compare-drawer-item";

    const label = document.createElement("strong");
    label.textContent = item.label;

    const removeButton = document.createElement("button");
    removeButton.className = "ghost-button compare-remove-button";
    removeButton.type = "button";
    removeButton.dataset.removePlaceId = item.placeId;
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${item.label} from the compare queue`);

    row.append(label, removeButton);
    compareDrawerList.appendChild(row);
  }
}

function saveCurrentComparePlace() {
  const placeId = compareSaveButton?.dataset.placeId || currentComparePlaceId();
  const label = compareSaveButton?.dataset.placeLabel || compareLabelForPlace(placeId, "");
  const nextItem = { placeId, label };
  const withoutDuplicate = state.compareQueue.filter((item) => item.placeId !== placeId);
  state.compareQueue = [...withoutDuplicate, nextItem].slice(-MAX_COMPARE_QUEUE_ITEMS);
  writeCompareQueue();
  renderCompareDrawer(`${label} saved. The compare URL now includes ${state.compareQueue.length} ${state.compareQueue.length === 1 ? "place" : "places"}.`);
}

function removeComparePlace(placeId) {
  const removed = state.compareQueue.find((item) => item.placeId === placeId);
  state.compareQueue = state.compareQueue.filter((item) => item.placeId !== placeId);
  writeCompareQueue();
  renderCompareDrawer(removed ? `${removed.label} removed from the compare queue.` : "Compare queue updated.");
}

function clearCompareQueue() {
  state.compareQueue = [];
  writeCompareQueue();
  renderCompareDrawer("Saved compare places cleared.");
}

function updatePlaceSummary({
  topSource,
  evidenceMix,
  uncertainty,
  lastUpdate,
  placeId = "WLD",
  compareLabel = "Compare this place",
}) {
  setSummaryText(summaryTopSource, topSource);
  setSummaryText(summaryEvidenceMix, evidenceMix);
  setSummaryText(summaryUncertainty, uncertainty);
  setSummaryText(summaryLastUpdate, lastUpdate);

  if (!comparePlaceLink) {
    return;
  }

  comparePlaceLink.href = compareUrlForPlace(placeId);
  comparePlaceLink.dataset.placeId = placeId;
  comparePlaceLink.textContent = compareLabel;
  comparePlaceLink.setAttribute("aria-label", `${compareLabel} on the compare page`);
  syncCompareSaveControl(placeId, compareLabel);
  renderCompareDrawer();
}

function findProvinceGsapRecord(iso, provinceFeature) {
  const records = gsapAdm1State.byIso?.[iso];

  if (!records) {
    return null;
  }

  const names = [
    provinceName(provinceFeature),
    provinceFeature?.properties?.shapeName,
    provinceFeature?.properties?.NAME_1,
    provinceFeature?.properties?.name,
    provinceFeature?.properties?.NAME,
    provinceFeature?.properties?.PROV_NAME,
  ]
    .filter(Boolean)
    .map(normalizeSearchText);

  for (const name of names) {
    if (records[name]) {
      return records[name];
    }
  }

  for (const name of names) {
    const entry = Object.entries(records).find(([key]) => key.startsWith(name) || name.startsWith(key));

    if (entry) {
      return entry[1];
    }
  }

  for (const name of names) {
    const entry = Object.entries(records).find(([key]) => key.includes(name) || name.includes(key));

    if (entry) {
      return entry[1];
    }
  }

  return null;
}

function geoAreaSqKm(feature) {
  return d3.geoArea(feature) * EARTH_RADIUS_KM * EARTH_RADIUS_KM;
}

function decimateRing(ring, maxPoints = 140) {
  if (!Array.isArray(ring) || ring.length <= maxPoints) {
    return ring;
  }

  const lastIndex = ring.length - 1;
  const step = Math.max(1, Math.ceil(lastIndex / Math.max(1, maxPoints - 1)));
  const reduced = ring.filter((_, index) => index === 0 || index === lastIndex || index % step === 0);

  if (reduced.length < 4) {
    return [ring[0], ring[Math.floor(lastIndex / 3)], ring[Math.floor((2 * lastIndex) / 3)], ring[lastIndex]];
  }

  const first = reduced[0];
  const last = reduced[reduced.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    reduced.push([...first]);
  }

  return reduced;
}

function simplifyGeometryForWorldPop(geometry, maxPointsPerRing = 140) {
  if (!geometry) {
    return null;
  }

  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => decimateRing(ring, maxPointsPerRing)),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => decimateRing(ring, maxPointsPerRing))
      ),
    };
  }

  return geometry;
}

function boundsPolygon(feature) {
  const [[west, south], [east, north]] = d3.geoBounds(feature);
  return {
    type: "Polygon",
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  };
}

function buildWorldPopGeoJson(feature) {
  const simplified = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: simplifyGeometryForWorldPop(feature.geometry),
      },
    ],
  };
  const simplifiedString = JSON.stringify(simplified);

  if (simplifiedString.length <= 14000) {
    return {
      geojson: simplified,
      method: "simplified-province-geometry",
    };
  }

  return {
    geojson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: boundsPolygon(feature),
        },
      ],
    },
    method: "bounding-box-fallback",
  };
}

function worldPopStatsUrl(dataset, geojson) {
  return `https://api.worldpop.org/v1/services/stats?dataset=${dataset}&year=${WORLDPOP_YEAR}&runasync=false&geojson=${encodeURIComponent(JSON.stringify(geojson))}`;
}

function parseWorldPopAgePyramid(rows = []) {
  return rows.reduce(
    (accumulator, row) => {
      const ageClass = Number(row.class);
      const male = Number(row.male || 0);
      const female = Number(row.female || 0);
      const total = male + female;

      accumulator.total += total;

      if (ageClass === 0 || ageClass === 1) {
        accumulator.under5 += total;
      }

      if (ageClass >= 15 && ageClass < 50) {
        accumulator.female15to49 += female;
      }

      return accumulator;
    },
    { total: 0, under5: 0, female15to49: 0 }
  );
}

function provincePopulationShare(provinceContext) {
  return Number.isFinite(provinceContext.populationShare) && provinceContext.populationShare > 0
    ? provinceContext.populationShare
    : provinceContext.areaShare || 0;
}

function provinceUnder5Share(provinceContext) {
  return Number.isFinite(provinceContext.under5Share) && provinceContext.under5Share > 0
    ? provinceContext.under5Share
    : provincePopulationShare(provinceContext);
}

function provinceHumanShare(issueId, provinceContext) {
  if (["SH.DYN.MORT", "SH.STA.STNT.ZS", "SH.IMM.IDPT"].includes(issueId)) {
    return provinceUnder5Share(provinceContext);
  }

  if (issueId === "SH.STA.MMRT") {
    return provinceUnder5Share(provinceContext);
  }

  return provincePopulationShare(provinceContext);
}

function provinceHumanShareLabel(issueId) {
  if (["SH.DYN.MORT", "SH.STA.STNT.ZS", "SH.IMM.IDPT"].includes(issueId)) {
    return "province under-5 population share from WorldPop age structure";
  }

  if (issueId === "SH.STA.MMRT") {
    return "province birth proxy from WorldPop under-5 age structure";
  }

  return "province population share from WorldPop";
}

function provinceAnimalShare(datasetId, provinceContext) {
  const populationShare = provincePopulationShare(provinceContext);
  const areaShare = provinceContext.areaShare || populationShare;
  const livestockShare = 0.65 * populationShare + 0.35 * areaShare;

  if (["wild-terrestrial-arthropods", "wild-birds", "insects"].includes(datasetId)) {
    return areaShare;
  }

  if (["chickens", "pigs", "other-birds", "bovines"].includes(datasetId)) {
    return livestockShare;
  }

  return populationShare;
}

function provinceAnimalShareLabel(datasetId) {
  if (["wild-terrestrial-arthropods", "wild-birds", "insects"].includes(datasetId)) {
    return "province land-area share from ADM1 geometry";
  }

  if (["chickens", "pigs", "other-birds", "bovines"].includes(datasetId)) {
    return "a blended province share: 65% population share plus 35% land-area share";
  }

  return "province population share from WorldPop";
}

function formatProvinceBurdenMetric(mode, rawValue) {
  if (mode === "death") {
    return `${formatLifeYears(rawValue)} province life-years lost proxy`;
  }

  return `${formatCompactNumber(rawValue)} province burden units`;
}

function issuePriorityLabel(support) {
  if (!support?.length) {
    return "Cross-country burden";
  }

  if (support.length >= 3) {
    return "3 EA sources";
  }

  if (support.length === 2) {
    return "2 EA sources";
  }

  return "1 EA source";
}

function joinList(items) {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function mediaGithubUrl(url) {
  if (!url) {
    return url;
  }

  const rawGithubHost = ["raw", "githubusercontent", "com"].join(".");

  if (url.includes("media.githubusercontent.com")) {
    return url;
  }

  if (url.includes("github.com/") && url.includes("/raw/")) {
    return url
      .replace("https://github.com/", "https://media.githubusercontent.com/media/")
      .replace("/raw/", "/");
  }

  if (url.includes(`${rawGithubHost}/`)) {
    return url.replace(
      `https://${rawGithubHost}/`,
      "https://media.githubusercontent.com/media/"
    );
  }

  return url;
}

const TELEMETRY_FIELDS_BY_EVENT = {
  route_view: ["route"],
  atlas_place_selected: ["place_id", "geometry_level", "parent_place_id"],
  dataset_download: ["path", "format"],
  compare_opened: [
    "route",
    "requested_places_count",
    "requested_from_url",
    "comparable_rows",
    "has_compatibility_issues",
    "canonical_place_count",
  ],
  release_manifest_opened: ["path"],
  release_mode_selected: ["mode"],
  place_search_started: ["query_length"],
  zero_result_search: ["query_length"],
  data_fetch_timing: ["target", "duration_ms", "ok"],
  web_vital: ["metric", "value", "rating"],
};
const TELEMETRY_EVENTS = new Set(Object.keys(TELEMETRY_FIELDS_BY_EVENT));

function currentRoutePath() {
  return window.location.pathname || "/";
}

function telemetryTarget(url) {
  try {
    const parsed = new URL(url, window.location.href);

    if (parsed.origin === window.location.origin) {
      return parsed.pathname;
    }

    return parsed.hostname;
  } catch {
    return "unknown";
  }
}

function datasetFormat(pathname) {
  if (pathname.endsWith(".csv")) {
    return "csv";
  }

  if (pathname.endsWith(".geojson")) {
    return "geojson";
  }

  if (pathname.endsWith(".json")) {
    return "json";
  }

  if (pathname.endsWith(".txt")) {
    return "txt";
  }

  return "html";
}

function recordTelemetry(eventName, fields = {}) {
  if (!TELEMETRY_EVENTS.has(eventName)) {
    return;
  }

  const allowedFields = TELEMETRY_FIELDS_BY_EVENT[eventName] || [];
  const payload = {
    event: eventName,
    release_id: RELEASE_ID,
  };

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      payload[field] = fields[field];
      continue;
    }

    if (field === "route") {
      payload.route = currentRoutePath();
    }
  }

  window.__painmapTelemetryEvents = window.__painmapTelemetryEvents || [];
  window.__painmapTelemetryEvents.push(payload);
  document.documentElement.dataset.telemetryEvents = String(window.__painmapTelemetryEvents.length);
  document.documentElement.dataset.telemetryLastEvent = eventName;
  window.dispatchEvent(new CustomEvent("painmap:telemetry", { detail: payload }));

  if (!TELEMETRY_ENDPOINT || !navigator.sendBeacon) {
    return;
  }

  navigator.sendBeacon(TELEMETRY_ENDPOINT, JSON.stringify(payload));
}

function rateWebVital(metric, value) {
  if (metric === "LCP") {
    return value <= 2500 ? "pass" : "over_budget";
  }

  if (metric === "INP") {
    return value <= 200 ? "pass" : "over_budget";
  }

  if (metric === "CLS") {
    return value <= 0.1 ? "pass" : "over_budget";
  }

  return "observed";
}

function recordWebVital(metric, value) {
  recordTelemetry("web_vital", {
    metric,
    value: Number(value.toFixed(metric === "CLS" ? 3 : 0)),
    rating: rateWebVital(metric, value),
  });
}

function initPerformanceTelemetry() {
  if (!("PerformanceObserver" in window)) {
    return;
  }

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries[entries.length - 1];

      if (latest) {
        recordWebVital("LCP", latest.startTime);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Some browsers do not expose all performance entry types.
  }

  try {
    let cls = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      }

      recordWebVital("CLS", cls);
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // Some browsers do not expose all performance entry types.
  }

  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId && entry.duration) {
          recordWebVital("INP", entry.duration);
        }
      }
    });
    inpObserver.observe({ type: "event", buffered: true, durationThreshold: 40 });
  } catch {
    // Some browsers do not expose all performance entry types.
  }
}

function registerServiceWorker() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    return;
  }

  if (window.location.protocol === "file:") {
    return;
  }

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";

  if (window.location.protocol !== "https:" && !isLocalHost) {
    return;
  }

  const register = () =>
    navigator.serviceWorker
      .register(SERVICE_WORKER_SCRIPT, { scope: "/" })
      .catch(() => void 0);

  if (document.readyState === "loading") {
    window.addEventListener("load", () => {
      void register();
    }, { once: true });
    return;
  }

  void register();
}

function setupTelemetryClickTracking() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");

    if (!link) {
      return;
    }

    const url = new URL(link.href, window.location.href);
    const pathname = url.pathname;

    if (pathname.endsWith("/manifest.json")) {
      recordTelemetry("release_manifest_opened", { path: pathname });
    }

    if (
      pathname.startsWith("/data/") ||
      pathname.startsWith("/v1/") ||
      pathname.startsWith("/schemas/") ||
      pathname.endsWith(".csv") ||
      pathname.endsWith(".geojson")
    ) {
      recordTelemetry("dataset_download", {
        path: pathname,
        format: datasetFormat(pathname),
      });
    }
  });
}

async function fetchJson(url, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  let timingRecorded = false;

  try {
    const response = await fetch(url, { signal: controller.signal });
    const duration = Math.round(performance.now() - startedAt);
    recordTelemetry("data_fetch_timing", {
      target: telemetryTarget(url),
      duration_ms: duration,
      ok: response.ok,
    });
    timingRecorded = true;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (!timingRecorded) {
      recordTelemetry("data_fetch_timing", {
        target: telemetryTarget(url),
        duration_ms: Math.round(performance.now() - startedAt),
        ok: false,
      });
    }

    if (error.name === "AbortError") {
      throw new Error("Request timed out");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function issueLevel(score) {
  if (score >= 70) {
    return "Severe";
  }

  if (score >= 45) {
    return "High";
  }

  if (score >= 20) {
    return "Moderate";
  }

  return "Lower";
}

function currentGlobeModeConfig() {
  return GLOBE_MODES[state.globeMode] || GLOBE_MODES.suffering;
}

function currentRankingModes() {
  return currentGlobeModeConfig().rankingModes;
}

function currentHumanIssues(issueData) {
  if (!issueData) {
    return [];
  }

  return state.globeMode === "death" ? issueData.deathIssues || [] : issueData.sufferingIssues || [];
}

function rankingLabel(mode = state.rankingMode) {
  return currentRankingModes()[mode]?.label || currentRankingModes().improvement.label;
}

function animalIssueScore(totalBurdenRaw) {
  if (!totalBurdenRaw) {
    return 0;
  }

  return Math.max(0, Math.min(100, (Math.log10(totalBurdenRaw + 1) - 4.5) * 18));
}

function worldBankDate(value) {
  return value || "recent years";
}

function per100kRate(total, population) {
  if (!population) {
    return 0;
  }

  return (total / population) * 100000;
}

function estimateHumanCausedInsectExposure(tonnes, context = {}) {
  if (!Number.isFinite(tonnes) || tonnes <= 0) {
    return {
      insectsAffected: 0,
      treatedAreaSqKm: 0,
      uncappedAreaSqKm: 0,
      treatedShare: null,
      cappedByAgriculturalLand: false,
    };
  }

  const uncappedAreaSqKm = tonnes * WAI_US_EQUIVALENT_TREATED_SQKM_PER_TONNE;
  const agriculturalLand = Number(context.agriculturalLand || 0);
  const hasAgriculturalLand = agriculturalLand > 0;
  const treatedAreaSqKm = hasAgriculturalLand ? Math.min(uncappedAreaSqKm, agriculturalLand) : uncappedAreaSqKm;
  const insectsAffected = treatedAreaSqKm * WAI_INSECTS_PER_TREATED_SQKM;

  return {
    insectsAffected,
    treatedAreaSqKm,
    uncappedAreaSqKm,
    treatedShare: hasAgriculturalLand ? treatedAreaSqKm / agriculturalLand : null,
    cappedByAgriculturalLand: hasAgriculturalLand && uncappedAreaSqKm > agriculturalLand,
  };
}

function humanContext(latestByIndicator) {
  const population = Number(latestByIndicator.get("SP.POP.TOTL")?.value || 0);
  const birthRate = Number(latestByIndicator.get("SP.DYN.CBRT.IN")?.value || 0);
  const births = population > 0 && birthRate > 0 ? (population * birthRate) / 1000 : 0;
  const landAreaRecord = latestByIndicator.get("AG.LND.TOTL.K2");
  const landArea = Number(landAreaRecord?.value || 0);
  const agriculturalLandRecord = latestByIndicator.get("AG.LND.AGRI.K2");
  const agriculturalLand = Number(agriculturalLandRecord?.value || 0);
  const lifeExpectancyRecord = latestByIndicator.get("SP.DYN.LE00.IN");
  const lifeExpectancyAtBirth = Number(lifeExpectancyRecord?.value || 73);

  return {
    population,
    birthRate,
    births,
    under5Population: births * 5,
    landArea,
    landAreaDate: landAreaRecord?.date || null,
    agriculturalLand,
    agriculturalLandDate: agriculturalLandRecord?.date || null,
    lifeExpectancyAtBirth,
    lifeExpectancyDate: lifeExpectancyRecord?.date || null,
  };
}

function lifeYearsLostPerDeath(definition, context = {}) {
  const lifeExpectancy = Number(context.lifeExpectancyAtBirth || 73);
  return Math.max(0.1, lifeExpectancy - Number(definition.typicalAgeAtDeath || 0));
}

function formatHumanRanking(issue, mode) {
  const ranking = issue.ranking[mode];

  if (!ranking) {
    return "";
  }

  if (state.globeMode === "death") {
    if (mode === "improvement") {
      return `Order mode: available life-years gained per dollar proxy · ${ranking.metric}.`;
    }

    if (mode === "total") {
      return `Order mode: total life-years lost proxy · ${ranking.metric}.`;
    }

    return `Order mode: life-years lost per death proxy · ${ranking.metric}.`;
  }

  if (mode === "improvement") {
    return "Order mode: available decrease in suffering per dollar proxy.";
  }

  if (mode === "total") {
    return `Order mode: total suffering proxy · ${ranking.metric}`;
  }

  return `Order mode: per-being suffering proxy · ${ranking.metric}.`;
}

function formatAnimalRanking(issue, mode) {
  const ranking = issue.ranking[mode];

  if (!ranking) {
    return "";
  }

  if (mode === "improvement") {
    return `Order mode: available decrease in suffering per dollar proxy · ${ranking.metric || `tractability-adjusted burden ${formatCompactNumber(ranking.raw)}`}.`;
  }

  if (mode === "total") {
    return `Order mode: total suffering proxy · ${ranking.metric}.`;
  }

  return `Order mode: per-being suffering proxy · ${ranking.metric || issue.perBeingNote}.`;
}

function sortIssuesByMode(issues, mode) {
  return [...issues].sort((left, right) => {
    const leftScore = left.ranking?.[mode]?.score ?? 0;
    const rightScore = right.ranking?.[mode]?.score ?? 0;
    return rightScore - leftScore || (right.score ?? 0) - (left.score ?? 0);
  });
}

function animalDatasetValue(row, dataset) {
  if (Array.isArray(dataset.valueKeys)) {
    const total = dataset.valueKeys.reduce((sum, key) => {
      const value = Number(row[key]);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    return total > 0 ? total : NaN;
  }

  return Number(row[dataset.valueKey]);
}

function parseLatestAnimalSeries(rows, dataset) {
  const latest = new Map();

  for (const row of rows) {
    const code = (row.Code || "").trim();
    const year = Number(row.Year);
    const value = animalDatasetValue(row, dataset);

    if (!code || code.length !== 3 || !Number.isFinite(year) || !Number.isFinite(value) || value <= 0) {
      continue;
    }

    const existing = latest.get(code);

    if (!existing || year > existing.year) {
      latest.set(code, {
        entity: row.Entity,
        year,
        value,
      });
    }
  }

  return latest;
}

function parseWorldAnimalSeries(rows, dataset) {
  let latest = null;

  for (const row of rows || []) {
    const entity = (row.Entity || "").trim();
    const code = (row.Code || "").trim();
    const isWorld = entity === "World" || code === "OWID_WRL";

    if (!isWorld) {
      continue;
    }

    const year = Number(row.Year);
    const value = animalDatasetValue(row, dataset);

    if (!Number.isFinite(year) || !Number.isFinite(value) || value <= 0) {
      continue;
    }

    if (!latest || year > latest.year) {
      latest = {
        entity: row.Entity,
        year,
        value,
      };
    }
  }

  return latest;
}

function buildAnimalIssuesFromMetrics(metrics, context, countryLabel) {
  const country = countryLabel || "this country";

  const issues = ANIMAL_DATASETS.map((dataset) => {
    const record = metrics?.[dataset.id];

    if (!record) {
      return null;
    }

    const rawValue =
      typeof dataset.valueFromRecord === "function" ? dataset.valueFromRecord(record, metrics, context) : record.value;

    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return null;
    }

    const perBeingRaw = dataset.welfareRange?.median || dataset.sentience?.median || 0;
    const totalBurdenRaw = rawValue * perBeingRaw;
    const improvementRaw = totalBurdenRaw * dataset.improvementFactor;
    const score =
      typeof dataset.score === "function"
        ? dataset.score(rawValue, totalBurdenRaw, record, context)
        : animalIssueScore(totalBurdenRaw);
    const rankingMetric =
      typeof dataset.rankingMetric === "function"
        ? dataset.rankingMetric(rawValue, totalBurdenRaw, record, context)
        : dataset.model === "sentience-only"
        ? `${formatCompactNumber(totalBurdenRaw)} sentience-weighted burden units`
        : dataset.model === "pressure-proxy"
          ? `${formatCompactNumber(totalBurdenRaw)} insect pressure units`
          : dataset.model === "human-caused-insect"
            ? `${formatScaleCount(rawValue)} insects potentially affected by human insecticide use`
          : dataset.model === "wild-proxy"
            ? `${formatCompactNumber(totalBurdenRaw)} wild animal burden proxy units`
          : `${formatCompactNumber(totalBurdenRaw)} sentience-adjusted burden units`;
    const perBeingNote =
      dataset.perBeingNote ||
      (dataset.model === "sentience-only"
        ? `sentience median ${dataset.sentience.median.toFixed(3)}; no matching welfare-range output loaded for this species`
        : dataset.model === "pressure-proxy"
          ? `cautious insect blend welfare-range median ${dataset.welfareRange.median.toFixed(3)} from bees, black soldier flies, and silkworms`
          : dataset.model === "human-caused-insect"
            ? `cautious insect welfare proxy median ${dataset.welfareRange.median.toFixed(3)} applied to a Wild Animal Initiative estimate of insects directly affected on insecticide-treated agricultural land`
          : dataset.model === "wild-proxy"
            ? `cautious insect welfare proxy median ${dataset.welfareRange.median.toFixed(3)} applied to a land-area-derived wild arthropod estimate`
          : dataset.model === "bird-proxy"
            ? `bird proxy using chicken welfare-range median ${dataset.welfareRange.median.toFixed(3)}`
            : `sentience-adjusted welfare range median ${dataset.welfareRange.median.toFixed(3)}`);
    const modelTail =
      dataset.model === "sentience-only"
        ? " This card uses sentience only rather than a full sentience-adjusted welfare range."
        : dataset.model === "pressure-proxy"
          ? " This card is a country pressure proxy rather than a direct estimate of insects affected."
          : dataset.model === "human-caused-insect"
            ? " This card is a U.S.-calibrated estimate of insects directly affected on human-managed land rather than a direct country census."
          : dataset.model === "bird-proxy"
            ? " This card uses chicken values as a cautious bird proxy."
            : " This card is a country burden proxy, not a full moral-weight calculation.";
    const improvementNote = dataset.improvementNote ? ` ${dataset.improvementNote}` : "";
    const tagPrefix =
      dataset.model === "pressure-proxy"
        ? "Insect pressure"
        : dataset.model === "human-caused-insect"
          ? "Human-caused insect harm"
        : dataset.model === "wild-proxy"
          ? "Wild animal estimate"
        : dataset.model === "sentience-only"
          ? "Sentience-only proxy"
          : "Animal pressure";

    return {
      id: dataset.id,
      tag: `${tagPrefix} · ${issueLevel(score)}`,
      title: dataset.title,
      metric: dataset.metric(rawValue, record, context),
      body: dataset.body(rawValue, score, country, record, context),
      source: `${dataset.source(record.year, record, context)}${modelTail}${improvementNote}`,
      score,
      countRaw: rawValue,
      welfareRange: dataset.welfareRange || null,
      sentience: dataset.sentience || null,
      perBeingNote,
      year: record.year,
      ranking: {
        improvement: {
          score: Math.log10(improvementRaw + 1),
          raw: improvementRaw,
          metric: `${formatCompactNumber(improvementRaw)} tractability-adjusted burden units`,
        },
        total: {
          score: Math.log10(totalBurdenRaw + 1),
          raw: totalBurdenRaw,
          metric: rankingMetric,
        },
        "per-being": {
          score: perBeingRaw,
          raw: perBeingRaw,
        },
      },
    };
  }).filter(Boolean);

  if (context?.landArea > 0) {
    for (const model of WILD_ANIMAL_CONTEXT_MODELS) {
      const rawValue = model.valueFromContext(context);

      if (!Number.isFinite(rawValue) || rawValue <= 0) {
        continue;
      }

      const perBeingRaw = model.welfareRange?.median || model.sentience?.median || 0;
      const totalBurdenRaw = rawValue * perBeingRaw;
      const improvementRaw = totalBurdenRaw * model.improvementFactor;
      const score = typeof model.score === "function" ? model.score(rawValue, totalBurdenRaw) : animalIssueScore(totalBurdenRaw);
      const improvementNote = model.improvementNote ? ` ${model.improvementNote}` : "";
      const perBeingNote =
        model.perBeingNote ||
        (model.model === "wild-bird"
          ? `bird proxy using chicken welfare-range median ${model.welfareRange.median.toFixed(3)}`
          : `cautious insect welfare proxy median ${model.welfareRange.median.toFixed(3)} applied to a land-area-derived wild arthropod estimate`);
      const modelTail =
        model.model === "wild-bird"
          ? " This card estimates wild bird scale from country land area and a global average density, so it is much rougher than the farmed-animal counts."
          : " This card estimates wild arthropod scale from country land area and a global average density, so it is much rougher than the farmed-animal counts.";
      const rankingMetric =
        typeof model.rankingMetric === "function"
          ? model.rankingMetric(rawValue, context)
          : model.model === "wild-bird"
            ? `${formatScaleCount(rawValue)} estimated wild birds from land area`
            : `${formatScaleCount(rawValue)} estimated terrestrial arthropods from land area`;

      issues.push({
        id: model.id,
        tag: `Wild animal estimate · ${issueLevel(score)}`,
        title: model.title,
        metric: model.metric(rawValue, context),
        body: model.body(rawValue, score, country, context),
        source: `${model.source(context)}${modelTail}${improvementNote}`,
        score,
        countRaw: rawValue,
        welfareRange: model.welfareRange || null,
        sentience: model.sentience || null,
        perBeingNote,
        year: null,
        ranking: {
          improvement: {
            score: Math.log10(improvementRaw + 1),
            raw: improvementRaw,
            metric: `${formatCompactNumber(improvementRaw)} tractability-adjusted burden units`,
          },
          total: {
            score: Math.log10(totalBurdenRaw + 1),
            raw: totalBurdenRaw,
            metric: rankingMetric,
          },
          "per-being": {
            score: perBeingRaw,
            raw: perBeingRaw,
          },
        },
      });
    }
  }

  return issues.sort((left, right) => right.ranking.improvement.score - left.ranking.improvement.score);
}

function animalBucketYearLabel(issues) {
  const years = [...new Set(issues.map((issue) => issue.year).filter((year) => Number.isFinite(year)))].sort(
    (left, right) => left - right
  );

  if (!years.length) {
    return "latest available years";
  }

  return years.length === 1 ? `${years[0]}` : `${years[0]}-${years[years.length - 1]}`;
}

function animalBucketTotals(issues) {
  return issues.reduce(
    (accumulator, issue) => {
      accumulator.countRaw += issue.countRaw || 0;
      accumulator.totalRaw += issue.ranking?.total?.raw || 0;
      accumulator.improvementRaw += issue.ranking?.improvement?.raw || 0;
      return accumulator;
    },
    { countRaw: 0, totalRaw: 0, improvementRaw: 0 }
  );
}

function dominantAnimalIssue(issues) {
  return issues.reduce((best, issue) => {
    if (!best) {
      return issue;
    }

    return (issue.ranking?.total?.raw || 0) > (best.ranking?.total?.raw || 0) ? issue : best;
  }, null);
}

function aggregateAnimalCauseIssues(issues, countryLabel) {
  const country = countryLabel || "this country";
  const issueMap = new Map(issues.map((issue) => [issue.id, issue]));
  const buckets = [];

  const factoryFarmedMembers = ["chickens", "pigs", "other-birds", "bovines", "fish", "crustaceans"]
    .map((id) => issueMap.get(id))
    .filter(Boolean);

  if (factoryFarmedMembers.length) {
    const totals = animalBucketTotals(factoryFarmedMembers);
    const perBeingRaw = totals.countRaw > 0 ? totals.totalRaw / totals.countRaw : 0;
    const score = animalIssueScore(totals.totalRaw);
    const leadIssue = dominantAnimalIssue(factoryFarmedMembers);

    buckets.push({
      id: "animal-bucket-factory-farmed",
      tag: `Animal category · ${issueLevel(score)}`,
      title: "Factory-farmed animals",
      metric: `${formatScaleCount(totals.countRaw)} factory-farmed animals in the live model`,
      body: `This bucket combines land animals, farmed fish, and farmed crustaceans for ${country}. ${
        leadIssue ? `${leadIssue.title} currently contribute the largest share of the bucket's total burden proxy.` : ""
      }`,
      source: `Latest live country rows from Our World in Data's FAO-based land-animal slaughter chart plus the OWID / Fishcount farmed-fish and farmed-crustacean midpoint estimates (${animalBucketYearLabel(factoryFarmedMembers)}). Per-being values use Rethink Priorities sentience and welfare-range medians where available; per-dollar ordering combines the existing chicken, pig, fish, and shrimp tractability anchors rather than claiming one settled cost-effectiveness number.`,
      score,
      countRaw: totals.countRaw,
      perBeingNote: `weighted average welfare proxy ${perBeingRaw.toFixed(3)} per farmed animal across the current mix`,
      ranking: {
        improvement: {
          score: Math.log10(totals.improvementRaw + 1),
          raw: totals.improvementRaw,
          metric: `${formatCompactNumber(totals.improvementRaw)} tractability-adjusted burden units across the factory-farmed bucket`,
        },
        total: {
          score: Math.log10(totals.totalRaw + 1),
          raw: totals.totalRaw,
          metric: `${formatCompactNumber(totals.totalRaw)} sentience-adjusted burden units across ${formatScaleCount(totals.countRaw)} factory-farmed animals`,
        },
        "per-being": {
          score: perBeingRaw,
          raw: perBeingRaw,
          metric: `weighted average welfare proxy ${perBeingRaw.toFixed(3)} per factory-farmed animal`,
        },
      },
    });
  }

  const nonInsectWildMembers = ["wild-caught-fish", "wild-birds"].map((id) => issueMap.get(id)).filter(Boolean);

  if (nonInsectWildMembers.length) {
    const totals = animalBucketTotals(nonInsectWildMembers);
    const perBeingRaw = totals.countRaw > 0 ? totals.totalRaw / totals.countRaw : 0;
    const score = animalIssueScore(totals.totalRaw);
    const leadIssue = dominantAnimalIssue(nonInsectWildMembers);

    buckets.push({
      id: "animal-bucket-non-insect-wild",
      tag: `Animal category · ${issueLevel(score)}`,
      title: "Non-insect wild animals",
      metric: `${formatScaleCount(totals.countRaw)} non-insect wild animals in the live model`,
      body: `This bucket combines wild-caught fish with a land-area-based wild-bird proxy for ${country}. ${
        leadIssue ? `${leadIssue.title} currently dominate the bucket's total burden proxy.` : ""
      } It remains conservative because it still omits most mammals, reptiles, amphibians, and marine vertebrates.`,
      source: `Uses the OWID / Fishcount wild-caught-fish midpoint estimate plus a World Bank land-area x Callaghan et al. bird-abundance proxy (${animalBucketYearLabel(nonInsectWildMembers)}). Per-dollar ordering stays heavily discounted because scalable, measured wild-animal welfare interventions remain thin compared with farmed-animal campaigns.`,
      score,
      countRaw: totals.countRaw,
      perBeingNote: `weighted average welfare proxy ${perBeingRaw.toFixed(3)} per non-insect wild animal across the fish-plus-bird mix`,
      ranking: {
        improvement: {
          score: Math.log10(totals.improvementRaw + 1),
          raw: totals.improvementRaw,
          metric: `${formatCompactNumber(totals.improvementRaw)} tractability-adjusted burden units across the non-insect wild bucket`,
        },
        total: {
          score: Math.log10(totals.totalRaw + 1),
          raw: totals.totalRaw,
          metric: `${formatCompactNumber(totals.totalRaw)} sentience-adjusted burden units across ${formatScaleCount(totals.countRaw)} modeled non-insect wild animals`,
        },
        "per-being": {
          score: perBeingRaw,
          raw: perBeingRaw,
          metric: `weighted average welfare proxy ${perBeingRaw.toFixed(3)} per non-insect wild animal`,
        },
      },
    });
  }

  const wildInsects = issueMap.get("wild-terrestrial-arthropods");
  const directInsects = issueMap.get("insects");

  if (wildInsects || directInsects) {
    const totalAnchor = wildInsects || directInsects;
    const totalRaw = totalAnchor?.ranking?.total?.raw || 0;
    const countRaw = totalAnchor?.countRaw || 0;
    const perBeingRaw = totalAnchor?.ranking?.["per-being"]?.raw || 0;
    const improvementRaw = (wildInsects?.ranking?.improvement?.raw || 0) + (directInsects?.ranking?.improvement?.raw || 0);
    const score = animalIssueScore(totalRaw);
    const yearLabel = animalBucketYearLabel([wildInsects, directInsects].filter(Boolean));

    buckets.push({
      id: "animal-bucket-insects",
      tag: `Animal category · ${issueLevel(score)}`,
      title: "Insects",
      metric: `${formatScaleCount(countRaw)} terrestrial arthropods as an insect-heavy lower-bound proxy`,
      body: `This bucket uses wild terrestrial arthropods as the total-burden anchor for ${country} and the direct insecticide estimate as the tractability anchor. It does not add the two estimates together, because the direct insecticide estimate is partly a subset of the broader insect population proxy.`,
      source: `Total ordering uses World Bank land area with Rosenberg et al.'s global soil-arthropod estimate; per-dollar ordering uses OWID insecticide-use data with Wild Animal Initiative's direct-insect benchmark (${yearLabel}). This remains conservative because it omits aquatic insects and most country-specific insect-density variation.`,
      score,
      countRaw,
      perBeingNote: `cautious insect welfare proxy ${perBeingRaw.toFixed(3)} per being, with tractability anchored to direct insecticide reform rather than the whole insect bucket`,
      ranking: {
        improvement: {
          score: Math.log10(improvementRaw + 1),
          raw: improvementRaw,
          metric: `${formatCompactNumber(improvementRaw)} tractability-adjusted burden units, anchored to insecticide reform rather than the full insect bucket`,
        },
        total: {
          score: Math.log10(totalRaw + 1),
          raw: totalRaw,
          metric: `${formatCompactNumber(totalRaw)} insect-burden units from an insect-heavy lower bound of ${formatScaleCount(countRaw)} terrestrial arthropods`,
        },
        "per-being": {
          score: perBeingRaw,
          raw: perBeingRaw,
          metric: `cautious insect welfare proxy ${perBeingRaw.toFixed(3)} per insect`,
        },
      },
    });
  }

  return sortIssuesByMode(buckets, state.rankingMode);
}

function buildAnimalIssues(feature) {
  const iso = countryIso(feature.properties);
  const country = countryName(feature.properties);

  if (!iso) {
    return [];
  }

  const metrics = animalDataState.byCountry.get(iso) || {};
  const context = state.countryIssueData?.context;

  return aggregateAnimalCauseIssues(buildAnimalIssuesFromMetrics(metrics, context, country), country);
}

function buildWholeWorldAnimalIssues() {
  const context = state.globalContext?.context || {};
  const issues = animalDataState.world ? buildAnimalIssuesFromMetrics(animalDataState.world, context, "the world") : [];
  return aggregateAnimalCauseIssues(issues, "the world");
}

function buildProvinceContext(countryFeature, provinceFeature, worldPopContext, povertyRecord) {
  const countryContext = state.countryIssueData?.context || {};
  const countryArea = Math.max(geoAreaSqKm(countryFeature), 1);
  const provinceArea = Math.max(geoAreaSqKm(provinceFeature), 0);
  const areaShare = Math.max(0, Math.min(1, provinceArea / countryArea));
  const fallbackPopulation = (countryContext.population || 0) * areaShare;
  const population = Number(worldPopContext.population || fallbackPopulation || 0);
  const populationShare =
    countryContext.population > 0 ? Math.max(0, Math.min(1, population / countryContext.population)) : areaShare;
  const fallbackUnder5 = (countryContext.under5Population || 0) * populationShare;
  const under5Population = Number(worldPopContext.under5Population || fallbackUnder5 || 0);
  const under5Share =
    countryContext.under5Population > 0
      ? Math.max(0, Math.min(1, under5Population / countryContext.under5Population))
      : populationShare;

  return {
    ...countryContext,
    population,
    populationShare,
    births: (countryContext.births || 0) * under5Share,
    under5Population,
    under5Share,
    reproductiveFemalePopulation: Number(worldPopContext.female15to49Population || 0),
    areaShare,
    landArea: (countryContext.landArea || 0) * areaShare,
    agriculturalLand: (countryContext.agriculturalLand || 0) * areaShare,
    worldPopMethod: worldPopContext.method || "unavailable",
    povertyRecord: povertyRecord || null,
  };
}

function buildProvinceHumanIssues(sourceIssues, provinceContext, provinceFeature, mode) {
  const provinceLabel = provinceName(provinceFeature);

  return sourceIssues
    .map((issue) => {
      const definition = (mode === "death" ? DEATH_MODEL_BY_ID : SUFFERING_MODEL_BY_ID).get(issue.id);

      if (!definition) {
        return null;
      }

      if (mode === "suffering" && issue.id === "SI.POV.DDAY" && provinceContext.povertyRecord?.poor300 != null) {
        const value = Number(provinceContext.povertyRecord.poor300) * 100;
        const severityScore = definition.score(value, provinceContext);
        const weightedScore = Math.min(100, severityScore * definition.weight);
        const totalBurden = (value / 100) * provinceContext.population;
        const povertyMetric = definition.metric(value, provinceContext);

        return {
          id: issue.id,
          tag: `${issuePriorityLabel(definition.support)} · ${issueLevel(weightedScore)}`,
          title: issue.title,
          metric: povertyMetric,
          body: `${provinceLabel} has a directly matched World Bank GSAP ADM1 poverty estimate rather than a country-share fallback for this cause.`,
          source: `World Bank Global Subnational Poverty Atlas (2023 ADM1 lineup) matched to ${provinceLabel} via ${provinceContext.povertyRecord.geo || "ADM1 poverty row"}. This province uses the GSAP poverty rate directly, while the other causes still rely on province population, age-structure, and land-area allocation where no global ADM1 feed is loaded.`,
          score: weightedScore,
          severityScore,
          ranking: {
            improvement: {
              score: Math.log10(weightedScore + 1),
              raw: weightedScore,
              metric: `${weightedScore.toFixed(1)} weighted province severity points`,
            },
            total: {
              score: Math.log10(totalBurden + 1),
              raw: totalBurden,
              metric: `${formatCompactNumber(totalBurden)} people in severe poverty in the province estimate`,
            },
            "per-being": {
              score: severityScore,
              raw: severityScore,
              metric: povertyMetric,
            },
          },
        };
      }

      const share = provinceHumanShare(issue.id, provinceContext);
      const totalRaw = (issue.ranking?.total?.raw || 0) * share;
      const improvementRaw = (issue.ranking?.improvement?.raw || 0) * share;

      return {
        ...issue,
        body: `${provinceLabel} uses ${provinceHumanShareLabel(issue.id)} to allocate this cause from the country model because a global province-by-province feed for ${issue.title.toLowerCase()} is not loaded here.`,
        source: `${issue.source} Province note: total and tractability ordering for ${provinceLabel} use ${provinceHumanShareLabel(issue.id)}; the per-being rate remains the country's latest national reading unless a direct ADM1 source exists.`,
        ranking: {
          improvement: {
            score: Math.log10(improvementRaw + 1),
            raw: improvementRaw,
            metric:
              mode === "death"
                ? `${formatLifeYears(improvementRaw)} tractability-adjusted province life-years`
                : `${formatCompactNumber(improvementRaw)} tractability-adjusted province burden units`,
          },
          total: {
            score: Math.log10(totalRaw + 1),
            raw: totalRaw,
            metric: formatProvinceBurdenMetric(mode, totalRaw),
          },
          "per-being": issue.ranking?.["per-being"] || { score: 0, raw: 0, metric: issue.metric },
        },
      };
    })
    .filter(Boolean);
}

function buildProvinceAnimalIssues(countryFeature, provinceFeature, provinceContext) {
  const iso = countryIso(countryFeature.properties);
  const provinceLabel = provinceName(provinceFeature);
  const countryLabel = countryName(countryFeature.properties);
  const metrics = animalDataState.byCountry.get(iso) || {};
  const scaledMetrics = Object.fromEntries(
    Object.entries(metrics).map(([datasetId, record]) => [
      datasetId,
      {
        ...record,
        value: (record.value || 0) * provinceAnimalShare(datasetId, provinceContext),
      },
    ])
  );
  const animalContext = {
    ...state.countryIssueData?.context,
    landArea: provinceContext.landArea,
    agriculturalLand: provinceContext.agriculturalLand,
    agriculturalLandDate: provinceContext.agriculturalLandDate,
  };
  const issues = buildAnimalIssuesFromMetrics(scaledMetrics, animalContext, provinceLabel);

  return aggregateAnimalCauseIssues(issues, provinceLabel).map((issue) => ({
    ...issue,
    body: `${issue.body} Province note: this bucket is estimated inside ${provinceLabel}, ${countryLabel} using real province population or land-area inputs rather than reusing the full country total unchanged.`,
    source: `${issue.source} Province note: this bucket is distributed within ${countryLabel} using ${
      issue.id === "animal-bucket-insects"
        ? provinceAnimalShareLabel("insects")
        : issue.id === "animal-bucket-non-insect-wild"
          ? provinceAnimalShareLabel("wild-birds")
          : provinceAnimalShareLabel("chickens")
    }.`,
  }));
}

function buildProvinceMixedSufferingIssues(provinceIssueData) {
  return sortIssuesByMode(
    [
      ...(provinceIssueData?.sufferingIssues || []).map((issue) => ({ ...issue, localKind: "human" })),
      ...(provinceIssueData?.animalIssues || []).map((issue) => ({ ...issue, localKind: "animal" })),
    ],
    state.rankingMode
  ).slice(0, WORLD_RANK_LIMIT);
}

function formatProvinceRanking(issue, mode) {
  return issue.localKind === "animal" ? formatAnimalRanking(issue, mode) : formatHumanRanking(issue, mode);
}

function animalDeathImprovementFactor(dataset) {
  return Math.max(0.003, Math.min(0.08, Math.sqrt(dataset.improvementFactor || 0.01) * 0.03));
}

function buildAnimalDeathIssuesFromMetrics(metrics, countryLabel) {
  const country = countryLabel || "the world";

  return ANIMAL_DATASETS.map((dataset) => {
    const deathModel = ANIMAL_DEATH_MODELS[dataset.id];
    const record = metrics?.[dataset.id];

    if (!deathModel || !record) {
      return null;
    }

    const rawValue =
      typeof dataset.valueFromRecord === "function" ? dataset.valueFromRecord(record, metrics, {}) : record.value;

    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return null;
    }

    const lifeYearsLost = deathModel.lifeYearsLost;
    const totalLifeYears = rawValue * lifeYearsLost;
    const improvementRaw = totalLifeYears * animalDeathImprovementFactor(dataset);
    const score = animalIssueScore(totalLifeYears);

    return {
      id: `animal-death-${dataset.id}`,
      worldKind: "animal-death",
      tag: `Animal deaths · ${issueLevel(score)}`,
      title: dataset.title,
      metric: dataset.metric(rawValue, record, {}),
      body: dataset.body(rawValue, score, country, record, {}),
      source: `${dataset.source(record.year, record, {})} ${deathModel.typicalLifeSource} Whole-world death ordering discounts current animal-welfare cost-effectiveness anchors because most measured interventions reduce suffering more directly than they extend lives.`,
      score,
      ranking: {
        improvement: {
          score: Math.log10(improvementRaw + 1),
          raw: improvementRaw,
          metric: `${formatLifeYears(improvementRaw)} tractability-adjusted animal life-years`,
        },
        total: {
          score: Math.log10(totalLifeYears + 1),
          raw: totalLifeYears,
          metric: `${formatLifeYears(totalLifeYears)} life-years lost from ${dataset.metric(rawValue, record, {}).toLowerCase()}`,
        },
        "per-being": {
          score: lifeYearsLost,
          raw: lifeYearsLost,
          metric: `${formatLifeYears(lifeYearsLost)} life-years lost per animal`,
        },
      },
    };
  })
    .filter(Boolean)
    .sort((left, right) => right.ranking.improvement.score - left.ranking.improvement.score);
}

function buildWholeWorldSufferingIssues() {
  const context = state.globalContext?.context || {};
  const humanIssues = (state.globalIssueData?.sufferingIssues || []).map((issue) => {
    const definition = SUFFERING_MODEL_BY_ID.get(issue.id);
    const perBeingRaw = Math.max(0, Math.min(1, (issue.severityScore || 0) / 100));
    const totalRaw = (issue.ranking?.total?.raw || 0) * perBeingRaw;
    const improvementRaw = totalRaw * (definition?.weight || 1);

    return {
      ...issue,
      id: `world-human-suffering-${issue.id}`,
      worldKind: "human-suffering",
      tag: `Human burden · ${issueLevel(issue.score)}`,
      source: `${issue.source} Whole-world mixed-species note: this human card rescales the existing country-level severity score to a 0-1 per-being proxy so it can sit beside animal welfare-range proxies.`,
      ranking: {
        improvement: {
          score: Math.log10(improvementRaw + 1),
          raw: improvementRaw,
          metric: `${formatCompactNumber(improvementRaw)} tractability-adjusted human suffering proxy units`,
        },
        total: {
          score: Math.log10(totalRaw + 1),
          raw: totalRaw,
          metric: `${formatCompactNumber(totalRaw)} human suffering proxy units from ${issue.ranking.total.metric.toLowerCase()}`,
        },
        "per-being": {
          score: perBeingRaw,
          raw: perBeingRaw,
          metric: `severity proxy ${perBeingRaw.toFixed(2)} per affected human`,
        },
      },
    };
  });
  const animalIssues = animalDataState.world
    ? buildAnimalIssuesFromMetrics(animalDataState.world, context, "the world").map((issue) => ({
        ...issue,
        worldKind: "animal-suffering",
      }))
    : [];

  return sortIssuesByMode([...humanIssues, ...animalIssues], state.rankingMode).slice(0, WORLD_RANK_LIMIT);
}

function buildWholeWorldDeathIssues() {
  const humanIssues = (state.globalIssueData?.deathIssues || []).map((issue) => ({
    ...issue,
    id: `world-human-death-${issue.id}`,
    worldKind: "human-death",
    tag: `Human deaths · ${issueLevel(issue.score)}`,
  }));
  const animalIssues = animalDataState.world
    ? buildAnimalDeathIssuesFromMetrics(animalDataState.world, "the world")
    : [];

  return sortIssuesByMode([...humanIssues, ...animalIssues], state.rankingMode).slice(0, WORLD_RANK_LIMIT);
}

function formatWholeWorldRanking(issue, mode) {
  if (issue.worldKind === "animal-suffering") {
    return formatAnimalRanking(issue, mode);
  }

  if (issue.worldKind === "human-suffering") {
    if (mode === "improvement") {
      return `Order mode: available decrease in suffering per dollar proxy · ${issue.ranking.improvement.metric}.`;
    }

    if (mode === "total") {
      return `Order mode: total suffering proxy · ${issue.ranking.total.metric}.`;
    }

    return `Order mode: per-being suffering proxy · ${issue.ranking["per-being"].metric}.`;
  }

  if (mode === "improvement") {
    return `Order mode: available life-years gained per dollar proxy · ${issue.ranking.improvement.metric}.`;
  }

  if (mode === "total") {
    return `Order mode: total life-years lost proxy · ${issue.ranking.total.metric}.`;
  }

  return `Order mode: life-years lost per death proxy · ${issue.ranking["per-being"].metric}.`;
}

async function loadGsapAdm1Data() {
  try {
    gsapAdm1State.byIso = await fetchJson(GSAP_ADM1_DATA_URL);
    gsapAdm1State.loading = false;
    gsapAdm1State.error = null;
    if (state.selectedCountry && state.selectedProvince) {
      loadProvinceIssueData(state.selectedCountry, state.selectedProvince);
    }
    renderDetails();
  } catch (error) {
    gsapAdm1State.loading = false;
    gsapAdm1State.error = error.message;
    renderDetails();
  }
}

async function fetchProvinceWorldPopContext(provinceFeature) {
  const { geojson, method } = buildWorldPopGeoJson(provinceFeature);
  const [populationPayload, agePayload] = await Promise.all([
    fetchJson(worldPopStatsUrl("wpgppop", geojson)),
    fetchJson(worldPopStatsUrl("wpgpas", geojson)),
  ]);
  const ageStats = parseWorldPopAgePyramid(agePayload?.data?.agesexpyramid || []);

  return {
    population: Number(populationPayload?.data?.total_population || ageStats.total || 0),
    under5Population: ageStats.under5,
    female15to49Population: ageStats.female15to49,
    method,
  };
}

async function loadProvinceIssueData(countryFeature, provinceFeature) {
  const cacheKey = provinceCacheKey(countryFeature, provinceFeature);

  if (provinceIssueCache.has(cacheKey) && !gsapAdm1State.loading && !animalDataState.loading) {
    state.provinceIssueData = provinceIssueCache.get(cacheKey);
    renderDetails();
    return;
  }

  const requestId = ++provinceIssueRequestId;
  state.provinceIssueData = { loading: true };
  renderDetails();

  try {
    const iso = countryIso(countryFeature.properties);
    const worldPopContext = await fetchProvinceWorldPopContext(provinceFeature);
    const povertyRecord = iso ? findProvinceGsapRecord(iso, provinceFeature) : null;
    const provinceContext = buildProvinceContext(countryFeature, provinceFeature, worldPopContext, povertyRecord);
    const parsed = {
      loading: false,
      error: null,
      context: provinceContext,
      sufferingIssues: buildProvinceHumanIssues(
        state.countryIssueData?.sufferingIssues || [],
        provinceContext,
        provinceFeature,
        "suffering"
      ),
      deathIssues: buildProvinceHumanIssues(
        state.countryIssueData?.deathIssues || [],
        provinceContext,
        provinceFeature,
        "death"
      ),
      animalIssues: buildProvinceAnimalIssues(countryFeature, provinceFeature, provinceContext),
    };

    if (!gsapAdm1State.loading && !animalDataState.loading) {
      provinceIssueCache.set(cacheKey, parsed);
    }

    if (
      requestId !== provinceIssueRequestId ||
      countryIso(state.selectedCountry?.properties) !== iso ||
      !sameProvinceFeature(state.selectedProvince, provinceFeature)
    ) {
      return;
    }

    state.provinceIssueData = parsed;
    renderDetails();
  } catch (error) {
    if (requestId !== provinceIssueRequestId) {
      return;
    }

    state.provinceIssueData = { loading: false, error: error.message };
    renderDetails();
    setStatus(`Province data load failed for ${provinceName(provinceFeature)}.`);
  }
}

async function loadAnimalBurdenData() {
  animalDataState.loading = true;
  animalDataState.error = null;

  try {
    const results = new Map(
      await Promise.all(
        [...new Set(ANIMAL_DATASETS.map((dataset) => dataset.url))].map(async (url) => [url, await d3.csv(url)])
      )
    );
    const byCountry = new Map();
    const world = {};

    ANIMAL_DATASETS.forEach((dataset) => {
      const latestSeries = parseLatestAnimalSeries(results.get(dataset.url) || [], dataset);
      const worldRecord = parseWorldAnimalSeries(results.get(dataset.url) || [], dataset);

      if (worldRecord) {
        world[dataset.id] = worldRecord;
      }

      for (const [code, record] of latestSeries) {
        const entry = byCountry.get(code) || {};
        entry[dataset.id] = record;
        byCountry.set(code, entry);
      }
    });

    animalDataState.byCountry = byCountry;
    animalDataState.world = Object.keys(world).length ? world : null;
    animalDataState.loading = false;
    if (state.selectedCountry && state.selectedProvince) {
      loadProvinceIssueData(state.selectedCountry, state.selectedProvince);
    }
    renderDetails();
  } catch (error) {
    animalDataState.error = error.message;
    animalDataState.loading = false;
    renderDetails();
  }
}

function buildHumanIssues(models, latestByIndicator, feature, context) {
  const country = countryName(feature.properties);

  return models.map((definition) => {
    const observation = latestByIndicator.get(definition.id);

    if (!observation) {
      return null;
    }

    const value = Number(observation.value);

    if (!Number.isFinite(value)) {
      return null;
    }

    const severityScore = definition.score(value, context);
    const weightedScore = Math.min(100, severityScore * definition.weight);
    const totalBurden = definition.totalBurden ? definition.totalBurden(value, context) : 0;
    const isDeathModel = Number.isFinite(definition.typicalAgeAtDeath);
    const perBeingLifeYears = isDeathModel ? lifeYearsLostPerDeath(definition, context) : null;
    const totalLifeYears = isDeathModel ? totalBurden * perBeingLifeYears : null;
    const improvementRaw = isDeathModel ? totalLifeYears * definition.weight : weightedScore;
    const proxyNote = definition.proxy ? `${definition.proxy} ` : "";
    const priorityTag = definition.priorityLabel || issuePriorityLabel(definition.support);
    const prioritySource =
      definition.prioritySource || `Priority sources: ${joinList(definition.support || [])}.`;
    const sourceTail = isDeathModel ? ` Life-years proxy: ${definition.lifeYearsSource}` : "";

    return {
      id: definition.id,
      tag: `${priorityTag} · ${issueLevel(weightedScore)}`,
      title: definition.title,
      metric: definition.metric(value, context),
      body: definition.body(value, country, context),
      source: `${proxyNote}${prioritySource} Data: ${observation.indicator.value} · ${worldBankDate(observation.date)}.${sourceTail}`,
      score: weightedScore,
      severityScore,
      year: observation.date,
      ranking: {
        improvement: {
          score: isDeathModel ? Math.log10(improvementRaw + 1) : weightedScore,
          raw: improvementRaw,
          metric: isDeathModel
            ? `${formatLifeYears(improvementRaw)} tractability-adjusted life-years`
            : `${weightedScore.toFixed(1)} weighted severity points`,
        },
        total: {
          score: Math.log10((isDeathModel ? totalLifeYears : totalBurden) + 1),
          raw: isDeathModel ? totalLifeYears : totalBurden,
          metric: isDeathModel
            ? `${formatLifeYears(totalLifeYears)} life-years lost from ${definition.totalMetric ? definition.totalMetric(value, context).toLowerCase() : "the latest death proxy"}`
            : definition.totalMetric
              ? definition.totalMetric(value, context)
              : "No total-burden proxy available",
        },
        "per-being": {
          score: isDeathModel ? perBeingLifeYears : severityScore,
          raw: isDeathModel ? perBeingLifeYears : severityScore,
          metric: isDeathModel
            ? `${formatLifeYears(perBeingLifeYears)} life-years lost per death proxy`
            : definition.metric(value, context),
        },
      },
    };
  })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.ranking.improvement.score - left.ranking.improvement.score ||
        right.severityScore - left.severityScore
    );
}

function parseCountryIssueData(payload, feature) {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    throw new Error("Unexpected World Bank response");
  }

  const meta = payload[0] || {};
  const rows = payload[1];
  const latestByIndicator = new Map();

  for (const row of rows) {
    if (!row || row.value === null || !row.indicator?.id) {
      continue;
    }

    const existing = latestByIndicator.get(row.indicator.id);

    if (!existing || Number(row.date) > Number(existing.date)) {
      latestByIndicator.set(row.indicator.id, row);
    }
  }

  const context = humanContext(latestByIndicator);

  return {
    meta,
    context,
    sufferingIssues: buildHumanIssues(SUFFERING_ISSUE_MODELS, latestByIndicator, feature, context),
    deathIssues: buildHumanIssues(DEATH_MODELS, latestByIndicator, feature, context),
  };
}

function parseContextData(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    throw new Error("Unexpected World Bank response");
  }

  const meta = payload[0] || {};
  const rows = payload[1];
  const latestByIndicator = new Map();

  for (const row of rows) {
    if (!row || row.value === null || !row.indicator?.id) {
      continue;
    }

    const existing = latestByIndicator.get(row.indicator.id);

    if (!existing || Number(row.date) > Number(existing.date)) {
      latestByIndicator.set(row.indicator.id, row);
    }
  }

  return {
    meta,
    context: humanContext(latestByIndicator),
  };
}

function clearTable(root) {
  if (root) {
    root.textContent = "";
  }
}

function appendTextCell(row, tagName, value) {
  const cell = document.createElement(tagName);
  cell.textContent = value || "";
  row.appendChild(cell);
  return cell;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeClaimToken(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildClaimId(subjectType, subjectId, releaseId = RELEASE_ID) {
  const normalizedType = normalizeClaimToken(subjectType || "claim");
  const normalizedSubject = normalizeClaimToken(subjectId || "unknown");
  return `claim.${releaseId}.${normalizedType}.${normalizedSubject}`;
}

function buildIssueClaimContext(issue, fallback = {}) {
  const releaseId = issue?.releaseId || fallback?.releaseId || RELEASE_ID;
  const subjectType = issue?.subjectType || fallback?.subjectType || "issue";
  const subjectId = normalizeClaimToken(
    issue?.subjectId ||
      issue?.id ||
      issue?.title ||
      fallback?.subjectId ||
      fallback?.title ||
      fallback?.subjectLabel ||
      "issue"
  );
  const subjectLabel = issue?.subjectLabel || issue?.title || fallback?.subjectLabel || subjectId;
  return {
    claimId: buildClaimId(subjectType, subjectId, releaseId),
    releaseId,
    subjectType,
    subjectId,
    subjectLabel,
  };
}

function buildIssueCorrectionUrl(issue) {
  const context = buildIssueClaimContext(issue);
  const route = `${window.location.pathname}${window.location.search}`;
  const title = `[PainMap correction] ${context.releaseId}: ${context.subjectLabel}`;
  const body = [
    `Release: ${context.releaseId}`,
    `Subject type: ${context.subjectType}`,
    `Subject id: ${context.subjectId}`,
    `Claim id: ${context.claimId}`,
    `Route: ${route}`,
    issue?.coverage_status ? `Coverage status: ${countryCoverageStatusText(issue.coverage_status)}` : "",
    issue?.source || issue?.issueSource ? `Issue source: ${issue.source || issue.issueSource}` : "",
    issue?.coverageReason ? `Coverage reason: ${issue.coverageReason}` : "",
    issue?.provenance_id || issue?.provenanceId ? `Provenance id: ${issue.provenance_id || issue.provenanceId}` : "",
    "",
    "Please include source links, issue scope, and what should be corrected.",
  ].join("\n");

  const params = new URLSearchParams({ title, body });
  params.set("labels", "correction");
  return `${ISSUE_TRACKER_TEMPLATE_URL}?${params.toString()}`;
}

function createIssueCorrectionLink(issue, options = {}) {
  const context = buildIssueClaimContext(issue, options);
  const link = document.createElement("a");
  link.className = "ghost-link";
  link.href = buildIssueCorrectionUrl({ ...issue, ...context });
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open correction form";
  return link;
}

function appendIssueCorrectionControls(card, issue, options = {}) {
  const context = buildIssueClaimContext(issue, options);
  const claim = document.createElement("p");
  claim.className = "issue-meta";
  claim.textContent = `Claim: ${context.claimId}`;
  card.appendChild(claim);

  const actions = document.createElement("div");
  actions.className = "route-actions";
  actions.appendChild(createIssueCorrectionLink({ ...issue, ...context }));
  card.appendChild(actions);
}

function issueMetadata(issue) {
  const source = issue.source || "";
  const combined = `${issue.tag || ""} ${issue.title || ""} ${source}`.toLowerCase();

  if (combined.includes("natural earth") || combined.includes("geoboundaries") || combined.includes("adm1")) {
    return {
      layer: "Boundary layer",
      evidenceKind: "boundary",
      vintage: "Natural Earth Admin 0 plus current geoBoundaries ADM1 API",
      uncertainty: "low",
      methodNote: "Geometry layer for locating places; it is not itself a pain estimate.",
    };
  }

  if (combined.includes("welfare footprint")) {
    return {
      layer: "Event pain evidence",
      evidenceKind: "modeled estimate",
      vintage: "2026-05-31 source review",
      uncertainty: "moderate",
      methodNote: "Event-level welfare estimate tied to a species, system, intensity class, and time window.",
    };
  }

  if (combined.includes("insect") || combined.includes("wild animal") || combined.includes("wild-caught") || combined.includes("soil-arthropod")) {
    return {
      layer: "Wild animals and insects",
      evidenceKind: "proxy aggregate",
      vintage: "2026-05-31.atlas.2 release plus latest public rows where available",
      uncertainty: "very-low",
      methodNote: "Directional burden proxy assembled from land-area, insecticide, and public abundance assumptions.",
    };
  }

  if (combined.includes("fish") || combined.includes("crustacean") || combined.includes("slaughter") || combined.includes("farmed") || combined.includes("owid")) {
    return {
      layer: "Factory-farmed animals",
      evidenceKind: "proxy aggregate",
      vintage: "Latest available OWID/Fishcount-style country rows plus 2026-05-31 contract",
      uncertainty: "low",
      methodNote: "Directional animal burden proxy with visible sentience and welfare-range assumptions.",
    };
  }

  if (combined.includes("world bank") || combined.includes("wdi") || combined.includes("gsap") || combined.includes("who")) {
    return {
      layer: "Human burden indicators",
      evidenceKind: "proxy aggregate",
      vintage: `World Bank ${ISSUE_DATA_DATE_RANGE} latest non-null country window`,
      uncertainty: "low",
      methodNote: "Directional place-level proxy assembled from public health, poverty, pollution, WASH, and conflict indicators.",
    };
  }

  return {
    layer: "Atlas context",
    evidenceKind: "proxy aggregate",
    vintage: "2026-05-31.atlas.2 release artifact",
    uncertainty: "low",
    methodNote: "Directional atlas value with public-source provenance shown alongside the ranking.",
  };
}

function renderIssueTable(root, caption, issues, orderNoteForIssue) {
  if (!root) {
    return;
  }

  root.textContent = "";

  if (!issues?.length) {
    return;
  }

  const details = document.createElement("details");
  details.className = "data-table-details";
  details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = "Data table equivalent";

  const wrap = document.createElement("div");
  wrap.className = "data-table-wrap";

  const table = document.createElement("table");
  table.className = "data-table";

  const tableCaption = document.createElement("caption");
  tableCaption.textContent = caption;

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Rank", "Cause", "Metric", "Evidence kind", "Vintage", "Uncertainty", "Order note", "Source"].forEach((label) =>
    appendTextCell(headerRow, "th", label)
  );
  appendTextCell(headerRow, "th", "Claim id");
  appendTextCell(headerRow, "th", "Correction");
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  issues.forEach((issue, index) => {
    const context = buildIssueClaimContext(issue);
    const metadata = issueMetadata(issue);
    const row = document.createElement("tr");
    appendTextCell(row, "td", String(index + 1));
    appendTextCell(row, "th", issue.title);
    row.lastElementChild.scope = "row";
    appendTextCell(row, "td", issue.metric);
    appendTextCell(row, "td", metadata.evidenceKind);
    appendTextCell(row, "td", metadata.vintage);
    appendTextCell(row, "td", metadata.uncertainty);
    appendTextCell(row, "td", orderNoteForIssue(issue));
    appendTextCell(row, "td", issue.source);
    appendTextCell(row, "td", context.claimId);
    const correctionCell = document.createElement("td");
    correctionCell.appendChild(createIssueCorrectionLink({ ...issue, ...context }));
    row.appendChild(correctionCell);
    tbody.appendChild(row);
  });

  table.append(tableCaption, thead, tbody);
  wrap.appendChild(table);
  details.append(summary, wrap);
  root.appendChild(details);
}

function renderRankedIssues(root, tableRoot, caption, issues, orderNoteForIssue) {
  root.textContent = "";

  issues.forEach((issue, index) => {
    root.appendChild(buildRankedIssueCard(issue, index + 1, orderNoteForIssue(issue)));
  });

  renderIssueTable(tableRoot, caption, issues, orderNoteForIssue);
}

function renderIssueStatus(title, body) {
  issuesRoot.textContent = "";
  clearTable(issuesTableRoot);
  const card = document.createElement("article");
  card.className = "issue-card";
  card.innerHTML = `
    <p class="issue-tag">Issue data</p>
    <h3>${title}</h3>
    <p>${body}</p>
  `;
  appendIssueCorrectionControls(card, null, {
    subjectId: `issue-status-${normalizeClaimToken(title)}`,
    subjectLabel: title,
  });
  issuesRoot.appendChild(card);
}

function renderAnimalIssueStatus(title, body) {
  animalIssuesRoot.textContent = "";
  clearTable(animalIssuesTableRoot);
  const card = document.createElement("article");
  card.className = "issue-card";
  card.innerHTML = `
    <p class="issue-tag">Animal suffering causes</p>
    <h3>${title}</h3>
    <p>${body}</p>
  `;
  appendIssueCorrectionControls(card, null, {
    subjectId: `animal-issue-status-${normalizeClaimToken(title)}`,
    subjectLabel: title,
  });
  animalIssuesRoot.appendChild(card);
}

function buildRankedIssueCard(issue, rank, orderNote) {
  const metadata = issueMetadata(issue);
  const card = document.createElement("article");
  card.className = "issue-card";
  card.innerHTML = `
    <p class="issue-tag">${escapeHtml(issue.tag)}</p>
    <h3 class="issue-title"><span class="issue-rank">${rank}.</span><span>${escapeHtml(issue.title)}</span></h3>
    <strong class="issue-metric">${escapeHtml(issue.metric)}</strong>
    <div class="issue-meta-grid" aria-label="Source metadata">
      <span><strong>Layer</strong>${escapeHtml(metadata.layer)}</span>
      <span><strong>Evidence</strong>${escapeHtml(metadata.evidenceKind)}</span>
      <span><strong>Vintage</strong>${escapeHtml(metadata.vintage)}</span>
      <span><strong>Uncertainty</strong>${escapeHtml(metadata.uncertainty)}</span>
    </div>
    <p>${escapeHtml(issue.body)}</p>
    <p class="issue-order-note">${escapeHtml(orderNote)}</p>
    <details class="issue-evidence-details">
      <summary>Evidence metadata</summary>
      <p>${escapeHtml(metadata.methodNote)}</p>
      <p class="issue-source">${escapeHtml(issue.source)}</p>
    </details>
  `;
  appendIssueCorrectionControls(card, issue);

  return card;
}

function renderPainAnchors() {
  if (!painAnchorsRoot) {
    return;
  }

  painAnchorsRoot.textContent = "";

  for (const level of PAIN_LEVELS) {
    const item = document.createElement("article");
    item.className = "pain-anchor";

    const swatch = document.createElement("span");
    swatch.className = "pain-anchor-swatch";
    swatch.style.backgroundColor = `var(--pain-${level.id})`;

    const body = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = level.label;
    const description = document.createElement("p");
    description.textContent = level.description;
    const anchor = document.createElement("p");
    anchor.className = "pain-meta";
    anchor.textContent = level.humanAnchor;

    body.append(title, description, anchor);
    item.append(swatch, body);
    painAnchorsRoot.appendChild(item);
  }
}

function buildPainCitation(row) {
  const sourceTitles = (row.sources || []).map((source) => source.title).join("; ");
  return `PainMap. ${row.label}. ${formatPainValue(painTotal(row.values), row.unit)} total ${row.unit} across Welfare Footprint pain categories. Sources: ${sourceTitles}. Last reviewed ${row.lastReviewedAt}. https://painmap.org/events/`;
}

function buildEvidenceBadge(text) {
  const badge = document.createElement("span");
  badge.className = "evidence-badge";
  badge.textContent = text;
  return badge;
}

function buildEvidenceField(label, value) {
  const field = document.createElement("div");
  field.className = "evidence-field";
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value || "Not stated";
  field.append(term, description);
  return field;
}

function buildPainEvidenceDetails(row) {
  const details = document.createElement("details");
  details.className = "evidence-details";

  const summary = document.createElement("summary");
  summary.textContent = "Evidence and uncertainty";
  details.appendChild(summary);

  const badges = document.createElement("div");
  badges.className = "evidence-badges";
  badges.append(
    buildEvidenceBadge(`Estimate: ${row.estimateKind || "modeled"}`),
    buildEvidenceBadge(`Confidence: ${row.confidence || "not stated"}`),
    buildEvidenceBadge(`Source type: ${row.sourceType || "source-linked"}`)
  );

  const fields = document.createElement("dl");
  fields.className = "evidence-grid";
  fields.append(
    buildEvidenceField("Species", row.species),
    buildEvidenceField("System", row.system),
    buildEvidenceField("Window", row.windowLabel),
    buildEvidenceField("Total", `${formatPainValue(painTotal(row.values), row.unit)} ${row.unit}`),
    buildEvidenceField("Last reviewed", row.lastReviewedAt),
    buildEvidenceField("Uncertainty", row.uncertainty)
  );

  const assumptions = document.createElement("div");
  assumptions.className = "evidence-block";
  const assumptionsTitle = document.createElement("h5");
  assumptionsTitle.textContent = "Assumptions";
  const assumptionsList = document.createElement("ul");
  for (const assumption of row.assumptions || []) {
    const item = document.createElement("li");
    item.textContent = assumption;
    assumptionsList.appendChild(item);
  }
  assumptions.append(assumptionsTitle, assumptionsList);

  const sources = document.createElement("div");
  sources.className = "evidence-block";
  const sourcesTitle = document.createElement("h5");
  sourcesTitle.textContent = "Sources";
  const sourceList = document.createElement("ul");
  for (const source of row.sources || []) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `${source.title} (${source.publisher})`;
    item.appendChild(link);
    sourceList.appendChild(item);
  }
  sources.append(sourcesTitle, sourceList);

  const citationButton = document.createElement("button");
  citationButton.className = "ghost-button citation-button";
  citationButton.type = "button";
  citationButton.textContent = "Copy citation";
  citationButton.addEventListener("click", async () => {
    const originalLabel = citationButton.textContent;
    const citation = buildPainCitation(row);

    try {
      await navigator.clipboard.writeText(citation);
      citationButton.textContent = "Citation copied";
    } catch (error) {
      setStatus(`Citation: ${citation}`);
      citationButton.textContent = "Citation shown in status";
    }

    window.setTimeout(() => {
      citationButton.textContent = originalLabel;
    }, 2200);
  });

  details.append(badges, fields, assumptions, sources, citationButton);
  return details;
}

function buildPainRow(row, maxTotal) {
  const article = document.createElement("article");
  article.className = "pain-row";

  const head = document.createElement("div");
  head.className = "pain-row-head";

  const headCopy = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = row.label;
  const meta = document.createElement("p");
  meta.className = "pain-meta";
  meta.textContent = row.meta;
  headCopy.append(title, meta);

  const total = document.createElement("span");
  total.className = "pain-total";
  total.textContent = `${formatPainValue(painTotal(row.values), row.unit)} total`;

  head.append(headCopy, total);

  const bar = document.createElement("div");
  bar.className = "pain-bar";
  bar.setAttribute("role", "img");
  bar.setAttribute(
    "aria-label",
    `${row.label}: ${formatPainValue(painTotal(row.values), row.unit)} total pain load. Values are also listed in the table below.`
  );

  for (const level of PAIN_LEVELS) {
    const value = row.values[level.id] || 0;

    if (!value) {
      continue;
    }

    const segment = document.createElement("span");
    segment.className = `pain-segment is-${level.id}`;
    segment.style.width = `${(value / maxTotal) * 100}%`;
    segment.title = `${level.label}: ${formatPainValue(value, row.unit)}`;
    bar.appendChild(segment);
  }

  const breakdown = document.createElement("div");
  breakdown.className = "pain-breakdown";

  for (const level of PAIN_LEVELS) {
    const value = row.values[level.id] || 0;

    if (!value) {
      continue;
    }

    const chip = document.createElement("span");
    chip.className = "pain-chip";
    const dot = document.createElement("i");
    dot.className = `is-${level.id}`;
    const label = document.createElement("span");
    label.textContent = `${level.label}: ${formatPainValue(value, row.unit)}`;
    chip.append(dot, label);
    breakdown.appendChild(chip);
  }

  article.append(head, bar, breakdown, buildPainEvidenceDetails(row));
  return article;
}

function renderPainChart(root, rows) {
  if (!root) {
    return;
  }

  root.textContent = "";
  const maxTotal = Math.max(...rows.map((row) => painTotal(row.values)));

  for (const row of rows) {
    root.appendChild(buildPainRow(row, maxTotal));
  }
}

function renderPainDataTable(root, caption, rows) {
  if (!root) {
    return;
  }

  root.textContent = "";

  const details = document.createElement("details");
  details.className = "data-table-details";
  details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = "Data table equivalent";

  const wrap = document.createElement("div");
  wrap.className = "data-table-wrap";

  const table = document.createElement("table");
  table.className = "data-table";

  const tableCaption = document.createElement("caption");
  tableCaption.textContent = caption;

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Event", "Context", "Estimate", "Confidence", "Last reviewed", "Source", "Total", ...PAIN_LEVELS.map((level) => level.label)].forEach((label) =>
    appendTextCell(headerRow, "th", label)
  );
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  rows.forEach((painRow) => {
    const row = document.createElement("tr");
    appendTextCell(row, "th", painRow.label).scope = "row";
    appendTextCell(row, "td", painRow.meta);
    appendTextCell(row, "td", painRow.estimateKind || "modeled");
    appendTextCell(row, "td", painRow.confidence || "");
    appendTextCell(row, "td", painRow.lastReviewedAt || "");
    appendTextCell(row, "td", (painRow.sources || []).map((source) => source.title).join("; "));
    appendTextCell(row, "td", formatPainValue(painTotal(painRow.values), painRow.unit));

    PAIN_LEVELS.forEach((level) => {
      const value = painRow.values[level.id] || 0;
      appendTextCell(row, "td", value ? formatPainValue(value, painRow.unit) : "0");
    });

    tbody.appendChild(row);
  });

  table.append(tableCaption, thead, tbody);
  wrap.appendChild(table);
  details.append(summary, wrap);
  root.appendChild(details);
}

function renderPainCallouts() {
  if (!painCalloutsRoot) {
    return;
  }

  painCalloutsRoot.textContent = "";

  for (const callout of PAIN_CALLOUTS) {
    const card = document.createElement("article");
    card.className = "pain-callout";
    const title = document.createElement("h4");
    title.textContent = callout.title;
    const body = document.createElement("p");
    body.textContent = callout.body;
    card.append(title, body);
    painCalloutsRoot.appendChild(card);
  }
}

function renderPainVisuals() {
  renderPainAnchors();
  renderPainChart(painLongChartRoot, LONG_PAIN_ROWS);
  renderPainChart(painAcuteChartRoot, ACUTE_PAIN_ROWS);
  renderPainDataTable(painLongTableRoot, "Long pain loads by event and pain intensity", LONG_PAIN_ROWS);
  renderPainDataTable(painAcuteTableRoot, "Acute slaughter pain by method and pain intensity", ACUTE_PAIN_ROWS);
  renderPainCallouts();
}

function renderMoralWeightNotes() {
  if (!moralWeightGridRoot) {
    return;
  }

  moralWeightGridRoot.textContent = "";

  for (const note of MORAL_WEIGHT_NOTES) {
    const card = document.createElement("article");
    card.className = "mw-card";
    card.innerHTML = `
      <p class="issue-tag">${note.tag}</p>
      <h3>${note.title}</h3>
      <p>${note.body}</p>
    `;
    moralWeightGridRoot.appendChild(card);
  }
}

function renderIssues(country) {
  if (isSnapshotMode()) {
    if (!country) {
      renderRankedIssues(
        issuesRoot,
        issuesTableRoot,
        "Snapshot whole-world release ranking",
        STATIC_WORLD_SUFFERING_ISSUES,
        (issue) => formatWholeWorldRanking(issue, state.rankingMode)
      );
      return;
    }

    const iso = countryIso(country.properties);
    const name = countryName(country.properties);
    ensureCountryCoverageStatus(iso).catch(() => {});
    const coverageStatus = countryCoverageStatus(country);
    const missingText = countryCoverageMissingText(coverageStatus);
    const promotionText = countryCoveragePromotionText(coverageStatus);

    renderIssueStatus(
      "Snapshot country context",
      coverageStatus === COVERAGE_STATUS.canonicalProfile
        ? `${name} has frozen country measurement rows in the 2026-05-31.atlas.2 release with ${countryCoverageStatusText(coverageStatus)}. Switch to Live overlay for browser-time World Bank, OWID, ADM1, and WorldPop context.`
        : `${name} is present in the release place index as ${countryCoverageStatusLabel(coverageStatus)}. ${missingText}. ${promotionText} This snapshot does not publish canonical country rows for this country yet.`
    );
    return;
  }

  if (!country) {
    const needsAnimalData = state.globeMode === "suffering" || state.globeMode === "death";
    const isLoading =
      state.globalIssueData.loading ||
      (needsAnimalData && animalDataState.loading) ||
      (state.globeMode === "suffering" && state.globalContext.loading);
    const hasError =
      state.globalIssueData.error ||
      (needsAnimalData && animalDataState.error) ||
      (state.globeMode === "suffering" && state.globalContext.error);

    if (isLoading) {
      renderIssueStatus(
        "Loading whole-world ranking",
        state.globeMode === "death"
          ? "Fetching World Bank WLD mortality data plus global animal kill counts so the panel can rank life-years lost across humans and animals."
          : "Fetching World Bank WLD burden data plus global farmed-animal, wild-animal, and insect data so the panel can rank whole-world suffering across humans and animals."
      );
      return;
    }

    if (hasError) {
      renderRankedIssues(
        issuesRoot,
        issuesTableRoot,
        "Whole-world atlas fallback ranking",
        STATIC_WORLD_SUFFERING_ISSUES,
        (issue) => formatWholeWorldRanking(issue, state.rankingMode)
      );
      return;
    }

    const issues = state.globeMode === "death" ? buildWholeWorldDeathIssues() : buildWholeWorldSufferingIssues();

    if (!issues.length) {
      renderIssueStatus(
        "No whole-world ranking available",
        "The loaded world data did not produce any mixed human-animal causes for the current ordering mode."
      );
      return;
    }

    renderRankedIssues(
      issuesRoot,
      issuesTableRoot,
      state.globeMode === "death"
        ? "Whole-world life-years lost ranking"
        : "Whole-world suffering ranking across humans and animals",
      issues,
      (issue) => formatWholeWorldRanking(issue, state.rankingMode)
    );

    return;
  }

  if (state.selectedProvince) {
    if (!state.provinceIssueData || state.provinceIssueData.loading) {
      renderIssueStatus(
        "Loading province ranking",
        state.globeMode === "death"
          ? "Fetching province population and age structure from WorldPop so the panel can estimate which death causes are largest inside the selected ADM1 region."
          : "Fetching province population and age structure from WorldPop, matching World Bank ADM1 poverty where available, and then building a province-level top 10 across human and animal pain causes."
      );
      return;
    }

    if (state.provinceIssueData.error) {
      renderIssueStatus(
        "Province data unavailable",
        "The province-specific data request failed, so the panel cannot yet estimate a province-level ranking for the selected ADM1 region."
      );
      return;
    }

    const issues =
      state.globeMode === "death"
        ? sortIssuesByMode(state.provinceIssueData.deathIssues || [], state.rankingMode).slice(0, WORLD_RANK_LIMIT)
        : buildProvinceMixedSufferingIssues(state.provinceIssueData);

    if (!issues.length) {
      renderIssueStatus(
        "No province ranking available",
        "The selected province did not produce any province-level causes for the current ordering mode."
      );
      return;
    }

    renderRankedIssues(
      issuesRoot,
      issuesTableRoot,
      "Selected province ranking",
      issues,
      (issue) =>
        state.globeMode === "death" && !issue.localKind
          ? formatHumanRanking(issue, state.rankingMode)
          : formatProvinceRanking(issue, state.rankingMode)
    );
    return;
  }

  if (!state.countryIssueData || state.countryIssueData.loading) {
    renderIssueStatus(
      "Loading country ranking",
      state.globeMode === "death"
        ? "Fetching the latest available national mortality indicators for child mortality, maternal mortality, pollution, unsafe WASH, road injuries, suicide, homicide, and war deaths."
        : "Fetching the latest available national indicators for child health, infectious disease, food insecurity, poverty, pollution, water, clean cooking, violence, and conflict."
    );
    return;
  }

  if (state.countryIssueData.error) {
    renderIssueStatus(
      "Country data unavailable",
      "The national issue-data request failed for this country, so the panel cannot yet rank the tracked issue set."
    );
    return;
  }

  const issues = currentHumanIssues(state.countryIssueData);

  if (!issues.length) {
    renderIssueStatus(
      "No recent issue data",
      state.globeMode === "death"
        ? "The World Bank API did not return recent non-null observations for the tracked death indicators for this country."
        : "The World Bank API did not return recent non-null observations for the tracked issue indicators for this country."
    );
    return;
  }

  const orderedIssues = sortIssuesByMode(issues, state.rankingMode);
  renderRankedIssues(
    issuesRoot,
    issuesTableRoot,
    "Selected country human issue ranking",
    orderedIssues,
    (issue) => formatHumanRanking(issue, state.rankingMode)
  );
}

function renderAnimalIssues(country) {
  if (!currentGlobeModeConfig().showAnimals || state.selectedProvince) {
    animalIssuesRoot.textContent = "";
    clearTable(animalIssuesTableRoot);
    return;
  }

  if (isSnapshotMode()) {
    if (!country) {
      renderRankedIssues(
        animalIssuesRoot,
        animalIssuesTableRoot,
        "Snapshot whole-world animal release ranking",
        STATIC_WORLD_ANIMAL_ISSUES,
        (issue) => formatAnimalRanking(issue, state.rankingMode)
      );
      return;
    }

    renderAnimalIssueStatus(
      "Snapshot animal overlay disabled",
      "Country-level animal buckets that depend on current OWID, Fishcount, WAI, and World Bank rows are live overlays. Switch to Live overlay to load them for the selected country."
    );
    return;
  }

  if (!country) {
    const isLoading = animalDataState.loading || state.globalContext.loading;
    const hasError = animalDataState.error || state.globalContext.error;

    if (isLoading) {
      renderAnimalIssueStatus(
        "Loading whole-world animal causes",
        "Fetching live global animal data so the panel can rank factory-farmed animals, non-insect wild animals, and insects by total burden, per-being burden, and tractability."
      );
      return;
    }

    if (hasError) {
      renderRankedIssues(
        animalIssuesRoot,
        animalIssuesTableRoot,
        "Whole-world animal atlas fallback ranking",
        STATIC_WORLD_ANIMAL_ISSUES,
        (issue) => formatAnimalRanking(issue, state.rankingMode)
      );
      return;
    }

    const issues = buildWholeWorldAnimalIssues();

    if (!issues.length) {
      renderAnimalIssueStatus(
        "No whole-world animal ranking available",
        "The loaded animal sources did not produce any whole-world cause buckets for the current ordering mode."
      );
      return;
    }

    renderRankedIssues(
      animalIssuesRoot,
      animalIssuesTableRoot,
      "Whole-world animal suffering ranking",
      issues,
      (issue) => formatAnimalRanking(issue, state.rankingMode)
    );

    return;
  }

  if (animalDataState.loading) {
    renderAnimalIssueStatus(
      "Loading animal data",
      "Fetching country-level slaughter, wild-caught fish, wild-bird and terrestrial-arthropod proxies, and direct insecticide estimates so the panel can rank the three requested animal buckets."
    );
    return;
  }

  if (animalDataState.error) {
    renderAnimalIssueStatus(
      "Animal data unavailable",
      "The country-level farmed and wild animal proxy data failed to load, so the panel cannot yet estimate those burdens for this country."
    );
    return;
  }

  const issues = buildAnimalIssues(country);

  if (!issues.length) {
    renderAnimalIssueStatus(
      "No animal issue data",
      "No matching country-level factory-farmed, non-insect wild, or insect estimate was found for this country in the loaded data."
    );
    return;
  }

  const orderedIssues = sortIssuesByMode(issues, state.rankingMode);
  renderRankedIssues(
    animalIssuesRoot,
    animalIssuesTableRoot,
    "Selected country animal cause ranking",
    orderedIssues,
    (issue) => formatAnimalRanking(issue, state.rankingMode)
  );
}

function populateCountryOptions() {
  const shouldOpen =
    document.activeElement === countrySearchInput && Boolean(countrySearchInput.value.trim());
  renderCountrySearchOptions(countrySearchInput.value, shouldOpen);
}

function buildCountrySearchOptions() {
  const options = [];
  const optionValues = new Set();
  const optionId = (type, value) =>
    `country-search-option-${type}-${normalizeSearchText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "result"}`;

  for (const entry of state.countryIndex) {
    if (optionValues.has(entry.name)) {
      continue;
    }

    const coverageStatus = countryCoverageStatus(entry.feature);
    options.push({
      id: optionId("country", entry.iso || entry.name),
      type: "country",
      countryId: entry.iso || entry.name,
      label: entry.name,
      description: buildCountrySearchOptionMeta(entry, coverageStatus),
      searchText: normalizeSearchText(`${entry.name} ${entry.iso || ""}`),
      feature: entry.feature,
      coverageStatus,
    });
    optionValues.add(entry.name);
  }

  for (const [iso, cached] of provinceCache) {
    const countryEntry = state.countryIndex.find((entry) => entry.iso === iso);

    if (!countryEntry) {
      continue;
    }

    for (const feature of cached.features || []) {
      const value = `${provinceName(feature)}, ${countryEntry.name}`;

      if (optionValues.has(value)) {
        continue;
      }

      options.push({
        id: optionId("province", `${iso}-${provinceName(feature)}`),
        type: "province",
        label: value,
        description: buildProvinceSearchOptionMeta(countryEntry, feature, countryCoverageStatus(countryEntry.feature)),
        searchText: normalizeSearchText(`${value} ${iso}`),
        feature,
        countryFeature: countryEntry.feature,
        coverageStatus: countryCoverageStatus(countryEntry.feature),
      });
      optionValues.add(value);
    }
  }

  return options;
}

function filterCountrySearchOptions(query) {
  const normalized = normalizeSearchText(query);
  const options = buildCountrySearchOptions();

  if (!normalized) {
    return options.slice(0, 12);
  }

  const countryMatches = findCountries(query);
  const ambiguousAliasMatchCount = countryMatches.reduce((count, entry) => {
    return isAliasMatchType(entry?.lastMatch?.type) ? count + 1 : count;
  }, 0);
  const countryMatchById = new Map();
  for (const entry of countryMatches) {
    const countryId = entry.iso || entry.name;
    if (!countryId) {
      continue;
    }
    countryMatchById.set(countryId, entry);
  }

  const exact = [];
  const startsWith = [];
  const contains = [];

  for (const option of options) {
    if (option.type !== "country") {
      option.lastMatch = {};
      option.requiresExplicitSelection = false;
      if (option.searchText === normalized) {
        exact.push(option);
      } else if (option.searchText.startsWith(normalized)) {
        startsWith.push(option);
      } else if (option.searchText.includes(normalized)) {
        contains.push(option);
      }
      continue;
    }

    const match = countryMatchById.get(option.countryId) || countryMatchEntry(option, normalized);
    if (!match) {
      continue;
    }

    option.lastMatch = match;
    option.requiresExplicitSelection = requiresExplicitCountrySelection(match, ambiguousAliasMatchCount);
    option.ambiguousAliasMatchCount = ambiguousAliasMatchCount;
    if (match.exact) {
      exact.push(option);
      continue;
    }

    if (match.startsWith) {
      startsWith.push(option);
      continue;
    }

    contains.push(option);
  }

  return [...exact, ...startsWith, ...contains].slice(0, 12);
}

function countrySearchSelectionRequiresConfirmation(option, options = currentCountrySearchOptions) {
  if (!option || !option.type) {
    return false;
  }

  if (options.length > 1 && !hasExplicitCountrySearchSelection) {
    return true;
  }

  if (option.type === "country" && option.requiresExplicitSelection && !hasExplicitCountrySearchSelection) {
    return true;
  }

  return false;
}

function showCountrySearchDisambiguation(option) {
  const query = countrySearchInput.value.trim();

  if (!option) {
    setSearchStatus("Select a place result from the list before confirming.");
    return;
  }

  if (currentCountrySearchOptions.length > 1) {
    setSearchStatus(`Multiple matches for "${query}". Select one result from the list before opening it.`);
    return;
  }

  if (option.type === "country" && option.lastMatch) {
    if (option.requiresExplicitSelection) {
      const aliasType = aliasTypeLabel(option.lastMatch.type);
      const aliasValue = option.lastMatch.value || option.label;
      const matchCount = Math.max(1, currentCountrySearchOptions.length);
      setSearchStatus(
        `Alias match for "${aliasValue}" (${aliasType}) is ambiguous across ${matchCount} results. Select a single result from the list before opening this place.`
      );
      return;
    }

    const aliasType = aliasTypeLabel(option.lastMatch.type);
    const aliasValue = option.lastMatch.value || option.label;
    setSearchStatus(
      `Alias match for "${aliasValue}": ${aliasType}. Select a single result from the list before opening this place.`
    );
    return;
  }

  if (option.type === "province") {
    setSearchStatus(`Ambiguous province query "${query}". Select a province result from the list before opening it.`);
    return;
  }

  setSearchStatus(`Select "${option.label}" from the list to confirm this match.`);
}

function closeCountrySearchOptions() {
  currentCountrySearchOptions = [];
  activeCountrySearchIndex = -1;
  hasExplicitCountrySearchSelection = false;
  countryOptions.hidden = true;
  countryOptions.textContent = "";
  countrySearchInput.removeAttribute("aria-activedescendant");
  countrySearchInput.setAttribute("aria-expanded", "false");
}

function setActiveCountrySearchOption(index, isExplicit = false) {
  if (!currentCountrySearchOptions.length) {
    activeCountrySearchIndex = -1;
    countrySearchInput.removeAttribute("aria-activedescendant");
    return;
  }

  activeCountrySearchIndex = Math.max(0, Math.min(index, currentCountrySearchOptions.length - 1));
  if (isExplicit) {
    hasExplicitCountrySearchSelection = true;
  }
  const activeOption = currentCountrySearchOptions[activeCountrySearchIndex];
  countrySearchInput.setAttribute("aria-activedescendant", activeOption.id);

  const optionNodes = countryOptions.querySelectorAll("[role='option']");

  optionNodes.forEach((option, optionIndex) => {
    option.setAttribute("aria-selected", String(optionIndex === activeCountrySearchIndex));
    option.classList.toggle("is-active", optionIndex === activeCountrySearchIndex);
  });

  const activeNode = optionNodes[activeCountrySearchIndex];
  activeNode?.scrollIntoView({ block: "nearest" });
}

function renderCountrySearchOptions(query, shouldOpen = true) {
  if (!countryOptions || !countrySearchInput) {
    return;
  }

  currentCountrySearchOptions = filterCountrySearchOptions(query);
  hasExplicitCountrySearchSelection = false;
  countryOptions.textContent = "";

  if (!shouldOpen || !currentCountrySearchOptions.length) {
    closeCountrySearchOptions();
    setSearchStatus(shouldOpen ? "No country or province search results." : "");
    return;
  }

  const fragment = document.createDocumentFragment();

  currentCountrySearchOptions.forEach((option, index) => {
    const item = document.createElement("li");
    item.id = option.id;
    item.className = "country-option";
    item.role = "option";
    item.setAttribute("aria-selected", String(index === activeCountrySearchIndex));

    const label = document.createElement("span");
    label.className = "country-option-label";
    label.textContent = option.label;

    const description = document.createElement("span");
    description.className = "country-option-meta";
    setCountrySearchOptionMeta(description, option.description);

    item.append(label, description);
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      // Keep mousedown behavior limited to preventing blur while selection is handled in click.
    });
    item.addEventListener("click", (event) => {
      event.preventDefault();
      void commitCountrySearchOption(option);
    });
    fragment.appendChild(item);
  });

  countryOptions.appendChild(fragment);
  countryOptions.hidden = false;
  countrySearchInput.setAttribute("aria-expanded", "true");

  if (activeCountrySearchIndex < 0 || activeCountrySearchIndex >= currentCountrySearchOptions.length) {
    setActiveCountrySearchOption(0);
  } else {
    setActiveCountrySearchOption(activeCountrySearchIndex);
  }

  setSearchStatus(`${currentCountrySearchOptions.length} results available.`);
}

async function commitCountrySearchOption(option) {
  if (!option) {
    return;
  }

  if (countrySearchSelectionRequiresConfirmation(option)) {
    showCountrySearchDisambiguation(option);
    return;
  }

  countrySearchInput.value = option.label;
  closeCountrySearchOptions();
  setSearchStatus(`${option.label} selected.`);

  if (option.type === "province") {
    await selectProvince(option.countryFeature, option.feature);
    return;
  }

  await selectCountry(option.feature);
}

function findCountry(query) {
  return findCountries(query)[0] || null;
}

function countryFocusScale(feature) {
  if (mapViewMode !== "globe") {
    return currentBaseScale();
  }

  const [longitude, latitude] = d3.geoCentroid(feature);
  const previewProjection = d3
    .geoOrthographic()
    .translate([width / 2, height / 2])
    .scale(GLOBE_BASE_SCALE)
    .clipAngle(90)
    .precision(0.2)
    .rotate([-longitude, -latitude, 0]);
  const previewPath = d3.geoPath(previewProjection);
  const bounds = previewPath.bounds(feature);
  const boundsWidth = Math.max(1, bounds[1][0] - bounds[0][0]);
  const boundsHeight = Math.max(1, bounds[1][1] - bounds[0][1]);
  const fitMultiplier = 0.58 * Math.min(width / boundsWidth, height / boundsHeight);

  return clampScale(GLOBE_BASE_SCALE * fitMultiplier);
}

function focusFeatureView(feature) {
  if (mapViewMode !== "globe") {
    updateZoomUi();
    renderGlobe();
    return;
  }

  const [longitude, latitude] = d3.geoCentroid(feature);
  transitionGlobe([-longitude, -latitude, 0], countryFocusScale(feature));
}

function syncModeUi() {
  const globeMode = currentGlobeModeConfig();
  const rankingModes = currentRankingModes();
  const isCountryView = Boolean(state.selectedCountry);
  const isProvinceView = Boolean(state.selectedProvince);
  const rankingReady = releaseRankingReadiness(state.releaseCoverage);
  const rankingDisabledForGlobal = !isCountryView && !rankingReady;
  const activeModeConfig = getReleaseModeConfig(state.releaseMode);

  if (topbarNote) {
    topbarNote.textContent =
      activeModeConfig.topbarNote ||
      (isSnapshotMode() ? RELEASE_MODES.snapshot.topbarNote : RELEASE_MODES.live.topbarNote) ||
      "Mode-specific atlas guidance will display here.";
  }

  if (globeModeSelect) {
    globeModeSelect.value = state.globeMode;
  }

  if (globeModeCopy) {
    globeModeCopy.textContent = !isCountryView
      ? globeMode.globeCopy
      : isProvinceView
        ? state.globeMode === "death"
          ? "Province drill-down uses real ADM1 geometry plus province population and age structure from WorldPop to estimate which death causes loom largest in the selected province."
          : "Province drill-down uses real ADM1 geometry, province population and age structure from WorldPop, World Bank ADM1 poverty where available, and province allocation proxies for the remaining causes."
      : state.globeMode === "death"
        ? "Country drill-down narrows back to national human death causes because the site does not load equally robust country animal-death data."
        : "Country drill-down separates broader human suffering from three animal buckets for the selected country: factory-farmed animals, non-insect wild animals, and insects.";
  }

  if (humanSectionLabel) {
    humanSectionLabel.textContent = isProvinceView
      ? state.globeMode === "death"
        ? "Province death causes"
        : "Top 10 causes of pain in this province"
      : state.selectedCountry
      ? globeMode.humanSectionLabel
      : state.globeMode === "death"
        ? "Atlas context: whole-world life-years lost"
        : "Atlas context: whole-world suffering";
  }

  if (animalSectionLabel) {
    animalSectionLabel.textContent = state.selectedCountry
      ? globeMode.animalSectionLabel
      : state.globeMode === "death"
        ? ""
        : "Whole-world animal suffering";
  }

  if (animalSection) {
    animalSection.hidden = !globeMode.showAnimals || isProvinceView;
  }

  if (rankingTitle) {
    rankingTitle.textContent = state.globeMode === "death" ? "Order Context By" : "Order Context By";
  }

  if (rankingModeSelect) {
    rankingModeSelect.value = state.rankingMode;

    for (const option of rankingModeSelect.options) {
      if (rankingModes[option.value]) {
        option.textContent = rankingModes[option.value].label;
      }
    }

    rankingModeSelect.disabled = rankingDisabledForGlobal;
    rankingModeSelect.title = rankingDisabledForGlobal
      ? "Global ranking is disabled in coverage-first mode. Select a country to use country-scoped ranking controls."
      : "Order the visible atlas context by selected ranking mode.";
    rankingModeSelect.setAttribute(
      "aria-label",
      rankingDisabledForGlobal
        ? "Ranking mode selector is disabled while release coverage gates are active"
        : "Ranking mode selector"
    );
  }

  if (rankingCopy) {
    if (!isCountryView) {
      rankingCopy.textContent = rankingModes[state.rankingMode].copy;
    } else if (isProvinceView && state.globeMode === "death") {
      rankingCopy.textContent =
        state.rankingMode === "improvement"
          ? "Province death mode uses WorldPop population and age structure to allocate the country death model into the selected ADM1 region."
          : state.rankingMode === "total"
            ? "Province death mode estimates total life-years lost inside the selected ADM1 region from province population and age shares."
            : "Province death mode keeps the country's per-death intensity proxies unless a direct province source is loaded.";
    } else if (isProvinceView) {
      rankingCopy.textContent =
        state.rankingMode === "improvement"
          ? "Province suffering mode mixes WorldPop province totals, GSAP province poverty where available, and province-distributed animal proxies into one top 10."
          : state.rankingMode === "total"
            ? "Province suffering mode estimates total burden inside the selected ADM1 region using province population, under-5 population, and land-area shares."
            : "Province suffering mode keeps direct province poverty where available and otherwise carries over the country per-being rate while changing the province total.";
    } else if (state.globeMode === "death") {
      rankingCopy.textContent =
        state.rankingMode === "improvement"
          ? "Country drill-down uses the same tractability-weighted life-years approach, but only for the selected country's human death causes."
          : state.rankingMode === "total"
            ? "Country drill-down orders human death causes by estimated total life-years lost within the selected country."
            : "Country drill-down orders human death causes by estimated life-years lost per death within the selected country.";
    } else {
      rankingCopy.textContent =
        state.rankingMode === "improvement"
          ? "Country drill-down mixes recurring EA priorities with broader burden indicators for humans and tractability-adjusted welfare proxies for animals."
          : state.rankingMode === "total"
            ? "Country drill-down uses affected-person proxies for humans and three live animal buckets built from factory-farmed, non-insect wild, and insect estimates."
            : "Country drill-down uses severity per affected human and average welfare-range or sentience proxies per animal inside each bucket.";
    }
  }
}

function renderDetails() {
  const globeMode = currentGlobeModeConfig();
  syncModeUi();
  syncReleaseModeUi();

  if (!state.selectedCountry) {
    const rankingReady = releaseRankingReadiness(state.releaseCoverage);

    if (!rankingReady) {
      const reasons = releaseRankingReadinessReason(state.releaseCoverage);
      const releaseNoteUrl = releaseRankingReadinessNoteUrl(state.releaseCoverage);
      const releaseSummary = state.releaseCoverage?.release_id || RELEASE_ID;
      const releaseDate = state.releaseCoverage?.generated_at || "2026-05-31";
      const coverage = state.releaseCoverage?.coverage_status || {};
      const countryBoundaries = Number(coverage.country_boundaries_indexed || 0);
      const canonicalProfiles = Number(coverage.canonical_country_profiles || 0);
      const evidenceLayerCoverage = coverage.evidence_layer_coverage || {};
      const directRows = Number(evidenceLayerCoverage.direct || 0);
      const priorityRows = Number(evidenceLayerCoverage.priority_overlay || 0);

      countrySearchInput.value = "";
      selectionMeta.textContent = "Coverage-first atlas";
      selectionTitle.textContent = "Release visibility";
      selectionSummary.textContent =
        `Coverage-first mode is active for ${releaseSummary} because global ranking readiness is not yet met (${reasons}). Review ${releaseNoteUrl} for release-level coverage gate context. Search a country to inspect country profiles and issue cards.`;
      selectionFootnote.textContent =
        "The map keeps country and ADM1 coverage states visible through hatch and outline cues. Rankings are not shown here until the release is dense enough for fair global comparison.";

      updatePlaceSummary({
        topSource: "Coverage summary",
        evidenceMix: `${formatCoverageSummaryValue(canonicalProfiles)} canonical profiles and ${formatCoverageSummaryValue(
          directRows + priorityRows
        )} direct/priority rows`,
        uncertainty: "Sparse coverage; not globally comparable",
        lastUpdate: releaseDate,
        placeId: "WLD",
        compareLabel: "Compare whole world",
      });

      setMapProvenance({
        place: "Whole Earth",
        encoding: "Boundary and ADM1 state is explicit; map color is not a global ranking claim in this default state.",
        source: `Natural Earth boundaries and ${releaseSummary} coverage JSON.`,
        uncertainty: "Coverage status, not ranking precision, is the strongest guarantee in this view.",
      });

      updateAtlasLayerRail({
        explanation:
          "Default global mode now emphasizes release coverage breadth. Select a country to inspect evidence rows, method context, and issue cards.",
        evidenceKind: `Global coverage matrix (canonical ${formatCoverageSummaryValue(canonicalProfiles)} / ${formatCoverageSummaryValue(
          countryBoundaries
        )}`,
        uncertainty: "High uncertainty on non-canonical rows",
        vintage: releaseDate,
        sourceCount: `${formatCoverageSummaryValue(countryBoundaries)} countries, ${formatCoverageSummaryValue(
          coverage.adm1_boundaries?.static_context_count || 0
        )} ADM1 context rows`,
        sourceList: "Natural Earth, Immutable release coverage index, geoBoundaries context overlay, and coverage JSON.",
      });

      factLocation.textContent = "Whole Earth";
      factCountrySource.textContent = "Natural Earth Admin 0, 1:50m release asset";
      factAdminSource.textContent = "ADM1 context and live overlays are deferred to country selection";
      factIssueSource.textContent = "Global ranking deferred in coverage-first mode.";
      setFactCoverageStatusText("Coverage-first global atlas view: global ranking disabled until release coverage is dense enough.");
      factUnitCount.textContent = formatNumber(canonicalProfiles);

      renderIssueStatus(
        "Global ranking deferred",
        "Use country search first. The release keeps most rows as sparse context until canonical coverage is expanded."
      );
      renderAnimalIssueStatus(
        "Animal ranking deferred",
        "Animal rows are held in coverage-first mode until snapshot readiness criteria pass for this release."
      );

      return;
    }

    if (isSnapshotMode()) {
      const snapshotIssues = STATIC_WORLD_SUFFERING_ISSUES;

      countrySearchInput.value = "";
      selectionMeta.textContent = "Atlas context";
      selectionTitle.textContent = "Release snapshot.";
      selectionSummary.textContent =
        "The default atlas view is pinned to the immutable 2026-05-31.atlas.2 release contract, with table equivalents and no live upstream ranking fetches.";
      selectionFootnote.textContent =
        "Snapshot mode uses static release artifacts, local boundary files, checksums, schemas, and coverage status. Switch to Live overlay for current public-source context that is not frozen into release rows.";
      updatePlaceSummary({
        topSource: "Whole-world release snapshot",
        evidenceMix: "Proxy fallback plus priority overlay",
        uncertainty: "Low to very low",
        lastUpdate: "2026-05-31",
        placeId: "WLD",
        compareLabel: "Compare whole world",
      });
      setMapProvenance({
        place: "Whole Earth",
        encoding:
          "Most countries are boundary-only release places and use diagonal hatching; Brazil and India use the low-confidence profile outline.",
        source: "Natural Earth Admin 0 local release asset plus 2026-05-31.atlas.2 place and coverage artifacts.",
        uncertainty:
          "Hatching marks boundary-only or very-low-confidence coverage. Solid outlined countries have canonical low-confidence release rows.",
      });
      updateAtlasLayerRail({
        explanation:
          "Snapshot mode keeps the visible atlas tied to frozen release rows, coverage JSON, and local boundary assets. The ranking cards are static fallback context, not browser-time upstream fetches.",
        evidenceKind: "Proxy aggregate plus boundary coverage",
        uncertainty: "Low to very low; boundary-only places are hatched",
        vintage: "2026-05-31.atlas.2",
        sourceCount: "6 source families",
        sourceList:
          "PainMap release rows, Natural Earth, World Bank indicators, OWID/Fishcount-style animal rows, Rethink Priorities, and Wild Animal Initiative.",
      });
      factLocation.textContent = "Whole Earth";
      factCountrySource.textContent = "Natural Earth Admin 0, 1:50m release asset";
      factAdminSource.textContent = "ADM1 disabled in snapshot mode";
      factIssueSource.textContent = "Snapshot: release rows, coverage JSON, and local fallback ranking metadata.";
      setFactCoverageStatusText("No place selected · release snapshot coverage.");
      factUnitCount.textContent = formatNumber(snapshotIssues.length);
      renderIssues(null);
      renderAnimalIssues(null);
      return;
    }

    const worldIssues =
      state.globalIssueData.loading ||
      state.globalIssueData.error ||
      animalDataState.loading ||
      animalDataState.error ||
      (state.globeMode === "suffering" && (state.globalContext.loading || state.globalContext.error))
        ? []
        : state.globeMode === "death"
          ? buildWholeWorldDeathIssues()
          : buildWholeWorldSufferingIssues();

    countrySearchInput.value = "";
    selectionMeta.textContent = "Atlas context";
    selectionTitle.textContent = "Place-level context.";
    selectionSummary.textContent =
      state.globeMode === "death"
        ? `This atlas panel shows whole-world death causes, currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}, with a table path for the same values.`
        : `This atlas panel shows whole-world suffering causes, with a separate animal-only ranking below ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`;
    selectionFootnote.textContent =
      state.globeMode === "death"
        ? "This atlas panel connects place-level context to event-level pain evidence. Whole-world human death causes come from World Bank WLD mortality indicators. Whole-world animal death causes come from OWID global slaughter and aquaculture kill counts plus conservative remaining-life proxies."
        : "This atlas panel connects place-level context to event-level pain evidence. Whole-world human suffering causes come from World Bank WLD burden indicators, while the animal-only ranking below aggregates live OWID and World Bank inputs into factory-farmed animals, non-insect wild animals, and insects.";
    updatePlaceSummary({
      topSource: state.globeMode === "death" ? "Live WDI WLD + OWID overlay" : "Live WDI / OWID / RP / WAI overlay",
      evidenceMix: state.globeMode === "death" ? "Human death indicators plus animal-death proxies" : "Human burden plus animal cause buckets",
      uncertainty: "Modeled and proxy",
      lastUpdate: "Live public-source overlay",
      placeId: "WLD",
      compareLabel: "Compare whole world",
    });
    setMapProvenance({
      place: "Whole Earth",
      encoding:
        "Country boundaries remain release-scoped; live overlay rankings are shown in the cards and tables, not as unlabeled map color.",
      source:
        state.globeMode === "death"
          ? "Natural Earth boundaries with live World Bank WLD and OWID animal-death context."
          : "Natural Earth boundaries with live World Bank, OWID, RP, WAI, and land-area context.",
      uncertainty:
        "Live values are modeled or proxy overlays. Boundary-only and low-confidence release status remains visible through hatching and outlines.",
    });
    updateAtlasLayerRail({
      explanation:
        state.globeMode === "death"
          ? "Live death mode keeps the boundary layer release-scoped while the right rail and tables show current mortality context."
          : "Live suffering mode keeps boundaries release-scoped while the rail and tables show current public-source human and animal burden context.",
      evidenceKind: state.globeMode === "death" ? "Modeled death proxy plus boundary layer" : "Modeled and proxy overlay plus boundary layer",
      uncertainty: "Modeled and proxy; release coverage remains hatched or outlined",
      vintage: state.globeMode === "death" ? `World Bank ${ISSUE_DATA_DATE_RANGE}; live OWID rows where used` : "Live public-source overlay plus 2026-05-31 release context",
      sourceCount: state.globeMode === "death" ? "3 source families" : "5 source families",
      sourceList:
        state.globeMode === "death"
          ? "Natural Earth, World Bank WLD mortality indicators, and OWID animal-death context."
          : "Natural Earth, World Bank indicators, OWID rows, Rethink Priorities, and Wild Animal Initiative.",
    });
    factLocation.textContent = "Whole Earth";
    factCountrySource.textContent = "Natural Earth Admin 0, 1:50m";
    factAdminSource.textContent = "geoBoundaries ADM1 will load on click";
    factIssueSource.textContent =
      state.globeMode === "death"
        ? state.globalIssueData.loading || animalDataState.loading
            ? "Atlas layer: loading WDI WLD + OWID animal-death data."
            : state.globalIssueData.error || animalDataState.error
            ? "Atlas layer: using local fallback metadata because one live mixed-species source failed."
            : "Atlas layer: WDI WLD + OWID slaughter and aquaculture data + life-years proxies."
        : state.globalIssueData.loading || animalDataState.loading || state.globalContext.loading
        ? "Atlas layer: loading WDI WLD + OWID + RP + WAI + land-area context."
        : state.globalIssueData.error || animalDataState.error || state.globalContext.error
        ? "Atlas layer: using local fallback metadata because one live suffering source failed."
        : "Atlas layer: WDI WLD + OWID + World Bank land area + RP + WAI + three animal cause buckets.";
    factUnitCount.textContent = formatNumber(worldIssues.length);
    setFactCoverageStatusText("Coverage-first global atlas view: live overlays are not release measurements.");
    renderIssues(null);
    renderAnimalIssues(null);
    return;
  }

  const countryProps = state.selectedCountry.properties;
  const name = countryName(countryProps);
  const iso = countryIso(countryProps) || "Unknown ISO";
  const subregion = countryProps.SUBREGION || countryProps.CONTINENT || "Unknown region";
  const coverageStatus = countryCoverageStatus(state.selectedCountry);
  const countryCoverageStatusForCard = countryCoverageStatusLabel(coverageStatus);
  const issueData = state.countryIssueData;
  const provinceNameLabel = state.selectedProvince ? provinceName(state.selectedProvince) : null;
  const provinceIssueData = state.provinceIssueData;

  countrySearchInput.value = provinceNameLabel ? `${provinceNameLabel}, ${name}` : name;
  selectionMeta.textContent = `${name} · ${subregion}`;
  selectionTitle.textContent = provinceNameLabel || name;

  if (isSnapshotMode()) {
    const hasCanonicalProfile = coverageStatus === COVERAGE_STATUS.canonicalProfile;
    const missingText = countryCoverageMissingText(coverageStatus);
    const promotionText = countryCoveragePromotionText(coverageStatus);

    selectionSummary.textContent = hasCanonicalProfile
      ? `${name} is selected from the immutable release. This country has canonical measurement rows in 2026-05-31.atlas.2.`
      : `${name} is selected from the immutable release boundary index. This country is in ${countryCoverageStatusText(coverageStatus)} in 2026-05-31.atlas.2. ${missingText} ${promotionText}`;
    selectionFootnote.textContent =
      "Snapshot mode does not query World Bank, OWID, geoBoundaries, or WorldPop at interaction time. Switch to Live overlay to load ADM1 boundaries and current public-source ranking context.";
    updatePlaceSummary({
      topSource: hasCanonicalProfile ? "Canonical release profile" : "Boundary-indexed country",
      evidenceMix: hasCanonicalProfile ? "3 canonical measurement rows" : `${missingText} ${promotionText}`,
      uncertainty: hasCanonicalProfile ? "Low confidence" : "Not measured",
      lastUpdate: "2026-05-31",
      placeId: iso,
      compareLabel: `Compare ${name}`,
    });
    setMapProvenance({
      place: name,
      encoding: hasCanonicalProfile
        ? `${name} uses the low-confidence profile outline because canonical release rows exist.`
        : `${name} remains diagonally hatched because this release has boundary coverage but no canonical measurement rows.`,
      source: "Natural Earth Admin 0 local release asset plus the release place index and coverage JSON.",
      uncertainty: hasCanonicalProfile
        ? "Canonical rows are labeled low confidence; confidence bands remain in the data table and JSON."
        : "Boundary-only status is not a pain measurement. It is shown with a hatch so sparse coverage is visible on the map.",
    });
    updateAtlasLayerRail({
      explanation: hasCanonicalProfile
        ? `${name} has frozen country measurement rows in the release. The rail keeps the layer caveat beside the map before any live overlay is requested.`
        : `${name} is a boundary-indexed place in this release. The hatch is the visible layer cue that no canonical pain measurement exists for this country yet.`,
      evidenceKind: hasCanonicalProfile ? "Canonical proxy measurements plus boundary layer" : "Boundary coverage only",
      uncertainty: hasCanonicalProfile ? "Low confidence release rows" : "Very-low-confidence coverage; not measured",
      vintage: "2026-05-31.atlas.2",
      sourceCount: hasCanonicalProfile ? "4 source families" : "2 source families",
      sourceList: hasCanonicalProfile
        ? "PainMap release rows, Natural Earth, World Bank indicators, and OWID/Fishcount-style animal rows."
        : "Natural Earth boundary asset and PainMap release coverage index.",
    });
    factLocation.textContent = `${name} · ${iso}`;
    factCountrySource.textContent = "Natural Earth Admin 0, 1:50m release asset";
    factAdminSource.textContent = "ADM1 disabled in snapshot mode";
    factIssueSource.textContent = hasCanonicalProfile
      ? "Snapshot: canonical country profile rows available."
      : "Snapshot: boundary-index-only country; no frozen measurement rows.";
    setFactCoverageStatusText(countryCoverageStatusForCard, coverageStatus);
    factUnitCount.textContent = hasCanonicalProfile ? "3" : "0";
    renderIssues(state.selectedCountry);
    renderAnimalIssues(state.selectedCountry);
    return;
  }

  if (!issueData || issueData.loading) {
    selectionSummary.textContent = provinceNameLabel
      ? `${provinceNameLabel} is selected inside ${name}. The ADM1 boundary is loaded, and the province model is waiting for the country baseline before it can finish the local ranking.`
      : state.globeMode === "death"
        ? `Loading the death-focused cause ranking for ${name} from World Bank country mortality indicators.`
        : `Loading the broader country suffering ranking for ${name} from World Bank and Our World in Data country indicators.`;
    factIssueSource.textContent = state.globeMode === "death"
      ? "Human: loading WDI death indicators."
      : animalDataState.loading
        ? "Human: loading WDI. Animals: loading OWID + WDI + RP + WAI + cost-effectiveness anchors."
        : "Human: loading WDI. Animals: OWID + WDI + RP + WAI + cost-effectiveness anchors.";
    setFactCoverageStatusText(countryCoverageStatusForCard, coverageStatus);
  } else if (issueData.error) {
    selectionSummary.textContent = provinceNameLabel
      ? `${provinceNameLabel} is selected inside ${name}. The ADM1 geometry is real, but the province model cannot finish because the country baseline failed to load.`
      : `Country-specific issue data could not be loaded for ${name}, so the ranking layer is unavailable right now.`;
    factIssueSource.textContent = state.globeMode === "death"
      ? "Human: WDI death indicators failed."
      : animalDataState.loading
        ? "Human: WDI failed. Animals: loading OWID + WDI + RP + WAI + cost-effectiveness anchors."
        : animalDataState.error
          ? "Human: WDI failed. Animals: OWID load failed."
          : "Human: WDI failed. Animals: OWID + WDI + RP + WAI + cost-effectiveness anchors.";
    setFactCoverageStatusText(countryCoverageStatusForCard, coverageStatus);
  } else if (provinceNameLabel && (!provinceIssueData || provinceIssueData.loading)) {
    selectionSummary.textContent =
      state.globeMode === "death"
        ? `${provinceNameLabel} is selected inside ${name}. Loading province population and age structure from WorldPop so the panel can estimate which death causes are largest inside this ADM1 region.`
        : `${provinceNameLabel} is selected inside ${name}. Loading province population and age structure from WorldPop, plus direct World Bank ADM1 poverty where available, so the panel can build a province-level top 10 pain ranking.`;
    factIssueSource.textContent =
      state.globeMode === "death"
        ? "Province: loading WorldPop + national WDI death model."
        : "Province: loading WorldPop + GSAP + WDI + OWID province estimate model.";
    setFactCoverageStatusText(countryCoverageStatusForCard, coverageStatus);
  } else if (provinceNameLabel && provinceIssueData?.error) {
    selectionSummary.textContent = `${provinceNameLabel} is selected inside ${name}, but the province-specific data request failed.`;
    factIssueSource.textContent =
      state.globeMode === "death"
        ? "Province: WorldPop or national death-model allocation failed."
        : "Province: WorldPop, GSAP, or province estimate model failed.";
    setFactCoverageStatusText(countryCoverageStatusForCard, coverageStatus);
  } else {
    selectionSummary.textContent = provinceNameLabel
      ? state.globeMode === "death"
        ? `${provinceNameLabel} is selected inside ${name}. The list below estimates which death causes loom largest inside this province, currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`
        : `${provinceNameLabel} is selected inside ${name}. The list below estimates the top 10 pain causes in this province across humans and animals, currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`
      : state.globeMode === "death"
        ? `This atlas panel focuses on human death causes in ${name}. It is currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`
        : `This atlas panel combines broader human suffering indicators with three country-level animal buckets for ${name}: factory-farmed animals, non-insect wild animals, and insects. It is currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`;
    factIssueSource.textContent = provinceNameLabel
      ? state.globeMode === "death"
        ? "Province: WorldPop + national WDI death model."
        : `Province: WorldPop + ${provinceIssueData?.context?.povertyRecord ? "World Bank GSAP + " : ""}WDI + OWID + RP + WAI province estimate model.`
      : state.globeMode === "death"
        ? "Human: World Bank WDI death indicators."
        : animalDataState.loading
          ? "Human: World Bank WDI. Animals: loading OWID + WDI + RP + WAI + cost-effectiveness anchors."
          : animalDataState.error
            ? "Human: World Bank WDI. Animals: OWID load failed."
            : "Human: World Bank WDI. Animals: OWID + WDI + RP + WAI + cost-effectiveness anchors.";
    setFactCoverageStatusText(countryCoverageStatusForCard, coverageStatus);
  }

  const isLoadingLiveSummary =
    !issueData ||
    issueData.loading ||
    (provinceNameLabel && (!provinceIssueData || provinceIssueData.loading));
  const hasLiveSummaryError = issueData?.error || (provinceNameLabel && provinceIssueData?.error);
  const liveTopSource = isLoadingLiveSummary
    ? "Loading live overlay"
    : hasLiveSummaryError
      ? provinceNameLabel
        ? "Province overlay unavailable"
        : "Country overlay unavailable"
      : provinceNameLabel
        ? "Province live overlay"
        : state.globeMode === "death"
          ? "Human death indicators"
          : "Human and animal burden overlay";
  const liveEvidenceMix = provinceNameLabel
    ? state.globeMode === "death"
      ? "WorldPop plus national WDI model"
      : "WorldPop, GSAP, WDI, OWID, RP, WAI"
    : state.globeMode === "death"
      ? "World Bank WDI death indicators"
      : "WDI, OWID, RP, WAI, cause buckets";
  updatePlaceSummary({
    topSource: liveTopSource,
    evidenceMix: liveEvidenceMix,
    uncertainty: hasLiveSummaryError ? "Unavailable" : isLoadingLiveSummary ? "Pending" : "Modeled and proxy",
    lastUpdate: "Live public-source overlay",
    placeId: currentComparePlaceId(state.selectedCountry, state.selectedProvince),
    compareLabel: `Compare ${provinceNameLabel || name}`,
  });
  const liveRailIsDeath = state.globeMode === "death";
  const liveRailHasGsap = Boolean(provinceNameLabel && provinceIssueData?.context?.povertyRecord);
  updateAtlasLayerRail({
    explanation: provinceNameLabel
      ? liveRailIsDeath
        ? `${provinceNameLabel} is an ADM1 live overlay. The rail separates the province geometry and WorldPop allocation from the national death model.`
        : `${provinceNameLabel} is an ADM1 live overlay. The rail separates province geometry, population context, poverty context where available, and distributed animal proxies from frozen release rows.`
      : liveRailIsDeath
        ? `${name} is using a live country death layer while the map still shows release-scoped coverage status and boundary uncertainty.`
        : `${name} is using a live country suffering layer while the map still shows release-scoped coverage status and boundary uncertainty.`,
    evidenceKind: provinceNameLabel
      ? liveRailIsDeath
        ? "ADM1 modeled death overlay"
        : "ADM1 modeled and proxy overlay"
      : liveRailIsDeath
        ? "Country death proxy overlay"
        : "Country modeled and proxy overlay",
    uncertainty: hasLiveSummaryError ? "Unavailable" : isLoadingLiveSummary ? "Pending" : provinceNameLabel ? "Modeled ADM1 proxy" : "Modeled and proxy",
    vintage: provinceNameLabel
      ? liveRailIsDeath
        ? `WorldPop ${WORLDPOP_YEAR}; World Bank ${ISSUE_DATA_DATE_RANGE}`
        : `WorldPop ${WORLDPOP_YEAR}; World Bank ${ISSUE_DATA_DATE_RANGE}; live OWID rows`
      : liveRailIsDeath
        ? `World Bank ${ISSUE_DATA_DATE_RANGE}`
        : `World Bank ${ISSUE_DATA_DATE_RANGE}; live OWID rows where available`,
    sourceCount: provinceNameLabel
      ? liveRailIsDeath
        ? "3 source families"
        : liveRailHasGsap
          ? "7 source families"
          : "6 source families"
      : liveRailIsDeath
        ? "2 source families"
        : "5 source families",
    sourceList: provinceNameLabel
      ? liveRailIsDeath
        ? "geoBoundaries, WorldPop, and World Bank WDI."
        : liveRailHasGsap
          ? "geoBoundaries, WorldPop, World Bank GSAP, World Bank WDI, OWID, Rethink Priorities, and Wild Animal Initiative."
          : "geoBoundaries, WorldPop, World Bank WDI, OWID, Rethink Priorities, and Wild Animal Initiative."
      : liveRailIsDeath
        ? "Natural Earth and World Bank WDI mortality indicators."
        : "Natural Earth, World Bank WDI, OWID, Rethink Priorities, and Wild Animal Initiative.",
  });
  setMapProvenance({
    place: provinceNameLabel ? `${provinceNameLabel}, ${name}` : name,
    encoding: provinceNameLabel
      ? "The selected ADM1 overlay uses a hatched proxy fill and solid selected outline; unselected provinces use dashed proxy outlines."
      : countryHasCanonicalProfile(state.selectedCountry)
        ? `${name} keeps the low-confidence release outline while live overlay cards update beside the map.`
        : `${name} keeps the boundary-only hatch while live overlay cards update beside the map.`,
    source: provinceNameLabel
      ? state.globeMode === "death"
        ? "geoBoundaries ADM1 geometry, WorldPop population and age structure, and national WDI death model."
        : "geoBoundaries ADM1 geometry, WorldPop, GSAP where available, WDI, OWID, RP, and WAI proxy overlay."
      : state.globeMode === "death"
        ? "Natural Earth boundary, World Bank WDI death indicators, and live public-source overlay model."
        : "Natural Earth boundary, World Bank WDI, OWID, RP, WAI, and live public-source overlay model.",
    uncertainty: provinceNameLabel
      ? "ADM1 values are modeled or proxy overlays. The hatch and dashed line distinguish them from frozen release measurement rows."
      : "Live overlay rankings are not frozen release measurements; release coverage status remains visible through map patterning.",
  });

  const boundarySource = state.provinceMeta?.boundarySource
    ? `ADM1 source: ${state.provinceMeta.boundarySource}.`
    : "ADM1 source will appear once the boundary layer loads.";
  const issueSource = issueData?.error
      ? " Issue data request failed."
      : issueData?.loading
        ? " Issue data will appear after the country request completes."
        : provinceNameLabel && provinceIssueData?.loading
          ? " Province ranking is loading from WorldPop population and age structure, plus World Bank ADM1 poverty where available."
          : provinceNameLabel && provinceIssueData?.error
            ? " Province ranking failed before the ADM1 estimate could be assembled."
            : provinceNameLabel && state.globeMode === "death"
              ? " Province death cards use WorldPop province population and age structure to allocate the national death model into this ADM1 region. Per-death intensities remain the country's current national proxy."
              : provinceNameLabel
                ? " Province suffering cards mix WorldPop province totals, World Bank GSAP ADM1 poverty where available, and province-distributed country and animal proxies where no direct ADM1 feed is loaded."
        : state.globeMode === "death"
          ? " Human death cards use World Bank mortality indicators and death proxies for pollution, unsafe WASH, road injury, suicide, homicide, and conflict. The within-country order converts deaths into rough life-years lost using local life expectancy minus WHO-style age anchors, so it is an inference rather than a published master list."
          : " Human cards combine recurring EA priorities with broader World Bank burden indicators for food insecurity, pollution, water, clean cooking, TB, homicide, and conflict. The within-country order is estimated rather than copied from a published master list.";
  const animalSource = provinceNameLabel
    ? state.globeMode === "death"
      ? " Province death mode hides the separate animal panel because the province ranking is already consolidated in the main list."
      : " Province animal estimates distribute country animal totals using real province population or land-area inputs. Wild and insect causes rely more heavily on land area; factory-farmed and aquatic causes rely more on province population because a global ADM1 livestock-by-species feed is not loaded here."
    : !globeMode.showAnimals
    ? " The death atlas mode hides the animal layer because this view is specifically about human death causes."
    : animalDataState.loading
      ? " Animal issue data is still loading from Our World in Data."
      : animalDataState.error
        ? " Animal issue data failed to load."
        : " Animal cards now aggregate live data into three requested buckets: factory-farmed animals, non-insect wild animals, and insects. The model uses Our World in Data slaughter, aquaculture, wild-caught fish, and insecticide data, World Bank land and agricultural-land indicators, a Wild Animal Initiative direct-insect benchmark, and Rethink Priorities sentience and welfare-range distributions where available. Per-dollar ordering remains rough and should be read as intervention-priority guidance rather than a settled cost-effectiveness table.";
  selectionFootnote.textContent = `${boundarySource}${issueSource}${animalSource} Current ordering: ${rankingLabel(state.rankingMode)}.`;

  factLocation.textContent = provinceNameLabel ? `${provinceNameLabel}, ${name} · ${iso}` : `${name} · ${iso}`;
  factCountrySource.textContent = "Natural Earth Admin 0, 1:50m";

  if (state.provinceMeta?.error) {
    factAdminSource.textContent = "ADM1 failed to load";
    factUnitCount.textContent = "0";
  } else if (state.provinceMeta) {
    const canonical = state.provinceMeta.boundaryCanonical || "ADM1";
    const buildDate = state.provinceMeta.buildDate || state.provinceMeta.sourceDataUpdateDate || "Current build";
    factAdminSource.textContent = `${canonical} · ${buildDate}`;
    factUnitCount.textContent = formatNumber(state.provinceMeta.admUnitCount || state.provinceFeatures.length);
  } else {
    factAdminSource.textContent = "Loading ADM1 boundaries...";
    factUnitCount.textContent = "0";
  }

  renderIssues(state.selectedCountry);
  renderAnimalIssues(state.selectedCountry);
}

function transitionGlobe(rotate, scale, duration = 900) {
  const startRotate = projection.rotate();
  const endRotate = rotate ?? startRotate;
  const endScale = clampScale(scale ?? projection.scale());

  if (prefersReducedMotion()) {
    projection.rotate(endRotate);
    projection.scale(endScale);
    updateZoomUi();
    renderGlobe();
    return;
  }

  const rotateInterpolator = d3.interpolate(startRotate, endRotate);
  const scaleInterpolator = d3.interpolateNumber(projection.scale(), endScale);

  svg
    .interrupt()
    .transition()
    .duration(duration)
    .tween("globe-focus", () => (time) => {
      projection.rotate(rotateInterpolator(time));
      projection.scale(scaleInterpolator(time));
      updateZoomUi();
      renderGlobe();
    });
}

function setProjectionScale(scale) {
  projection.scale(clampScale(scale));
  updateZoomUi();
  renderGlobe();
}

function switchMapView(nextMode) {
  mapViewMode = nextMode === "globe" ? "globe" : "atlas";
  svg.interrupt();
  projection = createMapProjection(mapViewMode);
  path.projection(projection);

  if (mapProjectionModeSelect) {
    mapProjectionModeSelect.value = mapViewMode;
  }

  if (mapDisclosureSummary) {
    mapDisclosureSummary.textContent = mapViewMode === "globe" ? "Globe explorer" : "Equal-area atlas view";
  }

  updateZoomUi();
  renderGlobe();

  if (state.selectedProvince) {
    setStatus(`${provinceName(state.selectedProvince)}, ${countryName(state.selectedCountry?.properties)} selected in ${mapViewLabel()}.`);
    return;
  }

  if (state.selectedCountry) {
    setStatus(`${countryName(state.selectedCountry.properties)} selected in ${mapViewLabel()}.`);
    return;
  }

  setStatus(`Showing global country boundaries in ${mapViewLabel()}.`);
}

function renderGlobe() {
  svg.classed("is-atlas-view", mapViewMode === "atlas").classed("is-globe-view", mapViewMode === "globe");
  spherePath.attr("d", path({ type: "Sphere" }));
  graticulePath.attr("d", path(graticule));
  outlinePath.attr("d", path({ type: "Sphere" }));

  countriesGroup
    .selectAll("path")
    .data(state.countries, (feature) => countryIso(feature.properties) || countryName(feature.properties))
    .join("path")
    .attr("class", (feature) => {
      const iso = countryIso(feature.properties);
      const selectedIso = state.selectedCountry ? countryIso(state.selectedCountry.properties) : null;
      const classes = ["country-path", countryMapCoverage(feature).className];

      if (selectedIso && iso === selectedIso) {
        classes.push("is-selected");
        return classes.join(" ");
      }

      if (selectedIso) {
        classes.push("is-muted");
        return classes.join(" ");
      }

      return classes.join(" ");
    })
    .attr("d", path)
    .attr("aria-label", (feature) => `${countryName(feature.properties)}; ${countryMapCoverage(feature).label}`)
    .attr("role", "button")
    .attr("tabindex", 0)
    .on("keydown", (event, feature) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      selectCountry(feature);
    })
    .on("click", (event, feature) => {
      if (justDragged) {
        return;
      }

      selectCountry(feature);
    });

  provincesGroup
    .selectAll("path")
    .data(
      state.provinceFeatures,
      (feature) => feature.properties.shapeID || feature.properties.shapeISO || provinceName(feature)
    )
    .join("path")
    .attr("class", (feature) => {
      const isSelected =
        state.selectedProvince &&
        (feature.properties.shapeID === state.selectedProvince.properties.shapeID ||
          provinceName(feature) === provinceName(state.selectedProvince));

      return isSelected ? "province-path is-selected" : "province-path";
    })
    .attr("d", path)
    .attr(
      "aria-label",
      (feature) =>
        `${provinceName(feature)}, ${countryName(state.selectedCountry?.properties)}; ADM1 proxy overlay with modeled or proxy uncertainty`
    )
    .attr("role", "button")
    .attr("tabindex", 0)
    .on("keydown", (event, feature) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      selectProvince(state.selectedCountry, feature);
    })
    .on("click", (event, feature) => {
      event.stopPropagation();

      if (justDragged) {
        return;
      }

      selectProvince(state.selectedCountry, feature);
    });
}

function focusCountryView(feature) {
  focusFeatureView(feature);
}

async function loadAdm1(feature) {
  const properties = feature.properties;
  const iso = countryIso(properties);
  const name = countryName(properties);

  if (!iso) {
    state.provinceMeta = { error: "Missing ISO code" };
    state.provinceFeatures = [];
    renderDetails();
    renderGlobe();
    setStatus(`No ISO code available for ${name}.`);
    return;
  }

  if (provinceCache.has(iso)) {
    const cached = provinceCache.get(iso);
    state.provinceMeta = cached.meta;
    state.provinceFeatures = cached.features;
    populateCountryOptions();
    renderDetails();
    renderGlobe();
    setStatus(`${name} ADM1 boundaries loaded from cache.`);
    return;
  }

  const requestId = ++provinceRequestId;
  state.provinceMeta = null;
  state.provinceFeatures = [];
  renderDetails();
  renderGlobe();
  setStatus(`Loading ${name} ADM1 boundaries...`);

  try {
    const meta = await fetchJson(`https://www.geoboundaries.org/api/current/gbOpen/${iso}/ADM1/`);
    const topology = await fetchJson(mediaGithubUrl(meta.tjDownloadURL));
    const objectKey = Object.keys(topology.objects)[0];
    const features = topojsonFeature(topology, topology.objects[objectKey]).features;

    provinceCache.set(iso, { meta, features });
    populateCountryOptions();

    if (requestId !== provinceRequestId || countryIso(state.selectedCountry?.properties) !== iso) {
      return;
    }

    state.provinceMeta = meta;
    state.provinceFeatures = features;
    renderDetails();
    renderGlobe();
    setStatus(`Loaded ${formatNumber(meta.admUnitCount || features.length)} ADM1 units for ${name}.`);
  } catch (error) {
    if (requestId !== provinceRequestId) {
      return;
    }

    state.provinceMeta = { error: error.message };
    state.provinceFeatures = [];
    renderDetails();
    renderGlobe();
    setStatus(`ADM1 load failed for ${name}.`);
  }
}

async function loadGlobalContext() {
  state.globalContext = { loading: true, error: null, context: null };
  renderDetails();

  try {
    const payload = await fetchJson(CONTEXT_DATA_URL("WLD"));
    const parsed = parseContextData(payload);
    state.globalContext = { ...parsed, loading: false, error: null };
    renderDetails();
  } catch (error) {
    state.globalContext = { loading: false, error: error.message, context: null };
    renderDetails();
  }
}

async function loadGlobalIssueData() {
  state.globalIssueData = { loading: true, error: null, sufferingIssues: [], deathIssues: [] };
  renderDetails();

  try {
    const payload = await fetchJson(ISSUE_DATA_URL("WLD"));
    const parsed = parseCountryIssueData(payload, WORLD_FEATURE);
    state.globalIssueData = { ...parsed, loading: false, error: null };
    renderDetails();
  } catch (error) {
    state.globalIssueData = { loading: false, error: error.message, sufferingIssues: [], deathIssues: [] };
    renderDetails();
  }
}

async function loadCountryIssueData(feature) {
  const properties = feature.properties;
  const iso = countryIso(properties);
  const name = countryName(properties);

  if (!iso) {
    state.countryIssueData = { error: "Missing ISO code" };
    renderDetails();
    return;
  }

  if (issueCache.has(iso)) {
    state.countryIssueData = issueCache.get(iso);
    renderDetails();
    return;
  }

  const requestId = ++issueRequestId;
  state.countryIssueData = { loading: true };
  renderDetails();

  try {
    const payload = await fetchJson(ISSUE_DATA_URL(iso));
    const parsed = parseCountryIssueData(payload, feature);
    issueCache.set(iso, parsed);

    if (requestId !== issueRequestId || countryIso(state.selectedCountry?.properties) !== iso) {
      return;
    }

    state.countryIssueData = parsed;
    renderDetails();
  } catch (error) {
    if (requestId !== issueRequestId) {
      return;
    }

    state.countryIssueData = { error: error.message };
    renderDetails();
    setStatus(`Issue data load failed for ${name}.`);
  }
}

async function selectCountry(feature) {
  recordTelemetry("atlas_place_selected", {
    place_id: countryIso(feature.properties) || "unknown",
    geometry_level: "country",
    parent_place_id: "WLD",
  });
  state.selectedCountry = feature;
  const iso = countryIso(feature?.properties);
  if (iso) {
    ensureCountryCoverageStatus(iso, { render: true }).catch(() => {});
  }
  state.selectedProvince = null;
  state.countryIssueData = isSnapshotMode() ? { snapshot: true } : { loading: true };
  state.provinceIssueData = null;
  state.provinceMeta = null;
  state.provinceFeatures = [];
  focusCountryView(feature);
  renderDetails();
  renderGlobe();

  if (isSnapshotMode()) {
    setStatus(`${countryName(feature.properties)} selected in snapshot mode. Switch to Live overlay to load ADM1 and current public-source rankings.`);
    return;
  }

  await Promise.all([loadAdm1(feature), loadCountryIssueData(feature)]);
}

async function selectProvince(countryFeature, provinceTarget) {
  if (isSnapshotMode()) {
    await selectCountry(countryFeature);
    setStatus("Province drill-down is a live overlay. Switch to Live overlay before loading ADM1 boundaries.");
    return;
  }

  const targetIso = countryIso(countryFeature.properties);
  const currentIso = countryIso(state.selectedCountry?.properties);

  if (currentIso !== targetIso || !state.provinceFeatures.length) {
    await selectCountry(countryFeature);
  }

  const resolvedProvince =
    typeof provinceTarget === "string"
      ? findProvince(state.provinceFeatures, provinceTarget)
      : state.provinceFeatures.find((feature) => sameProvinceFeature(feature, provinceTarget)) || null;

  if (typeof provinceTarget === "string") {
    const candidateMatches = findProvinceCandidates(state.provinceFeatures, provinceTarget);
    if (candidateMatches.length > 1) {
      setStatus(
        `Ambiguous province match for "${provinceTarget}" in ${countryName(countryFeature.properties)}. Select one result from the list before opening it.`
      );
      return;
    }
  }

  if (!resolvedProvince) {
    recordTelemetry("zero_result_search", {
      query_length: typeof provinceTarget === "string" ? provinceTarget.length : 0,
    });
    setStatus(`No province or state matched "${typeof provinceTarget === "string" ? provinceTarget : provinceName(provinceTarget)}" inside ${countryName(countryFeature.properties)}.`);
    return;
  }

  recordTelemetry("atlas_place_selected", {
    place_id: `${targetIso || "unknown"}:${provinceName(resolvedProvince)}`,
    geometry_level: "adm1",
    parent_place_id: targetIso || null,
  });
  state.selectedProvince = resolvedProvince;
  state.provinceIssueData = { loading: true };
  countrySearchInput.value = `${provinceName(resolvedProvince)}, ${countryName(countryFeature.properties)}`;
  focusFeatureView(resolvedProvince);
  renderDetails();
  renderGlobe();
  setStatus(`Loading province data for ${provinceName(resolvedProvince)}, ${countryName(countryFeature.properties)}...`);
  await loadProvinceIssueData(countryFeature, resolvedProvince);
  setStatus(`${provinceName(resolvedProvince)}, ${countryName(countryFeature.properties)} selected.`);
}

async function handleCountrySearch(event) {
  event.preventDefault();

  if (!state.countryIndex.length) {
    setStatus("Country boundaries are still loading.");
    return;
  }

  const rawQuery = countrySearchInput.value.trim();

  if (!rawQuery) {
    setStatus('Enter a country or a province in the form "Province, Country".');
    return;
  }

  recordTelemetry("place_search_started", { query_length: rawQuery.length });

  if (state.selectedCountry && state.provinceFeatures.length) {
    const provinceMatch = findProvince(state.provinceFeatures, rawQuery);
    const provinceCandidates = findProvinceCandidates(state.provinceFeatures, rawQuery);

    if (provinceMatch) {
      await selectProvince(state.selectedCountry, provinceMatch);
      return;
    }

    if (provinceCandidates.length > 1) {
      const selectedCountryName = state.selectedCountry?.properties
        ? countryName(state.selectedCountry.properties)
        : "the selected country";
      setStatus(
        `Ambiguous province match for "${rawQuery}" in ${selectedCountryName}. Select one province result from the suggestions before opening it.`
      );
      return;
    }
  }

  const provinceCountryQuery = parseProvinceCountryQuery(rawQuery);

  if (provinceCountryQuery) {
    const countryMatches = findCountries(provinceCountryQuery.countryQuery);

    if (!countryMatches.length) {
      recordTelemetry("zero_result_search", { query_length: rawQuery.length });
      setStatus(`No country matched "${provinceCountryQuery.countryQuery}".`);
      return;
    }

    if (countryMatches.length > 1) {
      renderCountrySearchOptions(rawQuery, true);
      setSearchStatus(
        `Disambiguation required for "${provinceCountryQuery.countryQuery}": multiple country matches found. Select one result from the list.`
      );
      return;
    }

    const countryMatch = countryMatches[0];
    if (requiresExplicitCountrySelection(countryMatch.lastMatch, countryMatches.length)) {
      renderCountrySearchOptions(rawQuery, true);
      const aliasType = aliasTypeLabel(countryMatch.lastMatch?.type);
      setSearchStatus(
        `Alias match for "${provinceCountryQuery.countryQuery}": ${aliasType} "${countryMatch.lastMatch?.value || countryMatch.name}". Confirm selection from the list before opening province "${provinceCountryQuery.provinceQuery}".`
      );
      return;
    }

    await selectProvince(countryMatch.feature, provinceCountryQuery.provinceQuery);
    return;
  }

  const matches = findCountries(rawQuery);

  if (!matches.length) {
    recordTelemetry("zero_result_search", { query_length: rawQuery.length });
    setStatus(`No country or province matched "${rawQuery}".`);
    return;
  }

  if (matches.length > 1) {
    renderCountrySearchOptions(rawQuery, true);
    setSearchStatus(
      `Disambiguation required for "${rawQuery}": multiple country matches found. Select one result from the list.`
    );
    return;
  }

  const bestMatch = matches[0];
  if (requiresExplicitCountrySelection(bestMatch.lastMatch, matches.length)) {
    renderCountrySearchOptions(rawQuery, true);
    const aliasType = aliasTypeLabel(bestMatch.lastMatch?.type);
    setSearchStatus(
      `Alias match for "${rawQuery}": ${aliasType} "${bestMatch.lastMatch?.value || bestMatch.name}". Confirm selection from the list before opening ${bestMatch.name}.`
    );
    return;
  }

  await selectCountry(bestMatch.feature);
}

function adjustZoom(multiplier) {
  setProjectionScale(projection.scale() * multiplier);
}

function resetView() {
  state.selectedCountry = null;
  state.selectedProvince = null;
  state.provinceMeta = null;
  state.provinceFeatures = [];
  state.countryIssueData = null;
  state.provinceIssueData = null;
  svg.interrupt();
  projection = createMapProjection(mapViewMode);
  path.projection(projection);
  renderDetails();
  updateZoomUi();
  renderGlobe();
  setStatus(`Showing global country boundaries in ${mapViewLabel()}.`);
}

function setupInteraction() {
  svg.call(
    d3
      .drag()
      .on("start", () => {
        justDragged = false;
      })
      .on("drag", (event) => {
        if (prefersReducedMotion()) {
          return;
        }

        if (mapViewMode !== "globe") {
          justDragged = Math.abs(event.dx) + Math.abs(event.dy) > 2;
          return;
        }

        const rotate = projection.rotate();
        const nextRotation = [
          rotate[0] + event.dx * 0.34,
          Math.max(-88, Math.min(88, rotate[1] - event.dy * 0.34)),
          0,
        ];

        projection.rotate(nextRotation);
        justDragged = true;
        renderGlobe();
      })
      .on("end", () => {
        if (prefersReducedMotion()) {
          justDragged = false;
          return;
        }

        window.setTimeout(() => {
          justDragged = false;
        }, 120);
      })
  );

  svg.node().addEventListener(
    "wheel",
    (event) => {
      if (prefersReducedMotion()) {
        return;
      }

      event.preventDefault();
      const nextScale = projection.scale() * Math.exp(-event.deltaY * 0.0015);
      setProjectionScale(nextScale);
    },
    { passive: false }
  );

  countrySearchInput.addEventListener("focus", () => {
    renderCountrySearchOptions(countrySearchInput.value, true);
  });
  countrySearchInput.addEventListener("input", () => {
    activeCountrySearchIndex = 0;
    renderCountrySearchOptions(countrySearchInput.value, true);
  });
  countrySearchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (countryOptions.hidden) {
        renderCountrySearchOptions(countrySearchInput.value, true);
        hasExplicitCountrySearchSelection = true;
      } else {
        setActiveCountrySearchOption(activeCountrySearchIndex + 1, true);
      }
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCountrySearchOption(activeCountrySearchIndex - 1, true);
    }

    if (event.key === "Enter" && !countryOptions.hidden && currentCountrySearchOptions[activeCountrySearchIndex]) {
      event.preventDefault();
      const candidate = currentCountrySearchOptions[activeCountrySearchIndex];

      if (countrySearchSelectionRequiresConfirmation(candidate)) {
        showCountrySearchDisambiguation(candidate);
        return;
      }

      commitCountrySearchOption(candidate);
    }

    if (event.key === "Escape") {
      closeCountrySearchOptions();
      setSearchStatus("Country search suggestions closed.");
    }
  });
  countrySearchForm.addEventListener("submit", async (event) => {
    if (!countryOptions.hidden && currentCountrySearchOptions[activeCountrySearchIndex]) {
      const candidate = currentCountrySearchOptions[activeCountrySearchIndex];

      if (countrySearchSelectionRequiresConfirmation(candidate)) {
        event.preventDefault();
        showCountrySearchDisambiguation(candidate);
        return;
      }

      event.preventDefault();
      await commitCountrySearchOption(candidate);
      return;
    }

    closeCountrySearchOptions();
    await handleCountrySearch(event);
  });
  document.addEventListener("click", (event) => {
    if (!countrySearchForm.contains(event.target)) {
      closeCountrySearchOptions();
    }
  });
  compareSaveButton?.addEventListener("click", saveCurrentComparePlace);
  compareClearButton?.addEventListener("click", clearCompareQueue);
  compareDrawerList?.addEventListener("click", (event) => {
    const removeButton = event.target.closest?.("[data-remove-place-id]");

    if (!removeButton) {
      return;
    }

    removeComparePlace(removeButton.dataset.removePlaceId);
  });
  releaseModeTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setReleaseMode(tab.dataset.releaseMode));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const lastIndex = releaseModeTabs.length - 1;
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? lastIndex
            : event.key === "ArrowLeft"
              ? Math.max(0, index - 1)
              : Math.min(lastIndex, index + 1);
      const nextTab = releaseModeTabs[nextIndex];
      nextTab.focus();
      setReleaseMode(nextTab.dataset.releaseMode);
    });
  });
  mapProjectionModeSelect?.addEventListener("change", () => {
    switchMapView(mapProjectionModeSelect.value);
  });
  globeModeSelect?.addEventListener("change", () => {
    state.globeMode = globeModeSelect.value;
    renderDetails();
  });
  rankingModeSelect?.addEventListener("change", () => {
    if (rankingModeSelect.disabled) {
      return;
    }

    state.rankingMode = rankingModeSelect.value;
    renderDetails();
  });
  zoomInButton.addEventListener("click", () => adjustZoom(1.18));
  zoomOutButton.addEventListener("click", () => adjustZoom(1 / 1.18));
  zoomRange.addEventListener("input", () => {
    setProjectionScale(currentBaseScale() * Number(zoomRange.value));
  });
  resetButton.addEventListener("click", resetView);
}

async function loadCoverageSummary() {
  try {
    const payload = await fetchJson(COVERAGE_DATA_URL, 3000);

    if (payload && payload.coverage_status) {
      state.releaseCoverage = payload;
    } else {
      state.releaseCoverage = RELEASE_COVERAGE_FALLBACK;
    }

    state.releaseCoverageLoaded = true;
  } catch (error) {
    state.releaseCoverage = RELEASE_COVERAGE_FALLBACK;
    state.releaseCoverageLoaded = false;
  }

  await loadPlaceIndexCoverageStatuses();

  for (const [iso, status] of state.placeIndexCoverageStatusByIso.entries()) {
    if (!state.countryCoverageStatusByIso.has(iso) && status === COVERAGE_STATUS.noData) {
      state.countryCoverageStatusByIso.set(iso, COVERAGE_STATUS.noData);
    }
  }
}

async function loadReleaseModeContract() {
  try {
    const payload = await fetchJson(RELEASE_MODES_DATA_URL, 3000);
    const parsed = parseReleaseModesPayload(payload);

    if (!parsed) {
      throw new Error("Invalid release mode payload");
    }

    state.releaseModeContract = parsed;
    const defaultMode = normalizeReleaseMode(parsed.default_mode);

    if (isModeContractSupported(defaultMode)) {
      state.releaseMode = defaultMode;
    }

    if (parsed.ui_contract?.tablist_label) {
      const tabList = document.querySelector(".release-mode-switch");
      if (tabList) {
        tabList.setAttribute("aria-label", String(parsed.ui_contract.tablist_label));
      }
    }

    if (parsed.local_event_name && parsed.local_event_name.trim()) {
      const eventName = parsed.local_event_name.trim();
      if (!TELEMETRY_EVENTS.has(eventName)) {
        TELEMETRY_EVENTS.add(eventName);
        TELEMETRY_FIELDS_BY_EVENT[eventName] = ["mode"];
      }
    }
  } catch (error) {
    state.releaseModeContract = null;
  }

  if (!isModeContractSupported(state.releaseMode)) {
    state.releaseMode = "snapshot";
  }

  syncReleaseModeUi();
}

function formatCoverageSummaryValue(value) {
  if (value == null || value === "") {
    return "—";
  }

  const number = Number(value);
  if (Number.isFinite(number)) {
    return `${formatNumber(number)}`;
  }

  const text = String(value).trim();
  return text || "—";
}

function summarizeEvidenceLayerCoverage(coverage) {
  const layerRows = [
    { label: "direct", value: coverage?.direct },
    { label: "proxy", value: coverage?.proxy },
    { label: "priority overlay", value: coverage?.priority_overlay },
    { label: "boundary", value: coverage?.boundary },
    { label: "ADM1 context overlay", value: coverage?.adm1_context_overlay },
  ];
  const nonZero = layerRows
    .map((entry) => ({ ...entry, count: Number(entry.value) || 0 }))
    .filter((entry) => Number.isFinite(entry.count) && entry.count > 0);

  if (!nonZero.length) {
    return "No evidence-layer rows are listed in this coverage snapshot.";
  }

  return `Evidence layers present: ${nonZero
    .map((entry) => `${formatCoverageSummaryValue(entry.count)} ${entry.label}`)
    .join(", ")}.`;
}

function summarizeSparseCoverage(summary) {
  const sparse = Array.isArray(summary?.known_sparse_areas) ? summary.known_sparse_areas : [];
  const statuses = sparse
    .map((entry) => entry?.status)
    .filter((status) => typeof status === "string" && status.trim().length > 0)
    .map((status) => status.trim());

  if (!statuses.length) {
    return "No sparse-coverage notes were loaded.";
  }

  return statuses.join(" · ");
}

function renderFactList(nodeOrId, items, fallbackText = "No items were found.") {
  const list = typeof nodeOrId === "string" ? document.getElementById(nodeOrId) : nodeOrId;
  if (!list) {
    return;
  }

  const raw = Array.isArray(items) ? items : [];
  const normalized = raw
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }

      if (!entry) {
        return "";
      }

      if (typeof entry.status === "string" && entry.status.trim()) {
        const area = typeof entry.area === "string" && entry.area.trim() ? `${entry.area.trim()}: ` : "";
        return `${area}${entry.status.trim()}`;
      }

      return "";
    })
    .filter(Boolean);

  list.textContent = "";

  if (!normalized.length) {
    const item = document.createElement("li");
    item.textContent = fallbackText;
    list.appendChild(item);
    return;
  }

  for (const text of normalized) {
    const item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
  }
}

function releaseRankingReadiness(summary = state.releaseCoverage) {
  const explicit = summary?.default_ranking_readiness;

  if (explicit && typeof explicit === "object" && explicit !== null) {
    if (typeof explicit.ready === "boolean") {
      return explicit.ready;
    }

    if (typeof explicit.enabled === "boolean") {
      return explicit.enabled;
    }
  }

  const coverage = summary?.coverage_status || {};
  const canonicalProfiles = Number(coverage.canonical_country_profiles || 0);
  const countryBoundaries = Number(coverage.country_boundaries_indexed || 0);
  const directEvidence = Number(coverage.evidence_layer_coverage?.direct || 0);
  const proxyEvidence = Number(coverage.evidence_layer_coverage?.proxy || 0);
  const priorityEvidence = Number(coverage.evidence_layer_coverage?.priority_overlay || 0);
  const releaseMeasurements = Number(coverage.release_measurements || 0);

  if (!Number.isFinite(countryBoundaries) || countryBoundaries <= 0) {
    return false;
  }

  const coverageRatio = canonicalProfiles / countryBoundaries;
  return (
    canonicalProfiles >= 10 &&
    coverageRatio >= 0.35 &&
    directEvidence + proxyEvidence + priorityEvidence + releaseMeasurements >= 10
  );
}

function releaseRankingReadinessNoteUrl(summary = state.releaseCoverage) {
  const explicit = summary?.default_ranking_readiness;
  const rawUrl = explicit?.release_note_url;

  if (typeof rawUrl === "string" && rawUrl.trim()) {
    return rawUrl.trim();
  }

  return "/updates/";
}

function releaseRankingReadinessReason(summary = state.releaseCoverage) {
  const explicit = summary?.default_ranking_readiness;

  if (explicit && typeof explicit === "object" && explicit !== null) {
    if (
      (typeof explicit.ready === "boolean" && !explicit.ready) ||
      (typeof explicit.enabled === "boolean" && !explicit.enabled)
    ) {
      const reason =
        explicit.reason ||
        "Release ranking readiness is disabled for this snapshot until coverage checks pass.";
      return reason.endsWith(".") ? reason : `${reason}.`;
    }
  }

  const coverage = summary?.coverage_status || {};
  const canonicalProfiles = Number(coverage.canonical_country_profiles || 0);
  const countryBoundaries = Number(coverage.country_boundaries_indexed || 0);
  const directEvidence = Number(coverage.evidence_layer_coverage?.direct || 0);
  const proxyEvidence = Number(coverage.evidence_layer_coverage?.proxy || 0);
  const priorityEvidence = Number(coverage.evidence_layer_coverage?.priority_overlay || 0);
  const releaseMeasurements = Number(coverage.release_measurements || 0);
  const evidenceReady = directEvidence + proxyEvidence + priorityEvidence + releaseMeasurements;
  const reasons = [];

  if (!Number.isFinite(countryBoundaries) || countryBoundaries <= 0) {
    return "Release coverage counts are incomplete in this snapshot.";
  }

  if (canonicalProfiles < 10) {
    reasons.push(`fewer than 10 canonical profiles (${formatCoverageSummaryValue(canonicalProfiles)} found)`);
  }

  if (countryBoundaries > 0 && canonicalProfiles / countryBoundaries < 0.35) {
    reasons.push(
      `only ${formatCoverageSummaryValue(canonicalProfiles)} of ${formatCoverageSummaryValue(
        countryBoundaries
      )} indexed countries are canonical`
    );
  }

  if (evidenceReady < 10) {
    reasons.push(`fewer than 10 direct/proxy/priority/release-metric rows (${formatCoverageSummaryValue(evidenceReady)} found)`);
  }

  if (!reasons.length) {
    return "Release ranking readiness requires additional release-specific checks to pass.";
  }

  return reasons.join(" · ");
}

function releaseRankingReadinessRule(summary = state.releaseCoverage) {
  const explicit = summary?.default_ranking_readiness;
  const rule = typeof explicit?.rule === "string" ? explicit.rule.trim() : "";

  return rule || "canonical country profiles, evidence-row, and coverage-ratio thresholds";
}

const COVERAGE_TERM_LINKS = {
  canonicalProfiles: {
    label: "canonical country profiles",
    href: "#term-canonical-country-profile",
  },
  boundaryCoverage: {
    label: "boundary-only coverage",
    href: "#term-boundary-only",
  },
  adm1Overlay: {
    label: "ADM1 context",
    href: "#term-adm1-context",
  },
  directEvidence: {
    label: "direct rows",
    href: "#term-direct-evidence",
  },
  proxy: {
    label: "proxy",
    href: "#term-proxy-aggregate",
  },
  priorityOverlay: {
    label: "priority-overlay",
    href: "#term-priority-overlay",
  },
  boundaryLabel: {
    label: "boundary-context rows",
    href: "#term-boundary-only",
  },
  adm1Label: {
    label: "ADM1 context-overlay rows",
    href: "#term-adm1-context",
  },
  noData: {
    label: "no release coverage",
    href: "#term-no-data",
  },
};

function coverageGlossaryAnchor(labelKey, fallback) {
  const entry = COVERAGE_TERM_LINKS[labelKey] || null;

  if (!entry) {
    return document.createTextNode(fallback || "");
  }

  const link = document.createElement("a");
  link.className = "glossary-term";
  link.href = entry.href;
  link.rel = "noopener";
  link.textContent = entry.label;
  link.title = fallback || entry.label;
  link.setAttribute("aria-label", `${entry.label}: ${fallback || "See glossary term."}`);
  return link;
}

function appendCoverageText(node, textOrNode) {
  if (typeof textOrNode === "string") {
    node.append(textOrNode);
    return;
  }

  if (textOrNode?.nodeType === 1) {
    node.appendChild(textOrNode);
  }
}

function setCoverageGridText(nodeOrId, parts) {
  const node = typeof nodeOrId === "string" ? document.getElementById(nodeOrId) : nodeOrId;

  if (!node) {
    return;
  }

  node.textContent = "";

  for (const part of parts) {
    if (part == null) {
      continue;
    }

    if (typeof part === "string") {
      appendCoverageText(node, part);
      continue;
    }

    if (typeof part === "object" && part.type === "glossary") {
      appendCoverageText(node, coverageGlossaryAnchor(part.key, part.help));
      if (part.suffix) {
        appendCoverageText(node, part.suffix);
      }
      continue;
    }

    appendCoverageText(node, String(part));
  }
}

function setCoverageGrid() {
  const summary = state.releaseCoverage || RELEASE_COVERAGE_FALLBACK;
  const coverage = summary.coverage_status || {};

  const placesIndexed = coverage.places_indexed;
  const countryProfiles = coverage.canonical_country_profiles || 0;
  const countryBoundaries = Number(coverage.country_boundaries_indexed || 0);
  const boundaryOnlyRows = Math.max(0, countryBoundaries - Number(countryProfiles || 0));
  const evidence = coverage.evidence_layer_coverage || {};
  const directEvidence = evidence.direct || 0;
  const directEvidenceCount = Number(directEvidence || 0);
  const proxyEvidence = evidence.proxy || 0;
  const priorityOverlayEvidence = evidence.priority_overlay || 0;
  const boundaryEvidence = evidence.boundary || 0;
  const adm1ContextEvidence = evidence.adm1_context_overlay || 0;
  const noDataEvidence = evidence.no_data || 0;
  const releaseDate = summary.last_release_date || summary.generated_at || summary.release_id?.split(".")[0] || RELEASE_ID;
  const adm1 = coverage.adm1_boundaries?.static_context_count || 0;
  const sparseCoverage = summarizeSparseCoverage(summary);
  const releaseLabel = summary.release_id || RELEASE_ID;
  const rankingReady = releaseRankingReadiness(summary);
  const rankingReadinessReason = rankingReady ? "" : releaseRankingReadinessReason(summary);
  const rankingReadinessNoteUrl = releaseRankingReadinessNoteUrl(summary);
  const rankingReadinessRule = releaseRankingReadinessRule(summary);
  const isCoverageFirstMode = !rankingReady;

  if (document.body) {
    document.body.classList.toggle("coverage-first-mode", isCoverageFirstMode);
  }

  if (coveragePlacesIndexed) {
    coveragePlacesIndexed.textContent = formatCoverageSummaryValue(placesIndexed);
  }

  if (coveragePlacesIndexedDetails) {
    setCoverageGridText(coveragePlacesIndexedDetails, [
      `World, ${formatCoverageSummaryValue(countryBoundaries)} `,
      { type: "glossary", key: "boundaryCoverage", help: "Countries with map boundaries but no canonical rows are boundary-only coverage." },
      ` entries, and ${formatCoverageSummaryValue(adm1)} `,
      { type: "glossary", key: "adm1Overlay", help: "ADM1 rows are subnational context rows and may not be direct canonical country comparisons." },
      " are listed in this release place index.",
      noDataEvidence > 0 ? ` Plus ${formatCoverageSummaryValue(noDataEvidence)} ` : " ",
      noDataEvidence > 0
        ? {
            type: "glossary",
            key: "noData",
            help: "No release rows are currently available for these places.",
          }
        : " ",
      noDataEvidence > 0 ? " rows are not represented in this release snapshot." : "",
    ]);
  }

  if (coverageCountryProfiles) {
    coverageCountryProfiles.textContent = formatCoverageSummaryValue(countryProfiles);
  }

  if (coverageCountryProfilesDetails) {
    const placeRows = formatCoverageSummaryValue(placesIndexed);
    setCoverageGridText(coverageCountryProfilesDetails, [
      `There are ${placeRows} release place rows total. `,
      `${formatCoverageSummaryValue(countryProfiles)} countries have `,
      { type: "glossary", key: "canonicalProfiles", help: "Canonical country profile rows are eligible for country-level comparison." },
      `. Remaining indexed rows are `,
      { type: "glossary", key: "boundaryCoverage", help: "Boundary-only rows are map-visible but have no canonical measure rows." },
      " or ",
      { type: "glossary", key: "adm1Overlay", help: "ADM1 context rows describe subnational context only unless promoted." },
      noDataEvidence > 0
        ? [", and ", { type: "glossary", key: "noData", help: "No indexed release rows are available yet." }, "."]
        : ".",
    ]);
  }

  if (coverageDirectEvidence) {
    coverageDirectEvidence.textContent = `${formatCoverageSummaryValue(directEvidence)} rows`;
  }

  if (coverageDirectEvidenceDetails) {
    setCoverageGridText(coverageDirectEvidenceDetails, [
      directEvidenceCount > 0 ? `${formatCoverageSummaryValue(directEvidence)} ` : "Direct rows are not yet represented",
      directEvidenceCount > 0
        ? {
            type: "glossary",
            key: "directEvidence",
            help: "Observed direct release rows.",
          }
        : "",
      " in this snapshot. This release also includes ",
      { type: "glossary", key: "proxy", help: "Indicator-derived proxy rows." },
      ` ${formatCoverageSummaryValue(proxyEvidence)} `,
      { type: "glossary", key: "priorityOverlay", help: "Priority ranking overlays are not direct comparison rows." },
      ` ${formatCoverageSummaryValue(priorityOverlayEvidence)} and ${formatCoverageSummaryValue(boundaryEvidence)} `,
      { type: "glossary", key: "boundaryLabel", help: "Boundary-context rows are not canonical country measurements." },
      ` and ${formatCoverageSummaryValue(adm1ContextEvidence)} `,
      { type: "glossary", key: "adm1Label", help: "ADM1 context overlay rows are not direct canonical country measures." },
      noDataEvidence > 0 ? [", and ", { type: "glossary", key: "noData", help: "No indexed release rows are available for these places." }] : [],
      ".",
    ]);
  }

  if (coverageLastRelease) {
    coverageLastRelease.textContent = formatCoverageSummaryValue(releaseDate);
  }
  if (coverageLastReleaseDetails) {
    const coverageSummary = `Release ${releaseLabel} is identified by immutable artifacts and checksums. Sparse coverage: ${sparseCoverage}. Evidence split: direct ${formatCoverageSummaryValue(
      directEvidence
    )}, proxy ${formatCoverageSummaryValue(proxyEvidence)}, priority overlay ${formatCoverageSummaryValue(
      priorityOverlayEvidence
    )}, boundary ${formatCoverageSummaryValue(boundaryEvidence)}, ADM1 context overlay ${formatCoverageSummaryValue(
      adm1ContextEvidence
    )}, no coverage ${formatCoverageSummaryValue(noDataEvidence)}.`;

    if (rankingReady) {
      setCoverageGridText(coverageLastReleaseDetails, [
        coverageSummary,
        " Default global ranking is enabled by this release configuration.",
      ]);
    } else {
      const releaseNoteLink = document.createElement("a");
      releaseNoteLink.className = "glossary-term";
      releaseNoteLink.href = rankingReadinessNoteUrl;
      releaseNoteLink.rel = "noopener";
      releaseNoteLink.textContent = "release note";
      releaseNoteLink.title = "Coverage gate criteria and rationale";
      releaseNoteLink.setAttribute("aria-label", "Coverage gate criteria and rationale");

      const normalizedLastReleaseReason = rankingReadinessReason.endsWith(".") ?
        rankingReadinessReason.slice(0, -1)
        : rankingReadinessReason;

      setCoverageGridText(coverageLastReleaseDetails, [
        coverageSummary,
        ` Default global ranking is not enabled (${normalizedLastReleaseReason}). Gate rule: ${rankingReadinessRule}. See `,
        releaseNoteLink,
        ".",
      ]);
    }
  }

  if (coverageDefaultRanking) {
    coverageDefaultRanking.textContent = rankingReady ? "Enabled" : "Not enabled";
  }

  if (coverageDefaultRankingDetails) {
    const releaseNoteLink = document.createElement("a");
    releaseNoteLink.className = "glossary-term";
    releaseNoteLink.href = rankingReadinessNoteUrl;
    releaseNoteLink.rel = "noopener";
    releaseNoteLink.textContent = "release note";
    releaseNoteLink.title = "Coverage gate criteria and rationale";
    releaseNoteLink.setAttribute("aria-label", "Coverage gate criteria and rationale");

    if (rankingReady) {
      setCoverageGridText(coverageDefaultRankingDetails, ["Default global ranking is enabled by this release configuration."]);
    } else {
      const reasonText = rankingReadinessReason || "Sparse coverage keeps ranking in coverage-first mode.";
      const normalizedReason = reasonText.endsWith(".") ? reasonText.slice(0, -1) : reasonText;

      setCoverageGridText(coverageDefaultRankingDetails, [
        `Coverage-first mode is active: ${normalizedReason}. See `,
        releaseNoteLink,
        ".",
      ]);
    }
  }

  if (coverageLegendAdm1Rows) {
    coverageLegendAdm1Rows.textContent = formatCoverageSummaryValue(adm1);
  }

  if (coverageLegendCanonical) {
    coverageLegendCanonical.textContent = formatCoverageSummaryValue(countryProfiles);
  }

  if (coverageLegendBoundaryOnly) {
    coverageLegendBoundaryOnly.textContent = formatCoverageSummaryValue(boundaryOnlyRows);
  }

  if (coverageLegendNoData) {
    coverageLegendNoData.textContent = formatCoverageSummaryValue(noDataEvidence);
  }

  if (coverageLegendRankingMode) {
    coverageLegendRankingMode.textContent = rankingReady ? "enabled" : "disabled";
  }

  renderFactList(
    coverageSparseAreasList,
    summary?.known_sparse_areas,
    "No known sparse-coverage areas were reported by this snapshot."
  );
}

async function ensureCountryCoverageStatus(iso, options = {}) {
  if (!iso || state.countryCoverageStatusByIso.has(iso) || state.countryCoverageStatusLoading.has(iso)) {
    return;
  }

  await loadPlaceIndexCoverageStatuses();
  const indexedStatus = getCachedPlaceIndexCoverageStatus(iso);
  state.countryCoverageStatusLoading.add(iso);

  try {
    const payload = await fetchJson(`v1/places/${iso}.json`);
    const measured = Number(payload?.measurements?.length) > 0;
    const directStatus = normalizeCoverageStatus(payload?.coverage_status);

    if (directStatus === COVERAGE_STATUS.canonicalProfile || measured) {
      state.countryCoverageStatusByIso.set(iso, COVERAGE_STATUS.canonicalProfile);
      return;
    }

    if (directStatus === COVERAGE_STATUS.noData) {
      state.countryCoverageStatusByIso.set(iso, COVERAGE_STATUS.noData);
      return;
    }

    if (directStatus === COVERAGE_STATUS.adm1Overlay) {
      state.countryCoverageStatusByIso.set(iso, COVERAGE_STATUS.adm1Overlay);
      return;
    }

    try {
      const adm1Payload = await fetchJson(`v1/places/${iso}/adm1.json`, 3000);
      const adm1Status = normalizeCoverageStatus(adm1Payload?.coverage_status);
      state.countryCoverageStatusByIso.set(
        iso,
        adm1Status === COVERAGE_STATUS.adm1Overlay
          ? COVERAGE_STATUS.adm1Overlay
        : COVERAGE_STATUS.boundaryOnly
      );
    } catch (adm1Error) {
      state.countryCoverageStatusByIso.set(
        iso,
        indexedStatus === COVERAGE_STATUS.noData ? COVERAGE_STATUS.noData : COVERAGE_STATUS.boundaryOnly
      );
    }
  } catch (error) {
    state.countryCoverageStatusByIso.set(
      iso,
      indexedStatus === COVERAGE_STATUS.noData ? COVERAGE_STATUS.noData : COVERAGE_STATUS.boundaryOnly
    );
  } finally {
    state.countryCoverageStatusLoading.delete(iso);

    if (options?.render) {
      renderDetails();
      renderGlobe();
      populateCountryOptions();
    }
  }
}

async function init() {
  recordTelemetry("route_view");
  initPerformanceTelemetry();
  registerServiceWorker();
  setupTelemetryClickTracking();
  setStatus("Loading Natural Earth country boundaries...");
  renderPainVisuals();
  renderMoralWeightNotes();
  syncReleaseModeUi();
  await loadReleaseModeContract();
  if (state.releaseMode === "live") {
    startLiveOverlayData();
  }

  try {
    await loadCoverageSummary();
    let data;
    let boundaryStatus = 'Equal-area atlas view loaded. Search for a country or "Province, Country", zoom the map, or switch to globe explorer.';

    try {
      data = await fetchJson(COUNTRY_DATA_URL, 1800);
    } catch (remoteError) {
      setStatus("Vendored Natural Earth boundary file is slow here, loading compact fallback boundaries...");
      data = await fetchJson(COUNTRY_DATA_FALLBACK_URL, 3000);
      boundaryStatus =
        "Compact fallback boundaries loaded. Search works for core places while the vendored Natural Earth file is unavailable.";
    }

    state.countries = data.features.filter(
      (feature) => feature.geometry && countryName(feature.properties) !== "Antarctica"
    );
    state.countryIndex = state.countries
      .map((feature) => {
        const name = countryName(feature.properties);
        const iso = countryIso(feature.properties);
        const aliases = countrySearchAliases(feature, name);
        return {
          feature,
          name,
          nameLower: normalizeSearchText(name),
          iso,
          isoLower: String(iso || "").trim().toLowerCase(),
          aliases,
          primaryAlias: aliases[0] || null,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
    populateCountryOptions();
    renderDetails();
    updateZoomUi();
    renderGlobe();
    setupInteraction();
    setStatus(boundaryStatus);
    setCoverageGrid();
  } catch (error) {
    setStatus(`Country data failed to load: ${error.message}`);
  }
}

init();
