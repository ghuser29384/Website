const CACHE_VERSION = "painmap-service-worker-v4";
const STATIC_CACHE = `painmap-static-${CACHE_VERSION}`;
const COUNTRY_BOUNDARY_PATH = "/data/natural-earth-countries.geojson";
const COUNTRY_BOUNDARY_FALLBACK_PATH = "/data/countries-lite.geojson";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/compare/index.html",
  "/places/index.html",
  "/offline.html",
  "/styles.css",
  "/script.js",
  "/compare.js",
  "/places-coverage.js",
  "/v1/coverage.json",
  "/v1/releases.json",
  "/data/release-modes.json",
  COUNTRY_BOUNDARY_FALLBACK_PATH,
];
const JSON_PATH_PREFIXES = [
  "/v1/",
  "/data/",
  "/place/",
  "/atlas/",
  "/updates/",
  "/methods/",
  "/api/",
];
const STATIC_EXTENSIONS = [
  ".css",
  ".js",
  ".json",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".map",
];
const OFFLINE_FALLBACK = "/offline.html";

function cacheLookupRequest(request) {
  const target = typeof request === "string" ? request : request.url;
  const url = new URL(target, self.location.href);

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = `${pathname}index.html`;
  }

  return new Request(pathname, { method: "GET" });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        CORE_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch (_error) {
            // Keep installation resilient if optional assets are temporarily unavailable.
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(async (key) => {
          if (key === STATIC_CACHE) {
            return;
          }
          if (key.startsWith("painmap-static-")) {
            await caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAssetRequest(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  const pathname = url.pathname.toLowerCase();
  if (pathname === "/") {
    return true;
  }

  if (pathname.endsWith("/")) {
    return false;
  }

  if (CORE_ASSETS.includes(pathname)) {
    return true;
  }

  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function isDataRequest(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  const pathname = url.pathname.toLowerCase();
  if (pathname.endsWith(".json") || pathname.endsWith(".geojson")) {
    return true;
  }

  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json") || accept.includes("application/geo+json")) {
    return true;
  }

  return JSON_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function fetchAndCache(request, cache, cacheKey) {
  const resultPromise = fetch(request)
    .then((response) => {
      const cacheWrite =
        response && response.ok
          ? cache.put(cacheKey, response.clone()).catch(() => undefined)
          : Promise.resolve();

      return { response, cacheWrite };
    })
    .catch(() => ({ response: null, cacheWrite: Promise.resolve() }));

  return {
    response: resultPromise.then((result) => result.response),
    completion: resultPromise.then((result) => result.cacheWrite).catch(() => undefined),
  };
}

async function countryBoundaryResponse(request, backgroundTasks) {
  const cache = await caches.open(STATIC_CACHE);
  const primaryKey = cacheLookupRequest(request);
  const cachedPrimary = await caches.match(primaryKey);
  const primaryFetch = fetchAndCache(request, cache, primaryKey);
  backgroundTasks.push(primaryFetch.completion);

  if (cachedPrimary) {
    return cachedPrimary;
  }

  const fallbackRequest = new Request(COUNTRY_BOUNDARY_FALLBACK_PATH, { method: "GET" });
  const fallbackKey = cacheLookupRequest(fallbackRequest);
  const cachedFallback = await caches.match(fallbackKey);

  if (cachedFallback) {
    return cachedFallback;
  }

  const fallbackFetch = fetchAndCache(fallbackRequest, cache, fallbackKey);
  backgroundTasks.push(fallbackFetch.completion);
  const fallbackResponse = await fallbackFetch.response;

  if (fallbackResponse && fallbackResponse.ok) {
    return fallbackResponse;
  }

  const primaryResponse = await primaryFetch.response;
  if (primaryResponse) {
    return primaryResponse;
  }

  return new Response("", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function staleWhileRevalidate(request, backgroundTasks) {
  const cache = await caches.open(STATIC_CACHE);
  const cacheKey = cacheLookupRequest(request);
  const cachePromise = caches.match(cacheKey);
  const networkFetch = fetchAndCache(request, cache, cacheKey);
  backgroundTasks.push(networkFetch.completion);

  const cachedResponse = await cachePromise;
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkFetch.response;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response("", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function respondWithBackground(event, responseFactory) {
  const backgroundTasks = [];
  const responsePromise = Promise.resolve().then(() => responseFactory(backgroundTasks));

  event.respondWith(responsePromise);
  event.waitUntil(
    responsePromise
      .catch(() => undefined)
      .then(() => Promise.allSettled(backgroundTasks))
      .then(() => undefined)
  );
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cacheKey = cacheLookupRequest(request);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch (_error) {
    const cached = await caches.match(cacheKey);
    if (cached) {
      return cached;
    }

    const fallback = await cache.match(OFFLINE_FALLBACK);
    if (fallback) {
      return fallback;
    }

    return new Response("PainMap offline. This page is not available from cache.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isNavigate = request.mode === "navigate";
  const isStatic = isStaticAssetRequest(request);
  const isJson = isDataRequest(request);

  if (isNavigate) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname === COUNTRY_BOUNDARY_PATH) {
    respondWithBackground(event, (backgroundTasks) =>
      countryBoundaryResponse(request, backgroundTasks)
    );
    return;
  }

  if (isStatic || isJson) {
    respondWithBackground(event, (backgroundTasks) =>
      staleWhileRevalidate(request, backgroundTasks)
    );
    return;
  }
});
