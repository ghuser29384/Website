const nativeFetch = window.fetch.bind(window);
const boundaryPaths = new Set([
  "/data/natural-earth-countries.geojson",
  "/data/countries-lite.geojson",
]);

window.fetch = (input, init = {}) => {
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

  if (url.origin !== window.location.origin || !boundaryPaths.has(url.pathname)) {
    return nativeFetch(input, init);
  }

  // The current atlas module creates 1.8 s and 3 s AbortSignals. Replace those
  // signals only for local boundary assets, while preserving every other fetch.
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60000);

  let request;
  try {
    request = new Request(input, { ...init, signal: controller.signal });
  } catch (_error) {
    window.clearTimeout(timeout);
    return nativeFetch(input, init);
  }

  return nativeFetch(request).finally(() => {
    window.clearTimeout(timeout);
  });
};

await import("/script.js?v=94dce133b6afba83-map-timeout-fix-3");
