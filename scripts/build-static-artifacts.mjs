import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const site = "https://painmap.org";
const releasePath = "/releases/2026-05-31/";
const releaseManifestPath = "releases/2026-05-31/manifest.json";
const socialImage = `${site}/assets/social-card.svg`;
const csp =
  "default-src 'self'; script-src 'self'; connect-src 'self' https://www.geoboundaries.org https://media.githubusercontent.com https://api.worldbank.org https://api.worldpop.org https://ourworldindata.org; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

const routes = readJson("data/routes.json");
const provenance = readJson("data/provenance-registry.json");
const measurements = readJson("data/place-measurements.json");
const countryBoundaries = readJson("data/natural-earth-countries.geojson");
const releaseId = routes.releaseId;
const releaseDate = routes.generatedAt;
const earthRadiusKm = 6371.0088;

function absolute(file) {
  return path.join(root, file);
}

function read(file) {
  return readFileSync(absolute(file), "utf8");
}

function readJson(file) {
  return JSON.parse(readFileSync(absolute(file), "utf8"));
}

function ensureParent(file) {
  mkdirSync(path.dirname(absolute(file)), { recursive: true });
}

function writeText(file, text) {
  ensureParent(file);
  const current = existsSync(absolute(file)) ? read(file) : null;

  if (current !== text) {
    writeFileSync(absolute(file), text);
  }
}

