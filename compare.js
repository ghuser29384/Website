const KNOWN_PLACES = {
  WLD: {
    label: "Whole Earth",
    parent: "World",
    href: "/v1/places/WLD.json",
    detail: "Release world profile",
  },
  BRA: {
    label: "Brazil",
    parent: "World",
    href: "/place/BRA/",
    detail: "Canonical country profile",
  },
  IND: {
    label: "India",
    parent: "World",
    href: "/place/IND/",
    detail: "Canonical country profile",
  },
};
const RELEASE_ID = "2026-05-31.atlas.2";
const TELEMETRY_ENDPOINT = document.documentElement.dataset.telemetryEndpoint || "";
const SERVICE_WORKER_SCRIPT = "/service-worker.js";
const COVERAGE_DATA_URL = "/v1/coverage.json";
const RELEASE_MODES_DATA_URL = "/data/release-modes.json";
const TELEMETRY_FIELDS_BY_EVENT = {
  route_view: ["route"],
  dataset_download: ["path", "format"],
  release_mode_selected: ["mode"],
  compare_opened: [
    "route",
    "requested_places_count",
    "requested_from_url",
    "comparable_rows",
    "has_compatibility_issues",
    "canonical_place_count",
    "release_mode",
  ],
  release_manifest_opened: ["path"],
  web_vital: ["metric", "value", "rating"],
};
const TELEMETRY_EVENTS = new Set(Object.keys(TELEMETRY_FIELDS_BY_EVENT));

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
      label: String(mode.label || modeId),
      status: String(mode.status || mode.replay_rule || ""),
      topbarNote:
        typeof mode.network_behavior === "string" && mode.network_behavior.trim()
          ? String(mode.network_behavior)
          : "",
      badge: mode.badge || "",
      cache_rule: mode.cache_rule || "",
      replay_rule: mode.replay_rule || "",
      network_behavior: mode.network_behavior || "",
      included_surfaces: mode.included_surfaces || [],
      upstream_sources: mode.upstream_sources || [],
    };
  }

  if (!modes.snapshot) {
    modes.snapshot = { label: "Snapshot", status: "", topbarNote: "", replay_rule: "", badge: "immutable" };
  }

  if (!modes.live) {
    modes.live = { label: "Live overlay", status: "", topbarNote: "", replay_rule: "", badge: "not frozen" };
  }

  return {
    release_id: String(rawPayload.release_id || RELEASE_ID),
    generated_at: String(rawPayload.generated_at || ""),
    default_mode: normalizeReleaseMode(rawPayload.default_mode),
    local_event_name: rawPayload.local_event_name || "compare_opened",
    modes,
    ui_contract: rawPayload.ui_contract || null,
  };
}

const RELEASE_MODE_FALLBACK = {
  local_event_name: "compare_opened",
  modes: {
    snapshot: { label: "Snapshot", status: "", topbarNote: "", replay_rule: "", badge: "immutable" },
    live: { label: "Live overlay", status: "", topbarNote: "", replay_rule: "", badge: "not frozen" },
  },
  ui_contract: {
    tablist_label: "Release data mode",
    status_region_id: "release-mode-status",
    snapshot_tab_id: "release-mode-snapshot",
    live_tab_id: "release-mode-live",
  },
};

let compareModeContract = null;
let compareMode = "snapshot";

const DEFAULT_COMPARE_MODE_UI = {
  tablistLabel: "Release data mode",
  statusRegionId: "release-mode-status",
  snapshotTabId: "release-mode-snapshot",
  liveTabId: "release-mode-live",
};

function compareModeUiConfig() {
  const contract = compareModeContract || RELEASE_MODE_FALLBACK;
  const uiContract = contract.ui_contract || {};
  const snapshotTabId = uiContract.snapshot_tab_id || DEFAULT_COMPARE_MODE_UI.snapshotTabId;
  const liveTabId = uiContract.live_tab_id || DEFAULT_COMPARE_MODE_UI.liveTabId;

  return {
    tablistLabel: uiContract.tablist_label || DEFAULT_COMPARE_MODE_UI.tablistLabel,
    statusRegionId: uiContract.status_region_id || DEFAULT_COMPARE_MODE_UI.statusRegionId,
    snapshotTabId,
    liveTabId,
    snapshotPanelId: `${snapshotTabId}-panel`,
    livePanelId: `${liveTabId}-panel`,
  };
}

function compareModeUiElements() {
  const config = compareModeUiConfig();
  return {
    tabList: document.getElementById("compare-release-mode-switch"),
    statusNode: document.getElementById(config.statusRegionId),
    tabs: Array.from(document.querySelectorAll("[data-compare-release-mode]")),
    panels: Array.from(document.querySelectorAll("[data-compare-release-mode-panel]")),
  };
}

function compareModeStatusText(modeConfig) {
  return (
    modeConfig.network_behavior ||
    modeConfig.topbarNote ||
    modeConfig.status ||
    modeConfig.replay_rule ||
    `${modeConfig.label || "snapshot"} mode is active.`
  );
}

function syncCompareModeUi() {
  const config = compareModeUiConfig();
  const { tabList, statusNode, tabs, panels } = compareModeUiElements();
  const normalizedMode = normalizeReleaseMode(compareMode);
  const modeConfig = getCompareReleaseModeConfig(normalizedMode);

  if (tabList) {
    tabList.setAttribute("aria-label", config.tablistLabel);
  }

  for (const tab of tabs) {
    const tabMode = normalizeReleaseMode(tab.dataset.compareReleaseMode);
    const isAvailable = isModeContractSupported(tabMode);

    if (!isAvailable) {
      tab.hidden = true;
      continue;
    }

    const tabConfig = getCompareReleaseModeConfig(tabMode);
    tab.hidden = false;
    if (tabConfig?.label) {
      tab.textContent = String(tabConfig.label);
    }

    const isSelected = tabMode === normalizedMode;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    tab.setAttribute("role", "tab");
    const panel = document.getElementById(`${tab.id}-panel`);
    if (panel) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      tab.setAttribute("aria-controls", panel.id);
    }
  }

  for (const panel of panels) {
    const panelMode = normalizeReleaseMode(panel.dataset.compareReleaseModePanel);
    const isAvailable = isModeContractSupported(panelMode);
    panel.hidden = !isAvailable || panelMode !== normalizedMode;
  }

  if (statusNode) {
    statusNode.textContent = compareModeStatusText(modeConfig);
  }

  const activePanel = panels.find((panel) => normalizeReleaseMode(panel.dataset.compareReleaseModePanel) === normalizedMode);
  if (activePanel) {
    const badge = activePanel.querySelector(".evidence-badge");
    if (badge && modeConfig.badge) {
      badge.textContent = String(modeConfig.badge);
    }
  }
}

