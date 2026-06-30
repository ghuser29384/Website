const COVERAGE_DATA_URL = "/v1/coverage.json";
const PLACES_INDEX_URL = "/v1/places/index.json";
const SERVICE_WORKER_SCRIPT = "/service-worker.js";

const GLOSSARY_TERM_LINKS = {
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
  directLabel: {
    label: "Direct rows",
    href: "#term-direct-evidence",
  },
  proxyLabel: {
    label: "proxy rows",
    href: "#term-proxy-aggregate",
  },
  priorityLabel: {
    label: "priority-overlay rows",
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
  coverage: {
    label: "coverage-first",
    href: "#term-coverage-status",
  },
  noData: {
    label: "no release coverage",
    href: "#term-no-data",
  },
};

const PLACE_LIST_DEFAULT_FILTER = "all";
const PLACE_LIST_DEFAULT_SORT = "priority";
const PLACE_LIST_PAGE_SIZE = 80;

const PLACE_LIST_SORT_LABELS = {
  priority: "coverage-first priority",
  rows: "release row count",
  name: "place name",
  parent: "parent and level",
};

const PLACE_LIST_FILTER_LABELS = {
  all: "all statuses",
  canonical_measurements: "canonical profiles",
  boundary_index_only: "boundary-only",
  adm1_context_overlay: "ADM1 context overlay",
  no_data: "no release coverage",
};

const COVERAGE_STATUS_LABELS = {
  canonical_measurements: "canonical profile",
  boundary_index_only: "boundary-only coverage",
  adm1_context_overlay: "ADM1 context overlay",
  no_data: "no release coverage",
};

const COVERAGE_STATUS_HINTS = {
  canonical_measurements: {
    summary: "Canonical profile rows are present in this release.",
    next: "Can enter direct release comparison for compatible layers.",
  },
  boundary_index_only: {
    summary: "No canonical country rows are published yet.",
    next: "Map boundary exists; country-level rows remain blocked until a promotion pass.",
  },
  adm1_context_overlay: {
    summary: "Subnational context rows exist, but no canonical country profile is present.",
    next: "Use ADM1 pages for contextual distribution and evidence hints only.",
  },
  no_data: {
    summary: "No release rows were indexed for this place.",
    next: "No structured comparison rows are available until data sources are added.",
  },
};

function normalizePlacesListFilter(rawValue) {
  return rawValue && Object.prototype.hasOwnProperty.call(PLACE_LIST_FILTER_LABELS, rawValue) ? rawValue : PLACE_LIST_DEFAULT_FILTER;
}

function normalizePlacesListSort(rawValue) {
  return rawValue && Object.keys(PLACE_LIST_SORT_LABELS).includes(rawValue)
    ? rawValue
    : PLACE_LIST_DEFAULT_SORT;
}

function escapeText(value) {
  return String(value == null ? "" : value);
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US").format(number);
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

function appendText(node, textOrNode) {
  if (typeof textOrNode === "string") {
    node.append(textOrNode);
    return;
  }

  if (textOrNode?.nodeType === 1) {
    node.appendChild(textOrNode);
  }
}

function glossaryAnchor(labelKey, fallback) {
  const entry = GLOSSARY_TERM_LINKS[labelKey] || null;

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

function getPlacesListControls() {
  return {
    statusFilterEl: document.getElementById("places-list-status-filter"),
    sortEl: document.getElementById("places-list-sort"),
  };
}

function readPlacesListControls() {
  const { statusFilterEl, sortEl } = getPlacesListControls();

  return {
    statusFilter: normalizePlacesListFilter(statusFilterEl?.value || PLACE_LIST_DEFAULT_FILTER),
    sortMode: normalizePlacesListSort(sortEl?.value || PLACE_LIST_DEFAULT_SORT),
  };
}

function setPlacesListControlsState(statusFilter, sortMode) {
  const { statusFilterEl, sortEl } = getPlacesListControls();

  if (statusFilterEl) {
    statusFilterEl.value = normalizePlacesListFilter(statusFilter);
  }

  if (sortEl) {
    sortEl.value = normalizePlacesListSort(sortMode);
  }
}

function formatGeometryLevel(level) {
  if (level === "world") {
    return "World";
  }

  if (level === "adm1") {
    return "ADM1";
  }

  return "Country";
}

function computePlaceReleaseRows(entry) {
  const canonicalRows = Number(entry?.canonical_measurement_count || 0);
  const adm1Rows = Number(entry?.adm1_context_count || 0);

  if (adm1Rows > 0 && canonicalRows > 0) {
    return canonicalRows + adm1Rows;
  }

  if (canonicalRows > 0) {
    return canonicalRows;
  }

  if (adm1Rows > 0) {
    return adm1Rows;
  }

  return 0;
}

function coverageRowCounts(items = []) {
  const counts = {
    canonical_measurements: 0,
    boundary_index_only: 0,
    adm1_context_overlay: 0,
    no_data: 0,
  };

  for (const item of items) {
    const status = normalizeCoverageStatusFromPayload(item?.coverage_status);
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
}

function setPlacesListSummary({ visibleCount = 0, totalCount = 0, filter, sortMode, counts = {} }) {
  const node = document.getElementById("places-list-summary");
  if (!node) {
    return;
  }

  const normalizedFilter = normalizePlacesListFilter(filter);
  const normalizedSort = normalizePlacesListSort(sortMode);
  const canonicalCount = Number(counts.canonical_measurements || 0);
  const boundaryCount = Number(counts.boundary_index_only || 0);
  const adm1Count = Number(counts.adm1_context_overlay || 0);
  const noDataCount = Number(counts.no_data || 0);

  node.textContent = `${formatNumber(visibleCount)} of ${formatNumber(totalCount)} places visible (${PLACE_LIST_FILTER_LABELS[normalizedFilter] || "all statuses"}, sorted by ${
    PLACE_LIST_SORT_LABELS[normalizedSort] || PLACE_LIST_SORT_LABELS.priority
  }). Canonical: ${formatNumber(canonicalCount)}, boundary-only: ${formatNumber(boundaryCount)}, ADM1: ${formatNumber(adm1Count)}, no-data: ${formatNumber(noDataCount)}.`;
}

function setText(id, value, fallback = "") {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }
  node.textContent = String(value == null ? fallback : value);
}

function normalizeCoverageStatusFromPayload(status) {
  const raw = typeof status === "string" ? status.trim() : "";
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const canonicalized = {
    canonical_country_profile: "canonical_measurements",
    canonical_profile: "canonical_measurements",
    canonical_measurement: "canonical_measurements",
    canonical_measurements: "canonical_measurements",
    boundary_only: "boundary_index_only",
    boundary_index_only: "boundary_index_only",
    adm1_context_overlay: "adm1_context_overlay",
    adm1_context: "adm1_context_overlay",
    no_data: "no_data",
    no_data_places: "no_data",
    no_data_rows: "no_data",
    no_release_coverage: "no_data",
    no_coverage: "no_data",
  };

  if (Object.prototype.hasOwnProperty.call(canonicalized, normalized)) {
    return canonicalized[normalized];
  }

  return COVERAGE_STATUS_LABELS[raw] ? raw : "no_data";
}

function placesIndexUrl(path) {
  if (!path) {
    return "";
  }

  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return "";
  }
}

function buildCoverageListRow(entry) {
  const status = normalizeCoverageStatusFromPayload(entry?.coverage_status);
  const statusLabel = COVERAGE_STATUS_LABELS[status] || "no release coverage";
  const statusHint = COVERAGE_STATUS_HINTS[status] || COVERAGE_STATUS_HINTS.no_data;
  const hasCanonical = Number(entry?.canonical_measurement_count || 0);
  const releaseRows = computePlaceReleaseRows(entry);
  const levelLabel = formatGeometryLevel(entry?.geometry_level);
  const links = [
    entry?.page_url ? [
      `place ${formatPlaceCode(entry.place_id)}`,
      entry.page_url,
    ] : null,
    entry?.measurements_url ? [
      "measurements",
      entry.measurements_url,
    ] : null,
    entry?.neighbors_url ? [
      "neighbors",
      entry.neighbors_url,
    ] : null,
  ].filter(Boolean);

  const row = document.createElement("tr");
  const placeCell = document.createElement("th");
  placeCell.scope = "row";
  placeCell.textContent = `${entry?.place_name || "Unknown place"} (${entry?.place_id || "—"})`;
  placeCell.append(document.createTextNode(" • "));
  const meta = document.createElement("span");
  meta.className = "glossary-term";
  meta.textContent = `${levelLabel}${entry?.parent_place_id ? ` · parent ${entry.parent_place_id}` : ""}`;
  placeCell.append(meta);

  const statusCell = document.createElement("td");
  const statusLink = placesCoverageStatusLink(statusLabel);
  statusLink.textContent = statusLabel;
  statusCell.appendChild(statusLink);

  const releaseCell = document.createElement("td");
  releaseCell.textContent = `${formatNumber(releaseRows)} ${releaseRows === 1 ? "row" : "rows"}`;

  const notesCell = document.createElement("td");
  const noteSuffix = typeof entry?.coverage_reason === "string" && entry.coverage_reason.trim()
    ? ` Promotion note: ${entry.coverage_reason.trim()}`
    : statusHint.summary;
  notesCell.textContent = noteSuffix;

  const linksCell = document.createElement("td");
  if (!links.length) {
    linksCell.textContent = "No place routes in release JSON";
  } else {
    for (let i = 0; i < links.length; i += 1) {
      const [label, href] = links[i];
      const link = document.createElement("a");
      link.className = "ghost-link";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = label;
      linksCell.appendChild(link);
      if (i < links.length - 1) {
        linksCell.appendChild(document.createTextNode(" · "));
      }
    }
  }

  row.appendChild(placeCell);
  row.appendChild(statusCell);
  row.appendChild(releaseCell);
  row.appendChild(notesCell);
  row.appendChild(linksCell);

  return { row, statusScore: hasCanonical + (releaseRows > 0 ? 1 : 0), note: statusHint.next, status, canonicalRows: hasCanonical, rows: releaseRows };
}

function placesCoverageStatusLink(label) {
  const map = {
    "canonical profile": "#term-canonical-country-profile",
    "boundary-only coverage": "#term-boundary-only",
    "ADM1 context overlay": "#term-adm1-context",
    "no release coverage": "#term-no-data",
  };

  const href = map[label];
  const node = document.createElement("a");
  node.className = "glossary-term";
  node.rel = "noopener";
  node.textContent = label;
  if (href) {
    node.href = href;
  } else {
    node.href = "#term-coverage-status";
  }
  node.setAttribute("aria-label", `${label}: coverage explanation`);
  return node;
}

function formatPlaceCode(value) {
  return String(value || "unknown").toUpperCase();
}

function renderPlacesListing(payload = {}) {
  const body = document.getElementById("places-list-body");
  const openAll = document.getElementById("places-list-open-all");
  const filterState = readPlacesListControls();

  if (!body) {
    return;
  }

  const requestedFilter = normalizePlacesListFilter(filterState.statusFilter);
  const requestedSort = normalizePlacesListSort(filterState.sortMode);

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const filteredItems = items.filter((item) => {
    const status = normalizeCoverageStatusFromPayload(item?.coverage_status);
    return requestedFilter === PLACE_LIST_DEFAULT_FILTER || status === requestedFilter;
  });
  const rowCounts = coverageRowCounts(items);
  const rowData = [];

  for (const item of filteredItems) {
    const status = normalizeCoverageStatusFromPayload(item?.coverage_status);
    const canonicalRows = Number(item?.canonical_measurement_count || 0);
    const priority = {
      canonical_measurements: 3,
      boundary_index_only: 2,
      adm1_context_overlay: 1,
      no_data: 0,
    }[status] || 0;
    const rows = computePlaceReleaseRows(item);
    rowData.push({ item, status, priority, canonicalRows, rows });
  }

  rowData.sort((a, b) => {
    if (requestedSort === "rows") {
      if (b.rows !== a.rows) {
        return b.rows - a.rows;
      }

      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
    }

    if (requestedSort === "name") {
      const aName = String(a.item?.place_name || "").toLowerCase();
      const bName = String(b.item?.place_name || "").toLowerCase();
      const byName = aName.localeCompare(bName);
      if (byName !== 0) {
        return byName;
      }
    }

    if (requestedSort === "parent") {
      const aParent = String(a.item?.parent_place_id || "").toLowerCase();
      const bParent = String(b.item?.parent_place_id || "").toLowerCase();
      if (aParent !== bParent) {
        return aParent.localeCompare(bParent);
      }
    }

    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    if (b.canonicalRows !== a.canonicalRows) {
      return b.canonicalRows - a.canonicalRows;
    }

    const aName = String(a.item?.place_name || "").toLowerCase();
      const bName = String(b.item?.place_name || "").toLowerCase();
      return aName.localeCompare(bName);
  });

  const visibleRows = rowData.slice(0, PLACE_LIST_PAGE_SIZE);
  body.textContent = "";

  if (!visibleRows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No release place rows were found for this release snapshot.";
    row.appendChild(cell);
    body.appendChild(row);
    setPlacesListSummary({
      visibleCount: 0,
      totalCount: items.length,
      filter: requestedFilter,
      sortMode: requestedSort,
      counts: rowCounts,
    });
    return;
  }

  for (const { item, status: sortedStatus, canonicalRows, row } of visibleRows.map((entry) => {
    const built = buildCoverageListRow(entry.item);
    return {
      row: built.row,
      status: built.status,
      canonicalRows: entry.canonicalRows,
    };
  })) {
    row.dataset.coverageStatus = sortedStatus;
    row.dataset.canonicalRows = String(canonicalRows);
    body.appendChild(row);
  }

  if (openAll) {
    openAll.textContent = `Open full place index (${formatNumber(items.length)} rows)`;
    openAll.href = `/v1/places/index.json`;
    openAll.rel = "noopener";
  }

  setPlacesListSummary({
    visibleCount: Math.min(PLACE_LIST_PAGE_SIZE, rowData.length),
    totalCount: items.length,
    filter: requestedFilter,
    sortMode: requestedSort,
    counts: rowCounts,
  });
}

function setRichText(id, parts) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }

  node.textContent = "";
  for (const part of parts) {
    if (part == null) {
      continue;
    }

    if (typeof part === "string") {
      appendText(node, part);
      continue;
    }

    if (typeof part === "object" && part.type === "glossary") {
      appendText(node, glossaryAnchor(part.key, part.help));
      if (part.suffix) {
        appendText(node, part.suffix);
      }
      continue;
    }

    appendText(node, String(part));
  }
}

