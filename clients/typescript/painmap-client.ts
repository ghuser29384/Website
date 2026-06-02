export type EvidenceKind = "direct" | "modeled" | "proxy" | "priority-overlay" | "boundary";
export type GeometryLevel = "world" | "country" | "adm1";

export interface PlaceIndexItem {
  place_id: string;
  place_name: string;
  parent_place_id: string | null;
  iso3: string;
  geometry_level: GeometryLevel;
  boundary_indexed: boolean;
  coverage_status: "canonical_measurements" | "boundary_index_only" | "adm1_context_overlay";
  canonical_measurement_count: number;
  available_layers: string[];
  evidence_kinds: EvidenceKind[];
  page_url: string | null;
  profile_url: string | null;
  measurements_url: string | null;
  neighbors_url: string | null;
  context_url?: string | null;
  adm1_context_url?: string | null;
  adm1_context_count?: number;
  adm1_static_page_count?: number;
  latest_release_id: string;
}

export interface PlaceIndex {
  release_id: string;
  generated_at: string;
  count: number;
  coverage_summary: Record<string, unknown>;
  items: PlaceIndexItem[];
}

export interface Coverage {
  release_id: string;
  generated_at: string;
  last_release_date: string;
  coverage_status: Record<string, unknown>;
  known_sparse_areas: Array<Record<string, string>>;
}

export interface ReleaseMode {
  id: "snapshot" | "live";
  label: string;
  badge: string;
  cache_rule: string;
  replay_rule: string;
  network_behavior: string;
  included_surfaces?: string[];
  upstream_sources?: string[];
}

export interface ReleaseModes {
  release_id: string;
  generated_at: string;
  default_mode: "snapshot" | "live";
  local_event_name: string;
  modes: ReleaseMode[];
  ui_contract: Record<string, string>;
}

export interface Adm1ContextItem {
  place_id: string;
  place_name: string;
  parent_place_id: string;
  parent_place_name: string;
  iso3: string;
  geometry_level: "adm1";
  adm1_key: string;
  adm1_geo_id: string | null;
  coverage_status: "adm1_context_overlay";
  page_url: string | null;
  context_url: string;
  source_ids: string[];
  source_vintage: string;
  relevance_score: number;
  adm1_priority_rank: number;
  poverty_context: Record<string, unknown>;
}

export interface Adm1ContextIndex {
  release_id: string;
  generated_at: string;
  source_id: string;
  coverage_status: "adm1_context_overlay";
  count: number;
  static_page_count: number;
  items: Adm1ContextItem[];
}

export interface PlaceMeasurement {
  measurement_id: string;
  release_id: string;
  place_id: string;
  place_name: string;
  parent_place_id: string | null;
  iso3: string;
  geometry_level: GeometryLevel;
  layer_id: string;
  layer_name: string;
  evidence_kind: EvidenceKind;
  value_type: string;
  raw_value: number;
  normalized_value?: number;
  display_value: string;
  unit_label: string;
  ranking_mode: string;
  rank_value?: number;
  confidence_low: number;
  confidence_high: number;
  uncertainty_class: string;
  source_ids: string[];
  provenance_id: string;
  source_vintage: string;
  method_note: string;
  license_id: string;
  data_license_uri?: string;
  attribution?: string;
  download_url?: string;
}

export interface PlaceProfile {
  release_id: string;
  place_id: string;
  place_name: string;
  parent_place_id: string | null;
  iso3: string;
  geometry_level: GeometryLevel;
  profile_url: string | null;
  data_url: string;
  compare_url: string;
  measurements_url: string;
  neighbors_url: string;
  evidence_kinds: EvidenceKind[];
  source_ids: string[];
  measurements: PlaceMeasurement[];
}

export interface PlaceMeasurementsResponse {
  release_id: string;
  place_id: string;
  measurements: PlaceMeasurement[];
}

export interface NeighborPlace {
  place_id: string;
  place_name: string;
  geometry_level: GeometryLevel;
  coverage_status: "canonical_measurements" | "boundary_index_only";
  canonical_measurement_count: number;
  profile_url: string | null;
  measurements_url: string | null;
  neighbors_url: string;
  relation?: "shared_boundary" | "nearest_centroid";
  shared_boundary_point_count?: number;
  centroid_distance_km?: number;
}

