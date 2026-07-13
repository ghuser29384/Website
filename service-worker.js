const CACHE_NAME = "painmap-emergency-boundaries-v1";
const BOUNDARY_PATHS = new Set([
  "/data/natural-earth-countries.geojson",
  "/data/countries-lite.geojson",
]);

const EMBEDDED_BOUNDARIES = {
  type: "FeatureCollection",
  name: "PainMap emergency country fallback",
  features: [
    {
      type: "Feature",
      properties: {
        ADM0_A3: "BRA",
        NAME_LONG: "Brazil",
        CONTINENT: "South America",
        SUBREGION: "South America",
        source: "PainMap emergency embedded fallback",
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
        source: "PainMap emergency embedded fallback",
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
        source: "PainMap emergency embedded fallback",
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
        source: "PainMap emergency embedded fallback",
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
        source: "PainMap emergency embedded fallback",
        source_vintage: "2026-05-31",
      },
      geometry: { type: "Point", coordinates: [8.7, 9.1] },
    },
  ],
};

function embeddedBoundaryResponse() {
  return new Response(JSON.stringify(EMBEDDED_BOUNDARIES), {
    status: 200,
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-PainMap-Boundary-Fallback": "embedded",
    },
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !BOUNDARY_PATHS.has(url.pathname)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = new Request(url.pathname, { method: "GET" });
      const cached = await cache.match(cacheKey);

      const networkUpdate = fetch(request, { cache: "reload" })
        .then(async (response) => {
          if (response && response.ok) {
            await cache.put(cacheKey, response.clone());
          }
        })
        .catch(() => undefined);

      event.waitUntil(networkUpdate);

      if (cached) {
        return cached;
      }

      return embeddedBoundaryResponse();
    })()
  );
});
