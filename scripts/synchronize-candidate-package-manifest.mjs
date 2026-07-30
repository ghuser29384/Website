import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageDirectory = path.join(root, "data/candidates/country-data-expansion");
const manifestPath = path.join(packageDirectory, "package-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

let changes = 0;
for (const entry of manifest.files ?? []) {
  const relativePath = String(entry.file ?? "").trim();
  const filePath = path.resolve(packageDirectory, relativePath);
  const packagePrefix = `${path.resolve(packageDirectory)}${path.sep}`;

  if (!relativePath || !filePath.startsWith(packagePrefix)) {
    throw new Error(`Unsafe candidate package manifest path: ${relativePath || "<empty>"}`);
  }

  if (!existsSync(filePath)) {
    throw new Error(`Candidate package manifest references a missing file: ${relativePath}`);
  }

  const bytes = readFileSync(filePath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  if (entry.sha256 !== sha256) {
    entry.sha256 = sha256;
    changes += 1;
  }

  if (entry.bytes !== bytes.length) {
    entry.bytes = bytes.length;
    changes += 1;
  }
}

if (changes > 0) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(`Synchronized ${changes} candidate package manifest field${changes === 1 ? "" : "s"}.`);
