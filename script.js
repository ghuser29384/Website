import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature as topojsonFeature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

const COUNTRY_DATA_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const GLOBE_ROTATION = [-18, -14, 0];
const width = 900;
const height = 900;
const baseScale = 388;

const briefs = {
  global: {
    location: "Whole Earth",
    summary:
      "Real geometry is now loaded. The prioritization layer still asks the same EA question: where do scale, suffering, neglect, and leverage combine most strongly?",
    footnote:
      "Country outlines come from Natural Earth. Provinces and states load from geoBoundaries only after a country is selected.",
    issues: [
      {
        tag: "Human welfare",
        title: "Preventable disease burden",
        body: "Large welfare gains still come from old problems like malaria, undernutrition, polluted air, and toxic exposure.",
      },
      {
        tag: "Animals",
        title: "Industrial animal systems",
        body: "A huge amount of suffering remains structurally hidden inside global food production, especially in poultry, fish, and shrimp systems.",
      },
      {
        tag: "Governance",
        title: "High-leverage institutions",
        body: "Some places matter less because of local burden and more because decisions made there shape risks and welfare worldwide.",
      },
    ],
  },
  "north-america": {
    location: "North America",
    summary:
      "The strongest EA case here is institutional leverage: frontier labs, capital, large public agencies, and animal agriculture all have wide spillovers.",
    footnote:
      "North America rises mostly because of policy, compute, biosecurity, and procurement leverage rather than direct disease burden alone.",
    issues: [
      {
        tag: "Governance",
        title: "AI oversight and frontier model governance",
        body: "A large share of frontier model development and policy debate is concentrated here.",
      },
      {
        tag: "Biosecurity",
        title: "Pandemic preparedness",
        body: "Institutional capacity is high enough that competence gains here can matter globally.",
      },
      {
        tag: "Animals",
        title: "Industrial meat systems",
        body: "Large-scale poultry and livestock production still turns routine procurement into hidden suffering.",
      },
    ],
  },
  "south-america": {
    location: "South America",
    summary:
      "Major priorities here mix institutional fragility with ecological leverage. Violence, forests, and food systems can all matter at once.",
    footnote:
      "Regional variation is large. The panel is a coarse strategic sketch, not a country ranking.",
    issues: [
      {
        tag: "Human welfare",
        title: "Violence and state capacity",
        body: "Organized violence can dominate development outcomes for millions.",
      },
      {
        tag: "Climate",
        title: "Deforestation and land conversion",
        body: "Forest loss creates costs that spill far beyond national borders.",
      },
      {
        tag: "Animals",
        title: "Growing poultry and fish production",
        body: "Food-system growth can lock in poor animal-welfare defaults early.",
      },
    ],
  },
  europe: {
    location: "Europe",
    summary:
      "Europe stands out for regulatory leverage. Rules written here can shift welfare, trade, and safety standards well beyond the region.",
    footnote:
      "Low direct burden does not imply low importance when standard-setting leverage is unusually high.",
    issues: [
      {
        tag: "Governance",
        title: "AI and biotech regulation",
        body: "Regulatory design choices can either raise the bar or perform safety theatrics.",
      },
      {
        tag: "Animals",
        title: "Farmed-animal welfare reform",
        body: "Retail and policy changes can improve conditions for very large numbers of animals.",
      },
      {
        tag: "Human welfare",
        title: "Aid and refugee policy",
        body: "European border and funding decisions strongly affect vulnerable people outside Europe too.",
      },
    ],
  },
  africa: {
    location: "Africa",
    summary:
      "This remains one of the clearest cases of concentrated, tractable human suffering: malaria, child mortality, undernutrition, and toxic exposure.",
    footnote:
      "The continent is morally and politically heterogeneous. This is a high-level EA framing, not a continent-wide uniform claim.",
    issues: [
      {
        tag: "Human welfare",
        title: "Malaria and child survival",
        body: "Malaria still falls heavily on African children and remains unusually tractable relative to the harm involved.",
      },
      {
        tag: "Health",
        title: "Lead exposure and dirty air",
        body: "Quiet toxic exposure can damage cognition and health at massive scale.",
      },
      {
        tag: "Poverty",
        title: "Extreme poverty and undernutrition",
        body: "Direct transfers and evidence-backed health programs still have large upside.",
      },
    ],
  },
  "middle-east": {
    location: "Middle East and North Africa",
    summary:
      "Conflict, displacement, and service collapse dominate here. Fragility makes ordinary health and welfare problems much more severe.",
    footnote:
      "In fragile settings, fast humanitarian logistics and health continuity can become unusually valuable very quickly.",
    issues: [
      {
        tag: "Human welfare",
        title: "Conflict and displacement",
        body: "War destroys infrastructure, uproots households, and creates long tails of trauma and poverty.",
      },
      {
        tag: "Health",
        title: "Health-system interruption",
        body: "When clinics fail, treatable disease and maternal risks become much deadlier.",
      },
      {
        tag: "Climate",
        title: "Water stress and extreme heat",
        body: "Heat and water insecurity compound already fragile politics.",
      },
    ],
  },
  "south-asia": {
    location: "South Asia",
    summary:
      "Very large population scale combines with chronic harms like polluted air, toxic exposure, heat, and rapidly expanding animal systems.",
    footnote:
      "Many of the region's biggest harms are chronic and familiar rather than spectacular, which makes them easy to underrate.",
    issues: [
      {
        tag: "Health",
        title: "Air pollution",
        body: "Clean air is a first-order public-health intervention here, not just an environmental preference.",
      },
      {
        tag: "Health",
        title: "Lead and industrial contamination",
        body: "Hidden toxic exposure can impose irreversible damage at very large scale.",
      },
      {
        tag: "Animals",
        title: "Poultry and aquaculture growth",
        body: "Demand growth can push huge numbers of animals into poor-welfare systems by default.",
      },
    ],
  },
  "east-asia": {
    location: "East and Southeast Asia",
    summary:
      "Animal numbers, pandemic preparedness, and dense industrial exposure all matter heavily here.",
    footnote:
      "This region can be simultaneously a human-health priority, an animal-welfare priority, and a systemic-risk priority.",
    issues: [
      {
        tag: "Animals",
        title: "Fish and shrimp welfare at extreme scale",
        body: "Aquatic systems can affect very large numbers of sentient beings even when each individual is easy to ignore.",
      },
      {
        tag: "Biosecurity",
        title: "Pandemic surveillance and preparedness",
        body: "Dense trade and livestock interfaces make fast detection unusually important.",
      },
      {
        tag: "Health",
        title: "Urban industrial exposure",
        body: "Air pollution and chronic exposure can quietly remove huge amounts of healthy life.",
      },
    ],
  },
  oceania: {
    location: "Oceania",
    summary:
      "The strongest case here is often regional stewardship: preparedness, Pacific resilience, and avoiding hidden cruelty in animal systems.",
    footnote:
      "The region matters partly because relatively capable institutions can act early and support nearby communities with fewer buffers.",
    issues: [
      {
        tag: "Biosecurity",
        title: "Biosecurity and preparedness",
        body: "Early action can still be unusually tractable in a region with strong institutions.",
      },
      {
        tag: "Climate",
        title: "Pacific climate resilience",
        body: "Nearby island communities face acute risk despite contributing little to the underlying damage.",
      },
      {
        tag: "Animals",
        title: "Animal farming and live-export welfare",
        body: "Wealth does not stop animal suffering from being systemically hidden.",
      },
    ],
  },
};

