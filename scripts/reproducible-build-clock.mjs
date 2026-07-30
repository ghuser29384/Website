import { readFileSync } from "node:fs";
import path from "node:path";

const NativeDate = globalThis.Date;

function parseTimestamp(value) {
  const parsed = NativeDate.parse(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8"));
  } catch {
    return null;
  }
}

function sourceDateEpochTimestamp(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) return null;

  const milliseconds = Number(normalized) * 1000;
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function releaseManifestTimestamp() {
  const latest = readJson("latest/manifest.json");
  const manifestUrl = String(latest?.release_manifest_url ?? "").trim();

  if (manifestUrl) {
    try {
      const manifestPath = new URL(manifestUrl, "https://painmaps.org")
        .pathname.replace(/^\/+/, "");
      const releaseManifest = readJson(manifestPath);
      const releaseTimestamp = parseTimestamp(releaseManifest?.generated_at);
      if (releaseTimestamp !== null) return releaseTimestamp;
    } catch {
      // Fall through to other stable release metadata.
    }
  }

  const latestTimestamp = parseTimestamp(latest?.generated_at);
  if (latestTimestamp !== null) return latestTimestamp;

  const releaseDate = String(latest?.latest_release_id ?? "").match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return releaseDate ? parseTimestamp(`${releaseDate}T00:00:00Z`) : null;
}

const fixedTimestamp =
  parseTimestamp(process.env.PAINMAP_BUILD_TIMESTAMP) ??
  sourceDateEpochTimestamp(process.env.SOURCE_DATE_EPOCH) ??
  releaseManifestTimestamp();

if (fixedTimestamp === null) {
  throw new Error(
    "Unable to resolve a reproducible PainMap build timestamp. Set PAINMAP_BUILD_TIMESTAMP or SOURCE_DATE_EPOCH.",
  );
}

class ReproducibleDate extends NativeDate {
  constructor(...args) {
    super(...(args.length ? args : [fixedTimestamp]));
  }

  static now() {
    return fixedTimestamp;
  }
}

globalThis.Date = ReproducibleDate;