function setListItems(id, items) {
  const list = document.getElementById(id);
  if (!list) {
    return;
  }

  list.textContent = "";

  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) {
    const fallback = document.createElement("li");
    fallback.textContent = "No sparse-coverage notices are currently included in the release coverage payload.";
    list.appendChild(fallback);
    return;
  }

  for (const item of safeItems) {
    const li = document.createElement("li");
    li.textContent = escapeText(item.area ? `${item.area}: ${item.status}` : item.status || item);
    list.appendChild(li);
  }
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

function releaseRankingReadinessNoteUrl(summary = {}) {
  const explicit = summary?.default_ranking_readiness;
  const rawUrl = explicit?.release_note_url;

  if (typeof rawUrl === "string" && rawUrl.trim()) {
    return rawUrl.trim();
  }

  return "/updates/";
}

function releaseRankingReadinessRule(summary = {}) {
  const explicit = summary?.default_ranking_readiness;
  const rule = typeof explicit?.rule === "string" ? explicit.rule.trim() : "";
  return rule || "direct/proxy/priority/release-measurement rows and canonical coverage thresholds";
}

function releaseRankingReadinessReason(summary = {}) {
  const explicit = summary?.default_ranking_readiness;

  if (explicit && typeof explicit === "object" && explicit !== null) {
    if (
      (typeof explicit.ready === "boolean" && !explicit.ready) ||
      (typeof explicit.enabled === "boolean" && !explicit.enabled)
    ) {
      const reason =
        explicit.reason || "Release ranking readiness is disabled for this snapshot until coverage checks pass.";
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
    reasons.push(`fewer than 10 canonical profiles (${formatNumber(canonicalProfiles)} found)`);
  }

  if (countryBoundaries > 0 && canonicalProfiles / countryBoundaries < 0.35) {
    reasons.push(
      `only ${formatNumber(canonicalProfiles)} of ${formatNumber(countryBoundaries)} indexed countries are canonical`
    );
  }

  if (evidenceReady < 10) {
    reasons.push(
      `fewer than 10 direct/proxy/priority/release-metric release rows (${formatNumber(evidenceReady)} found)`
    );
  }

  if (!reasons.length) {
    return "Release ranking readiness requires additional release-specific checks to pass.";
  }

  return reasons.join(" · ");
}

function setCoverageSummaryNodes(data) {
  const coverage = data?.coverage_status || {};
  const evidence = coverage.evidence_layer_coverage || {};

  const placesIndexed = formatNumber(coverage.places_indexed || 0);
  const countryBoundaries = formatNumber(coverage.country_boundaries_indexed || 0);
  const adm1ContextRows = formatNumber(coverage.adm1_boundaries?.static_context_count || 0);
  const canonicalProfiles = formatNumber(coverage.canonical_country_profiles || 0);
  const releaseMeasurements = formatNumber(coverage.release_measurements || 0);
  const directEvidence = formatNumber(evidence.direct || 0);
  const proxyEvidence = formatNumber(evidence.proxy || 0);
  const priorityEvidence = formatNumber(evidence.priority_overlay || 0);
  const boundaryEvidence = formatNumber(evidence.boundary || 0);
  const adm1Evidence = formatNumber(evidence.adm1_context_overlay || 0);
  const noDataEvidence = formatNumber(evidence.no_data || 0);
  const noDataCount = Number(evidence.no_data || 0);
  const releaseLabel = coverage.release_id || data?.release_id || "2026-05-31.atlas.2";
  const directCount = Number(evidence.direct || 0);
  const proxyCount = Number(evidence.proxy || 0);
  const priorityCount = Number(evidence.priority_overlay || 0);
  const boundaryCount = Number(evidence.boundary || 0);
  const adm1Count = Number(evidence.adm1_context_overlay || 0);

  setText("coverage-places-indexed", placesIndexed);
  setText("coverage-country-profiles", canonicalProfiles);
  setText("coverage-evidence-rows", `${releaseMeasurements} measurements`);
  setText("coverage-adm1-context", `${formatNumber(coverage.adm1_boundaries?.static_page_count || 0)} static context pages`);
  setText("coverage-direct-place-evidence", `${directEvidence} rows`);
  setText("coverage-last-release", String(releaseLabel).split(".")[0] || "2026-05-31");

  setRichText(
    "coverage-places-indexed-details",
    [
      `World, ${countryBoundaries} `,
      { type: "glossary", key: "boundaryCoverage", help: "Countries with map boundaries but no canonical rows are boundary-only coverage." },
      ` entries, and ${adm1ContextRows} `,
      { type: "glossary", key: "adm1Overlay", help: "ADM1 rows are subnational context rows and may not be direct canonical country comparisons." },
      ` are listed in this release.`,
      noDataCount > 0 ? ". " : "",
      ...(noDataCount > 0
        ? [
            { type: "glossary", key: "noData", help: "No indexed rows are currently available for these places in this release." },
            ` ${noDataEvidence} places have no release coverage.`,
          ]
        : []),
    ]
  );
  setRichText(
    "coverage-country-profiles-details",
    [
      `There are ${canonicalProfiles} countries with `,
      { type: "glossary", key: "canonicalProfiles", help: "Canonical country profile rows are eligible for country-level comparison." },
      ` in this release. Other rows are `,
      { type: "glossary", key: "boundaryCoverage", help: "Boundary-only rows are map-visible but have no canonical measure rows." },
      ", ",
      { type: "glossary", key: "adm1Overlay", help: "ADM1 context rows describe subnational context only unless promoted." },
      ...(noDataCount > 0
        ? [", and ", { type: "glossary", key: "noData", help: "No indexed release rows are currently available for these places." }]
        : []),
      ".",
    ]
  );
  setRichText(
    "coverage-evidence-rows-details",
    [
      directCount > 0 ? `${directEvidence} ` : "Direct rows are not yet represented",
      directCount > 0 ? { type: "glossary", key: "directEvidence", help: "Observed direct release rows." } : "",
      ` in this snapshot. It also includes `,
      { type: "glossary", key: "proxy", help: "Indicator-derived proxy rows." },
      ` ${proxyEvidence} `,
      { type: "glossary", key: "priorityOverlay", help: "Priority ranking overlays are not direct comparison rows." },
      ` ${priorityEvidence} and `,
      `plus ${boundaryEvidence} `,
      { type: "glossary", key: "boundaryLabel", help: "Boundary-context rows are not canonical country measurements." },
      ` and ${adm1Evidence} `,
      { type: "glossary", key: "adm1Label", help: "ADM1 context overlay rows are not direct canonical country measures." },
      ...(noDataCount > 0
        ? [` and ${noDataEvidence} `, { type: "glossary", key: "noData", help: "No indexed release rows are currently available for these places." }]
        : []),
      ".",
    ]
  );
  setRichText(
    "coverage-adm1-context-details",
    [
      `ADM1 poverty-context rows are separate overlay coverage for ${adm1Evidence} rows and ${formatNumber(
        coverage.adm1_boundaries?.static_page_count || 0
      )} pre-built ADM1 pages.`,
    ]
  );
  setRichText(
    "coverage-direct-place-evidence-details",
    [
      `Release evidence mix: `,
      directEvidence,
      " ",
      { type: "glossary", key: "directLabel", help: "Observed direct place measurements." },
      `, ${proxyEvidence} `,
      { type: "glossary", key: "proxyLabel", help: "Indicator-derived proxy rows." },
      `, ${priorityEvidence} `,
      { type: "glossary", key: "priorityLabel", help: "Priority-overlay rows used for visibility and routing." },
      `, ${boundaryEvidence} `,
      { type: "glossary", key: "boundaryLabel", help: "Boundary context rows without canonical values." },
      `, ${adm1Evidence} `,
      { type: "glossary", key: "adm1Label", help: "ADM1 context overlay rows are not direct canonical country measures." },
      ...(noDataCount > 0
        ? [", and ", { type: "glossary", key: "noData", help: "No indexed release rows are currently available for these places." }, ` ${noDataEvidence}`]
        : []),
      ".",
    ]
  );

  const sparseAreasCount = Array.isArray(data?.known_sparse_areas) ? data.known_sparse_areas.length : 0;
  setText(
    "coverage-last-release-details",
    `Release ${releaseLabel} is identified by immutable artifacts and checksums. Sparse coverage entries: ${sparseAreasCount}.`
  );

  const ready = releaseRankingReadiness(data);
  const reason = releaseRankingReadinessReason(data);
  const rule = releaseRankingReadinessRule(data);
  const noteUrl = releaseRankingReadinessNoteUrl(data);

  setText("coverage-default-ranking", ready ? "Enabled" : "Not enabled");
  const releaseNoteLink = document.createElement("a");
  releaseNoteLink.className = "glossary-term";
  releaseNoteLink.href = noteUrl;
  releaseNoteLink.rel = "noopener";
  releaseNoteLink.textContent = "release note";
  releaseNoteLink.title = "Coverage gate criteria and rationale";
  releaseNoteLink.setAttribute("aria-label", "Coverage gate criteria and rationale");

  if (ready) {
    setRichText("coverage-default-ranking-details", [
      "Default global ranking is enabled by this release configuration.",
      " Gate rule: ",
      rule,
      ". See ",
      releaseNoteLink,
      ".",
    ]);
  } else {
    const reasonText = reason.endsWith(".") ? reason.slice(0, -1) : reason;
    setRichText("coverage-default-ranking-details", [
      `Coverage-first mode is active: ${reasonText}. `,
      `Gate rule: ${rule}. `,
      "See ",
      releaseNoteLink,
      ".",
    ]);
  }

  setListItems("coverage-sparse-areas", data?.known_sparse_areas);

  if (ready) {
    document.body.classList.remove("coverage-first-mode");
  } else {
    document.body.classList.add("coverage-first-mode");
  }
}

async function hydratePlacesCoverage() {
  registerServiceWorker();
  setPlacesListControlsState(PLACE_LIST_DEFAULT_FILTER, PLACE_LIST_DEFAULT_SORT);

  try {
    const response = await fetch(COVERAGE_DATA_URL, {
      credentials: "same-origin",
      cache: "force-cache",
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setCoverageSummaryNodes(data);

    try {
      const placesResponse = await fetch(PLACES_INDEX_URL, {
        credentials: "same-origin",
        cache: "force-cache",
      });

      if (placesResponse.ok) {
        const placesPayload = await placesResponse.json();
        const render = () => {
          renderPlacesListing(placesPayload);
        };

        const { statusFilterEl, sortEl } = getPlacesListControls();

        statusFilterEl?.addEventListener("change", render);
        sortEl?.addEventListener("change", render);

        render();
      }
    } catch {
      // listing fallback keeps summary UI as the primary surface
    }
  } catch {
    // keep static fallback values if coverage.json is temporarily unavailable
  }
}

document.addEventListener("DOMContentLoaded", hydratePlacesCoverage);
