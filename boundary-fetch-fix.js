(() => {
  const nativeFetch = window.fetch.bind(window);
  const boundaryPaths = new Set([
    "/data/natural-earth-countries.geojson",
    "/data/countries-lite.geojson",
  ]);

  window.fetch = (input, init = {}) => {
    let url;

    try {
      const rawUrl = typeof input === "string" || input instanceof URL ? input : input?.url;
      url = new URL(rawUrl, window.location.href);
    } catch (_error) {
      return nativeFetch(input, init);
    }

    if (url.origin !== window.location.origin || !boundaryPaths.has(url.pathname)) {
      return nativeFetch(input, init);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    const boundaryInit = { ...init, signal: controller.signal };

    return nativeFetch(input, boundaryInit).finally(() => {
      window.clearTimeout(timeout);
    });
  };
})();
