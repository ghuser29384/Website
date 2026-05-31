import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const site = "https://painmap.org";
const releasePath = "/releases/2026-05-31/";
const releaseManifestPath = "releases/2026-05-31/manifest.json";
const socialImage = `${site}/assets/social-card.svg`;
const csp =
  "default-src 'self'; script-src 'self'; connect-src 'self' https://www.geoboundaries.org https://media.githubusercontent.com https://api.worldbank.org https://ourworldindata.org; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

const routes = readJson("data/routes.json");
const provenance = readJson("data/provenance-registry.json");
const measurements = readJson("data/place-measurements.json");
const releaseId = routes.releaseId;
const releaseDate = routes.generatedAt;

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

function ogType(route) {
  return route.path === "/" ? "website" : "article";
}

function schemaType(route) {
  return route.jsonLdType || "WebPage";
}

function simpleJsonLd(route) {
  const value = {
    "@context": "https://schema.org",
    "@type": schemaType(route),
    name: route.title,
    url: routeUrl(route),
    description: route.description,
  };

  return `    <script type="application/ld+json">\n      ${jsonEscapeForScript(value)}\n    </script>`;
}

function managedHeadBlock(route) {
  const canonical = routeUrl(route);
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

function placeSummary(placeId) {
  const rows = measurements.measurements.filter((row) => row.place_id === placeId);
  const first = rows[0];
  const evidenceKinds = [...new Set(rows.map((row) => row.evidence_kind))].sort();
  const sourceIds = [...new Set(rows.flatMap((row) => row.source_ids))].sort();

  return {
    release_id: releaseId,
    place_id: first.place_id,
    place_name: first.place_name,
    parent_place_id: first.parent_place_id,
    iso3: first.iso3,
    geometry_level: first.geometry_level,
    profile_url: `${site}/place/${first.place_id}/`,
    compare_url: `${site}/compare/`,
    measurements_url: `${site}/v1/places/${first.place_id}/measurements.json`,
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
      "/v1/places/BRA.json": {
        get: { summary: "Get Brazil place profile", responses: { 200: staticJsonResponse("Place profile JSON") } },
      },
      "/v1/places/IND.json": {
        get: { summary: "Get India place profile", responses: { 200: staticJsonResponse("Place profile JSON") } },
      },
      "/releases/2026-05-31/manifest.json": {
        get: { summary: "Get immutable release manifest", responses: { 200: staticJsonResponse("Release manifest JSON") } },
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
    },
    components: {
      schemas: {
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
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:downloadURL": `${site}/releases/2026-05-31/manifest.json` },
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
          { "@type": "dcat:Distribution", "dct:format": "application/json", "dcat:accessURL": `${site}/v1/sources.json` },
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

function writeApiArtifacts() {
  const places = ["BRA", "IND"];
  const placeProfiles = places.map(placeSummary);

  writeText("data/place-measurements.csv", measurementCsv());
  writeJson("data/places.geojson", buildPlacesGeojson());
  writeJson("data/openapi.json", buildOpenApi());
  writeJson("data/dcat.json", buildDcat());
  writeJson("data/route-smoke.json", {
    release_id: releaseId,
    generated_at: releaseDate,
    routes: routes.routes.map((route) => ({
      key: route.key,
      path: route.path,
      file: route.file,
      expected_title: route.title,
      expected_description: route.description,
      expected_canonical: routeUrl(route),
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
}

function buildReleaseManifest() {
  const artifactFiles = [
    ...routes.routes.map((route) => route.file),
    "data/routes.json",
    "data/route-smoke.json",
    "data/provenance-registry.json",
    "data/place-measurements.json",
    "data/place-measurements.csv",
    "data/places.geojson",
    "data/countries-lite.geojson",
    "data/natural-earth-countries.geojson",
    "data/dcat.json",
    "data/openapi.json",
    "v1/releases.json",
    "v1/layers.json",
    "v1/sources.json",
    "v1/places/BRA.json",
    "v1/places/BRA/measurements.json",
    "v1/places/IND.json",
    "v1/places/IND/measurements.json",
    "assets/social-card.svg",
    "vendor/d3.v7.min.js",
    "vendor/topojson-client.v3.min.js",
    "sitemap.xml",
    "robots.txt",
    "_headers",
    "vercel.json",
    ".well-known/security.txt",
    "README.md",
    "LICENSE",
  ].filter((file) => existsSync(absolute(file)));

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
      provenance: `${site}/data/provenance-registry.json`,
      openapi: `${site}/data/openapi.json`,
    },
    navigation: routes.navigation,
    routes: routes.routes.map((route) => ({
      key: route.key,
      path: route.path,
      file: route.file,
      title: route.title,
      description: route.description,
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
