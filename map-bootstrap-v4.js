const nativeFetch = window.fetch.bind(window);
const PRIMARY_BOUNDARY_PATH = "/data/natural-earth-countries.geojson";
const FALLBACK_BOUNDARY_PATH = "/data/countries-lite.geojson";

const embeddedFallback = {
  type: "FeatureCollection",
  name: "PainMap embedded country fallback",
  features: [
    {
      type: "Feature",
      properties: {
        ADM0_A3: "BRA",
        NAME_LONG: "Brazil",
        CONTINENT: "South America",
        SUBREGION: "South America",
        source: "PainMap embedded coarse fallback",
        source_vintage: "2026-05-31",
      },
      geometry: { type: "Point", coordinates: [-53.2, -10.8] },
    },
    {
      type: "Feature",
      properties: {
        ADM0_A3: "USA",
        NAME_LONG: "United States",
        CONTINENT: "North America",
        SUBREGION: "Northern America",
        source: "PainMap embedded coarse fallback",
        source_vintage: "2026-05-31",
      },
      geometry: { type: "Point", coordinates: [-98.6, 39.8] },
    },
    {
      type: "Feature",
      properties: {
        ADM0_A3: "IND",
        NAME_LONG: "India",
        CONTINENT: "Asia",
        SUBREGION: "Southern Asia",
        source: "PainMap embedded coarse fallback",
        source_vintage: "2026-05-31",
      },
      geometry: { type: "Point", coordinates: [78.9, 22.9] },
    },
    {
      type: "Feature",
      properties: {
        ADM0_A3: "CHN",
        NAME_LONG: "China",
        CONTINENT: "Asia",
        SUBREGION: "Eastern Asia",
        source: "PainMap embedded coarse fallback",
        source_vintage: "2026-05-31",
      },
      geometry: { type: "Point", coordinates: [103.8, 35.9] },
    },
    {
      type: "Feature",
      properties: {
        ADM0_A3: "NGA",
        NAME_LONG: "Nigeria",
        CONTINENT: "Africa",
        SUBREGION: "Western Africa",
        source: "PainMap embedded coarse fallback",
        source_vintage: "2026-05-31",
      },
      geometry: { type: "Point", coordinates: [8.7, 9.1] },
    },
  ],
};

function embeddedFallbackResponse() {
  return new Response(JSON.stringify(embeddedFallback), {
    status: 200,
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-PainMap-Boundary-Fallback": "embedded",
    },
  });
}

window.fetch = async (input, init = {}) => {
  let url;

  try {
    const rawUrl =
      typeof input === "string" || input instanceof URL
        ? input
        : input && input.url;
    url = new URL(rawUrl, window.location.href);
  } catch (_error) {
    return nativeFetch(input, init);
  }

  if (url.origin !== window.location.origin) {
    return nativeFetch(input, init);
  }

  if (url.pathname === FALLBACK_BOUNDARY_PATH) {
    return embeddedFallbackResponse();
  }

  if (url.pathname !== PRIMARY_BOUNDARY_PATH) {
    return nativeFetch(input, init);
  }

  // Ignore script.js's 1.8-second signal for the full local boundary asset.
  // A failed or slow primary attempt is allowed to reject after 12 seconds;
  // script.js then requests the fallback path, which is served immediately above.
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const request = new Request(input, { ...init, signal: controller.signal });
    return await nativeFetch(request);
  } finally {
    window.clearTimeout(timeout);
  }
};

await import("/script.js?v=94dce133b6afba83-map-timeout-fix-4");
