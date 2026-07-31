import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const siteOrigin = "https://painmap.org";
const correctionEndpoint = "https://github.com/ghuser29384/Website/issues/new";
const checkOnly = process.argv.includes("--check");

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(absolute(relativePath), "utf8"));
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function routeLabel(route) {
  return String(route.title).replace(/ \| PainMap$/, "");
}

function routeCanonical(route) {
  return `${siteOrigin}${route.canonicalPath || route.path}`;
}

function correctionUrl({ releaseId, route, claimId, subjectLabel }) {
  const body = [
    `Release: ${releaseId}`,
    "Subject type: route",
    `Subject id: ${route.key}`,
    `Claim id: ${claimId}`,
    `Route: ${route.path}`,
    "Claims context: Route-level correction surface and route metadata",
    "Please include source links, scope, and what should be corrected.",
  ].join("\n");
  const query = new URLSearchParams({
    title: `[PainMap correction] ${releaseId}: ${subjectLabel}`,
    body,
    labels: "correction",
  });
  return `${correctionEndpoint}?${query.toString()}`;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("data/routes.json must contain an object");
  }
  if (!manifest.releaseId || !manifest.generatedAt || !Array.isArray(manifest.routes)) {
    throw new Error("data/routes.json must include releaseId, generatedAt, and routes");
  }
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(String(manifest.generatedAt))) {
    throw new Error(`data/routes.json generatedAt is not an ISO date or timestamp: ${manifest.generatedAt}`);
  }

  const seen = {
    key: new Set(),
    path: new Set(),
    file: new Set(),
  };

  for (const route of manifest.routes) {
    for (const field of ["key", "path", "file", "title", "description"]) {
      if (!route?.[field] || typeof route[field] !== "string") {
        throw new Error(`Route is missing non-empty ${field}: ${JSON.stringify(route)}`);
      }
    }
    if (/\s/.test(route.key)) {
      throw new Error(`Route key must not contain whitespace: ${route.key}`);
    }
    if (!route.path.startsWith("/") || !route.path.endsWith("/")) {
      throw new Error(`Route path must start and end with '/': ${route.path}`);
    }
    if (
      route.canonicalPath !== undefined &&
      (typeof route.canonicalPath !== "string" ||
        !route.canonicalPath.startsWith("/") ||
        !route.canonicalPath.endsWith("/"))
    ) {
      throw new Error(`Route canonicalPath must start and end with '/': ${route.canonicalPath}`);
    }
    if (!route.file.endsWith(".html")) {
      throw new Error(`Route file must be an HTML file: ${route.file}`);
    }
    if (!existsSync(absolute(route.file))) {
      throw new Error(`Route file does not exist: ${route.file}`);
    }

    for (const field of ["key", "path", "file"]) {
      if (seen[field].has(route[field])) {
        throw new Error(`Duplicate route ${field}: ${route[field]}`);
      }
      seen[field].add(route[field]);
    }
  }
}

function buildSitemap(manifest) {
  const lastmod = String(manifest.generatedAt).slice(0, 10);
  const entries = manifest.routes.map((route) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(`${siteOrigin}${route.path}`)}</loc>`,
      `    <lastmod>${xmlEscape(lastmod)}</lastmod>`,
      "  </url>",
    ].join("\n")
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

function buildRouteSmoke(manifest) {
  return {
    release_id: manifest.releaseId,
    generated_at: manifest.generatedAt,
    routes: manifest.routes.map((route) => ({
      key: route.key,
      path: route.path,
      file: route.file,
      expected_title: route.title,
      expected_description: route.description,
      expected_canonical: routeCanonical(route),
    })),
  };
}

function buildClaims(manifest, currentClaims) {
  if (!currentClaims || typeof currentClaims !== "object" || !Array.isArray(currentClaims.claims)) {
    throw new Error("data/claims.json must contain a claims array");
  }

  const preservedClaims = currentClaims.claims.filter((claim) => claim?.subject_type !== "route");
  const routeClaims = manifest.routes.map((route) => {
    const claimId = `claim.${manifest.releaseId}.route.${route.key}`;
    const subjectLabel = `${routeLabel(route)} route`;
    return {
      claim_id: claimId,
      release_id: manifest.releaseId,
      subject_type: "route",
      subject_id: route.key,
      subject_label: subjectLabel,
      route: route.path,
      coverage_status: route.generated || "route",
      context: "Route-level correction surface and route metadata",
      correction_url: correctionUrl({
        releaseId: manifest.releaseId,
        route,
        claimId,
        subjectLabel,
      }),
    };
  });

  const claims = [...preservedClaims, ...routeClaims].sort((left, right) =>
    String(left.claim_id).localeCompare(String(right.claim_id))
  );

  return {
    ...currentClaims,
    release_id: manifest.releaseId,
    generated_at: manifest.generatedAt,
    count: claims.length,
    claims,
  };
}

function synchronize(relativePath, expectedText) {
  const filePath = absolute(relativePath);
  const currentText = existsSync(filePath) ? readFileSync(filePath, "utf8") : null;
  if (currentText === expectedText) {
    return false;
  }
  if (checkOnly) {
    throw new Error(`${relativePath} is not synchronized with data/routes.json`);
  }
  writeFileSync(filePath, expectedText, "utf8");
  return true;
}

const manifest = readJson("data/routes.json");
validateManifest(manifest);
const claims = buildClaims(manifest, readJson("data/claims.json"));
const changes = [
  synchronize("sitemap.xml", buildSitemap(manifest)),
  synchronize("data/route-smoke.json", jsonText(buildRouteSmoke(manifest))),
  synchronize("data/claims.json", jsonText(claims)),
].filter(Boolean).length;

console.log(
  `${checkOnly ? "Verified" : "Synchronized"} ${manifest.routes.length} routes across sitemap, route smoke, and ${manifest.routes.length} route claims (${changes} file${changes === 1 ? "" : "s"} changed).`
);