function syncCompareModeToUrl(mode) {
  const params = new URLSearchParams(window.location.search);
  params.set("mode", mode);

  const pathname = window.location.pathname || "/";
  const query = params.toString();
  const nextUrl = `${pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function setCompareMode(mode, shouldRecord = true) {
  const selectedMode = normalizeReleaseMode(mode);
  if (!isModeContractSupported(selectedMode)) {
    return;
  }

  const modeChanged = compareMode !== selectedMode;
  if (compareMode !== selectedMode) {
    compareMode = selectedMode;
  }

  syncCompareModeUi();
  renderCompareCoverageReadiness(compareReleaseSummary);

  if (shouldRecord && modeChanged) {
    const eventName = compareReleaseModeTelemetryEventName();
    recordTelemetry(eventName, {
      mode: selectedMode,
    });
  }

  syncCompareModeToUrl(selectedMode);
}

function attachCompareModeKeyboardNavigation(tabs) {
  const visibleTabs = tabs.filter((tab) => !tab.hidden);
  for (let i = 0; i < visibleTabs.length; i += 1) {
    const tab = visibleTabs[i];
    tab.addEventListener("keydown", (event) => {
      const key = event.key;
      if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") {
        return;
      }

      event.preventDefault();
      const lastIndex = visibleTabs.length - 1;
      const currentIndex = i;
      let nextIndex = currentIndex;

      if (key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
      } else if (key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % visibleTabs.length;
      } else if (key === "Home") {
        nextIndex = 0;
      } else if (key === "End") {
        nextIndex = lastIndex;
      }

      const nextTab = visibleTabs[nextIndex];
      nextTab.focus();
      const nextMode = nextTab.dataset.compareReleaseMode;
      setCompareMode(nextMode);
    });
  }
}

function initCompareModeControls() {
  const { tabs } = compareModeUiElements();

  if (!tabs.length) {
    return;
  }

  for (const tab of tabs) {
    const tabMode = normalizeReleaseMode(tab.dataset.compareReleaseMode);
    if (!isModeContractSupported(tabMode)) {
      tab.hidden = true;
      continue;
    }

    tab.addEventListener("click", () => {
      setCompareMode(tabMode);
    });
  }

  attachCompareModeKeyboardNavigation(tabs);
  syncCompareModeUi();
}

function requestedCompareModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeReleaseMode(params.get("mode"));
}

function getCompareReleaseModeConfig(mode) {
  const key = normalizeReleaseMode(mode);
  return (compareModeContract || RELEASE_MODE_FALLBACK).modes?.[key] || (RELEASE_MODE_FALLBACK.modes.snapshot || {});
}

function isModeContractSupported(mode) {
  const key = normalizeReleaseMode(mode);
  return Boolean((compareModeContract || RELEASE_MODE_FALLBACK).modes?.[key]);
}

function compareReleaseModeTelemetryEventName() {
  return (compareModeContract?.local_event_name || "compare_opened").trim();
}

async function loadCompareReleaseModeContract() {
  try {
    const payload = await fetchJson(RELEASE_MODES_DATA_URL, 3000);
    const parsed = parseReleaseModesPayload(payload);

    if (!parsed) {
      throw new Error("Invalid release mode payload");
    }

    compareModeContract = parsed;
    const requestedMode = requestedCompareModeFromUrl();
    const defaultMode = normalizeReleaseMode(parsed.default_mode);

    if (isModeContractSupported(requestedMode)) {
      compareMode = requestedMode;
    } else if (isModeContractSupported(defaultMode)) {
      compareMode = defaultMode;
    } else if (!isModeContractSupported(compareMode)) {
      compareMode = "snapshot";
    }

    const eventName = compareReleaseModeTelemetryEventName();
    if (eventName) {
      if (!TELEMETRY_EVENTS.has(eventName)) {
        TELEMETRY_EVENTS.add(eventName);
      }

      const eventFields = Array.isArray(TELEMETRY_FIELDS_BY_EVENT[eventName])
        ? [...TELEMETRY_FIELDS_BY_EVENT[eventName]]
        : [...TELEMETRY_FIELDS_BY_EVENT.compare_opened];

      if (!eventFields.includes("release_mode")) {
        eventFields.push("release_mode");
      }

      TELEMETRY_FIELDS_BY_EVENT[eventName] = eventFields;
    }
  } catch (error) {
    compareModeContract = null;
    compareMode = "snapshot";
  }
}
const COVERAGE_STATUS = {
  canonicalProfile: "canonical_country_profile",
  boundaryOnly: "boundary_index_only",
  adm1Overlay: "adm1_context_overlay",
  noData: "no_data",
};
const COVERAGE_STATUS_LABEL = {
  [COVERAGE_STATUS.canonicalProfile]: "canonical country profile",
  [COVERAGE_STATUS.boundaryOnly]: "boundary-only context",
  [COVERAGE_STATUS.adm1Overlay]: "ADM1 context",
  [COVERAGE_STATUS.noData]: "no release coverage",
};
const COVERAGE_NO_DATA_HINT = {
  [COVERAGE_STATUS.boundaryOnly]:
    "Boundary-only coverage indicates a country profile shape is visible but canonical rows are not yet present in this snapshot.",
  [COVERAGE_STATUS.adm1Overlay]:
    "ADM1 context rows are available, but country canonical rows are not yet present in this snapshot.",
  [COVERAGE_STATUS.noData]:
    "No indexed coverage rows are available in this snapshot. This place is shown as sparse and cannot be ranked yet.",
};
const COVERAGE_PROMOTION_HINT = {
  [COVERAGE_STATUS.boundaryOnly]:
    "To promote this row for ranking, add release-measured country rows with method, source, and provenance coverage.",
  [COVERAGE_STATUS.adm1Overlay]:
    "To promote this row for ranking, add release-measured country rows and full method/source coverage.",
  [COVERAGE_STATUS.noData]:
    "To promote this row, add a release-indexed place profile with validated measurement sources and provenance.",
};
const ISSUE_TRACKER_TEMPLATE_URL = "https://github.com/ghuser29384/Website/issues/new";
const TERM_GLOSSARY = {
  "canonical country profile": {
    anchor: "#term-canonical-country-profile",
    help: "Country-level rows that have release-reviewed measurement rows and are explicitly eligible for ranked comparison.",
  },
  "boundary-only context": {
    anchor: "#term-boundary-only",
    help: "Boundary-only coverage means the place is visible on the map but has no canonical pain measurement rows yet.",
  },
  "adm1 context": {
    anchor: "#term-adm1-context",
    help: "ADM1 context uses subnational poverty/overlay rows for context, not a full canonical country ranking row.",
  },
  "no release coverage": {
    anchor: "#term-no-data",
    help: "No canonical or context rows were produced for this place in the active frozen release.",
  },
  "no data": {
    anchor: "#term-no-data",
    help: "No canonical or context rows were produced for this place in the active frozen release.",
  },
  "proxy aggregate": {
    anchor: "#term-proxy-aggregate",
    help: "A modeled proxy estimate that uses publicly available indicators and documented assumptions.",
  },
  "priority overlay": {
    anchor: "#term-priority-overlay",
    help: "A ranked priority overlay used for visibility, not a direct suffering measurement.",
  },
  "direct evidence": {
    anchor: "#term-direct-evidence",
    help: "Direct or canonical source-reported evidence used without proxy conversion.",
  },
  "proxy ranking mode": {
    anchor: "#term-ranking-mode",
    help: "Ranking mode defines how values are sorted or interpreted for comparison.",
  },
  "priority ranking mode": {
    anchor: "#term-ranking-mode",
    help: "Ranking mode defines how values are sorted or interpreted for comparison.",
  },
  "not directly comparable": {
    anchor: "#term-comparability",
    help: "Rows are compared only when layer, value model, unit, ranking mode, reference period, source vintage, and method version contracts match across all selected places.",
  },
  "reference period": {
    anchor: "#term-reference-period",
    help: "Compare and ranking logic uses this time window; values from different windows are not directly comparable.",
  },
  "source vintage": {
    anchor: "#term-source-vintage",
    help: "The source release snapshot that the release row was built from.",
  },
  "transform version": {
    anchor: "#term-transform-version",
    help: "Method version for score transformation and ranking logic used to build the release row.",
  },
  "method version": {
    anchor: "#term-transform-version",
    help: "Method version for score transformation and ranking logic used to build the release row.",
  },
  "value model": {
    anchor: "#term-value-model",
    help: "The numeric meaning behind a value row (for example, raw burden proxy, modeled proxy, or direct count).",
  },
  uncertainty: {
    anchor: "#term-uncertainty",
    help: "Uncertainty class and bounds used for this row; these values should be interpreted with their confidence interval.",
  },
};
const TERM_GLOSSARY_ALIASES = {
  proxy: "proxy aggregate",
  "priority-overlay": "priority overlay",
  direct: "direct evidence",
  "higher-proxy-score-more-attention": "proxy ranking mode",
  "higher_priority_more_attention": "priority ranking mode",
};
const COMPARE_TABLE_COLUMN_LABELS = [
  "Place",
  "Layer",
  "Evidence kind",
  "Value model",
  "Unit",
  "Ranking mode",
  "Reference period",
  "Display value",
  "Uncertainty",
  "Method version",
  "Source vintage",
];
const RELEASE_COVERAGE_FALLBACK = {
  release_id: RELEASE_ID,
  generated_at: "2026-05-31",
  last_release_date: "2026-05-31",
  default_ranking_readiness: {
    ready: false,
    enabled: false,
    reason: "Release-level coverage summary could not be loaded; compare defaults to coverage-first until release metrics confirm readiness.",
    release_note_url: "/updates/",
    rule: "default-ranking = canonical_country_profiles >= 10 and canonical_ratio >= 0.35 and (direct + proxy + priority_overlay + release_measurements) >= 10",
  },
};
const COMPATIBILITY_FIELDS = [
  "layer_id",
  "evidence_kind",
  "value_type",
  "unit_label",
  "ranking_mode",
  "geometry_level",
  "reference_period",
  "source_vintage",
  "method_version",
];

const COMPARABILITY_FIELD_HINTS = {
  layer_id: "layer",
  evidence_kind: "evidence kind",
  value_type: "value model",
  unit_label: "unit",
  ranking_mode: "ranking mode",
  geometry_level: "place geometry level",
  reference_period: "reference period",
  source_vintage: "source vintage",
  method_version: "method version",
};

const PLACE_PROFILE_CACHE = new Map();
let compareReleaseSummary = RELEASE_COVERAGE_FALLBACK;

function normalizeGlossaryKey(value) {
  return String(value || "").trim().toLowerCase();
}

function glossaryEntry(value) {
  const normalized = normalizeGlossaryKey(value);
  const alias = TERM_GLOSSARY_ALIASES[normalized];
  const key = alias || normalized;
  return TERM_GLOSSARY[key] || null;
}

function glossaryNode(rawValue, rawFallback, glossarySource = rawValue) {
  const fallback = String(rawFallback == null ? rawValue || "" : rawFallback);
  const entry = glossaryEntry(glossarySource);

  if (!entry) {
    return null;
  }

  const anchor = document.createElement("a");
  anchor.className = "glossary-term";
  anchor.href = entry.anchor;
  anchor.textContent = fallback;
  anchor.rel = "noopener";
  anchor.title = entry.help;
  anchor.setAttribute("aria-label", fallback + " : " + entry.help);
  return anchor;
}

function buildCorrectionIssueUrl(profile) {
  const releaseId = profile?.release_id || RELEASE_ID;
  const subjectType = profile?.type === "province" ? "province" : "place";
  const subjectId = normalizePlaceToken(profile?.countryId || profile?.id || "unknown");
  const route = `${window.location.pathname}${window.location.search}`;
  const claimId = `claim.${releaseId}.${subjectType}.${subjectId}`;
  const coverageStatus = coverageStatusLabel(profile?.coverage_status);
  const title = `[PainMap correction] ${releaseId}: ${profile?.label || subjectId}`;
  const body = [
    `Release: ${releaseId}`,
    `Subject type: ${subjectType}`,
    `Subject id: ${subjectId}`,
    `Claim id: ${claimId}`,
    `Route: ${route}`,
    `Coverage status: ${coverageStatus}`,
    "",
    "Please include source links, release context, and what should be corrected.",
  ].join("\n");

  const params = new URLSearchParams({
    title,
    body,
  });
  params.set("labels", "correction");

  return `${ISSUE_TRACKER_TEMPLATE_URL}?${params.toString()}`;
}


function describeMissingInputs(value) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => String(item || "").trim()).filter(Boolean);
    return items.length ? items.join(", ") : "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "object") {
    const items = Object.entries(value)
      .filter(([, stateValue]) => Boolean(stateValue))
      .map(([name]) => name);
    return items.length ? items.join(", ") : "";
  }

  return "";
}

function evidenceKindGlossaryKey(value) {
  return normalizeGlossaryKey(value) === "priority-overlay"
    ? "priority overlay"
    : normalizeGlossaryKey(value);
}

function rankingModeGlossaryKey(value) {
  if (normalizeGlossaryKey(value).includes("proxy")) {
    return "proxy ranking mode";
  }

  if (normalizeGlossaryKey(value).includes("priority")) {
    return "priority ranking mode";
  }

  return "";
}

function valueModelGlossaryKey(value) {
  const normalized = normalizeGlossaryKey(value);
  if (!normalized || normalized === "unreported") {
    return "";
  }

  return "value model";
}

function normalizePlaceToken(value) {
  return String(value || "").trim().slice(0, 96);
}

function currentRoutePath() {
  return window.location.pathname || "/";
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

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function normalizeCoverageStatus(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const canonicalized = {
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

  if (Object.prototype.hasOwnProperty.call(canonicalized, normalized)) {
    return canonicalized[normalized];
  }

  return Object.values(COVERAGE_STATUS).includes(raw) ? raw : COVERAGE_STATUS.noData;
}

function coverageStatusLabel(value) {
  return COVERAGE_STATUS_LABEL[normalizeCoverageStatus(value)] || COVERAGE_STATUS_LABEL[COVERAGE_STATUS.noData];
}

function releaseRankingReadiness(summary = {}) {
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
  const evidenceReady = directEvidence + proxyEvidence + priorityEvidence + releaseMeasurements;

  if (!Number.isFinite(countryBoundaries) || countryBoundaries <= 0) {
    return false;
  }

  return (
    canonicalProfiles >= 10 &&
    canonicalProfiles / countryBoundaries >= 0.35 &&
    evidenceReady >= 10
  );
}

function releaseRankingReadinessNoteUrl(summary = {}) {
  const explicit = summary?.default_ranking_readiness;
  const rawUrl = explicit?.release_note_url;

  return normalizeReleaseNoteUrl(rawUrl);
}

function normalizeReleaseNoteUrl(rawUrl) {
  const fallback = "/updates/";

  if (typeof rawUrl !== "string") {
    return fallback;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.pathname + (parsed.search || "") + (parsed.hash || "");
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function releaseRankingReadinessReason(summary = {}) {
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
    reasons.push(`fewer than 10 canonical profiles`);
  }

  if (countryBoundaries > 0 && canonicalProfiles / countryBoundaries < 0.35) {
    reasons.push("too few countries have canonical rows relative to indexed boundaries");
  }

  if (evidenceReady < 10) {
    reasons.push("fewer than 10 direct/proxy/priority/release-metric rows");
  }

  if (!reasons.length) {
    return "Release ranking readiness requires additional release-specific checks to pass.";
  }

  return reasons.join(" · ");
}

function releaseRankingReadinessRule(summary = {}) {
  const explicit = summary?.default_ranking_readiness;
  const rule = typeof explicit?.rule === "string" ? explicit.rule.trim() : "";
  return (
    rule ||
    "default-ranking = canonical_country_profiles >= 10 and canonical_ratio >= 0.35 and (direct + proxy + priority_overlay + release_measurements) >= 10"
  );
}

function renderCompareCoverageReadiness(summary = {}) {
  const releaseSummary = summary || RELEASE_COVERAGE_FALLBACK;
  const modeConfig = getCompareReleaseModeConfig(compareMode);
  const modeLabel = modeConfig?.label || compareMode;
  const readiness = releaseRankingReadiness(releaseSummary);
  const reason = releaseRankingReadinessReason(releaseSummary);
  const rule = releaseRankingReadinessRule(releaseSummary);
  const noteUrl = releaseRankingReadinessNoteUrl(releaseSummary);
  const reasonText = reason.endsWith(".") ? reason.slice(0, -1) : reason;
  const releaseLabel = releaseSummary.release_id || RELEASE_ID;
  const statusNode = document.getElementById("compare-coverage-readiness");
  document.body?.classList.toggle("coverage-first-mode", !Boolean(readiness));

  if (!statusNode) {
    return;
  }

  statusNode.textContent = "";
  statusNode.className = "compare-comparability-notice";
  if (readiness) {
    statusNode.classList.add("compare-warning--ok");
    statusNode.textContent = `Compare surface in release ${releaseLabel} (${modeLabel}) passed the ranking-readiness gate.`;
  } else {
    statusNode.classList.remove("compare-warning--ok");
    statusNode.textContent = `Compare surface in release ${releaseLabel} (${modeLabel}) is coverage-first: ${reasonText}.`;
  }

  const ruleText = `Gate rule: ${rule}.`;
  statusNode.appendChild(document.createTextNode(` ${ruleText}`));

  const releaseNoteLink = document.createElement("a");
  releaseNoteLink.className = "glossary-term";
  releaseNoteLink.href = noteUrl;
  releaseNoteLink.rel = "noopener";
  releaseNoteLink.textContent = "See release note";
  releaseNoteLink.setAttribute("aria-label", "Release gate criteria and rationale");
  statusNode.appendChild(document.createTextNode(" "));
  statusNode.appendChild(releaseNoteLink);
  statusNode.appendChild(document.createTextNode("."));

  renderCompareSparseAreas(releaseSummary);
}

function renderCompareSparseAreas(summary = {}) {
  const listNode = document.getElementById("compare-coverage-sparse-areas");
  if (!listNode) {
    return;
  }

  const areas = Array.isArray(summary?.known_sparse_areas) ? summary.known_sparse_areas : [];
  listNode.textContent = "";
  listNode.setAttribute("aria-live", "polite");

  if (!areas.length) {
    const li = document.createElement("li");
    li.textContent = "No known sparse-coverage areas are currently flagged.";
    listNode.appendChild(li);
    return;
  }

  areas.forEach((area) => {
    const li = document.createElement("li");
    li.textContent = String(area);
    listNode.appendChild(li);
  });
}

async function loadReleaseCoverageSummary() {
  try {
    const summary = await fetchJson(COVERAGE_DATA_URL);
    return summary && typeof summary === "object" ? summary : RELEASE_COVERAGE_FALLBACK;
  } catch {
    return RELEASE_COVERAGE_FALLBACK;
  }
}

function measurementSignature(measurement) {
  if (!measurement || typeof measurement !== "object") {
    return "";
  }

  return COMPATIBILITY_FIELDS.map((field) => `${field}=${compatibilityFieldValue(measurement, field) || ""}`).join("|");
}

function methodVersionValue(measurement) {
  const methodVersion = measurement?.method_version;
  if (methodVersion != null && String(methodVersion).trim() !== "") {
    return String(methodVersion);
  }

  const transformVersion = measurement?.transform_version;
  if (transformVersion != null && String(transformVersion).trim() !== "") {
    return String(transformVersion);
  }

  return "";
}

function compatibilityFieldValue(measurement, field) {
  if (field === "method_version") {
    return methodVersionValue(measurement);
  }

  return measurement?.[field];
}

function normalizeComparisonValue(value) {
  return String(value == null ? "" : value).trim().toLowerCase() || "unreported";
}

function formatUncertainty(measurement) {
  const low = Number.isFinite(measurement?.confidence_low)
    ? measurement.confidence_low.toFixed(2)
    : "n/a";
  const high = Number.isFinite(measurement?.confidence_high)
    ? measurement.confidence_high.toFixed(2)
    : "n/a";
  const base = measurement?.uncertainty_class || "unknown";

  if (low === "n/a" || high === "n/a") {
    return `${base}`;
  }

  return `${base} (${low} to ${high})`;
}

function parsePlaceToken(rawToken) {
  const token = normalizePlaceToken(rawToken);
  if (!token) {
    return null;
  }

  const [countryId, ...provinceParts] = token.split(":");
  const provinceName = provinceParts.join(":").trim();

  if (countryId && provinceName) {
    return {
      type: "province",
      countryId: countryId.toUpperCase(),
      id: `${countryId.toUpperCase()}:${provinceName}`,
      label: `${provinceName}, ${countryId.toUpperCase()}`,
      rawLabel: `${provinceName}, ${countryId.toUpperCase()}`,
      parent: countryId.toUpperCase(),
      href: `/compare/?places=${encodeURIComponent(`${countryId.toUpperCase()}:${provinceName}`)}`,
      detail: "ADM1 compare request",
    };
  }

  return {
    type: "country",
    countryId: token.toUpperCase(),
    id: token.toUpperCase(),
    label: token.toUpperCase(),
    rawLabel: token.toUpperCase(),
  };
}

function buildCompatibilityDifferences(baseMeasurement, targetProfiles) {
  if (!baseMeasurement || !targetProfiles.length) {
    return [];
  }

  const layer = baseMeasurement.layer_name || baseMeasurement.layer_id || "Unknown layer";
  const issues = [];
  const targetProfilesWithMissingLayer = [];

  for (const profile of targetProfiles) {
    const matches = (profile.measurements || []).filter(
      (measurement) => measurement?.layer_id && measurement.layer_id === baseMeasurement.layer_id
    );

    if (!matches.length) {
      targetProfilesWithMissingLayer.push(profile.label || profile.id || profile.placeId || "place");
      continue;
    }

    const fieldSignatures = {
      layer_id: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "layer_id") || "")]),
      evidence_kind: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "evidence_kind") || "")]),
      value_type: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "value_type") || "")]),
      unit_label: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "unit_label") || "")]),
      ranking_mode: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "ranking_mode") || "")]),
      geometry_level: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "geometry_level") || "")]),
      reference_period: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "reference_period") || "")]),
      source_vintage: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "source_vintage") || "")]),
      method_version: new Set([normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, "method_version") || "")]),
    };

    for (const match of matches) {
      for (const [field, bucket] of Object.entries(fieldSignatures)) {
        bucket.add(normalizeComparisonValue(compatibilityFieldValue(match, field)));
      }
    }

    for (const field of Object.keys(fieldSignatures)) {
      const baseValue = normalizeComparisonValue(compatibilityFieldValue(baseMeasurement, field));
      const values = Array.from(fieldSignatures[field]);
      if (values.length > 1) {
        const pretty = values.sort((left, right) => left.localeCompare(right)).join(" vs ");
        issues.push(
          `${layer}: ${COMPARABILITY_FIELD_HINTS[field] || field} differs across places for this layer (${pretty}).`
        );
      } else if (baseValue !== values[0]) {
        issues.push(`${layer}: ${COMPARABILITY_FIELD_HINTS[field] || field} differs for ${profile.label || profile.id}.`);
      }
    }
  }

  for (const placeLabel of targetProfilesWithMissingLayer) {
    issues.push(`${layer}: ${placeLabel} does not expose this layer in a comparable contract row.`);
  }

  const unique = Array.from(new Set(issues));
  return unique.slice(0, 4);
}

function placeInfo(token) {
  const parsed = parsePlaceToken(token);
  if (!parsed) {
    return null;
  }

  const known = KNOWN_PLACES[parsed.id];
  if (known) {
    return {
      ...parsed,
      label: known.label,
      parent: known.parent,
      href: known.href,
      detail: known.detail,
    };
  }

  if (parsed.type === "province") {
    return {
      ...parsed,
      href: parsed.href,
      detail: parsed.detail,
    };
  }

  return {
    ...parsed,
    href: `/v1/places/${parsed.id.toUpperCase()}.json`,
    detail: "Boundary-indexed place request",
  };
}

function requestedPlaceTokens() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("places") || params.get("place") || "";

  if (!raw) {
    return ["BRA", "IND"];
  }

  return raw
    .split(",")
    .map(normalizePlaceToken)
    .filter(Boolean)
    .slice(0, 4);
}

function setTableCell(row, value, isHeader = false, glossarySource = "", label = "") {
  const cell = isHeader ? document.createElement("th") : document.createElement("td");
  cell.scope = isHeader ? "row" : "";
  const text = String(value || "");
  const node = glossarySource ? glossaryNode(text, text, glossarySource) : null;
  if (node) {
    cell.appendChild(node);
  } else {
    cell.textContent = text;
  }
  if (!isHeader && label) {
    cell.dataset.label = label;
  }
  row.appendChild(cell);
}

function noDataProfileMessage(profile) {
  const statusText = coverageStatusLabel(profile?.coverage_status);
  const statusHint = COVERAGE_NO_DATA_HINT[profile?.coverage_status] ||
    "No canonical rows for direct comparison in this release.";
  const reason = String(profile?.coverage_reason || "").trim();
  const missingInputs = describeMissingInputs(profile?.missing_inputs);
  const promotionHint = COVERAGE_PROMOTION_HINT[profile?.coverage_status];

  if (profile?.load_error) {
    return `${profile?.label || "Requested place"} could not be loaded for comparison: ${profile.load_error}. Coverage status: ${statusText}.`;
  }

  const details = [
    `${profile?.label || "Requested place"} has no canonical release measurements in this snapshot.`,
    `Coverage status: ${statusText}.`,
    statusHint,
  ];

  if (reason) {
    details.push(`Reason: ${reason}.`);
  }

  if (missingInputs) {
    details.push(`Missing inputs: ${missingInputs}.`);
  }

  if (promotionHint) {
    details.push(`What to check next: ${promotionHint}`);
  }

  return details.join(" ");
}

async function loadCountryProfile(countryId) {
  const normalized = countryId.toUpperCase();
  const cached = PLACE_PROFILE_CACHE.get(normalized);
  if (cached) {
    return cached;
  }

  const base = {
    id: normalized,
    type: "country",
    countryId: normalized,
    label: normalized,
    parent: "World",
    href: `/place/${normalized}/`,
    detail: "Boundary-indexed place request",
    release_id: RELEASE_ID,
    coverage_status: COVERAGE_STATUS.noData,
    measurements: [],
    measurementBySignature: new Map(),
    load_error: null,
  };

  try {
    const payload = await fetchJson(`/v1/places/${normalized}.json`);
    const measurements = Array.isArray(payload?.measurements) ? payload.measurements : [];
    const payloadStatus = normalizeCoverageStatus(payload?.coverage_status);
    base.label = payload?.place_name || base.label;
    base.parent = payload?.parent_place_id || base.parent;
    base.release_id = payload?.release_id || RELEASE_ID;
    base.measurements = measurements;
    base.coverage_status = measurements.length > 0 || payloadStatus === COVERAGE_STATUS.canonicalProfile
      ? COVERAGE_STATUS.canonicalProfile
      : payloadStatus === COVERAGE_STATUS.adm1Overlay
        ? COVERAGE_STATUS.adm1Overlay
        : payloadStatus === COVERAGE_STATUS.noData
          ? COVERAGE_STATUS.noData
          : COVERAGE_STATUS.boundaryOnly;
    base.measurementBySignature = new Map();

    for (const measurement of measurements) {
      const key = measurementSignature(measurement);
      if (key) {
        base.measurementBySignature.set(key, measurement);
      }
    }
  } catch (error) {
    base.load_error = error.message || "Failed to load place payload";
    base.coverage_status = COVERAGE_STATUS.noData;
  }

  PLACE_PROFILE_CACHE.set(normalized, base);
  return base;
}

async function loadPlaceProfile(requested) {
  if (!requested) {
    return null;
  }

  if (requested.type === "province") {
    const parent = await loadCountryProfile(requested.countryId || "");
    return {
      ...requested,
      coverage_status:
        requested.type === "province"
          ? parent.coverage_status === COVERAGE_STATUS.noData
            ? COVERAGE_STATUS.noData
            : COVERAGE_STATUS.adm1Overlay
          : parent.coverage_status,
      parent: requested.parent || "World",
      release_id: parent.release_id || RELEASE_ID,
      measurements: [],
      measurementBySignature: new Map(),
      load_error: parent.load_error,
      source_place: parent,
    };
  }

  const normalized = requested.countryId || requested.id;
  return loadCountryProfile(normalized);
}

function buildComparabilityReport(profiles) {
  const canonicalProfiles = profiles.filter(
    (profile) => profile.coverage_status === COVERAGE_STATUS.canonicalProfile
  );

  const report = {
    canonicalProfiles,
    issues: [],
    nonComparableMismatchSummary: [],
    sharedSignatures: new Set(),
    rowCount: 0,
    nonComparableLayerRows: [],
    fullyComparable: false,
  };

  if (profiles.length > 1 && canonicalProfiles.length < profiles.length) {
    report.issues.push(
      "One or more places are boundary-only or ADM1-only in this release. Direct ranking comparison is not supported for those rows."
    );
  }

  if (canonicalProfiles.length === 0) {
    report.issues.push("No requested place has canonical release rows in this release.");
    return report;
  }

  const [first, ...rest] = canonicalProfiles;
  report.sharedSignatures = new Set(first.measurementBySignature.keys());

  for (const profile of rest) {
    const next = new Set(profile.measurementBySignature.keys());
    report.sharedSignatures = new Set(
      [...report.sharedSignatures].filter((signature) => next.has(signature))
    );
  }

  if (profiles.length > 1 && report.sharedSignatures.size === 0) {
      report.issues.push(
      "No shared layer contract, value model, unit, ranking mode, reference period, source vintage, or method version exists across all selected places."
    );
  }

  report.rowCount = report.sharedSignatures.size;
  report.fullyComparable = report.issues.length === 0 && (profiles.length <= 1 || report.rowCount > 0);

  for (const profile of canonicalProfiles) {
    for (const [signature, measurement] of profile.measurementBySignature.entries()) {
      if (!report.sharedSignatures.has(signature)) {
        report.nonComparableLayerRows.push({
          layer: measurement.layer_name || measurement.layer_id || signature,
          sample: `${profile.label}: ${measurement.layer_name || measurement.layer_id || signature}`,
        });
      }
    }
  }

  const comparePeers = canonicalProfiles.slice(1);
  const referenceProfile = canonicalProfiles[0] || null;
  if (referenceProfile && comparePeers.length) {
    for (const measurement of referenceProfile.measurements) {
      const signature = measurementSignature(measurement);
      if (report.sharedSignatures.has(signature)) {
        continue;
      }

      const incompatibilities = buildCompatibilityDifferences(measurement, comparePeers);
      if (incompatibilities.length) {
        incompatibilities.forEach((issue) => {
          report.nonComparableLayerRows.push({
            layer: measurement.layer_name || measurement.layer_id || signature,
            sample: `${measurement.layer_name || measurement.layer_id || signature}: ${issue}`,
          });
        });
      }
    }
  }

  report.nonComparableLayerRows = Array.from(
    new Map(report.nonComparableLayerRows.map((row) => [row.sample, row])).values()
  ).slice(0, 14);

  report.nonComparableMismatchSummary = mismatchSummaryFromRows(
    report.nonComparableLayerRows.map((row) => row.sample || row),
    4
  );

  const nonComparableRows =
    typeof report.nonComparableLayerRows[0]?.sample === "string"
      ? report.nonComparableLayerRows
      : report.nonComparableLayerRows.map((row) => row.sample);

  report.issues = report.issues.filter(Boolean);
  if (nonComparableRows.length) {
    report.issues.unshift(
      "Layer, value model, unit, ranking mode, reference period, source vintage, and method version contracts are not aligned for all requested places."
    );
  }

  return report;
}

function renderRequestedPlaceChips(placeProfiles, fromUrl) {
  const status = document.getElementById("compare-url-status");
  const list = document.getElementById("compare-requested-list");
  const heading = document.getElementById("compare-title");

  if (!status || !list) {
    return;
  }

  if (heading && fromUrl) {
    heading.textContent = "Compare places with contract guards";
  }

  status.textContent = fromUrl
    ? "Showing requested compare places from this URL. Directly comparable rows are filtered by release contract."
    : "Default release example: Brazil and India. Use the compare URL to set custom places.";

  list.textContent = "";

  for (const place of placeProfiles) {
    const link = document.createElement("a");
    link.className = "compare-chip";
    link.href = place.href;
    link.textContent = `${place.label} · ${coverageStatusLabel(place.coverage_status)}`;
    list.appendChild(link);
  }
}

function renderPlaceCard(profile) {
  const article = document.createElement("article");
  article.className = "metadata-card";

  const badge = document.createElement("span");
  badge.className = "evidence-badge";
  badge.textContent = profile.countryId || profile.id || "CMP";
  article.appendChild(badge);

  const title = document.createElement("h2");
  title.textContent = profile.label;
  article.appendChild(title);

  const release = document.createElement("p");
  release.textContent = `Release: ${profile.release_id || RELEASE_ID}`;
  article.appendChild(release);

  const status = document.createElement("p");
  const coverageText = coverageStatusLabel(profile.coverage_status);
  status.textContent = "Coverage: ";
  status.appendChild(glossaryNode(coverageText, coverageText) || document.createTextNode(coverageText));
  article.appendChild(status);

  const details = document.createElement("p");
  if (profile.load_error) {
    details.textContent = `Load error: ${profile.load_error}`;
  } else if (!profile.measurements.length) {
    const statusText = coverageStatusLabel(profile.coverage_status);
    const statusNode = glossaryNode(statusText, statusText, statusText);
    const noDataHint = COVERAGE_NO_DATA_HINT[profile.coverage_status] || "No canonical rows for direct comparison in this snapshot.";
    const missingInputs = describeMissingInputs(profile.missing_inputs);
    const coverageReason = String(profile.coverage_reason || "").trim();

    details.textContent = "";
    details.appendChild(document.createTextNode("No canonical rows for direct ranking in this release. Coverage status: "));
    details.appendChild(statusNode || document.createTextNode(statusText));
    details.appendChild(document.createTextNode(". "));
    details.appendChild(document.createTextNode(noDataHint + " "));

    if (coverageReason) {
      details.appendChild(document.createTextNode("Reason: " + coverageReason + ". "));
    }

    if (missingInputs) {
      details.appendChild(document.createTextNode("Missing inputs: " + missingInputs + ". "));
    }

    const promotion = COVERAGE_PROMOTION_HINT[profile.coverage_status];
    if (promotion) {
      details.appendChild(document.createTextNode("What to check next: " + promotion));
    }
  } else {
    details.textContent = `Rows: ${profile.measurements.length}. Layer modes: ${[
      ...new Set(profile.measurements.map((m) => m.evidence_kind).filter(Boolean)),
    ].join(", ") || "unknown"}.`;
  }

  article.appendChild(details);

  const uncertainty = document.createElement("p");
  const uniqueUncertainty = new Set(profile.measurements.map((m) => m.uncertainty_class).filter(Boolean));
  uncertainty.textContent =
    uniqueUncertainty.size > 0
      ? `Uncertainty classes: ${[...uniqueUncertainty].sort().join(", ")}`
      : "Uncertainty class: unavailable";
  article.appendChild(uncertainty);

  const actions = document.createElement("div");
  actions.className = "route-actions";

  const pageLink = document.createElement("a");
  pageLink.className = "ghost-link";
  pageLink.href = profile.href;
  pageLink.textContent = profile.type === "country" ? "Open place page" : "Open profile JSON";
  actions.appendChild(pageLink);

  const correctionLink = document.createElement("a");
  correctionLink.className = "ghost-link";
  correctionLink.href = buildCorrectionIssueUrl(profile);
  correctionLink.target = "_blank";
  correctionLink.rel = "noopener noreferrer";
  correctionLink.textContent = "Open correction form";
  actions.appendChild(correctionLink);

  article.appendChild(actions);

  return article;
}

function renderCompareSummaryCard(profiles, report) {
  const article = document.createElement("article");
  article.className = "metadata-card compare-gutter";

  const badge = document.createElement("span");
  badge.className = "evidence-badge";
  badge.textContent = "Compare";
  article.appendChild(badge);

  const title = document.createElement("h2");
  title.textContent = "Comparability";
  article.appendChild(title);

  const summary = document.createElement("p");
  if (profiles.length <= 1) {
    summary.textContent = "Single-place view shows release rows in the same contract-aware format.";
  } else if (report.fullyComparable) {
    summary.textContent = "Selected places currently share direct row contracts for comparable layers.";
  } else if (report.rowCount > 0) {
    const mismatchSummary = report.nonComparableMismatchSummary || [];
    if (mismatchSummary.length) {
      summary.textContent = `Some rows are comparable; top contract mismatches: ${mismatchSummary.join(", ")}.`;
      summary.appendChild(document.createTextNode(" "));
      const detail = document.createElement("span");
      detail.textContent = "Non-comparable rows are flagged below and excluded from ranked interpretation.";
      summary.appendChild(detail);
    } else {
      summary.textContent =
        "Some rows are comparable; non-comparable rows are flagged below and excluded from ranked interpretation.";
    }
  } else {
    const noComparableLink = glossaryNode("No directly comparable", "No directly comparable", "No directly comparable");
    const nonComparableRows =
      typeof report.nonComparableLayerRows[0]?.sample === "string"
        ? report.nonComparableLayerRows
        : report.nonComparableLayerRows.map((row) => row.sample);
    const mismatchSummary = report.nonComparableMismatchSummary || mismatchSummaryFromRows(nonComparableRows, 3);

    if (noComparableLink) {
      summary.textContent = "";
      summary.appendChild(noComparableLink);
      summary.appendChild(document.createTextNode(" rows were found for the selected places."));

      if (mismatchSummary.length) {
        summary.appendChild(document.createElement("br"));
        const mismatchLabel = document.createElement("span");
        mismatchLabel.textContent = `Top mismatches: ${mismatchSummary.join(", ")}.`;
        summary.appendChild(mismatchLabel);
      }
    } else {
      if (mismatchSummary.length) {
        summary.textContent = `No directly comparable rows were found for the selected places, with leading mismatches in: ${mismatchSummary.join(", ")}.`;
      } else {
        summary.textContent = "No directly comparable rows were found for the selected places.";
      }
    }
  }

  article.appendChild(summary);

  const comparison = document.createElement("p");
  if (profiles.length > 1) {
    comparison.textContent = `Canonical rows available: ${report.canonicalProfiles.length} of ${profiles.length}.`;
  } else {
    comparison.textContent = `Canonical rows available: ${report.canonicalProfiles.length}.`;
  }
  article.appendChild(comparison);

  return article;
}

function renderComparePlaceCards(profiles, report) {
  const grid = document.getElementById("compare-place-grid");
  if (!grid) {
    return;
  }

  grid.textContent = "";

  const leftProfile = profiles[0] || null;
  const rightProfile = profiles[1] || null;
  const fallback = {
    id: "Missing",
    label: "Missing place",
    href: "/places/",
    detail: "Request another place ID",
    parent: "World",
    coverage_status: COVERAGE_STATUS.noData,
    release_id: RELEASE_ID,
    measurements: [],
    type: "country",
    load_error: "not requested",
  };

  if (leftProfile) {
    grid.appendChild(renderPlaceCard(leftProfile));
  } else {
    grid.appendChild(renderPlaceCard(fallback));
  }

  grid.appendChild(renderCompareSummaryCard(profiles, report));

  if (rightProfile) {
    grid.appendChild(renderPlaceCard(rightProfile));
  }
}

function renderComparabilityNotice(profiles, report) {
  const notice = document.getElementById("compare-comparability-notice");
  const layerList = document.getElementById("compare-noncomparable-list");

  if (!notice || !layerList) {
    return;
  }

  const isRankingReady = releaseRankingReadiness(compareReleaseSummary);
  const reason = isRankingReady ? "" : releaseRankingReadinessReason(compareReleaseSummary);
  const reasonText = reason.endsWith(".") ? reason.slice(0, -1) : reason;
  const messageItems = report.issues.length
    ? [...report.issues]
    : ["Release rows below are directly comparable. Layer and contract terms align across selected canonical profiles."];

  const isDirectlyComparableIssue = report.issues.find((issue) =>
    issue.toLowerCase().includes("directly comparable")
  );

  if (!report.fullyComparable && !isDirectlyComparableIssue) {
    if (report.nonComparableMismatchSummary?.length) {
      messageItems.push(`Contract mismatch examples: ${report.nonComparableMismatchSummary.join("; ")}.`);
    }

    messageItems.push("See guidance for");
  }

  if (!isRankingReady) {
    messageItems.unshift(
      `Global ranking readiness is not met for this release: ${reasonText || "additional release checks remain."}`
    );
  }

  const list = document.createElement("ul");
  list.className = "compare-notice-list";
  for (const item of messageItems) {
    const li = document.createElement("li");
    if (item === "See guidance for") {
      li.textContent = "See guidance for ";
      const noComparableLink = glossaryNode("not directly comparable", "not directly comparable");
      if (noComparableLink) {
        li.appendChild(document.createTextNode(" "));
        li.appendChild(noComparableLink);
        li.appendChild(document.createTextNode("."));
      } else {
        li.appendChild(document.createTextNode(" comparison constraints."));
      }
    } else {
      li.textContent = item;
    }
    list.appendChild(li);
  }

  notice.textContent = "";
  notice.className = `compare-warning ${report.fullyComparable ? "compare-warning--ok" : ""}`;
  notice.appendChild(list);

  layerList.textContent = "";
  const nonComparableRows =
    typeof report.nonComparableLayerRows[0]?.sample === "string"
      ? report.nonComparableLayerRows
      : report.nonComparableLayerRows.map((row) => row.sample);

  if (!nonComparableRows.length) {
    layerList.hidden = true;
    return;
  }

  const label = document.createElement("p");
  label.textContent =
    "Non-comparable rows are intentionally hidden from direct comparison because their layer, value model, ranking, and release-contract fields do not align.";
  const nonComparable = document.createElement("ul");
  for (const item of nonComparableRows.slice(0, 12)) {
    const row = document.createElement("li");
    row.textContent = item;
    nonComparable.appendChild(row);
  }

  const mismatchSummary = report.nonComparableMismatchSummary || mismatchSummaryFromRows(nonComparableRows, 4);

  if (mismatchSummary.length) {
    const summary = document.createElement("p");
    summary.textContent = `Top mismatch examples: ${mismatchSummary.join("; ")}.`;
    layerList.appendChild(summary);
  }

  layerList.appendChild(label);
  layerList.appendChild(nonComparable);
  layerList.hidden = false;
}

function mismatchSummaryFromRows(rows, limit = 2) {
  return rows
    .slice(0, limit)
    .map((row) => {
      if (typeof row !== "string") {
        return null;
      }

      const normalized = row.trim();
      if (!normalized) {
        return null;
      }

      const separatorIndex = normalized.indexOf(":");
      return separatorIndex >= 0 ? normalized.slice(0, separatorIndex).trim() : normalized;
    })
    .filter(Boolean);
}

function renderComparisonTable(profiles, report) {
  const tableBody = document.getElementById("compare-table-body");
  if (!tableBody) {
    return;
  }

  tableBody.textContent = "";

  if (profiles.length === 1) {
    const place = profiles[0];
    if (!place.measurements.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 11;
      cell.className = "compare-placeholder";
      if (place.coverage_status && place.coverage_status !== COVERAGE_STATUS.canonicalProfile) {
        cell.className = "compare-placeholder compare-warning-row";
        cell.setAttribute("role", "status");
        cell.setAttribute("aria-label", "No rows are currently non-comparable for " + (place.label || "requested place") + " due to coverage limits.");
      }

      cell.textContent = noDataProfileMessage(place);
      row.appendChild(cell);
      tableBody.appendChild(row);
      return;
    }

    for (const measurement of place.measurements) {
      const row = document.createElement("tr");
      setTableCell(row, place.label, true);
      setTableCell(
        row,
        measurement.layer_name || measurement.layer_id || "Unknown layer",
        false,
        "",
        COMPARE_TABLE_COLUMN_LABELS[1]
      );
      const evidenceValue = measurement.evidence_kind || "unknown";
      setTableCell(
        row,
        evidenceValue,
        false,
        evidenceKindGlossaryKey(evidenceValue),
        COMPARE_TABLE_COLUMN_LABELS[2]
      );
      setTableCell(
        row,
        measurement.value_type || "unreported",
        false,
        valueModelGlossaryKey(measurement.value_type),
        COMPARE_TABLE_COLUMN_LABELS[3]
      );
      setTableCell(row, measurement.unit_label || "unreported", false, "", COMPARE_TABLE_COLUMN_LABELS[4]);
      const rankingValue = measurement.ranking_mode || "unreported";
      setTableCell(
        row,
        rankingValue,
        false,
        rankingModeGlossaryKey(rankingValue),
        COMPARE_TABLE_COLUMN_LABELS[5]
      );
      setTableCell(
        row,
        measurement.reference_period || "unreported",
        false,
        "reference period",
        COMPARE_TABLE_COLUMN_LABELS[6]
      );
      setTableCell(row, measurement.display_value || "Unavailable", false, "", COMPARE_TABLE_COLUMN_LABELS[7]);
      setTableCell(row, formatUncertainty(measurement), false, "uncertainty", COMPARE_TABLE_COLUMN_LABELS[8]);
      setTableCell(
        row,
        methodVersionValue(measurement) || "unreported",
        false,
        "method version",
        COMPARE_TABLE_COLUMN_LABELS[9]
      );
      setTableCell(
        row,
        measurement.source_vintage || "Unavailable",
        false,
        "source vintage",
        COMPARE_TABLE_COLUMN_LABELS[10]
      );
      tableBody.appendChild(row);
    }

    return;
  }

  if (report.sharedSignatures.size === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 11;
    cell.className = "compare-placeholder compare-warning-row";
    cell.setAttribute("role", "status");
    cell.setAttribute("aria-label", "No directly comparable rows were found because selected places do not share compatible row contracts.");

    const nonComparableRows =
      typeof report.nonComparableLayerRows[0]?.sample === "string"
        ? report.nonComparableLayerRows
        : report.nonComparableLayerRows.map((row) => row.sample);

    const mismatchSummary = report.nonComparableMismatchSummary || mismatchSummaryFromRows(nonComparableRows);
    const topMismatch = mismatchSummary.join("; ");

    const noComparableLink = glossaryNode("not directly comparable", "not directly comparable");
    if (noComparableLink) {
      cell.appendChild(document.createTextNode("No rows are currently "));
      cell.appendChild(noComparableLink);
      cell.appendChild(
        document.createTextNode(
          " because selected places do not share a compatible row contract. Compare views require compatible layer, value model, unit, ranking mode, reference period, source vintage, and method version fields."
        )
      );
    } else {
      cell.textContent =
        "No rows are currently directly comparable because selected places do not share a compatible row contract. Compare views require compatible layer, value model, unit, ranking mode, reference period, source vintage, and method version fields.";
    }

    if (topMismatch) {
      const mismatchText = document.createElement("span");
      mismatchText.textContent = ` Common mismatches observed: ${topMismatch}.`;
      cell.appendChild(mismatchText);
    }

    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  const signatures = Array.from(report.sharedSignatures).sort();
    for (const signature of signatures) {
    const labelRows = report.canonicalProfiles
      .map((profile) => profile.measurementBySignature.get(signature))
      .filter(Boolean);
    const label = labelRows[0]?.layer_name || labelRows[0]?.layer_id || "Unknown layer";
    const evidenceValue = labelRows[0]?.evidence_kind || "unknown";
    const valueType = labelRows[0]?.value_type || "unreported";
    const rankingValue = labelRows[0]?.ranking_mode || "unreported";
    const referencePeriod = labelRows[0]?.reference_period || "unreported";
    const methodVersion = methodVersionValue(labelRows[0]) || "unreported";
    const sourceVintage = labelRows[0]?.source_vintage || "Unavailable";

    for (const profile of report.canonicalProfiles) {
      const measurement = profile.measurementBySignature.get(signature);
      if (!measurement) {
        continue;
      }
      const row = document.createElement("tr");
      setTableCell(row, profile.label, true);
      setTableCell(row, label, false, "", COMPARE_TABLE_COLUMN_LABELS[1]);
      setTableCell(
        row,
        measurement.evidence_kind || evidenceValue,
        false,
        evidenceKindGlossaryKey(measurement.evidence_kind || evidenceValue),
        COMPARE_TABLE_COLUMN_LABELS[2]
      );
      setTableCell(
        row,
        measurement.value_type || valueType,
        false,
        valueModelGlossaryKey(measurement.value_type || valueType),
        COMPARE_TABLE_COLUMN_LABELS[3]
      );
      setTableCell(
        row,
        measurement.unit_label || "unreported",
        false,
        "",
        COMPARE_TABLE_COLUMN_LABELS[4]
      );
      setTableCell(
        row,
        measurement.ranking_mode || rankingValue,
        false,
        rankingModeGlossaryKey(measurement.ranking_mode || rankingValue),
        COMPARE_TABLE_COLUMN_LABELS[5]
      );
      setTableCell(
        row,
        measurement.reference_period || referencePeriod,
        false,
        "reference period",
        COMPARE_TABLE_COLUMN_LABELS[6]
      );
      setTableCell(
        row,
        measurement.display_value || "Unavailable",
        false,
        "",
        COMPARE_TABLE_COLUMN_LABELS[7]
      );
      setTableCell(row, formatUncertainty(measurement), false, "uncertainty", COMPARE_TABLE_COLUMN_LABELS[8]);
      setTableCell(
        row,
        methodVersionValue(measurement) || methodVersion,
        false,
        "method version",
        COMPARE_TABLE_COLUMN_LABELS[9]
      );
      setTableCell(
        row,
        measurement.source_vintage || sourceVintage,
        false,
        "source vintage",
        COMPARE_TABLE_COLUMN_LABELS[10]
      );
      tableBody.appendChild(row);
    }
  }
}

async function initCompareSurface() {
  recordTelemetry("route_view");
  initPerformanceTelemetry();
  registerServiceWorker();
  setupTelemetryClickTracking();

  const rawTokens = requestedPlaceTokens();
  const requested = rawTokens.map(placeInfo).filter(Boolean);
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.has("places") || params.has("place");
  await loadCompareReleaseModeContract();
  compareReleaseSummary = await loadReleaseCoverageSummary();
  syncCompareModeToUrl(compareMode);
  syncCompareModeUi();
  initCompareModeControls();
  renderCompareCoverageReadiness(compareReleaseSummary);

  const places = await Promise.all(requested.map(loadPlaceProfile));
  const profiles = places.filter(Boolean);

  const report = buildComparabilityReport(profiles);

  renderRequestedPlaceChips(profiles, fromUrl);
  renderComparePlaceCards(profiles, report);
  renderComparabilityNotice(profiles, report);
  renderComparisonTable(profiles, report);

  const compareEventName = compareReleaseModeTelemetryEventName();
  const comparePayload = {
    route: currentRoutePath(),
    requested_places_count: profiles.length,
    requested_from_url: fromUrl,
    comparable_rows: report.rowCount,
    has_compatibility_issues: report.issues.length > 0,
    canonical_place_count: report.canonicalProfiles.length,
    release_mode: compareMode,
  };

  recordTelemetry("compare_opened", {
    route: currentRoutePath(),
    requested_places_count: profiles.length,
    requested_from_url: fromUrl,
    comparable_rows: report.rowCount,
    has_compatibility_issues: report.issues.length > 0,
    canonical_place_count: report.canonicalProfiles.length,
    release_mode: compareMode,
  });

  if (compareEventName && compareEventName !== "compare_opened" && compareEventName !== "release_mode_selected") {
    recordTelemetry(compareEventName, comparePayload);
  }
}

initCompareSurface();
