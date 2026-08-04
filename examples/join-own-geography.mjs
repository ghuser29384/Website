import { readFileSync } from "node:fs";
import path from "node:path";

const csvPath = process.argv[2] || "examples/custom-geography.csv";
const baseUrl = process.env.PAINMAP_BASE_URL || "https://painmaps.org";
const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

function endpoint(pathname) {
  return new URL(pathname.replace(/^\//, ""), base).href;
}

async function fetchJson(pathname) {
  const response = await fetch(endpoint(pathname));

  if (!response.ok) {
    throw new Error(`${pathname} failed with HTTP ${response.status}`);
  }

  return response.json();
}

function parseSimpleCsv(file) {
  const lines = readFileSync(path.resolve(process.cwd(), file), "utf8").trim().split(/\r?\n/);
  const headers = lines.shift().split(",");

  return lines.map((line) =>
    Object.fromEntries(
      line.split(",").map((value, index) => [headers[index], value])
    )
  );
}

const [placeIndex, ogcItemIndex] = await Promise.all([
  fetchJson("/v1/places/index.json"),
  fetchJson("/ogc/collections/places/item-index.json"),
]);

const placesById = new Map(placeIndex.items.map((item) => [item.place_id, item]));
const ogcItemsById = new Map(ogcItemIndex.items.map((item) => [item.place_id, item]));
const userRows = parseSimpleCsv(csvPath);

console.log(`Joined ${userRows.length} user rows to PainMap release ${placeIndex.release_id}`);
console.log("place_id,portfolio_region,place_name,coverage_status,measurements_url,ogc_item_url");

for (const userRow of userRows) {
  const place = placesById.get(userRow.place_id);
  const ogcItem = ogcItemsById.get(userRow.place_id);

  if (!place) {
    console.log(`${userRow.place_id},${userRow.portfolio_region},NOT_FOUND,missing,,`);
    continue;
  }

  console.log(
    [
      userRow.place_id,
      userRow.portfolio_region,
      place.place_name,
      place.coverage_status,
      place.measurements_url || "",
      ogcItem?.item_url || "",
    ].join(",")
  );
}