export interface PlaceNeighbors {
  release_id: string;
  generated_at: string;
  place_id: string;
  place_name: string;
  geometry_level: GeometryLevel;
  border_neighbors: NeighborPlace[];
  nearby_places: NeighborPlace[];
  child_places?: NeighborPlace[];
}

export interface OgcFeatureCollection {
  type: "FeatureCollection";
  title?: string;
  release_id?: string;
  numberMatched?: number;
  numberReturned?: number;
  features: OgcFeature[];
}

export interface OgcFeature {
  type: "Feature";
  id: string;
  bbox?: number[];
  properties: Record<string, unknown>;
  geometry: Record<string, unknown>;
  links?: Array<Record<string, string>>;
}

export interface OgcItemIndex {
  release_id: string;
  generated_at: string;
  collection_id: "places";
  count: number;
  partitioning: string;
  full_collection_url: string;
  items: Array<{
    place_id: string;
    place_name: string;
    geometry_level: "country";
    coverage_status: string;
    bbox: number[] | null;
    item_url: string;
    neighbors_url: string;
    profile_url: string | null;
  }>;
}

export interface ReleaseDiff {
  release_id: string;
  generated_at: string;
  previous_release_id: string | null;
  comparison_type: string;
  summary: string;
  current_release: Record<string, number>;
  added_contract_surfaces: string[];
  notable_changes: Array<Record<string, string>>;
}

export interface ReleaseManifest {
  release_id: string;
  release_date: string;
  generated_at: string;
  immutable: boolean;
  site: string;
  artifacts: Array<{
    path: string;
    sha256: string;
    bytes: number;
  }>;
}

export class PainMapClient {
  readonly baseUrl: string;

  constructor(baseUrl = "https://painmap.org") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async placeIndex(): Promise<PlaceIndex> {
    return this.json<PlaceIndex>("/v1/places/index.json");
  }

  async adm1ContextIndex(): Promise<Adm1ContextIndex> {
    return this.json<Adm1ContextIndex>("/v1/adm1/index.json");
  }

  async countryAdm1Context(placeId: string): Promise<Adm1ContextIndex> {
    return this.json<Adm1ContextIndex>(`/v1/places/${encodeURIComponent(placeId)}/adm1.json`);
  }

  async coverage(): Promise<Coverage> {
    return this.json<Coverage>("/v1/coverage.json");
  }

  async releaseModes(): Promise<ReleaseModes> {
    return this.json<ReleaseModes>("/data/release-modes.json");
  }

  async placeProfile(placeId: string): Promise<PlaceProfile> {
    return this.json<PlaceProfile>(`/v1/places/${encodeURIComponent(placeId)}.json`);
  }

  async placeMeasurements(placeId: string): Promise<PlaceMeasurementsResponse> {
    return this.json<PlaceMeasurementsResponse>(`/v1/places/${encodeURIComponent(placeId)}/measurements.json`);
  }

  async placeNeighbors(placeId: string): Promise<PlaceNeighbors> {
    return this.json<PlaceNeighbors>(`/v1/places/${encodeURIComponent(placeId)}/neighbors.json`);
  }

  async ogcPlaceFeatures(): Promise<OgcFeatureCollection> {
    return this.json<OgcFeatureCollection>("/ogc/collections/places/items.json");
  }

  async ogcPlaceItemIndex(): Promise<OgcItemIndex> {
    return this.json<OgcItemIndex>("/ogc/collections/places/item-index.json");
  }

  async ogcPlaceFeature(placeId: string): Promise<OgcFeature> {
    return this.json<OgcFeature>(`/ogc/collections/places/items/${encodeURIComponent(placeId)}.json`);
  }

  async releaseManifest(releaseDate = "2026-05-31"): Promise<ReleaseManifest> {
    return this.json<ReleaseManifest>(`/releases/${encodeURIComponent(releaseDate)}/manifest.json`);
  }

  async releaseDiff(releaseDate = "2026-05-31"): Promise<ReleaseDiff> {
    return this.json<ReleaseDiff>(`/releases/${encodeURIComponent(releaseDate)}/diff.json`);
  }

  private async json<T>(pathname: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${pathname}`);

    if (!response.ok) {
      throw new Error(`PainMap request failed for ${pathname}: HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
