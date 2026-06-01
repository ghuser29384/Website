from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class PainMapClient:
    base_url: str = "https://painmap.org"
    timeout: float = 20.0

    def place_index(self) -> dict[str, Any]:
        return self._json("/v1/places/index.json")

    def coverage(self) -> dict[str, Any]:
        return self._json("/v1/coverage.json")

    def place_profile(self, place_id: str) -> dict[str, Any]:
        return self._json(f"/v1/places/{quote(place_id)}.json")

    def place_measurements(self, place_id: str) -> dict[str, Any]:
        return self._json(f"/v1/places/{quote(place_id)}/measurements.json")

    def place_neighbors(self, place_id: str) -> dict[str, Any]:
        return self._json(f"/v1/places/{quote(place_id)}/neighbors.json")

    def ogc_place_features(self) -> dict[str, Any]:
        return self._json("/ogc/collections/places/items.json")

    def release_manifest(self, release_date: str = "2026-05-31") -> dict[str, Any]:
        return self._json(f"/releases/{quote(release_date)}/manifest.json")

    def release_diff(self, release_date: str = "2026-05-31") -> dict[str, Any]:
        return self._json(f"/releases/{quote(release_date)}/diff.json")

    def _json(self, pathname: str) -> dict[str, Any]:
        base = self.base_url.rstrip("/") + "/"
        url = urljoin(base, pathname.lstrip("/"))
        request = Request(url, headers={"Accept": "application/json", "User-Agent": "painmap-python-client"})

        with urlopen(request, timeout=self.timeout) as response:
            status = getattr(response, "status", 200)

            if status >= 400:
                raise RuntimeError(f"PainMap request failed for {pathname}: HTTP {status}")

            return json.loads(response.read().decode("utf-8"))