const svg = d3.select("#globe");
const mapStatus = document.getElementById("map-status");
const resetButton = document.getElementById("reset-view");
const selectionMeta = document.getElementById("selection-meta");
const selectionTitle = document.getElementById("selection-title");
const selectionSummary = document.getElementById("selection-summary");
const selectionFootnote = document.getElementById("selection-footnote");
const factLocation = document.getElementById("fact-location");
const factCountrySource = document.getElementById("fact-country-source");
const factAdminSource = document.getElementById("fact-admin-source");
const factUnitCount = document.getElementById("fact-unit-count");
const issuesRoot = document.getElementById("issues");

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
  selectedCountry: null,
  selectedProvince: null,
  provinceMeta: null,
  provinceFeatures: [],
};

const provinceCache = new Map();
let provinceRequestId = 0;
let justDragged = false;

function setStatus(message) {
  mapStatus.textContent = message;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
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

function countryRegionKey(feature) {
  if (!feature) {
    return "global";
  }

  const properties = feature.properties || {};
  const continent = properties.CONTINENT || "";
  const subregion = properties.SUBREGION || "";

  if (subregion === "Northern Africa" || subregion === "Western Asia") {
    return "middle-east";
  }

  if (subregion === "Southern Asia") {
    return "south-asia";
  }

  if (subregion === "Eastern Asia" || subregion === "South-Eastern Asia") {
    return "east-asia";
  }

  if (continent === "North America") {
    return "north-america";
  }

  if (continent === "South America") {
    return "south-america";
  }

  if (continent === "Europe") {
    return "europe";
  }

  if (continent === "Africa") {
    return "africa";
  }

  if (continent === "Oceania") {
    return "oceania";
  }

  if (continent === "Asia") {
    return "east-asia";
  }

  return "global";
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

function renderIssues(country) {
  const brief = briefs[countryRegionKey(country)];
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
}

function renderDetails() {
  const brief = briefs[countryRegionKey(state.selectedCountry)];

  if (!state.selectedCountry) {
    selectionMeta.textContent = "Global view";
    selectionTitle.textContent = "The whole Earth.";
    selectionSummary.textContent =
      "Drag the globe to rotate it. Click a country to load first-order administrative boundaries with real geometry.";
    selectionFootnote.textContent = brief.footnote;
    factLocation.textContent = brief.location;
    factCountrySource.textContent = "Natural Earth Admin 0, 1:50m";
    factAdminSource.textContent = "geoBoundaries ADM1 will load on click";
    factUnitCount.textContent = "0";
    renderIssues(null);
    return;
  }

  const countryProps = state.selectedCountry.properties;
  const name = countryName(countryProps);
  const iso = countryIso(countryProps) || "Unknown ISO";
  const subregion = countryProps.SUBREGION || countryProps.CONTINENT || "Unknown region";

  selectionMeta.textContent = `${name} · ${subregion}`;
  selectionTitle.textContent = state.selectedProvince ? provinceName(state.selectedProvince) : name;
  selectionSummary.textContent = state.selectedProvince
    ? `${provinceName(state.selectedProvince)} is selected inside ${name}. The outline is drawn from the live ADM1 layer for ${iso}.`
    : brief.summary;
  selectionFootnote.textContent = state.provinceMeta?.boundarySource
    ? `ADM1 source: ${state.provinceMeta.boundarySource}. ${brief.footnote}`
    : brief.footnote;

  factLocation.textContent = `${name} · ${iso}`;
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

function rotateTo(feature) {
  const [longitude, latitude] = d3.geoCentroid(feature);
  const start = projection.rotate();
  const end = [-longitude, -latitude, 0];
  const interpolate = d3.interpolate(start, end);

  d3.transition()
    .duration(900)
    .tween("rotate-globe", () => (time) => {
      projection.rotate(interpolate(time));
      renderGlobe();
    });
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

async function selectCountry(feature) {
  state.selectedCountry = feature;
  state.selectedProvince = null;
  rotateTo(feature);
  renderDetails();
  renderGlobe();
  await loadAdm1(feature);
}

function resetView() {
  state.selectedCountry = null;
  state.selectedProvince = null;
  state.provinceMeta = null;
  state.provinceFeatures = [];
  projection.rotate(GLOBE_ROTATION);
  renderDetails();
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

  resetButton.addEventListener("click", resetView);
}

async function init() {
  setStatus("Loading Natural Earth country boundaries...");

  try {
    const data = await fetchJson(COUNTRY_DATA_URL);
    state.countries = data.features.filter((feature) => countryName(feature.properties) !== "Antarctica");
    renderDetails();
    renderGlobe();
    setupInteraction();
    setStatus("Drag to rotate. Click a country to load provinces or states.");
  } catch (error) {
    setStatus(`Country data failed to load: ${error.message}`);
  }
}

init();
