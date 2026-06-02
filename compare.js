const KNOWN_PLACES = {
  WLD: {
    label: "Whole Earth",
    href: "/v1/places/WLD.json",
    detail: "Release world profile",
  },
  BRA: {
    label: "Brazil",
    href: "/place/BRA/",
    detail: "Canonical country profile",
  },
  IND: {
    label: "India",
    href: "/place/IND/",
    detail: "Canonical country profile",
  },
};

function normalizePlaceToken(value) {
  return String(value || "").trim().slice(0, 96);
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

function placeInfo(token) {
  const normalized = normalizePlaceToken(token);
  const known = KNOWN_PLACES[normalized.toUpperCase()];

  if (known) {
    return { id: normalized.toUpperCase(), ...known };
  }

  const [countryId, ...provinceParts] = normalized.split(":");
  const provinceName = provinceParts.join(":").trim();

  if (countryId && provinceName) {
    const parentId = countryId.toUpperCase();
    return {
      id: `${parentId}:${provinceName}`,
      label: `${provinceName}, ${parentId}`,
      href: `/compare/?places=${encodeURIComponent(normalized)}`,
      detail: "ADM1 compare request",
    };
  }

  return {
    id: normalized.toUpperCase(),
    label: normalized.toUpperCase(),
    href: "/v1/places/index.json",
    detail: "Boundary-indexed place request",
  };
}

function renderRequestedPlaces() {
  const status = document.getElementById("compare-url-status");
  const list = document.getElementById("compare-requested-list");

  if (!status || !list) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.has("places") || params.has("place");
  const places = requestedPlaceTokens().map(placeInfo);

  status.textContent = fromUrl
    ? `Showing requested compare places from this URL: ${places.map((place) => place.label).join(", ")}. Canonical release rows remain visibly labeled below.`
    : "Default release example: Brazil and India. Atlas place buttons can open this route with a requested place list.";
  list.textContent = "";

  for (const place of places) {
    const link = document.createElement("a");
    link.className = "compare-chip";
    link.href = place.href;
    link.textContent = `${place.label} · ${place.detail}`;
    list.appendChild(link);
  }
}

renderRequestedPlaces();