function writeJson(file, value) {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonCompact(file, value) {
  writeText(file, `${JSON.stringify(value)}\n`);
}

function hashFile(file, algorithm = "sha256", encoding = "hex") {
  return createHash(algorithm).update(readFileSync(absolute(file))).digest(encoding);
}

function sizeBytes(file) {
  return readFileSync(absolute(file)).byteLength;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function jsonEscapeForScript(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

function rootPrefix(file) {
  const dir = path.dirname(file);

  if (dir === ".") {
    return "";
  }

  return `${"../".repeat(dir.split(path.sep).length)}`;
}

function tagInsertionPoint(html) {
  const stylesheetIndex = html.indexOf("<link rel=\"stylesheet\"");
  return stylesheetIndex === -1 ? html.indexOf("</head>") : stylesheetIndex;
}

function upsertHeadTag(html, pattern, tag) {
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }

  const index = tagInsertionPoint(html);

  if (index === -1) {
    return html;
  }

  return `${html.slice(0, index)}    ${tag}\n${html.slice(index)}`;
}

function routeUrl(route) {
  return `${site}${route.path}`;
}

function routeCanonicalUrl(route) {
  return `${site}${route.canonicalPath || route.path}`;
}

function ogType(route) {
  return route.path === "/" ? "website" : "article";
}

function schemaType(route) {
  return route.jsonLdType || "WebPage";
}

function simpleJsonLd(route) {
  const page = {
    "@type": schemaType(route),
    "@id": `${routeCanonicalUrl(route)}#page`,
    name: route.title,
    url: routeCanonicalUrl(route),
    description: route.description,
  };
  const value = {
    "@context": "https://schema.org",
    "@graph": [
      page,
      {
        "@type": "BreadcrumbList",
        "@id": `${routeCanonicalUrl(route)}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "PainMap",
            item: site,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: route.title.replace(/ \| PainMap$/, ""),
            item: routeCanonicalUrl(route),
          },
        ],
      },
    ],
  };

  return `    <script type="application/ld+json">\n      ${jsonEscapeForScript(value)}\n    </script>`;
}

function managedHeadBlock(route) {
  const canonical = routeCanonicalUrl(route);
  const escapedTitle = htmlEscape(route.title);
  const escapedDescription = htmlEscape(route.description);

  return [
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <meta http-equiv="Content-Security-Policy" content="${htmlEscape(csp)}">`,
    '    <meta name="referrer" content="strict-origin-when-cross-origin">',
    `    <title>${escapedTitle}</title>`,
    `    <meta name="description" content="${escapedDescription}">`,
    `    <link rel="canonical" href="${canonical}">`,
    `    <meta property="og:title" content="${escapedTitle}">`,
    `    <meta property="og:description" content="${escapedDescription}">`,
    `    <meta property="og:image" content="${socialImage}">`,
    `    <meta property="og:type" content="${ogType(route)}">`,
    `    <meta property="og:url" content="${canonical}">`,
    '    <meta name="twitter:card" content="summary_large_image">',
    `    <meta name="twitter:title" content="${escapedTitle}">`,
    `    <meta name="twitter:description" content="${escapedDescription}">`,
    `    <meta name="twitter:image" content="${socialImage}">`,
    "",
  ].join("\n");
}

function syncRouteHtml() {
  const styleSri = `sha384-${hashFile("styles.css", "sha384", "base64")}`;
  const scriptSri = `sha384-${hashFile("script.js", "sha384", "base64")}`;
  const d3Sri = `sha384-${hashFile("vendor/d3.v7.min.js", "sha384", "base64")}`;
  const topojsonSri = `sha384-${hashFile("vendor/topojson-client.v3.min.js", "sha384", "base64")}`;

  for (const route of routes.routes) {
    const file = route.file;

    if (!existsSync(absolute(file))) {
      continue;
    }

    let html = read(file);
    const headStart = html.indexOf("<head>");
    const stylesheetIndex = html.indexOf("<link rel=\"stylesheet\"");

    if (headStart !== -1 && stylesheetIndex !== -1) {
      const managedStart = html.indexOf("\n", headStart) + 1;
      html = `${html.slice(0, managedStart)}${managedHeadBlock(route)}${html.slice(stylesheetIndex)}`;
    }

    html = html.replace(
      /<link rel="stylesheet" href="([^"]+)" integrity="sha384-[^"]+" crossorigin="anonymous">/g,
      `<link rel="stylesheet" href="$1" integrity="${styleSri}" crossorigin="anonymous">`
    );

    if (!/type="application\/ld\+json"/.test(html)) {
      html = html.replace("</head>", `${simpleJsonLd(route)}\n  </head>`);
    }

    if (file === "index.html") {
      html = html.replace(
        /\s*<script src="vendor\/d3\.v7\.min\.js"[\s\S]*?<\/script>\n/g,
        "\n"
      );
      html = html.replace(
        /\s*<script src="vendor\/topojson-client\.v3\.min\.js"[\s\S]*?<\/script>\n/g,
        "\n"
      );
      const vendorTags =
        `    <script src="vendor/d3.v7.min.js" integrity="${d3Sri}" crossorigin="anonymous"></script>\n` +
        `    <script src="vendor/topojson-client.v3.min.js" integrity="${topojsonSri}" crossorigin="anonymous"></script>\n`;

      if (/<script type="module" src="script\.js"[\s\S]*?><\/script>/.test(html)) {
        html = html.replace(
          /<script type="module" src="script\.js" integrity="sha384-[^"]+" crossorigin="anonymous"><\/script>/,
          `${vendorTags}    <script type="module" src="script.js" integrity="${scriptSri}" crossorigin="anonymous"></script>`
        );
      } else {
        html = html.replace("</body>", `${vendorTags}    <script type="module" src="script.js" integrity="${scriptSri}" crossorigin="anonymous"></script>\n  </body>`);
      }
    }

    writeText(file, html);
  }
}

function measurementCsv() {
  const fields = [
    "measurement_id",
    "release_id",
    "place_id",
    "place_name",
    "parent_place_id",
    "iso3",
    "geometry_level",
    "layer_id",
    "layer_name",
    "evidence_kind",
    "value_type",
    "raw_value",
    "normalized_value",
    "display_value",
    "unit_label",
    "ranking_mode",
    "rank_value",
    "confidence_low",
    "confidence_high",
    "uncertainty_class",
    "source_ids",
    "provenance_id",
    "source_vintage",
    "method_note",
    "license_id",
    "data_license_uri",
    "attribution",
    "download_url",
  ];

  const rows = [fields.join(",")];

  for (const measurement of measurements.measurements) {
    rows.push(
      fields
        .map((field) => {
          const raw = Array.isArray(measurement[field])
            ? measurement[field].join("|")
            : measurement[field] ?? "";
          const value = String(raw);

          if (/[",\n]/.test(value)) {
            return `"${value.replaceAll('"', '""')}"`;
          }

          return value;
        })
        .join(",")
    );
  }

  return `${rows.join("\n")}\n`;
}

function validIso(value) {
  return Boolean(value && value !== "-99" && value !== -99);
}

function countryIsoFromProperties(properties = {}) {
  return [properties.ISO_A3_EH, properties.ISO_A3, properties.ADM0_A3, properties.ADM0_ISO].find(validIso) || null;
}

function countryNameFromProperties(properties = {}) {
  return properties.NAME_EN || properties.NAME_LONG || properties.ADMIN || properties.NAME || "Unknown place";
}

function mergeCountryGeometry(features) {
  const polygons = [];

  for (const feature of features) {
    if (feature.geometry?.type === "Polygon") {
      polygons.push(feature.geometry.coordinates);
      continue;
    }

    if (feature.geometry?.type === "MultiPolygon") {
      polygons.push(...feature.geometry.coordinates);
    }
  }

  return {
    type: "MultiPolygon",
    coordinates: polygons,
  };
}

function representativeCountryFeature(features) {
  return [...features].sort((left, right) => {
    const leftPopulation = Number(left.properties?.POP_EST) || 0;
    const rightPopulation = Number(right.properties?.POP_EST) || 0;

    return rightPopulation - leftPopulation;
  })[0];
}

function countryBoundaryFeatures() {
  const grouped = new Map();

  for (const entry of countryBoundaries.features
    .filter((feature) => feature.geometry && feature.properties?.CONTINENT !== "Antarctica")
    .map((feature) => ({ feature, iso: countryIsoFromProperties(feature.properties) }))
    .filter((entry) => entry.iso)) {
    const features = grouped.get(entry.iso) || [];
    features.push(entry.feature);
    grouped.set(entry.iso, features);
  }

  return [...grouped.entries()]
    .map(([iso, features]) => {
      const representative = representativeCountryFeature(features);

      return {
        iso,
        feature: {
          type: "Feature",
          properties: {
            ...representative.properties,
            PAINMAP_MERGED_FEATURE_COUNT: features.length,
          },
          geometry: mergeCountryGeometry(features),
        },
      };
    })
    .sort((left, right) =>
      countryNameFromProperties(left.feature.properties).localeCompare(countryNameFromProperties(right.feature.properties))
    );
}

function measurementRowsForPlace(placeId) {
  return measurements.measurements.filter((row) => row.place_id === placeId);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function roundNumber(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function haversineKm(left, right) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const leftLat = toRadians(left[1]);
  const rightLat = toRadians(right[1]);
  const deltaLat = toRadians(right[1] - left[1]);
  const deltaLon = toRadians(right[0] - left[0]);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coordinateTuples(geometry) {
  const tuples = [];

  function visit(node) {
    if (!Array.isArray(node)) {
      return;
    }

    if (typeof node[0] === "number" && typeof node[1] === "number") {
      tuples.push([node[0], node[1]]);
      return;
    }

    for (const child of node) {
      visit(child);
    }
  }

  visit(geometry?.coordinates);
  return tuples;
}

function featureBbox(feature) {
  const tuples = coordinateTuples(feature.geometry);
  const bbox = tuples.reduce(
    (memo, tuple) => [
      Math.min(memo[0], tuple[0]),
      Math.min(memo[1], tuple[1]),
      Math.max(memo[2], tuple[0]),
      Math.max(memo[3], tuple[1]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity]
  );

  return bbox.some((value) => !Number.isFinite(value)) ? null : bbox.map((value) => roundNumber(value));
}

function featureCentroid(feature) {
  const labelX = Number(feature.properties?.LABEL_X);
  const labelY = Number(feature.properties?.LABEL_Y);

  if (Number.isFinite(labelX) && Number.isFinite(labelY)) {
    return [labelX, labelY];
  }

  const tuples = coordinateTuples(feature.geometry);

  if (!tuples.length) {
    return null;
  }

  const [lon, lat] = tuples.reduce((memo, tuple) => [memo[0] + tuple[0], memo[1] + tuple[1]], [0, 0]);

  return [lon / tuples.length, lat / tuples.length];
}

function featureCoordinateKeys(feature) {
  return new Set(
    coordinateTuples(feature.geometry).map((tuple) => `${tuple[0].toFixed(5)},${tuple[1].toFixed(5)}`)
  );
}

function collectionBbox(features) {
  const bboxes = features.map(featureBbox).filter(Boolean);

  if (!bboxes.length) {
    return null;
  }

  const bbox = bboxes.reduce(
    (memo, bboxValue) => [
      Math.min(memo[0], bboxValue[0]),
      Math.min(memo[1], bboxValue[1]),
      Math.max(memo[2], bboxValue[2]),
      Math.max(memo[3], bboxValue[3]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity]
  );

  return bbox.map((value) => roundNumber(value));
}

function ogcLink(href, rel, type, title) {
  return { href, rel, type, title };
}

function placePageUrl(placeId) {
  const expectedPath = `/place/${placeId}/`;
  return routes.routes.some((route) => route.path === expectedPath) ? `${site}${expectedPath}` : null;
}

function placeSummary(placeId) {
  const rows = measurements.measurements.filter((row) => row.place_id === placeId);
  const first = rows[0];
  const evidenceKinds = uniqueSorted(rows.map((row) => row.evidence_kind));
  const sourceIds = uniqueSorted(rows.flatMap((row) => row.source_ids));

  return {
    release_id: releaseId,
    place_id: first.place_id,
    place_name: first.place_name,
    parent_place_id: first.parent_place_id,
    iso3: first.iso3,
    geometry_level: first.geometry_level,
    profile_url: placePageUrl(first.place_id),
    data_url: `${site}/v1/places/${first.place_id}.json`,
    compare_url: `${site}/compare/`,
    measurements_url: `${site}/v1/places/${first.place_id}/measurements.json`,
    neighbors_url: `${site}/v1/places/${first.place_id}/neighbors.json`,
    evidence_kinds: evidenceKinds,
    source_ids: sourceIds,
    measurements: rows,
  };
}

function buildPlacesGeojson() {
  const coordinates = {
    WLD: null,
    BRA: [-53.2, -10.8],
    IND: [78.9, 22.7],
  };
  const placeIds = [...new Set(measurements.measurements.map((row) => row.place_id))];

  return {
    type: "FeatureCollection",
    name: "PainMap canonical release places",
    release_id: releaseId,
    features: placeIds.map((placeId) => {
      const rows = measurements.measurements.filter((row) => row.place_id === placeId);
      const first = rows[0];

      return {
        type: "Feature",
        id: placeId,
        properties: {
          place_id: placeId,
          place_name: first.place_name,
          parent_place_id: first.parent_place_id,
          iso3: first.iso3,
          geometry_level: first.geometry_level,
          release_id: releaseId,
          evidence_kinds: [...new Set(rows.map((row) => row.evidence_kind))],
          uncertainty_classes: [...new Set(rows.map((row) => row.uncertainty_class))],
          source_vintage: "2026-05-31.atlas.2 immutable release",
        },
        geometry: coordinates[placeId]
          ? {
              type: "Point",
              coordinates: coordinates[placeId],
            }
          : null,
      };
    }),
  };
}

function buildPlaceIndex() {
  const boundaries = countryBoundaryFeatures();
  const measuredCountryIds = new Set(
    measurements.measurements
      .filter((row) => row.geometry_level === "country")
      .map((row) => row.place_id)
  );
  const worldRows = measurementRowsForPlace("WLD");
  const items = [];

  if (worldRows.length) {
    items.push({
      place_id: "WLD",
      place_name: "World",
      parent_place_id: null,
      iso3: "WLD",
      geometry_level: "world",
      boundary_indexed: false,
      coverage_status: "canonical_measurements",
      canonical_measurement_count: worldRows.length,
      available_layers: uniqueSorted(worldRows.map((row) => row.layer_id)),
      evidence_kinds: uniqueSorted(worldRows.map((row) => row.evidence_kind)),
      page_url: placePageUrl("WLD"),
      profile_url: `${site}/v1/places/WLD.json`,
      measurements_url: `${site}/v1/places/WLD/measurements.json`,
      neighbors_url: `${site}/v1/places/WLD/neighbors.json`,
      latest_release_id: releaseId,
    });
  }

  for (const { feature, iso } of boundaries) {
    const rows = measurementRowsForPlace(iso);

    items.push({
      place_id: iso,
      place_name: countryNameFromProperties(feature.properties),
      parent_place_id: "WLD",
      iso3: iso,
      geometry_level: "country",
      boundary_indexed: true,
      coverage_status: rows.length ? "canonical_measurements" : "boundary_index_only",
      canonical_measurement_count: rows.length,
      available_layers: uniqueSorted(rows.map((row) => row.layer_id)),
      evidence_kinds: uniqueSorted(rows.map((row) => row.evidence_kind)),
      page_url: placePageUrl(iso),
      profile_url: rows.length ? `${site}/v1/places/${iso}.json` : null,
      measurements_url: rows.length ? `${site}/v1/places/${iso}/measurements.json` : null,
      neighbors_url: `${site}/v1/places/${iso}/neighbors.json`,
      latest_release_id: releaseId,
    });
  }

  return {
    release_id: releaseId,
    generated_at: releaseDate,
    count: items.length,
    coverage_summary: {
      place_index_count: items.length,
      world_rows: worldRows.length,
      country_boundary_indexed: boundaries.length,
      adm1_boundary_mode: "runtime_overlay",
      adm1_release_measurements: 0,
      canonical_country_profiles: measuredCountryIds.size,
      canonical_place_profiles: uniqueSorted(measurements.measurements.map((row) => row.place_id)).length,
      release_measurements: measurements.measurements.length,
      direct_evidence_place_measurements: measurements.measurements.filter((row) => row.evidence_kind === "direct").length,
      modeled_place_measurements: measurements.measurements.filter((row) => row.evidence_kind === "modeled").length,
      proxy_place_measurements: measurements.measurements.filter((row) => row.evidence_kind === "proxy").length,
      priority_overlay_measurements: measurements.measurements.filter((row) => row.evidence_kind === "priority-overlay").length,
      boundary_index_only_places: items.filter((item) => item.coverage_status === "boundary_index_only").length,
      last_release_date: releaseDate,
    },
    items,
  };
}

function buildCoverage() {
  const placeIndex = buildPlaceIndex();
  const summary = placeIndex.coverage_summary;

  return {
    release_id: releaseId,
    generated_at: releaseDate,
    last_release_date: releaseDate,
    coverage_status: {
      places_indexed: summary.place_index_count,
      country_boundaries_indexed: summary.country_boundary_indexed,
      adm1_boundaries: {
        status: "runtime_overlay",
        release_scoped_count: summary.adm1_release_measurements,
        source: "geoBoundaries ADM1 loaded on demand by selected country",
      },
      canonical_country_profiles: summary.canonical_country_profiles,
      canonical_place_profiles: summary.canonical_place_profiles,
      release_measurements: summary.release_measurements,
      evidence_layer_coverage: {
        direct: summary.direct_evidence_place_measurements,
        modeled: summary.modeled_place_measurements,
        proxy: summary.proxy_place_measurements,
        priority_overlay: summary.priority_overlay_measurements,
        boundary: summary.country_boundary_indexed,
      },
    },
    known_sparse_areas: [
      {
        area: "Boundary-only countries",
        status: `${summary.boundary_index_only_places} country places have Natural Earth boundaries but no canonical measurement rows in this release.`,
      },
      {
        area: "ADM1 measurements",
        status: "ADM1 boundaries are available as a labeled runtime overlay, but no ADM1 measurement rows are frozen into the release.",
      },
      {
        area: "Direct evidence by place",
        status: "Direct welfare evidence is not yet represented as country or ADM1 measurement rows; current country rows are proxy and priority-overlay records.",
      },
      {
        area: "Release/live split",
        status: "Immutable release artifacts are available; homepage live public-source overlays are labeled separately and remain outside the frozen release rows.",
      },
    ],
  };
}

function buildReleaseModes() {
  return {
    release_id: releaseId,
    generated_at: releaseDate,
    default_mode: "snapshot",
    local_event_name: "release_mode_selected",
    modes: [
      {
        id: "snapshot",
        label: "Snapshot",
        badge: "immutable",
        cache_rule: "Release-scoped static artifacts may use long-lived immutable caching.",
        replay_rule: "Use the immutable release manifest, checksums, schemas, and release URLs for reproducible analysis.",
        network_behavior:
          "The homepage does not start World Bank, OWID, geoBoundaries, or WorldPop ranking requests in this mode.",
        included_surfaces: [
          "/v1/places/index.json",
          "/v1/coverage.json",
          "/data/place-measurements.json",
          "/data/provenance-registry.json",
          "/releases/2026-05-31/manifest.json",
        ],
      },
      {
        id: "live",
        label: "Live overlay",
        badge: "not frozen",
        cache_rule: "Browser-time public-source overlays are short lived and source dependent.",
        replay_rule:
          "Treat live overlay values as current context unless they are materialized into a later immutable release.",
        network_behavior:
          "The homepage may query public World Bank, OWID, geoBoundaries, and WorldPop surfaces after the user selects this mode.",
        upstream_sources: ["world-bank-indicators", "owid-livestock", "geoboundaries-adm1", "worldpop"],
      },
    ],
    ui_contract: {
      tablist_label: "Release data mode",
      status_region_id: "release-mode-status",
      snapshot_tab_id: "release-mode-snapshot",
      live_tab_id: "release-mode-live",
    },
  };
}

function buildCountryNeighborIndex() {
  const entries = countryBoundaryFeatures().map(({ feature, iso }) => ({
    feature,
    iso,
    name: countryNameFromProperties(feature.properties),
    bbox: featureBbox(feature),
    centroid: featureCentroid(feature),
    coordinateKeys: featureCoordinateKeys(feature),
  }));
  const pointIndex = new Map();
  const borderCounts = new Map();

  for (const entry of entries) {
    for (const key of entry.coordinateKeys) {
      const owners = pointIndex.get(key) || [];
      owners.push(entry.iso);
      pointIndex.set(key, owners);
    }
  }

  for (const owners of pointIndex.values()) {
    if (owners.length < 2) {
      continue;
    }

    const uniqueOwners = uniqueSorted(owners);

    for (let i = 0; i < uniqueOwners.length; i += 1) {
      for (let j = i + 1; j < uniqueOwners.length; j += 1) {
        const key = [uniqueOwners[i], uniqueOwners[j]].join("|");
        borderCounts.set(key, (borderCounts.get(key) || 0) + 1);
      }
    }
  }

  return { entries, borderCounts };
}

function neighborPlaceSummary(item) {
  return {
    place_id: item.place_id,
    place_name: item.place_name,
    geometry_level: item.geometry_level,
    coverage_status: item.coverage_status,
    canonical_measurement_count: item.canonical_measurement_count,
    profile_url: item.profile_url,
    measurements_url: item.measurements_url,
    neighbors_url: item.neighbors_url,
  };
}

function buildNeighborPayloads() {
  const placeIndex = buildPlaceIndex();
  const itemsById = new Map(placeIndex.items.map((item) => [item.place_id, item]));
  const { entries, borderCounts } = buildCountryNeighborIndex();
  const entryById = new Map(entries.map((entry) => [entry.iso, entry]));
  const payloads = new Map();

  for (const item of placeIndex.items) {
    if (item.place_id === "WLD") {
      payloads.set(item.place_id, {
        release_id: releaseId,
        generated_at: releaseDate,
        place_id: item.place_id,
        place_name: item.place_name,
        geometry_level: item.geometry_level,
        method: {
          border_neighbors: "World is the parent collection, so border neighbors are not defined.",
          nearby_places:
            "Country payloads include nearest centroid neighbors for geography discovery; use border_neighbors for shared-boundary relationships.",
        },
        border_neighbors: [],
        nearby_places: [],
        child_places: placeIndex.items
          .filter((candidate) => candidate.parent_place_id === "WLD" && candidate.boundary_indexed)
          .map(neighborPlaceSummary),
        links: [
          ogcLink(`${site}/v1/places/index.json`, "collection", "application/json", "Place index"),
          ogcLink(`${site}/ogc/collections/places/items.json`, "alternate", "application/geo+json", "OGC-style place features"),
        ],
      });
      continue;
    }

    const entry = entryById.get(item.place_id);

    if (!entry) {
      continue;
    }

    const borderNeighbors = [...borderCounts.entries()]
      .filter(([key, count]) => count >= 2 && key.split("|").includes(item.place_id))
      .map(([key, count]) => {
        const neighborId = key.split("|").find((id) => id !== item.place_id);
        const neighbor = itemsById.get(neighborId);

        return {
          ...neighborPlaceSummary(neighbor),
          relation: "shared_boundary",
          shared_boundary_point_count: count,
        };
      })
      .sort((left, right) => left.place_name.localeCompare(right.place_name));

    const nearbyPlaces = entries
      .filter((candidate) => candidate.iso !== item.place_id && candidate.centroid && entry.centroid)
      .map((candidate) => {
        const neighbor = itemsById.get(candidate.iso);

        return {
          ...neighborPlaceSummary(neighbor),
          relation: "nearest_centroid",
          centroid_distance_km: roundNumber(haversineKm(entry.centroid, candidate.centroid), 1),
        };
      })
      .sort((left, right) => left.centroid_distance_km - right.centroid_distance_km)
      .slice(0, 8);

    payloads.set(item.place_id, {
      release_id: releaseId,
      generated_at: releaseDate,
      place_id: item.place_id,
      place_name: item.place_name,
      geometry_level: item.geometry_level,
      bbox: entry.bbox,
      centroid: entry.centroid?.map((value) => roundNumber(value)),
      method: {
        border_neighbors:
          "Shared-boundary neighbors are derived from Natural Earth Admin 0 polygon vertices quantized to five decimal places; island states may have no border_neighbors.",
        nearby_places:
          "Nearby places are the eight nearest country centroids and are included for geographic discovery, not as a moral ranking.",
      },
      border_neighbors: borderNeighbors,
      nearby_places: nearbyPlaces,
      links: [
        ogcLink(`${site}/v1/places/index.json`, "collection", "application/json", "Place index"),
        ogcLink(`${site}/ogc/collections/places/items.json`, "alternate", "application/geo+json", "OGC-style place features"),
      ],
    });
  }

  return payloads;
}

function buildOgcPlaceItems() {
  const placeIndex = buildPlaceIndex();
  const itemsById = new Map(placeIndex.items.map((item) => [item.place_id, item]));
  const features = countryBoundaryFeatures().map(({ feature, iso }) => {
    const item = itemsById.get(iso);

    return {
      type: "Feature",
      id: iso,
      bbox: featureBbox(feature),
      properties: {
        place_id: iso,
        place_name: item?.place_name || countryNameFromProperties(feature.properties),
        parent_place_id: "WLD",
        iso3: iso,
        geometry_level: "country",
        release_id: releaseId,
        boundary_indexed: true,
        coverage_status: item?.coverage_status || "boundary_index_only",
        canonical_measurement_count: item?.canonical_measurement_count || 0,
        profile_url: item?.profile_url || null,
        measurements_url: item?.measurements_url || null,
        neighbors_url: item?.neighbors_url || `${site}/v1/places/${iso}/neighbors.json`,
        source_id: "natural-earth-admin0",
      },
      geometry: feature.geometry,
    };
  });

  return {
    type: "FeatureCollection",
    title: "PainMap OGC-style place features",
    release_id: releaseId,
    timeStamp: releaseDate,
    numberMatched: features.length,
    numberReturned: features.length,
    bbox: collectionBbox(features),
    links: [
      ogcLink(`${site}/ogc/index.json`, "root", "application/json", "OGC landing document"),
      ogcLink(`${site}/ogc/collections/places/index.json`, "collection", "application/json", "Places collection"),
      ogcLink(`${site}/v1/places/index.json`, "describedby", "application/json", "PainMap place index"),
    ],
    features,
  };
}

function buildOgcArtifacts() {
  const countryFeatures = countryBoundaryFeatures().map((entry) => entry.feature);
  const placeFeatureCount = countryFeatures.length;
  const spatialBbox = collectionBbox(countryFeatures);
  const placeCollectionUrl = `${site}/ogc/collections/places/index.json`;
  const placeItemsUrl = `${site}/ogc/collections/places/items.json`;

  return {
    "ogc/index.json": {
      title: "PainMap OGC API - Features landing document",
      description:
        "Static OGC API - Features-style discovery surfaces for PainMap place geometry, coverage status, and release-scoped atlas metadata.",
      links: [
        ogcLink(`${site}/ogc/index.json`, "self", "application/json", "This document"),
        ogcLink(`${site}/ogc/conformance.json`, "conformance", "application/json", "Conformance classes"),
        ogcLink(`${site}/ogc/collections/index.json`, "data", "application/json", "Collections"),
        ogcLink(`${site}/data/openapi.json`, "service-desc", "application/vnd.oai.openapi+json;version=3.1", "OpenAPI description"),
      ],
    },
    "ogc/conformance.json": {
      conformsTo: [
        "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
        "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
        "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
      ],
      note:
        "PainMap publishes static, release-scoped JSON files that follow OGC API - Features discovery shapes without dynamic query parameters.",
    },
    "ogc/collections/index.json": {
      links: [
        ogcLink(`${site}/ogc/index.json`, "root", "application/json", "OGC landing document"),
        ogcLink(placeCollectionUrl, "item", "application/json", "Places collection"),
      ],
      collections: [
        {
          id: "places",
          title: "PainMap places",
          description:
            "Country boundary features joined to PainMap place index coverage metadata for the immutable atlas release.",
          itemType: "feature",
          crs: ["http://www.opengis.net/def/crs/OGC/1.3/CRS84"],
          extent: {
            spatial: { bbox: [spatialBbox] },
            temporal: { interval: [[releaseDate, releaseDate]] },
          },
          links: [ogcLink(placeItemsUrl, "items", "application/geo+json", "GeoJSON items")],
        },
      ],
    },
    "ogc/collections/places/index.json": {
      id: "places",
      title: "PainMap places",
      description:
        "Release-scoped country features with Natural Earth geometry and PainMap coverage/profile links.",
      itemType: "feature",
      crs: ["http://www.opengis.net/def/crs/OGC/1.3/CRS84"],
      extent: {
        spatial: { bbox: [spatialBbox] },
        temporal: { interval: [[releaseDate, releaseDate]] },
      },
      links: [
        ogcLink(`${site}/ogc/collections/index.json`, "collection", "application/json", "Collections"),
        ogcLink(placeItemsUrl, "items", "application/geo+json", `${placeFeatureCount} place features`),
        ogcLink(`${site}/v1/places/index.json`, "describedby", "application/json", "Coverage-aware place index"),
      ],
    },
    "ogc/collections/places/items.json": buildOgcPlaceItems(),
  };
}

function buildAnalyticsEvents() {
  return {
    release_id: releaseId,
    generated_at: releaseDate,
    collection_mode: "Privacy-preserving first-party event vocabulary. The static site dispatches local painmap:telemetry events and only sends to a collector when a first-party telemetry endpoint is explicitly configured.",
    privacy: {
      no_user_ids: true,
      no_precise_location: true,
      no_personal_health_fields: true,
      no_query_strings: true,
      no_cross_site_tracker: true,
      default_network_collection: false,
    },
    allowed_events: [
      {
        event: "route_view",
        fields: ["route", "release_id"],
      },
      {
        event: "atlas_place_selected",
        fields: ["place_id", "geometry_level", "parent_place_id", "release_id"],
      },
      {
        event: "dataset_download",
        fields: ["path", "format", "release_id"],
      },
      {
        event: "compare_opened",
        fields: ["route", "release_id"],
      },
      {
        event: "release_manifest_opened",
        fields: ["path", "release_id"],
      },
      {
        event: "release_mode_selected",
        fields: ["mode", "release_id"],
      },
      {
        event: "place_search_started",
        fields: ["query_length", "release_id"],
      },
      {
        event: "zero_result_search",
        fields: ["query_length", "release_id"],
      },
      {
        event: "data_fetch_timing",
        fields: ["target", "duration_ms", "ok", "release_id"],
      },
      {
        event: "web_vital",
        fields: ["metric", "value", "rating", "release_id"],
      },
    ],
  };
}

function buildPerformanceBudgets() {
  return {
    release_id: releaseId,
    generated_at: releaseDate,
    field_budgets: {
      largest_contentful_paint_ms: 2500,
      interaction_to_next_paint_ms: 200,
      cumulative_layout_shift: 0.1,
    },
    instrumentation: {
      local_event_name: "painmap:telemetry",
      collector_endpoint: null,
      route_event: "route_view",
      fetch_timing_event: "data_fetch_timing",
      web_vital_event: "web_vital",
    },
    ci_expectation:
      "Keep npm run check passing and review these budgets before any release that changes atlas rendering, map data loading, or route-critical assets.",
  };
}

function buildEndpointSmoke() {
  const endpoint = (path, format, purpose) => ({
    path,
    url: `${site}${path}`,
    method: "GET",
    expected_status: 200,
    format,
    purpose,
  });

  return {
    release_id: releaseId,
    generated_at: releaseDate,
    endpoints: [
      endpoint("/", "text/html", "Homepage atlas entry"),
      endpoint("/places/", "text/html", "Canonical place index route"),
      endpoint("/countries/", "text/html", "Legacy route alias for places"),
      endpoint("/compare/", "text/html", "Compare route"),
      endpoint("/examples/", "text/html", "Developer examples route"),
      endpoint("/data/openapi.json", "application/json", "OpenAPI contract"),
      endpoint("/data/dcat.json", "application/ld+json", "DCAT catalog"),
      endpoint("/data/release-modes.json", "application/json", "Snapshot and live overlay mode contract"),
      endpoint("/v1/places/index.json", "application/json", "Full release place index"),
      endpoint("/v1/coverage.json", "application/json", "Release coverage status"),
      endpoint("/v1/places/BRA/neighbors.json", "application/json", "Brazil geographic neighbor payload"),
      endpoint("/ogc/index.json", "application/json", "OGC API - Features landing document"),
      endpoint("/ogc/collections/places/items.json", "application/geo+json", "OGC-style place feature collection"),
      endpoint("/clients/typescript/painmap-client.ts", "text/typescript", "TypeScript client"),
      endpoint("/clients/python/painmap_client.py", "text/x-python", "Python client"),
      endpoint("/releases/2026-05-31/manifest.json", "application/json", "Immutable release manifest"),
      endpoint("/releases/2026-05-31/diff.json", "application/json", "Release diff artifact"),
      endpoint("/.well-known/security.txt", "text/plain", "Security contact policy"),
    ],
  };
}

function buildJsonSchemas() {
  const schemaBase = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
  };

  return {
    "schemas/place-index.schema.json": {
      ...schemaBase,
      $id: `${site}/schemas/place-index.schema.json`,
      title: "PainMap place index",
      type: "object",
      required: ["release_id", "generated_at", "count", "coverage_summary", "items"],
      properties: {
        release_id: { type: "string" },
        generated_at: { type: "string" },
        count: { type: "integer", minimum: 1 },
        coverage_summary: { type: "object" },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["place_id", "place_name", "geometry_level", "coverage_status", "latest_release_id"],
            properties: {
              place_id: { type: "string" },
              place_name: { type: "string" },
              parent_place_id: { type: ["string", "null"] },
              iso3: { type: "string" },
              geometry_level: { enum: ["world", "country", "adm1"] },
              boundary_indexed: { type: "boolean" },
              coverage_status: { enum: ["canonical_measurements", "boundary_index_only"] },
              canonical_measurement_count: { type: "integer", minimum: 0 },
              available_layers: { type: "array", items: { type: "string" } },
              evidence_kinds: { type: "array", items: { type: "string" } },
              page_url: { type: ["string", "null"] },
              profile_url: { type: ["string", "null"] },
              measurements_url: { type: ["string", "null"] },
              neighbors_url: { type: "string" },
              latest_release_id: { type: "string" },
            },
          },
        },
      },
    },
    "schemas/place-measurements.schema.json": {
      ...schemaBase,
      $id: `${site}/schemas/place-measurements.schema.json`,
      title: "PainMap place measurements",
      type: "object",
      required: ["build", "measurements"],
      properties: {
        build: { type: "object" },
        measurements: {
          type: "array",
          items: {
            type: "object",
            required: [
              "measurement_id",
              "release_id",
              "place_id",
              "place_name",
              "geometry_level",
              "layer_id",
              "evidence_kind",
              "raw_value",
              "display_value",
              "source_ids",
              "confidence_low",
              "confidence_high",
              "uncertainty_class",
              "license_id",
            ],
          },
        },
      },
    },
    "schemas/coverage.schema.json": {
      ...schemaBase,
      $id: `${site}/schemas/coverage.schema.json`,
      title: "PainMap release coverage",
      type: "object",
      required: ["release_id", "generated_at", "coverage_status", "known_sparse_areas"],
      properties: {
        release_id: { type: "string" },
        generated_at: { type: "string" },
        last_release_date: { type: "string" },
        coverage_status: { type: "object" },
        known_sparse_areas: { type: "array", items: { type: "object" } },
      },
    },
    "schemas/release-modes.schema.json": {
      ...schemaBase,
      $id: `${site}/schemas/release-modes.schema.json`,
      title: "PainMap release modes",
      type: "object",
      required: ["release_id", "generated_at", "default_mode", "modes", "ui_contract"],
      properties: {
        release_id: { type: "string" },
        generated_at: { type: "string" },
        default_mode: { enum: ["snapshot", "live"] },
        local_event_name: { type: "string" },
        modes: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "label", "badge", "cache_rule", "replay_rule", "network_behavior"],
            properties: {
              id: { enum: ["snapshot", "live"] },
              label: { type: "string" },
              badge: { type: "string" },
              cache_rule: { type: "string" },
              replay_rule: { type: "string" },
              network_behavior: { type: "string" },
              included_surfaces: { type: "array", items: { type: "string" } },
              upstream_sources: { type: "array", items: { type: "string" } },
            },
          },
        },
        ui_contract: { type: "object" },
      },
    },
    "schemas/ogc-place-features.schema.json": {
      ...schemaBase,
      $id: `${site}/schemas/ogc-place-features.schema.json`,
      title: "PainMap OGC-style place features",
      type: "object",
      required: ["type", "features", "numberMatched", "numberReturned", "links"],
      properties: {
        type: { const: "FeatureCollection" },
        numberMatched: { type: "integer", minimum: 1 },
        numberReturned: { type: "integer", minimum: 1 },
        links: { type: "array", items: { type: "object" } },
        features: {
          type: "array",
          items: {
            type: "object",
            required: ["type", "id", "properties", "geometry"],
            properties: {
              type: { const: "Feature" },
              id: { type: "string" },
              properties: {
                type: "object",
                required: ["place_id", "place_name", "geometry_level", "coverage_status", "neighbors_url"],
              },
            },
          },
        },
      },
    },
  };
}

function buildLayers() {
  return {
    release_id: releaseId,
    generated_at: releaseDate,
    layers: [
      {
        layer_id: "factory-farmed-animals",
        label: "Factory-farmed animals",
        evidence_kind: "proxy",
        value_type: "normalized_proxy_score",
        unit_label: "0-1 normalized proxy score",
        ranking_mode: "higher_proxy_score_more_attention",
        source_ids: ["owid-livestock", "fishcount-aquaculture", "painmap-welfare-assumptions"],
      },
      {
        layer_id: "human-burden",
        label: "Human burden indicators",
        evidence_kind: "proxy",
        value_type: "normalized_proxy_score",
        unit_label: "0-1 normalized proxy score",
        ranking_mode: "higher_proxy_score_more_attention",
        source_ids: ["world-bank-indicators"],
      },
      {
        layer_id: "wild-insects",
        label: "Wild terrestrial arthropod scale",
        evidence_kind: "proxy",
        value_type: "normalized_proxy_score",
        unit_label: "0-1 normalized proxy score",
        ranking_mode: "higher_proxy_score_more_attention",
        source_ids: ["world-bank-land-area", "painmap-welfare-assumptions"],
      },
      {
        layer_id: "animal-priority-overlay",
        label: "Animal priority overlay",
        evidence_kind: "priority-overlay",
        value_type: "normalized_priority_score",
        unit_label: "0-1 normalized priority score",
        ranking_mode: "higher_priority_more_attention",
        source_ids: ["owid-livestock", "welfare-footprint-events", "painmap-priority-review"],
      },
      {
        layer_id: "event-evidence",
        label: "Event-level animal pain evidence",
        evidence_kind: "modeled",
        value_type: "welfare_footprint_event_estimate",
        unit_label: "duration by intensity band",
        ranking_mode: "event_context_only",
        source_ids: ["welfare-footprint-events"],
      },
      {
        layer_id: "country-boundaries",
        label: "Country and ADM1 boundaries",
        evidence_kind: "boundary",
        value_type: "geometry",
        unit_label: "GeoJSON or TopoJSON geometry",
        ranking_mode: "not_ranked",
        source_ids: ["natural-earth-admin0", "geoboundaries-adm1"],
      },
    ],
  };
}

function buildOpenApi() {
  const staticJsonResponse = (description, schemaRef = null) => ({
    description,
    content: {
      "application/json": {
        schema: schemaRef ? { $ref: schemaRef } : { type: "object" },
      },
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "PainMap public read-only data contract",
      version: releaseId,
      description:
        "Static API contract for immutable PainMap releases, places, layers, sources, provenance, catalog, and geometry exports.",
    },
    servers: [{ url: site }],
    paths: {
      "/v1/releases.json": {
        get: { summary: "Get release index", responses: { 200: staticJsonResponse("Release index JSON") } },
      },
      "/v1/layers.json": {
        get: { summary: "Get layer definitions", responses: { 200: staticJsonResponse("Layer definitions JSON") } },
      },
      "/v1/sources.json": {
        get: { summary: "Get source registry", responses: { 200: staticJsonResponse("Source registry JSON") } },
      },
      "/v1/places/index.json": {
        get: {
          summary: "Get full release place index",
          responses: { 200: staticJsonResponse("Place index JSON", "#/components/schemas/PlaceIndex") },
        },
      },
      "/v1/coverage.json": {
        get: {
          summary: "Get release coverage status",
          responses: { 200: staticJsonResponse("Coverage status JSON", "#/components/schemas/CoverageStatus") },
        },
      },
      "/v1/places/WLD.json": {
        get: { summary: "Get world place profile", responses: { 200: staticJsonResponse("Place profile JSON") } },
      },
      "/v1/places/{place_id}.json": {
        get: {
          summary: "Get release place profile when canonical measurements exist",
          parameters: [{ name: "place_id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: staticJsonResponse("Place profile JSON") },
        },
      },
      "/v1/places/{place_id}/measurements.json": {
        get: {
          summary: "Get release measurements for a place profile",
          parameters: [{ name: "place_id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: staticJsonResponse("Place measurements for one place") },
        },
      },
      "/v1/places/{place_id}/neighbors.json": {
        get: {
          summary: "Get geographic neighbor and nearby-place metadata for a place",
          parameters: [{ name: "place_id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: staticJsonResponse("Place neighbor payload") },
        },
      },
      "/v1/places/BRA.json": {
        get: { summary: "Get Brazil place profile", responses: { 200: staticJsonResponse("Place profile JSON") } },
      },
      "/v1/places/BRA/neighbors.json": {
        get: { summary: "Get Brazil neighbor payload", responses: { 200: staticJsonResponse("Place neighbor payload") } },
      },
      "/v1/places/IND.json": {
        get: { summary: "Get India place profile", responses: { 200: staticJsonResponse("Place profile JSON") } },
      },
      "/v1/places/IND/neighbors.json": {
        get: { summary: "Get India neighbor payload", responses: { 200: staticJsonResponse("Place neighbor payload") } },
      },
      "/releases/2026-05-31/manifest.json": {
        get: { summary: "Get immutable release manifest", responses: { 200: staticJsonResponse("Release manifest JSON") } },
      },
      "/releases/2026-05-31/diff.json": {
        get: { summary: "Get release diff artifact", responses: { 200: staticJsonResponse("Release diff JSON") } },
      },
      "/latest/manifest.json": {
        get: { summary: "Get latest release alias manifest", responses: { 200: staticJsonResponse("Latest alias JSON") } },
      },
      "/data/provenance-registry.json": {
        get: {
          summary: "Get dataset, source, license, evidence-kind, and uncertainty registry",
          responses: { 200: staticJsonResponse("Provenance registry JSON", "#/components/schemas/ProvenanceRegistry") },
        },
      },
      "/data/place-measurements.json": {
        get: {
          summary: "Get canonical place-level pain-source measurements",
          responses: { 200: staticJsonResponse("Place measurements JSON", "#/components/schemas/PlaceMeasurements") },
        },
      },
      "/data/place-measurements.csv": {
        get: {
          summary: "Get canonical place-level measurements as CSV",
          responses: {
            200: {
              description: "Place measurements CSV",
              content: { "text/csv": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/data/places.geojson": {
        get: {
          summary: "Get canonical place features for the atlas contract",
          responses: {
            200: {
              description: "GeoJSON feature collection",
              content: { "application/geo+json": { schema: { $ref: "#/components/schemas/FeatureCollection" } } },
            },
          },
        },
      },
      "/data/dcat.json": {
        get: { summary: "Get DCAT-style dataset catalog", responses: { 200: staticJsonResponse("Dataset catalog JSON") } },
      },
      "/data/release-modes.json": {
        get: {
          summary: "Get snapshot and live overlay release-mode contract",
          responses: { 200: staticJsonResponse("Release-mode contract JSON", "#/components/schemas/ReleaseModes") },
        },
      },
      "/ogc/index.json": {
        get: { summary: "Get OGC API - Features landing document", responses: { 200: staticJsonResponse("OGC landing document") } },
      },
      "/ogc/conformance.json": {
        get: { summary: "Get OGC conformance classes", responses: { 200: staticJsonResponse("OGC conformance document") } },
      },
      "/ogc/collections/index.json": {
        get: { summary: "Get OGC collection list", responses: { 200: staticJsonResponse("OGC collections document") } },
      },
      "/ogc/collections/places/index.json": {
        get: { summary: "Get OGC places collection metadata", responses: { 200: staticJsonResponse("OGC collection metadata") } },
      },
      "/ogc/collections/places/items.json": {
        get: {
          summary: "Get OGC-style GeoJSON country place features",
          responses: {
            200: {
              description: "OGC-style GeoJSON feature collection",
              content: { "application/geo+json": { schema: { $ref: "#/components/schemas/FeatureCollection" } } },
            },
          },
        },
      },
      "/data/analytics-events.json": {
        get: { summary: "Get privacy-preserving telemetry event vocabulary", responses: { 200: staticJsonResponse("Analytics event contract JSON") } },
      },
      "/data/performance-budgets.json": {
        get: { summary: "Get field performance budgets", responses: { 200: staticJsonResponse("Performance budget JSON") } },
      },
      "/data/endpoint-smoke.json": {
        get: { summary: "Get endpoint smoke-test manifest", responses: { 200: staticJsonResponse("Endpoint smoke manifest JSON") } },
      },
      "/schemas/place-index.schema.json": {
        get: { summary: "Get JSON Schema for the place index", responses: { 200: staticJsonResponse("Place index JSON Schema") } },
      },
      "/schemas/place-measurements.schema.json": {
        get: { summary: "Get JSON Schema for place measurements", responses: { 200: staticJsonResponse("Place measurements JSON Schema") } },
      },
      "/schemas/coverage.schema.json": {
        get: { summary: "Get JSON Schema for coverage status", responses: { 200: staticJsonResponse("Coverage JSON Schema") } },
      },
      "/schemas/release-modes.schema.json": {
        get: { summary: "Get JSON Schema for release modes", responses: { 200: staticJsonResponse("Release modes JSON Schema") } },
      },
      "/schemas/ogc-place-features.schema.json": {
        get: { summary: "Get JSON Schema for OGC-style place features", responses: { 200: staticJsonResponse("OGC place features JSON Schema") } },
      },
    },
    components: {
      schemas: {
        PlaceIndex: {
          type: "object",
          required: ["release_id", "count", "coverage_summary", "items"],
        },
        CoverageStatus: {
          type: "object",
          required: ["release_id", "coverage_status", "known_sparse_areas"],
        },
        ReleaseModes: {
          type: "object",
          required: ["release_id", "default_mode", "modes", "ui_contract"],
        },
        ProvenanceRegistry: {
          type: "object",
          required: ["build", "methodClasses", "uncertaintyClasses", "licenses", "sources", "datasets"],
        },
        PlaceMeasurements: {
          type: "object",
          required: ["build", "measurements"],
          properties: {
            build: { type: "object" },
            measurements: { type: "array", items: { $ref: "#/components/schemas/PlaceMeasurement" } },
          },
        },
        PlaceMeasurement: {
          type: "object",
          required: [
            "measurement_id",
            "release_id",
            "place_id",
            "place_name",
            "geometry_level",
            "layer_id",
            "layer_name",
            "evidence_kind",
            "value_type",
            "raw_value",
            "display_value",
            "unit_label",
            "ranking_mode",
            "source_ids",
            "confidence_low",
            "confidence_high",
            "provenance_id",
            "source_vintage",
            "method_note",
            "uncertainty_class",
            "license_id",
          ],
          properties: {
            measurement_id: { type: "string" },
            release_id: { type: "string" },
            place_id: { type: "string" },
            place_name: { type: "string" },
            geometry_level: { type: "string" },
            layer_id: { type: "string" },
            layer_name: { type: "string" },
            evidence_kind: { enum: ["direct", "modeled", "proxy", "priority-overlay", "boundary"] },
            value_type: { type: "string" },
            raw_value: { type: "number" },
            normalized_value: { type: "number" },
            display_value: { type: "string" },
            unit_label: { type: "string" },
            ranking_mode: { type: "string" },
            rank_value: { type: "number" },
            source_ids: { type: "array", items: { type: "string" } },
            confidence_low: { type: "number" },
            confidence_high: { type: "number" },
            provenance_id: { type: "string" },
            source_vintage: { type: "string" },
            method_note: { type: "string" },
            uncertainty_class: { enum: ["moderate", "low", "very-low"] },
            license_id: { type: "string" },
          },
        },
        FeatureCollection: {
          type: "object",
          required: ["type", "features"],
          properties: {
            type: { const: "FeatureCollection" },
            features: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  };
}

function buildDcat() {
  return {
    "@context": {
      dcat: "http://www.w3.org/ns/dcat#",
      dct: "http://purl.org/dc/terms/",
      foaf: "http://xmlns.com/foaf/0.1/",
      spdx: "http://spdx.org/rdf/terms#",
    },
    "@type": "dcat:Catalog",
    "dct:title": "PainMap public data catalog",
    "dct:description":
      "Catalog of PainMap event evidence, canonical place measurements, boundary layers, provenance exports, and immutable release manifests.",
    "dct:issued": releaseDate,
    "dct:modified": releaseDate,
    "dct:identifier": releaseId,
    "dcat:dataset": [
      {
        "@type": "dcat:Dataset",
        "dct:identifier": "place-measurements",
        "dct:title": "PainMap canonical place measurements",
        "dct:license": `${site}/policies/terms/`,
        "dct:hasVersion": releaseId,
        "dcat:distribution": [
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/data/place-measurements.json` },
          { "@type": "dcat:Distribution", "dct:format": "text/csv", "dcat:downloadURL": `${site}/data/place-measurements.csv` },
          { "@type": "dcat:Distribution", "dct:format": "application/geo+json", "dcat:downloadURL": `${site}/data/places.geojson` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/v1/places/index.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/v1/coverage.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/data/release-modes.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/v1/places/BRA/neighbors.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/releases/2026-05-31/manifest.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/releases/2026-05-31/diff.json` },
        ],
      },
      {
        "@type": "dcat:Dataset",
        "dct:identifier": "provenance-registry",
        "dct:title": "PainMap provenance registry",
        "dct:license": `${site}/policies/terms/`,
        "dct:hasVersion": releaseId,
        "dcat:distribution": [
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/data/provenance-registry.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/ld+json", "dcat:downloadURL": `${site}/data/dcat.json` },
        ],
      },
      {
        "@type": "dcat:Dataset",
        "dct:identifier": "boundary-layers",
        "dct:title": "PainMap boundary layers",
        "dct:license": `${site}/policies/terms/`,
        "dct:hasVersion": releaseId,
        "dcat:distribution": [
          { "@type": "dcat:Distribution", "dct:format": "application/geo+json", "dcat:downloadURL": `${site}/data/natural-earth-countries.geojson` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:accessURL": `${site}/ogc/index.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/geo+json", "dcat:downloadURL": `${site}/ogc/collections/places/items.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:accessURL": `${site}/v1/sources.json` },
        ],
      },
      {
        "@type": "dcat:Dataset",
        "dct:identifier": "developer-contracts",
        "dct:title": "PainMap developer contracts and field budgets",
        "dct:license": `${site}/policies/terms/`,
        "dct:hasVersion": releaseId,
        "dcat:distribution": [
          { "@type": "dcat:Distribution", "dct:format": "application/schema+json", "dcat:downloadURL": `${site}/schemas/place-index.schema.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/schema+json", "dcat:downloadURL": `${site}/schemas/place-measurements.schema.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/schema+json", "dcat:downloadURL": `${site}/schemas/coverage.schema.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/schema+json", "dcat:downloadURL": `${site}/schemas/release-modes.schema.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/schema+json", "dcat:downloadURL": `${site}/schemas/ogc-place-features.schema.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/data/performance-budgets.json` },
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/data/endpoint-smoke.json` },
          { "@type": "dcat:Distribution", "dct:format": "text/typescript", "dcat:downloadURL": `${site}/clients/typescript/painmap-client.ts` },
          { "@type": "dcat:Distribution", "dct:format": "text/x-python", "dcat:downloadURL": `${site}/clients/python/painmap_client.py` },
          { "@type": "dcat:Distribution", "dct:format": "text/markdown", "dcat:downloadURL": `${site}/examples/README.md` },
        ],
      },
    ],
  };
}

function writeSitemap() {
  const entries = routes.routes
    .map(
      (route) =>
        `  <url>\n    <loc>${routeUrl(route)}</loc>\n    <lastmod>${releaseDate}</lastmod>\n  </url>`
    )
    .join("\n");
  writeText("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`);
}

function writeHeaders() {
  writeText(
    "_headers",
    `/*\n  Content-Security-Policy: ${csp}\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  Permissions-Policy: geolocation=(), microphone=(), camera=()\n`
  );
  writeJson("vercel.json", {
    headers: [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
    ],
  });
}

function writeSecurityTxt() {
  writeText(
    ".well-known/security.txt",
    [
      "Contact: mailto:security@painmap.org",
      "Contact: https://github.com/ghuser29384/Website/issues",
      "Expires: 2027-05-31T00:00:00Z",
      "Preferred-Languages: en",
      "Canonical: https://painmap.org/.well-known/security.txt",
      "Policy: https://painmap.org/security/",
      "",
    ].join("\n")
  );
}

function measuredPlaceIds() {
  return uniqueSorted(measurements.measurements.map((row) => row.place_id));
}

function releaseArtifactFileCandidates() {
  const placeIndex = buildPlaceIndex();
  const measuredPlaces = measuredPlaceIds();
  const neighborFiles = placeIndex.items.map((item) => `v1/places/${item.place_id}/neighbors.json`);
  const measuredPlaceFiles = measuredPlaces.flatMap((placeId) => [
    `v1/places/${placeId}.json`,
    `v1/places/${placeId}/measurements.json`,
  ]);

  return [
    ...routes.routes.map((route) => route.file),
    "data/routes.json",
    "data/route-smoke.json",
    "data/provenance-registry.json",
    "data/place-measurements.json",
    "data/place-measurements.csv",
    "data/places.geojson",
    "data/release-modes.json",
    "data/analytics-events.json",
    "data/performance-budgets.json",
    "data/endpoint-smoke.json",
    "data/countries-lite.geojson",
    "data/natural-earth-countries.geojson",
    "data/dcat.json",
    "data/openapi.json",
    "clients/typescript/painmap-client.ts",
    "clients/python/painmap_client.py",
    "examples/README.md",
    "examples/load-place-profile.mjs",
    "examples/load_place_profile.py",
    "schemas/place-index.schema.json",
    "schemas/place-measurements.schema.json",
    "schemas/coverage.schema.json",
    "schemas/release-modes.schema.json",
    "schemas/ogc-place-features.schema.json",
    "v1/releases.json",
    "v1/layers.json",
    "v1/sources.json",
    "v1/coverage.json",
    "v1/places/index.json",
    ...measuredPlaceFiles,
    ...neighborFiles,
    "ogc/index.json",
    "ogc/conformance.json",
    "ogc/collections/index.json",
    "ogc/collections/places/index.json",
    "ogc/collections/places/items.json",
    "releases/2026-05-31/diff.json",
    "assets/social-card.svg",
    "vendor/d3.v7.min.js",
    "vendor/topojson-client.v3.min.js",
    "sitemap.xml",
    "robots.txt",
    ".nojekyll",
    "_headers",
    "vercel.json",
    ".well-known/security.txt",
    "README.md",
    "LICENSE",
  ];
}

function buildReleaseDiff() {
  const placeIndex = buildPlaceIndex();
  const coverage = buildCoverage();

  return {
    release_id: releaseId,
    generated_at: releaseDate,
    previous_release_id: null,
    comparison_type: "initial_release_baseline",
    summary:
      "This diff records the first release baseline for future comparisons. There is no previous immutable PainMap release in this release series.",
    current_release: {
      places_indexed: placeIndex.count,
      country_boundaries_indexed: coverage.coverage_status.country_boundaries_indexed,
      canonical_place_profiles: coverage.coverage_status.canonical_place_profiles,
      release_measurements: coverage.coverage_status.release_measurements,
      ogc_place_features: countryBoundaryFeatures().length,
      neighbor_payloads: placeIndex.items.length,
    },
    added_contract_surfaces: [
      "/v1/places/index.json",
      "/v1/coverage.json",
      "/v1/places/{place_id}/neighbors.json",
      "/ogc/index.json",
      "/ogc/collections/places/items.json",
      "/data/release-modes.json",
      "/schemas/release-modes.schema.json",
      "/schemas/ogc-place-features.schema.json",
      "/releases/2026-05-31/diff.json",
    ],
    notable_changes: [
      {
        area: "coverage",
        change: "Published a full country place index with canonical-measurement and boundary-index-only status.",
      },
      {
        area: "geospatial contract",
        change: "Added OGC API - Features-style discovery and a GeoJSON country feature collection.",
      },
      {
        area: "place discovery",
        change: "Added release-scoped neighbor payloads for all indexed places.",
      },
      {
        area: "release QA",
        change: "Added a diff artifact so later releases can expose added, changed, and removed surfaces.",
      },
      {
        area: "release mode",
        change: "Documented the homepage Snapshot and Live overlay split as a static public contract.",
      },
    ],
  };
}

function writeApiArtifacts() {
  const places = measuredPlaceIds();
  const placeProfiles = places.map(placeSummary);
  const schemas = buildJsonSchemas();
  const neighborPayloads = buildNeighborPayloads();
  const ogcArtifacts = buildOgcArtifacts();

  writeText("data/place-measurements.csv", measurementCsv());
  writeJson("data/places.geojson", buildPlacesGeojson());
  writeJson("v1/places/index.json", buildPlaceIndex());
  writeJson("v1/coverage.json", buildCoverage());
  writeJson("data/release-modes.json", buildReleaseModes());
  writeJson("data/analytics-events.json", buildAnalyticsEvents());
  writeJson("data/performance-budgets.json", buildPerformanceBudgets());
  writeJson("data/endpoint-smoke.json", buildEndpointSmoke());
  writeJson("data/openapi.json", buildOpenApi());
  writeJson("data/dcat.json", buildDcat());
  writeJson("releases/2026-05-31/diff.json", buildReleaseDiff());
  writeJson("data/route-smoke.json", {
    release_id: releaseId,
    generated_at: releaseDate,
    routes: routes.routes.map((route) => ({
      key: route.key,
      path: route.path,
      file: route.file,
      expected_title: route.title,
      expected_description: route.description,
      expected_canonical: routeCanonicalUrl(route),
    })),
  });
  writeJson("v1/releases.json", {
    latest_release_id: releaseId,
    generated_at: releaseDate,
    releases: [
      {
        release_id: releaseId,
        release_date: releaseDate,
        immutable: true,
        path: releasePath,
        manifest_url: `${site}${releasePath}manifest.json`,
        data_contract_url: `${site}/data/openapi.json`,
      },
    ],
    latest_alias: {
      mutable: true,
      manifest_url: `${site}/latest/manifest.json`,
      note: "The latest alias may advance; cite release manifests for reproducible analysis.",
    },
  });
  writeJson("v1/layers.json", buildLayers());
  writeJson("v1/sources.json", {
    release_id: releaseId,
    generated_at: releaseDate,
    sources: provenance.sources,
    licenses: provenance.licenses,
  });

  for (const profile of placeProfiles) {
    writeJson(`v1/places/${profile.place_id}.json`, profile);
    writeJson(`v1/places/${profile.place_id}/measurements.json`, {
      release_id: releaseId,
      place_id: profile.place_id,
      measurements: profile.measurements,
    });
  }

  for (const [placeId, payload] of neighborPayloads.entries()) {
    writeJson(`v1/places/${placeId}/neighbors.json`, payload);
  }

  for (const [file, artifact] of Object.entries(ogcArtifacts)) {
    if (file === "ogc/collections/places/items.json") {
      writeJsonCompact(file, artifact);
      continue;
    }

    writeJson(file, artifact);
  }

  for (const [file, schema] of Object.entries(schemas)) {
    writeJson(file, schema);
  }
}

function buildReleaseManifest() {
  const artifactFiles = releaseArtifactFileCandidates().filter((file) => existsSync(absolute(file)));

  return {
    release_id: releaseId,
    release_date: releaseDate,
    generated_at: releaseDate,
    immutable: true,
    site,
    source_of_truth: {
      route_manifest: `${site}/data/routes.json`,
      release_manifest: `${site}/${releaseManifestPath}`,
      measurements: `${site}/data/place-measurements.json`,
      place_index: `${site}/v1/places/index.json`,
      coverage: `${site}/v1/coverage.json`,
      release_modes: `${site}/data/release-modes.json`,
      ogc_features: `${site}/ogc/collections/places/items.json`,
      release_diff: `${site}${releasePath}diff.json`,
      provenance: `${site}/data/provenance-registry.json`,
      openapi: `${site}/data/openapi.json`,
      schemas: `${site}/schemas/place-index.schema.json`,
    },
    navigation: routes.navigation,
    routes: routes.routes.map((route) => ({
      key: route.key,
      path: route.path,
      file: route.file,
      title: route.title,
      description: route.description,
      canonical_url: routeCanonicalUrl(route),
      json_ld_type: route.jsonLdType,
    })),
    artifacts: artifactFiles.map((file) => ({
      path: `/${file}`,
      sha256: hashFile(file),
      bytes: sizeBytes(file),
    })),
  };
}

writeHeaders();
writeSecurityTxt();
writeApiArtifacts();
writeSitemap();
syncRouteHtml();
writeJson(releaseManifestPath, buildReleaseManifest());
writeJson("latest/manifest.json", {
  latest_release_id: releaseId,
  release_manifest_url: `${site}/${releaseManifestPath}`,
  release_manifest_sha256: hashFile(releaseManifestPath),
  mutable: true,
  generated_at: releaseDate,
  note: "This alias points to the latest PainMap release and may change. Use immutable release URLs for reproducible citations.",
});

console.log(`Built PainMap static artifacts for ${releaseId}.`);
