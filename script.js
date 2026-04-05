import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature as topojsonFeature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

const COUNTRY_DATA_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const GLOBE_ROTATION = [-18, -14, 0];
const width = 900;
const height = 900;
const baseScale = 388;
const minScale = baseScale;
const maxScale = baseScale * 3.25;
const ISSUE_DATA_DATE_RANGE = "2010:2025";
const ISSUE_CONTEXT_INDICATORS = ["SP.POP.TOTL", "SP.DYN.CBRT.IN", "AG.LND.TOTL.K2", "AG.LND.AGRI.K2"];
const TERRESTRIAL_SOIL_ARTHROPODS_PER_SQKM = 6.7e10;
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
      "Drag to rotate, search or click a country, and inspect real ADM1 geometry. This globe orders broader country-by-country human, animal, and insect suffering data, while separating wild insect scale from a direct human-caused insect estimate and still treating both as conservative slices of a larger wild-insect question.",
    globeCopy:
      "The suffering globe mixes broader human burden indicators with farmed-animal counts, wild-animal estimates, and a direct human-caused insect estimate.",
    humanSectionLabel: "Human suffering",
    animalSectionLabel: "Farmed and wild animal suffering",
    showAnimals: true,
    rankingModes: {
      improvement: {
        label: "Available improvement per dollar",
        copy:
          "For humans, mixes recurring EA priorities with broader cross-country burden indicators. For animals, it favors tractable burden proxies and clearly marks where the evidence is welfare-range weighted, sentience-only, land-area wild-estimated, or based on a direct human-caused insect estimate.",
      },
      total: {
        label: "Total amount of suffering caused",
        copy:
          "For humans, uses affected-person or direct-count burden proxies. For animals, it uses sentience-adjusted counts where possible, a land-area wild estimate for terrestrial arthropods, sentience-only bovine proxies where needed, and a direct human-caused insect estimate calibrated from insecticide-treated agricultural land.",
      },
      "per-being": {
        label: "Amount of suffering suffered per being",
        copy:
          "For humans, this uses severity per affected person. For animals, it uses welfare-range medians when available, sentience medians when that is all the source pack supports, and a cautious insect blend for wild and direct human-caused insect proxies, while noting Bentham's Bulldog's argument that pain in simpler animals may be more intense than these conservative scores suggest.",
      },
    },
  },
  death: {
    label: "Top Causes of Death by Country",
    topbarNote:
      "Drag to rotate, search or click a country, and inspect real ADM1 geometry. This globe switches to human death-focused causes using direct mortality indicators and death proxies.",
    globeCopy:
      "The death globe narrows the panel to human death-focused causes and hides the animal suffering layer.",
    humanSectionLabel: "Human deaths",
    animalSectionLabel: "",
    showAnimals: false,
    rankingModes: {
      improvement: {
        label: "Available deaths averted per dollar",
        copy:
          "Uses a rough preventability and tractability proxy for each human death cause rather than treating all deaths as equally easy to avert.",
      },
      total: {
        label: "Total number of deaths",
        copy:
          "Uses death counts or count proxies, so large-population and high-mortality causes rise even when the per-person rate is lower.",
      },
      "per-being": {
        label: "Death rate per person",
        copy:
          "Uses the most relevant death-rate measure for each cause, such as deaths per 100,000 people or per 100,000 live births.",
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
      "Death globe: child survival proxy derived from the World Bank country indicator set.",
    weight: 1.08,
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
      "Death globe: maternal mortality indicator from the World Bank country set.",
    weight: 0.88,
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
      "Death globe: direct mortality indicator from the World Bank country set.",
    weight: 0.92,
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
      "Death globe: direct WASH mortality indicator from the World Bank country set.",
    weight: 0.98,
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
      "Death globe: direct road-injury mortality indicator from the World Bank country set.",
    weight: 0.71,
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
      "Death globe: suicide mortality indicator from the World Bank country set.",
    weight: 0.66,
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
      "Death globe: homicide mortality indicator from the World Bank country set.",
    weight: 0.72,
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
      "Death globe: direct conflict death indicator from the World Bank country set.",
    weight: 0.93,
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

const SUFFERING_BRIEF = {
  location: "Whole Earth",
  summary:
    "The global view now includes estimated global animal suffering ranks; click a country to order a broader country suffering set with current national data: child health, infectious disease, food insecurity, poverty, pollution, water, clean cooking, violence, conflict, farmed animals, wild terrestrial arthropods, and a direct human-caused insect estimate.",
  footnote:
    "Geography comes from Natural Earth and geoBoundaries. Human issue ordering uses World Bank country indicators; animal cards use Our World in Data production proxies, World Bank land-area data, a Wild Animal Initiative insect benchmark, and Rethink Priorities sentience and welfare-range distributions where available. Wild-animal estimates are coarse and inference-heavy, and Bentham's Bulldog argues both that they may dominate the global picture and that simple animals may feel more intense pain than low-neuron intuitions suggest.",
  issues: [
    {
      tag: "Health burden",
      title: "Child survival and infectious disease",
      body: "The country layer now tracks preventable child death, malaria, routine immunization gaps, maternal mortality, and tuberculosis rather than compressing them into a single regional label.",
    },
    {
      tag: "Deprivation",
      title: "Food, poverty, and basic services",
      body: "Food insecurity, severe poverty, sanitation, drinking water, and clean cooking access are all tracked directly with country indicators where available.",
    },
    {
      tag: "Environmental burden",
      title: "Air pollution and household smoke",
      body: "The country list now treats chronic PM2.5 exposure and dirty household fuels as distinct causes of suffering rather than burying them in general development prose.",
    },
    {
      tag: "Violence burden",
      title: "War, homicide, and displacement",
      body: "The site now loads country-specific homicide, battle-death, and conflict-displacement indicators so violent harm appears as data rather than as omission.",
    },
    {
      tag: "Insect stakes",
      title: "Debated species may still be conscious and feel intense pain",
      body: "Bentham's Bulldog argues for a stronger prior that insects, fish, and decapods are conscious, and that conditional on consciousness their pain may be quite intense rather than faint. The site still uses conservative numeric proxies, but now explains that these numbers may understate pain intensity.",
    },
  ],
};

const DEATH_BRIEF = {
  location: "Whole Earth",
  summary:
    "Click a country to order a death-focused set with current national data: child mortality, maternal mortality, air pollution deaths, unsafe WASH deaths, road injuries, suicide, homicide, and war deaths.",
  footnote:
    "Geography comes from Natural Earth and geoBoundaries. The death globe uses World Bank mortality indicators and death proxies. It hides the animal layer because this view is specifically about human death causes.",
  issues: [
    {
      tag: "Preventable deaths",
      title: "Child and maternal mortality",
      body: "The death globe tracks under-5 and maternal mortality directly instead of leaving preventable deaths folded into general suffering prose.",
    },
    {
      tag: "Environmental deaths",
      title: "Air pollution and unsafe WASH",
      body: "The death view separates chronic pollution mortality from deaths attributed to unsafe water, sanitation, and hygiene.",
    },
    {
      tag: "Injury deaths",
      title: "Road injury mortality",
      body: "Road deaths are treated as their own cross-country mortality category rather than disappearing into a catch-all safety problem.",
    },
    {
      tag: "Violence and conflict",
      title: "Suicide, homicide, and war",
      body: "The death globe also tracks violent mortality directly, including self-harm, homicide, and battle-related deaths.",
    },
  ],
};

const animalBrief = {
  summary:
    "Animal suffering is now expanded country-by-country using slaughter and aquaculture proxies from Our World in Data, a wild terrestrial arthropod estimate derived from country land area, and a direct human-caused insect estimate calibrated from insecticide-treated agricultural land, plus Rethink Priorities sentience and welfare-range distributions where those exist.",
  issues: [
    {
      tag: "Prior",
      title: "The site now surfaces a stronger default presumption of sentience",
      body: "Bentham's Bulldog argues that behavioral, evolutionary, inductive, probabilistic, and theoretical considerations together favor treating many debated species as conscious unless the evidence turns against that view, rather than defaulting to skepticism.",
    },
    {
      tag: "Method",
      title: "Country counts first, then the strongest weighting the source pack supports",
      body: "Where the RP distributions doc gives sentience-adjusted welfare ranges, this site uses them. Where it only gives sentience, the card says so. For wild terrestrial arthropods, the site estimates country scale from land area multiplied by a global arthropod-density benchmark from Rosenberg et al., and labels that estimate as rough rather than exact.",
    },
    {
      tag: "Bentham's Bulldog",
      title: "Wild insects may dominate the whole animal picture",
      body: "The article argues that if insects can suffer, the sheer number of wild insects and the frequency of short, painful deaths could make insect suffering vastly larger than farmed-vertebrate suffering. The site now includes an explicit wild terrestrial arthropod estimate instead of only mentioning this as a caveat.",
    },
    {
      tag: "Conservative proxy",
      title: "The direct insect card is narrower than the wild-insect question",
      body: "The human-caused insect card estimates insects potentially affected on insecticide-treated agricultural land. The wild-arthropod card estimates the much larger baseline wild-animal scale. Both are rough: one is a direct but partial human-caused estimate, the other is a broad but highly inferential baseline.",
    },
    {
      tag: "Intensity",
      title: "Simple minds do not imply mild pain",
      body: "The article argues that lower neuron counts do not automatically mean weaker suffering. If simpler creatures cannot cognitively step back from pain, painful experience may occupy more of their total consciousness. The site now states that its per-being ordering is conservative on this point.",
    },
    {
      tag: "Caution",
      title: "Habitat-loss conclusions are noted, not encoded",
      body: "The reducing-suffering literature argues that if wild insect lives are mostly net negative, some human actions that reduce insect populations could reduce suffering. The site surfaces that as an important but controversial note rather than hard-coding it into country rankings.",
    },
  ],
};

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
  },
];

const ANIMAL_DATASETS = [
  {
    id: "chickens",
    title: "Chickens killed for meat",
    url: "https://ourworldindata.org/grapher/land-animals-slaughtered-for-meat.csv",
    valueKey: "Chickens",
    improvementFactor: 1.08,
    model: "welfare-range",
    sentience: { median: 0.904, low: 0.629, high: 0.99 },
    welfareRange: { median: 0.327, low: 0.002, high: 0.856 },
    metric: (value) => `${formatCompactNumber(value)} chickens slaughtered for meat in the latest year`,
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
    improvementFactor: 0.92,
    model: "welfare-range",
    sentience: { median: 0.973, low: 0.737, high: 0.99 },
    welfareRange: { median: 0.512, low: 0.005, high: 1.031 },
    metric: (value) => `${formatCompactNumber(value)} pigs slaughtered for meat in the latest year`,
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
    improvementFactor: 0.84,
    model: "bird-proxy",
    sentience: { median: 0.904, low: 0.629, high: 0.99 },
    welfareRange: { median: 0.327, low: 0.002, high: 0.856 },
    metric: (value) => `${formatCompactNumber(value)} ducks, geese, and turkeys slaughtered for meat`,
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
    improvementFactor: 0.58,
    model: "sentience-only",
    sentience: { median: 0.945, low: 0.712, high: 0.99 },
    metric: (value) => `${formatCompactNumber(value)} bovines slaughtered for meat in the latest year`,
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
    improvementFactor: 0.82,
    model: "welfare-range",
    sentience: { median: 0.328, low: 0.08, high: 0.911 },
    welfareRange: { median: 0.071, low: 0, high: 0.543 },
    metric: (value) => `${formatCompactNumber(value)} farmed fish killed for food (midpoint estimate)`,
    perBeingNote:
      "sentience-adjusted welfare range median 0.071; Bentham's Bulldog argues fish pain may be more intense than cortex-based intuitions suggest",
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
    id: "crustaceans",
    title: "Shrimp and crustacean farming",
    url: "https://ourworldindata.org/grapher/farmed-crustaceans.csv",
    valueKey: "Mid-point estimate",
    improvementFactor: 0.76,
    model: "welfare-range",
    sentience: { median: 0.314, low: 0.079, high: 0.87 },
    welfareRange: { median: 0.03, low: 0, high: 0.681 },
    metric: (value) => `${formatCompactNumber(value)} farmed crustaceans killed for food (midpoint estimate)`,
    perBeingNote:
      "sentience-adjusted welfare range median 0.030; Bentham's Bulldog argues decapod pain evidence is stronger than skeptical defaults suggest",
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
    improvementFactor: 0.98,
    model: "human-caused-insect",
    sentience: INSECT_WELFARE_PROXY.sentience,
    welfareRange: INSECT_WELFARE_PROXY.welfareRange,
    valueFromRecord: (record, metrics, context) => estimateHumanCausedInsectExposure(record.value, context).insectsAffected,
    perBeingNote:
      "cautious insect welfare proxy median 0.029; Bentham's Bulldog argues insect pain may be more totalizing than this conservative proxy implies",
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

const LONG_PAIN_ROWS = [
  {
    id: "caged-hen",
    label: "Conventional cage instead of aviary",
    meta: "Laying hen, one laying life",
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
const zoomOutButton = document.getElementById("zoom-out");
const zoomInButton = document.getElementById("zoom-in");
const zoomRange = document.getElementById("zoom-range");
const resetButton = document.getElementById("reset-view");
const topbarNote = document.getElementById("topbar-note");
const selectionMeta = document.getElementById("selection-meta");
const selectionTitle = document.getElementById("selection-title");
const selectionSummary = document.getElementById("selection-summary");
const selectionFootnote = document.getElementById("selection-footnote");
const factLocation = document.getElementById("fact-location");
const factCountrySource = document.getElementById("fact-country-source");
const factAdminSource = document.getElementById("fact-admin-source");
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
const painAnchorsRoot = document.getElementById("pain-anchors");
const painLongChartRoot = document.getElementById("pain-long-chart");
const painAcuteChartRoot = document.getElementById("pain-acute-chart");
const painCalloutsRoot = document.getElementById("pain-callouts");
const moralWeightGridRoot = document.getElementById("mw-grid");

const projection = d3
  .geoOrthographic()
  .translate([width / 2, height / 2])
  .scale(baseScale)
  .clipAngle(90)
  .precision(0.2)
  .rotate(GLOBE_ROTATION);

const path = d3.geoPath(projection);
const graticule = d3.geoGraticule10();

const spherePath = svg.append("path").attr("class", "sphere");
const graticulePath = svg.append("path").attr("class", "graticule");
const countriesGroup = svg.append("g");
const provincesGroup = svg.append("g");
const outlinePath = svg.append("path").attr("class", "globe-outline");

const state = {
  countries: [],
  countryIndex: [],
  globeMode: "suffering",
  rankingMode: "improvement",
  selectedCountry: null,
  selectedProvince: null,
  provinceMeta: null,
  provinceFeatures: [],
  countryIssueData: null,
  globalContext: { loading: true, error: null, context: null },
};

const animalDataState = {
  loading: true,
  error: null,
  byCountry: new Map(),
  world: null,
};

const provinceCache = new Map();
const issueCache = new Map();
let provinceRequestId = 0;
let issueRequestId = 0;
let justDragged = false;

function setStatus(message) {
  mapStatus.textContent = message;
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
  return Math.max(minScale, Math.min(maxScale, scale));
}

function updateZoomUi() {
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

  if (url.includes("media.githubusercontent.com")) {
    return url;
  }

  if (url.includes("github.com/") && url.includes("/raw/")) {
    return url
      .replace("https://github.com/", "https://media.githubusercontent.com/media/")
      .replace("/raw/", "/");
  }

  if (url.includes("raw.githubusercontent.com/")) {
    return url.replace(
      "https://raw.githubusercontent.com/",
      "https://media.githubusercontent.com/media/"
    );
  }

  return url;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
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

function currentGlobalBrief() {
  return state.globeMode === "death" ? DEATH_BRIEF : SUFFERING_BRIEF;
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

  return {
    population,
    birthRate,
    births,
    under5Population: births * 5,
    landArea,
    landAreaDate: landAreaRecord?.date || null,
    agriculturalLand,
    agriculturalLandDate: agriculturalLandRecord?.date || null,
  };
}

function formatHumanRanking(issue, mode) {
  const ranking = issue.ranking[mode];

  if (!ranking) {
    return "";
  }

  if (state.globeMode === "death") {
    if (mode === "improvement") {
      return "Order mode: available deaths averted per dollar proxy.";
    }

    if (mode === "total") {
      return `Order mode: total deaths proxy · ${ranking.metric}`;
    }

    return `Order mode: death rate proxy · ${ranking.metric}.`;
  }

  if (mode === "improvement") {
    return "Order mode: available improvement per dollar proxy.";
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
    return `Order mode: available improvement per dollar proxy · tractability-adjusted burden ${formatCompactNumber(ranking.raw)}.`;
  }

  if (mode === "total") {
    return `Order mode: total suffering proxy · ${ranking.metric}.`;
  }

  return `Order mode: per-being suffering proxy · ${issue.perBeingNote}`;
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
          : dataset.model === "wild-proxy"
            ? " This card estimates wild arthropod scale from country land area and a global average density, so it is much rougher than the farmed-animal counts."
          : dataset.model === "bird-proxy"
            ? " This card uses chicken values as a cautious bird proxy."
            : " This card is a country burden proxy, not a full moral-weight calculation.";
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
      source: `${dataset.source(record.year, record, context)}${modelTail}`,
      score,
      welfareRange: dataset.welfareRange || null,
      sentience: dataset.sentience || null,
      perBeingNote,
      ranking: {
        improvement: {
          score: Math.log10(improvementRaw + 1),
          raw: improvementRaw,
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

      issues.push({
        id: model.id,
        tag: `Wild animal estimate · ${issueLevel(score)}`,
        title: model.title,
        metric: model.metric(rawValue, context),
        body: model.body(rawValue, score, country, context),
        source: `${model.source(context)} This card estimates wild arthropod scale from country land area and a global average density, so it is much rougher than the farmed-animal counts.`,
        score,
        welfareRange: model.welfareRange || null,
        sentience: model.sentience || null,
        perBeingNote:
          model.perBeingNote ||
          `cautious insect welfare proxy median ${model.welfareRange.median.toFixed(3)} applied to a land-area-derived wild arthropod estimate`,
        ranking: {
          improvement: {
            score: Math.log10(improvementRaw + 1),
            raw: improvementRaw,
          },
          total: {
            score: Math.log10(totalBurdenRaw + 1),
            raw: totalBurdenRaw,
            metric: `${formatScaleCount(rawValue)} estimated terrestrial arthropods from land area`,
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

function buildAnimalIssues(feature) {
  const iso = countryIso(feature.properties);
  const country = countryName(feature.properties);

  if (!iso) {
    return [];
  }

  const metrics = animalDataState.byCountry.get(iso) || {};
  const context = state.countryIssueData?.context;

  return buildAnimalIssuesFromMetrics(metrics, context, country);
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
    const proxyNote = definition.proxy ? `${definition.proxy} ` : "";
    const priorityTag = definition.priorityLabel || issuePriorityLabel(definition.support);
    const prioritySource =
      definition.prioritySource || `Priority sources: ${joinList(definition.support || [])}.`;

    return {
      id: definition.id,
      tag: `${priorityTag} · ${issueLevel(weightedScore)}`,
      title: definition.title,
      metric: definition.metric(value, context),
      body: definition.body(value, country, context),
      source: `${proxyNote}${prioritySource} Data: ${observation.indicator.value} · ${worldBankDate(observation.date)}`,
      score: weightedScore,
      severityScore,
      year: observation.date,
      ranking: {
        improvement: {
          score: weightedScore,
          raw: weightedScore,
        },
        total: {
          score: Math.log10(totalBurden + 1),
          raw: totalBurden,
          metric: definition.totalMetric ? definition.totalMetric(value, context) : "No total-burden proxy available",
        },
        "per-being": {
          score: severityScore,
          raw: severityScore,
          metric: definition.metric(value, context),
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

function renderIssueStatus(title, body) {
  issuesRoot.textContent = "";
  const card = document.createElement("article");
  card.className = "issue-card";
  card.innerHTML = `
    <p class="issue-tag">Issue data</p>
    <h3>${title}</h3>
    <p>${body}</p>
  `;
  issuesRoot.appendChild(card);
}

function renderAnimalIssueStatus(title, body) {
  animalIssuesRoot.textContent = "";
  const card = document.createElement("article");
  card.className = "issue-card";
  card.innerHTML = `
    <p class="issue-tag">Farmed and wild animal suffering</p>
    <h3>${title}</h3>
    <p>${body}</p>
  `;
  animalIssuesRoot.appendChild(card);
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

  article.append(head, bar, breakdown);
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
  const brief = currentGlobalBrief();

  if (!country) {
    issuesRoot.textContent = "";

    for (const issue of brief.issues) {
      const card = document.createElement("article");
      card.className = "issue-card";
      card.innerHTML = `
        <p class="issue-tag">${issue.tag}</p>
        <h3>${issue.title}</h3>
        <p>${issue.body}</p>
      `;
      issuesRoot.appendChild(card);
    }

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

  issuesRoot.textContent = "";
  const orderedIssues = sortIssuesByMode(issues, state.rankingMode);

  for (const issue of orderedIssues) {
    const card = document.createElement("article");
    card.className = "issue-card";
    card.innerHTML = `
      <p class="issue-tag">${issue.tag}</p>
      <h3>${issue.title}</h3>
      <strong class="issue-metric">${issue.metric}</strong>
      <p>${issue.body}</p>
      <p class="issue-order-note">${formatHumanRanking(issue, state.rankingMode)}</p>
      <p class="issue-source">${issue.source}</p>
    `;
    issuesRoot.appendChild(card);
  }
}

function renderAnimalIssues(country) {
  if (!currentGlobeModeConfig().showAnimals) {
    animalIssuesRoot.textContent = "";
    return;
  }

  if (!country) {
    if (animalDataState.loading) {
      renderAnimalIssueStatus(
        "Loading global animal data",
        "Fetching global slaughter, aquaculture, insecticide, and land-area context to estimate global animal suffering rankings."
      );
      return;
    }

    if (animalDataState.error) {
      renderAnimalIssueStatus(
        "Global animal data unavailable",
        "The global farmed and wild animal proxy data failed to load, so the panel cannot yet estimate global animal burdens."
      );
      return;
    }

    if (!animalDataState.world) {
      animalIssuesRoot.textContent = "";

      for (const issue of animalBrief.issues) {
        const card = document.createElement("article");
        card.className = "issue-card";
        card.innerHTML = `
          <p class="issue-tag">${issue.tag}</p>
          <h3>${issue.title}</h3>
          <p>${issue.body}</p>
        `;
        animalIssuesRoot.appendChild(card);
      }

      return;
    }

    const context = state.globalContext?.context || {};
    const issues = buildAnimalIssuesFromMetrics(animalDataState.world, context, "the world");

    if (!issues.length) {
      renderAnimalIssueStatus(
        "No global animal issue data",
        "No matching global slaughter, wild-animal, or human-caused insect estimate was found for the loaded data."
      );
      return;
    }

    animalIssuesRoot.textContent = "";
    const orderedIssues = sortIssuesByMode(issues, state.rankingMode);

    for (const issue of orderedIssues) {
      const card = document.createElement("article");
      card.className = "issue-card";
      card.innerHTML = `
        <p class="issue-tag">${issue.tag}</p>
        <h3>${issue.title}</h3>
        <strong class="issue-metric">${issue.metric}</strong>
        <p>${issue.body}</p>
        <p class="issue-order-note">${formatAnimalRanking(issue, state.rankingMode)}</p>
        <p class="issue-source">${issue.source}</p>
      `;
      animalIssuesRoot.appendChild(card);
    }

    return;
  }

  if (animalDataState.loading) {
    renderAnimalIssueStatus(
      "Loading animal data",
      "Fetching country-level slaughter, wild terrestrial arthropod, agricultural land, and human-caused insect estimates to model local farmed and wild animal suffering."
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
      "No matching country-level slaughter, wild-animal, or human-caused insect estimate was found for this country in the loaded data."
    );
    return;
  }

  animalIssuesRoot.textContent = "";
  const orderedIssues = sortIssuesByMode(issues, state.rankingMode);

  for (const issue of orderedIssues) {
    const card = document.createElement("article");
    card.className = "issue-card";
    card.innerHTML = `
      <p class="issue-tag">${issue.tag}</p>
      <h3>${issue.title}</h3>
      <strong class="issue-metric">${issue.metric}</strong>
      <p>${issue.body}</p>
      <p class="issue-order-note">${formatAnimalRanking(issue, state.rankingMode)}</p>
      <p class="issue-source">${issue.source}</p>
    `;
    animalIssuesRoot.appendChild(card);
  }
}

function populateCountryOptions() {
  countryOptions.textContent = "";

  const fragment = document.createDocumentFragment();

  for (const entry of state.countryIndex) {
    const option = document.createElement("option");
    option.value = entry.name;
    fragment.appendChild(option);
  }

  countryOptions.appendChild(fragment);
}

function findCountry(query) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    state.countryIndex.find(
      (entry) => entry.nameLower === normalized || (entry.iso && entry.iso.toLowerCase() === normalized)
    ) ||
    state.countryIndex.find((entry) => entry.nameLower.startsWith(normalized)) ||
    state.countryIndex.find((entry) => entry.nameLower.includes(normalized)) ||
    null
  );
}

function countryFocusScale(feature) {
  const [longitude, latitude] = d3.geoCentroid(feature);
  const previewProjection = d3
    .geoOrthographic()
    .translate([width / 2, height / 2])
    .scale(baseScale)
    .clipAngle(90)
    .precision(0.2)
    .rotate([-longitude, -latitude, 0]);
  const previewPath = d3.geoPath(previewProjection);
  const bounds = previewPath.bounds(feature);
  const boundsWidth = Math.max(1, bounds[1][0] - bounds[0][0]);
  const boundsHeight = Math.max(1, bounds[1][1] - bounds[0][1]);
  const fitMultiplier = 0.58 * Math.min(width / boundsWidth, height / boundsHeight);

  return clampScale(baseScale * fitMultiplier);
}

function syncModeUi() {
  const globeMode = currentGlobeModeConfig();
  const rankingModes = currentRankingModes();

  if (topbarNote) {
    topbarNote.textContent = globeMode.topbarNote;
  }

  if (globeModeSelect) {
    globeModeSelect.value = state.globeMode;
  }

  if (globeModeCopy) {
    globeModeCopy.textContent = globeMode.globeCopy;
  }

  if (humanSectionLabel) {
    humanSectionLabel.textContent = globeMode.humanSectionLabel;
  }

  if (animalSectionLabel) {
    animalSectionLabel.textContent = globeMode.animalSectionLabel;
  }

  if (animalSection) {
    animalSection.hidden = !globeMode.showAnimals;
  }

  if (rankingTitle) {
    rankingTitle.textContent = state.globeMode === "death" ? "Order Death Causes By" : "Order Causes By";
  }

  if (rankingModeSelect) {
    rankingModeSelect.value = state.rankingMode;

    for (const option of rankingModeSelect.options) {
      if (rankingModes[option.value]) {
        option.textContent = rankingModes[option.value].label;
      }
    }
  }

  if (rankingCopy) {
    rankingCopy.textContent = rankingModes[state.rankingMode].copy;
  }
}

function renderDetails() {
  const globeMode = currentGlobeModeConfig();
  const brief = currentGlobalBrief();
  syncModeUi();

  if (!state.selectedCountry) {
    countrySearchInput.value = "";
    selectionMeta.textContent = "Global view";
    selectionTitle.textContent = "The whole Earth.";
    selectionSummary.textContent = brief.summary;
    selectionFootnote.textContent = brief.footnote;
    factLocation.textContent = brief.location;
    factCountrySource.textContent = "Natural Earth Admin 0, 1:50m";
    factAdminSource.textContent = "geoBoundaries ADM1 will load on click";
    factIssueSource.textContent = state.globeMode === "death"
      ? "Human: WDI death indicators on click."
      : animalDataState.loading
        ? "Human: WDI on click. Animals: loading OWID + WDI + RP + WAI insect estimates."
        : animalDataState.error
          ? "Human: WDI on click. Animals: OWID load failed."
          : "Human: WDI on click. Animals: OWID + WDI + RP + WAI insect estimates.";
    factUnitCount.textContent = "0";
    renderIssues(null);
    renderAnimalIssues(null);
    return;
  }

  const countryProps = state.selectedCountry.properties;
  const name = countryName(countryProps);
  const iso = countryIso(countryProps) || "Unknown ISO";
  const subregion = countryProps.SUBREGION || countryProps.CONTINENT || "Unknown region";
  const issueData = state.countryIssueData;
  const provinceNameLabel = state.selectedProvince ? provinceName(state.selectedProvince) : null;

  countrySearchInput.value = name;
  selectionMeta.textContent = `${name} · ${subregion}`;
  selectionTitle.textContent = provinceNameLabel || name;

  if (!issueData || issueData.loading) {
    selectionSummary.textContent = provinceNameLabel
      ? `${provinceNameLabel} is selected inside ${name}. The boundary is ADM1, but the issue ranking remains national and is still loading.`
      : state.globeMode === "death"
        ? `Loading the death-focused cause ranking for ${name} from World Bank country mortality indicators.`
        : `Loading the broader country suffering ranking for ${name} from World Bank and Our World in Data country indicators.`;
    factIssueSource.textContent = state.globeMode === "death"
      ? "Human: loading WDI death indicators."
      : animalDataState.loading
        ? "Human: loading WDI. Animals: loading OWID + WDI + RP + WAI insect estimates."
        : "Human: loading WDI. Animals: OWID + WDI + RP + WAI insect estimates.";
  } else if (issueData.error) {
    selectionSummary.textContent = provinceNameLabel
      ? `${provinceNameLabel} is selected inside ${name}. The ADM1 geometry is real, but the national issue ranking failed to load.`
      : `Country-specific issue data could not be loaded for ${name}, so the ranking layer is unavailable right now.`;
    factIssueSource.textContent = state.globeMode === "death"
      ? "Human: WDI death indicators failed."
      : animalDataState.loading
        ? "Human: WDI failed. Animals: loading OWID + WDI + RP + WAI insect estimates."
        : animalDataState.error
          ? "Human: WDI failed. Animals: OWID load failed."
          : "Human: WDI failed. Animals: OWID + WDI + RP + WAI insect estimates.";
  } else {
    selectionSummary.textContent = provinceNameLabel
      ? `${provinceNameLabel} is selected inside ${name}. The boundary is provincial, but the issue lists below remain national and are currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`
      : state.globeMode === "death"
        ? `The list below focuses on human death causes. It is currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`
        : `The lists below combine broader human suffering indicators with country-specific farmed and wild animal burden proxies plus a direct human-caused insect estimate. They are currently ordered by ${rankingLabel(state.rankingMode).toLowerCase()}.`;
    factIssueSource.textContent = state.globeMode === "death"
      ? "Human: World Bank WDI death indicators."
      : animalDataState.loading
        ? "Human: World Bank WDI. Animals: loading OWID + WDI + RP + WAI insect estimates."
        : animalDataState.error
          ? "Human: World Bank WDI. Animals: OWID load failed."
          : "Human: World Bank WDI. Animals: OWID + WDI + RP + WAI insect estimates.";
  }

  const boundarySource = state.provinceMeta?.boundarySource
    ? `ADM1 source: ${state.provinceMeta.boundarySource}.`
    : "ADM1 source will appear once the boundary layer loads.";
  const issueSource = issueData?.error
      ? " Issue data request failed."
      : issueData?.loading
        ? " Issue data will appear after the country request completes."
        : state.globeMode === "death"
          ? " Human death cards use World Bank mortality indicators and death proxies for pollution, unsafe WASH, road injury, suicide, homicide, and conflict. The within-country order is estimated rather than copied from a published master list."
          : " Human cards combine recurring EA priorities with broader World Bank burden indicators for food insecurity, pollution, water, clean cooking, TB, homicide, and conflict. The within-country order is estimated rather than copied from a published master list.";
  const animalSource = !globeMode.showAnimals
    ? " The death globe hides the animal layer because this view is specifically about human death causes."
    : animalDataState.loading
      ? " Animal issue data is still loading from Our World in Data."
      : animalDataState.error
        ? " Animal issue data failed to load."
        : " Animal cards use Our World in Data country slaughter and insecticide data, World Bank land and agricultural-land indicators, a Wild Animal Initiative direct-insect benchmark, and Rethink Priorities sentience and welfare-range distributions where available. Bentham's Bulldog's ubiquitous-pain argument is reflected in the notes and interpretation, so current per-being animal scores should be read as conservative rather than as upper bounds.";
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
  const rotateInterpolator = d3.interpolate(startRotate, endRotate);
  const scaleInterpolator = d3.interpolateNumber(projection.scale(), clampScale(scale ?? projection.scale()));

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

function renderGlobe() {
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

      if (selectedIso && iso === selectedIso) {
        return "country-path is-selected";
      }

      if (selectedIso) {
        return "country-path is-muted";
      }

      return "country-path";
    })
    .attr("d", path)
    .attr("aria-label", (feature) => countryName(feature.properties))
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
    .on("click", (event, feature) => {
      event.stopPropagation();

      if (justDragged) {
        return;
      }

      state.selectedProvince = feature;
      renderDetails();
      renderGlobe();
      setStatus(`${provinceName(feature)} selected.`);
    });
}

function focusCountryView(feature) {
  const [longitude, latitude] = d3.geoCentroid(feature);
  transitionGlobe([-longitude, -latitude, 0], countryFocusScale(feature));
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
  state.selectedCountry = feature;
  state.selectedProvince = null;
  state.countryIssueData = { loading: true };
  focusCountryView(feature);
  renderDetails();
  renderGlobe();
  await Promise.all([loadAdm1(feature), loadCountryIssueData(feature)]);
}

async function handleCountrySearch(event) {
  event.preventDefault();

  if (!state.countryIndex.length) {
    setStatus("Country boundaries are still loading.");
    return;
  }

  const match = findCountry(countrySearchInput.value);

  if (!match) {
    setStatus(`No country matched "${countrySearchInput.value.trim()}".`);
    return;
  }

  await selectCountry(match.feature);
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
  projection.rotate(GLOBE_ROTATION);
  projection.scale(baseScale);
  renderDetails();
  updateZoomUi();
  renderGlobe();
  setStatus("Showing global country boundaries.");
}

function setupInteraction() {
  svg.call(
    d3
      .drag()
      .on("start", () => {
        justDragged = false;
      })
      .on("drag", (event) => {
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
        window.setTimeout(() => {
          justDragged = false;
        }, 120);
      })
  );

  svg.node().addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const nextScale = projection.scale() * Math.exp(-event.deltaY * 0.0015);
      setProjectionScale(nextScale);
    },
    { passive: false }
  );

  countrySearchForm.addEventListener("submit", handleCountrySearch);
  globeModeSelect.addEventListener("change", () => {
    state.globeMode = globeModeSelect.value;
    renderDetails();
  });
  rankingModeSelect.addEventListener("change", () => {
    state.rankingMode = rankingModeSelect.value;
    renderDetails();
  });
  zoomInButton.addEventListener("click", () => adjustZoom(1.18));
  zoomOutButton.addEventListener("click", () => adjustZoom(1 / 1.18));
  zoomRange.addEventListener("input", () => {
    setProjectionScale(baseScale * Number(zoomRange.value));
  });
  resetButton.addEventListener("click", resetView);
}

async function init() {
  setStatus("Loading Natural Earth country boundaries...");
  renderPainVisuals();
  renderMoralWeightNotes();
  loadAnimalBurdenData();
  loadGlobalContext();

  try {
    const data = await fetchJson(COUNTRY_DATA_URL);
    state.countries = data.features.filter((feature) => countryName(feature.properties) !== "Antarctica");
    state.countryIndex = state.countries
      .map((feature) => ({
        feature,
        name: countryName(feature.properties),
        nameLower: countryName(feature.properties).toLowerCase(),
        iso: countryIso(feature.properties),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
    populateCountryOptions();
    renderDetails();
    updateZoomUi();
    renderGlobe();
    setupInteraction();
    setStatus("Drag to rotate, search for a country, or zoom in to inspect provinces and states.");
  } catch (error) {
    setStatus(`Country data failed to load: ${error.message}`);
  }
}

init();
