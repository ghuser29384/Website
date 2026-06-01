from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "clients" / "python"))

from painmap_client import PainMapClient


def main() -> None:
    place_id = sys.argv[1] if len(sys.argv) > 1 else "IND"
    profile = PainMapClient().place_profile(place_id)

    print(f"{profile['place_name']} ({profile['place_id']})")
    print(f"Release: {profile['release_id']}")
    print(f"Measurements: {len(profile['measurements'])}")

    for row in profile["measurements"]:
        print(f"- {row['layer_name']}: {row['display_value']} [{row['evidence_kind']}, {row['uncertainty_class']}]")


if __name__ == "__main__":
    main()
