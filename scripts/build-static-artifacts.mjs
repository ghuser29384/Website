import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const COUNTRY_DATA_CANDIDATE_DIR = "data/candidates/country-data-expansion";

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(absolute(relativePath), "utf8"));
}

function readJsonOptional(relativePath) {
  const filePath = absolute(relativePath);

  if (!existsSync(filePath)) {
    return null;
  }

  return readJson(relativePath);
}

function writeJson(relativePath, value) {
  writeFileSync(absolute(relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(relativePath, value) {
  writeFileSync(absolute(relativePath), value, "utf8");
}

function sha256(relativePath) {
  const filePath = absolute(relativePath);
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function bytes(relativePath) {
  return readFileSync(absolute(relativePath)).length;
}

function sha256String(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseDateMs(value) {
  const parsed = Date.parse(String(value || "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

function asMappedSet(value, mapValue) {
  const values = asArray(value);
  const output = new Set();

  for (const entry of values) {
    const mapped = String(mapValue ? mapValue(entry) : entry).trim();
    if (mapped.length > 0) {
      output.add(mapped);
    }
  }

  return output;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter((entry) => String(entry || "").trim()).map((entry) => String(entry).trim())));
}

function uniqueSortedStrings(values) {
  return uniqueStrings(values).sort((a, b) => a.localeCompare(b));
}

function asObjectRows(value) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
}

function readCandidateJson(fileName) {
  return readJsonOptional(`${COUNTRY_DATA_CANDIDATE_DIR}/${fileName}`);
}

function countBy(rows, fieldName) {
  const counts = {};

  for (const row of rows || []) {
    const raw = typeof fieldName === "function" ? fieldName(row) : row?.[fieldName];
    const key = String(raw ?? "unknown").trim() || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function normalizeIso3(value) {
  return String(value || "").trim().toUpperCase();
}

function asReasonList(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((entry) => String(entry || "").trim()));
  }

  if (typeof value === "string" && value.trim()) {
    return uniqueStrings(value.split(/[;|]/).map((entry) => entry.trim()));
  }

  return [];
}

function hasCandidateValue(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function candidateMissingInputToken(reason) {
  const normalized = String(reason || "").toLowerCase();

  if (normalized.includes("source snapshot")) {
    return "candidate_source_snapshot";
  }

  if (normalized.includes("license")) {
    return "candidate_license_review";
  }

  if (normalized.includes("numeric") || normalized.includes("qa")) {
    return "candidate_numeric_value_QA";
  }

  if (normalized.includes("coverage artifact")) {
    return "candidate_place_registry_mapping";
  }

  return "candidate_release_review";
}

function currentCandidateBlockers(reasons) {
  const blockers = new Set();

  for (const reason of reasons || []) {
    const normalized = String(reason || "").toLowerCase();

    if (normalized.includes("source snapshot")) {
      blockers.add("source snapshots not captured");
    } else if (normalized.includes("license")) {
      blockers.add("licenses not fully verified");
    } else if (normalized.includes("numeric") || normalized.includes("qa")) {
      blockers.add("numeric values not fetched or QAed");
    }
  }

  return Array.from(blockers);
}

function appendSentence(base, addition) {
  const baseText = String(base || "").trim();
  const additionText = String(addition || "").trim();

  if (!additionText) {
    return baseText;
  }

  if (!baseText) {
    return additionText;
  }

  if (baseText.includes(additionText)) {
    return baseText;
  }

  return `${baseText} ${additionText}`;
}

function mergeCoverageStrings(baseValue, rawValue) {
  return uniqueStrings([...(baseValue || []), ...(rawValue || [])]);
}

function mergeGroupRequirements(baseRequirement, rawRequirement) {
  if (!baseRequirement && !rawRequirement) {
    return {};
  }

  return {
    ...baseRequirement,
    ...rawRequirement,
    required_place_fields: mergeCoverageStrings(
      asArray(baseRequirement?.required_place_fields),
      asArray(rawRequirement?.required_place_fields)
    ),
    required_layer_ids: mergeCoverageStrings(
      asArray(baseRequirement?.required_layer_ids),
      asArray(rawRequirement?.required_layer_ids)
    ),
    required_source_ids: mergeCoverageStrings(
      asArray(baseRequirement?.required_source_ids),
      asArray(rawRequirement?.required_source_ids)
    ),
    source_priority_ladder: mergeCoverageStrings(
      asArray(baseRequirement?.source_priority_ladder),
      asArray(rawRequirement?.source_priority_ladder)
    ),
  };
}

function pickFirst(valueCandidates) {
  for (const value of valueCandidates) {
    if (value === undefined || value === null) {
      continue;
    }

    if (String(value).trim().length === 0) {
      continue;
    }

    return String(value);
  }

  return null;
}

function buildMapById(rows, key = "id") {
  const map = new Map();

  for (const row of rows || []) {
    const id = String(row?.[key] || "").trim();
    if (!id) {
      continue;
    }
    map.set(id, row);
  }

  return map;
}

function extractNumeric(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isoDateOnly(dateValue) {
  const asDate = dateValue && Date.parse(dateValue) ? new Date(dateValue) : new Date();
  return asDate.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function normalizeReleaseDate(value, fallback = new Date()) {
  const releaseDate = String(value ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return releaseDate;
  }

  const parsed = Date.parse(releaseDate);

  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return String(fallback).slice(0, 10);
}

function normalizeCoverageStatus(value) {
  const status = String(value ?? "").trim();

  switch (status) {
    case "canonical_measurements":
    case "boundary_index_only":
    case "adm1_context_overlay":
    case "no_data":
      return status;
    default:
      return "boundary_index_only";
  }
}

function normalizeGapStatus(status) {
  if (status === "canonical_measurements") {
    return "canonical";
  }

  if (status === "no_data") {
    return "no_data";
  }

  if (status === "boundary_index_only") {
    return "boundary_only";
  }

  return "blocked";
}

function releaseRankingReadinessSummary(counts) {
  const canonicalProfiles = counts.canonicalCountryProfiles;
  const countryBoundaries = counts.countryBoundariesIndexed;
  const evidenceReady = counts.directEvidence + counts.proxyEvidence + counts.priorityOverlayEvidence + counts.releaseMeasurements;
  const ratio = countryBoundaries > 0 ? canonicalProfiles / countryBoundaries : 0;
  const rule = "canonical_country_profiles >= 10 and canonical_ratio >= 0.35 and (direct + proxy + priority_overlay + release_measurements) >= 10";
  const ready = canonicalProfiles >= 10 && ratio >= 0.35 && evidenceReady >= 10;

  if (ready) {
    return {
      ready: true,
      enabled: true,
      rule,
      reason: "Global ranking visibility is enabled by this release coverage gate.",
      release_note_url: "/updates/",
      summary_generated_at: isoDateOnly(new Date()),
    };
  }

  const reasons = [];

  if (canonicalProfiles < 10) {
    reasons.push(`fewer than 10 canonical country profiles (${canonicalProfiles})`);
  }

  if (countryBoundaries > 0 && canonicalProfiles / countryBoundaries < 0.35) {
    reasons.push(
      `canonical ratio below minimum threshold (${canonicalProfiles} canonical profiles across ${countryBoundaries} indexed country boundaries)`
    );
  }

  if (evidenceReady < 10) {
    reasons.push(`fewer than 10 evidence rows (${evidenceReady})`);
  }

  if (!reasons.length) {
    reasons.push("coverage-first safety checks are required for this release.");
  }

  return {
    ready: false,
    enabled: false,
    rule,
    reason: reasons.join(" · "),
    release_note_url: "/updates/",
    summary_generated_at: isoDateOnly(new Date()),
  };
}

function buildPlaceCoverageContext(measurementRows) {
  const layerIds = new Set();
  const sourceIds = new Set();
  const evidenceKinds = new Set();

  for (const row of measurementRows) {
    if (row?.layer_id) {
      layerIds.add(String(row.layer_id));
    }

    if (Array.isArray(row.source_ids)) {
      for (const sourceId of row.source_ids) {
        if (String(sourceId).trim()) {
          sourceIds.add(String(sourceId));
        }
      }
    }

    if (row?.evidence_kind) {
      evidenceKinds.add(String(row.evidence_kind));
    }
  }

  return {
    layerIds: Array.from(layerIds),
    sourceIds: Array.from(sourceIds),
    evidenceKinds: Array.from(evidenceKinds),
  };
}

function evaluateGroupCoverage({
  groupId,
  requirement = {},
  countryRow,
  countryRows,
  sourceFreshnessById = new Map(),
  sourceById = new Map(),
  layerById = new Map(),
  releaseDateMs,
}) {
  const requiredPlaceFields = asArray(requirement.required_place_fields);
  const requiredLayerIds = asArray(requirement.required_layer_ids);
  const requiredSourceIds = asArray(requirement.required_source_ids);
  const preferredSourceIds = asArray(requirement.source_priority_ladder);
  const minimumHits = extractNumeric(requirement.minimum_hits || 0, 0) || 1;
  const minimumLayerHits = requiredLayerIds.length ? extractNumeric(requirement.minimum_layer_hits || 0, 0) || 1 : 0;
  const minimumSourceHits = requiredSourceIds.length ? extractNumeric(requirement.minimum_source_hits || 0, 0) || 1 : 0;
  const rows = Array.isArray(countryRows) ? countryRows : [];
  const { layerIds, sourceIds, evidenceKinds } = buildPlaceCoverageContext(rows);

  const missing = [];
  const blocked = new Set();
  const stale = new Set();
  const policy = [];

  for (const field of requiredPlaceFields) {
    if (field === "boundary_indexed") {
      if (!Boolean(countryRow?.[field])) {
        missing.push(field);
      }
      continue;
    }

    if (!countryRow?.[field]) {
      missing.push(field);
    }
  }

  const matchedLayerIds = requiredLayerIds.filter((layerId) => layerIds.includes(layerId));
  const matchedSourceIds = requiredSourceIds.filter((sourceId) => sourceIds.includes(sourceId));
  const preferredSourceMatch = preferredSourceIds.filter((sourceId) => sourceIds.includes(sourceId));

  if (
    minimumLayerHits > 0 &&
    requiredLayerIds.length > 0 &&
    matchedLayerIds.length < Math.min(minimumLayerHits, requiredLayerIds.length)
  ) {
    missing.push(`${groupId}:layer`);
  }

  if (
    minimumSourceHits > 0 &&
    requiredSourceIds.length > 0 &&
    matchedSourceIds.length < Math.min(minimumSourceHits, requiredSourceIds.length)
  ) {
    missing.push(`${groupId}:source`);
  }

  if (requiredSourceIds.length > 0 && preferredSourceIds.length > 0 && matchedSourceIds.length > 0 && !preferredSourceMatch.length) {
    policy.push(`${groupId}:source_priority`);
  }

  for (const sourceId of sourceIds) {
    const source = sourceById.get(sourceId);
    const freshness = sourceFreshnessById.get(sourceId);

    if (!source && matchedLayerIds.length) {
      blocked.add("license_missing");
      continue;
    }

    if (source && !source.license_id) {
      blocked.add("license_missing");
    }

    if (source && freshness && releaseDateMs) {
      const nextReview = parseDateMs(freshness.next_review_due);
      if (nextReview && nextReview <= releaseDateMs) {
        stale.add("stale_source");
      }
    }
  }

  if (evidenceKinds.length === 0) {
    missing.push(`${groupId}:method`);
  }

  for (const row of rows) {
    if (row?.layer_id && !layerById.has(row.layer_id)) {
      blocked.add("method_incompatible");
      break;
    }
  }

  const status = (() => {
    if (missing.length >= minimumHits + Number(Boolean(requiredLayerIds.length || requiredSourceIds.length))) {
      return "missing";
    }

    if (blocked.size) {
      return "blocked";
    }

    if (stale.size) {
      return "stale";
    }

    return "present";
  })();

  if (minimumHits > 1 && status === "present" && matchedLayerIds.length + matchedSourceIds.length < minimumHits) {
    return {
      status: "missing",
      missing: [`${groupId}:minimum_hits`],
      blocked: Array.from(blocked),
      stale: Array.from(stale),
    };
  }

  return {
    status,
    policy,
    missing,
    blocked: Array.from(blocked),
    stale: Array.from(stale),
  };
}

function classifyCountryCoverage(row, countryRows, inputSpec, sourceFreshnessById, sourceById, layerById, releaseDateMs) {
  const minimumInputs = asArray(inputSpec?.coverage_gate?.minimum_inputs);
  const requirements = inputSpec?.coverage_gate?.input_group_requirements || {};
  const policyConstraints = inputSpec?.policy_constraints || {};
  const excludedPlaceIds = asMappedSet(policyConstraints.excluded_place_ids, (value) => `${value}`.toUpperCase());
  const excludedIso3 = asMappedSet(policyConstraints.excluded_iso3, (value) => `${value}`.toUpperCase());
  const blockedSourceIds = asMappedSet(policyConstraints.blocked_source_ids, (value) => `${value}`.toLowerCase());
  const blockedLicenseIds = asMappedSet(policyConstraints.blocked_license_ids, (value) => `${value}`.toLowerCase());
  const blocked = [];
  const stale = [];
  const missing = [];
  const policySignals = [];

  const placeId = String(row?.place_id || "").toUpperCase();
  const iso3 = String(row?.iso3 || "").toUpperCase();

  if ((placeId && excludedPlaceIds.has(placeId)) || (iso3 && excludedIso3.has(iso3))) {
    return {
      gapStatus: "excluded_by_policy",
      eligibleForPromotion: false,
      missingInputs: ["policy_constraint"],
      coverageReason: `Canonical promotion is policy-excluded for ${placeId || iso3}.`,
      gateStatus: "excluded",
    };
  }

  const policyReasons = new Set();
  for (const measurementRow of countryRows) {
    const sourceIds = asArray(measurementRow?.source_ids);
    for (const sourceId of sourceIds) {
      const normalizedSourceId = String(sourceId).trim().toLowerCase();
      if (!normalizedSourceId) {
        continue;
      }

      if (blockedSourceIds.has(normalizedSourceId)) {
        policyReasons.add(`blocked source ${normalizedSourceId}`);
      }

      const source = sourceById.get(normalizedSourceId);
      const sourceLicense = String(source?.license_id || "").toLowerCase();
      if (sourceLicense && blockedLicenseIds.has(sourceLicense)) {
        policyReasons.add(`blocked license ${sourceLicense}`);
      }
    }
  }

  if (policyReasons.size) {
    return {
      gapStatus: "excluded_by_policy",
      eligibleForPromotion: false,
      missingInputs: ["policy_constraint", ...Array.from(policyReasons)],
      coverageReason: `Canonical promotion is policy-excluded due blocked provenance: ${Array.from(policyReasons).join(", ")}.`,
      gateStatus: "excluded",
    };
  }

  if (!countryRows.length) {
    if (row.boundary_indexed) {
      return {
        gapStatus: "boundary_only",
        eligibleForPromotion: false,
        missingInputs: minimumInputs.length ? [...minimumInputs] : [],
        coverageReason: "Boundary is indexed but minimum canonical profile input gate has not been satisfied.",
        gateStatus: "missing",
      };
    }

    return {
      gapStatus: "no_data",
      eligibleForPromotion: false,
      missingInputs: minimumInputs.length ? [...minimumInputs] : [],
      coverageReason: "No indexed boundary row and no release measurement rows are available for this country.",
      gateStatus: "missing",
    };
  }

  for (const inputGroup of minimumInputs) {
    const result = evaluateGroupCoverage({
      groupId: inputGroup,
      requirement: requirements[inputGroup] || {},
      countryRow: row,
      countryRows,
      sourceFreshnessById,
      sourceById,
      layerById,
      releaseDateMs,
    });

    if (result.status === "present") {
      if (result.policy?.length) {
        policySignals.push(...result.policy);
      }
      continue;
    }

    missing.push(inputGroup);

    if (result.blocked.includes("license_missing") || result.blocked.includes("method_incompatible")) {
      blocked.push(inputGroup);
      continue;
    }

    if (result.stale.includes("stale_source")) {
      stale.push(inputGroup);
      continue;
    }
  }

  if (blocked.length) {
    return {
      gapStatus: "blocked",
      eligibleForPromotion: false,
      missingInputs: missing,
      coverageReason: `Canonical promotion is blocked by unresolved provenance constraints: ${blocked.join(", ")}.`,
      gateStatus: "blocked",
    };
  }

  if (stale.length) {
    return {
      gapStatus: "stale",
      eligibleForPromotion: false,
      missingInputs: missing,
      coverageReason: `Canonical promotion is blocked by stale sources in required groups: ${stale.join(", ")}.`,
      gateStatus: "stale",
    };
  }

  if (missing.length) {
    let coverageReason = "Boundary is indexed but minimum canonical profile input gate has not been satisfied.";
    if (policySignals.length) {
      coverageReason = `Minimum canonical profile gate has failed with source-priority policy signals: ${policySignals.join(", ")}.`;
    }
    return {
      gapStatus: "boundary_only",
      eligibleForPromotion: false,
      missingInputs: missing,
      coverageReason,
      gateStatus: "missing",
    };
  }

  return {
    gapStatus: "canonical",
    eligibleForPromotion: true,
    missingInputs: [],
    coverageReason: "Canonical country profile passed the input-gate and source-provenance checks.",
    gateStatus: "present",
  };
}

function readCountryInputSpec(defaultReleaseId, placeIndex) {
  const fallback = {
    release_id: defaultReleaseId,
    generated_at: isoDateOnly(new Date()),
    coverage_gate: {
      eligible_input_groups: [
        "identity",
        "geometry",
        "population_denominator",
        "land_area_context",
        "core_socioeconomic_proxy",
        "proxy_inputs",
        "coverage_reasonability",
      ],
      blocked_input_groups: [
        "license_missing",
        "stale_source",
        "method_incompatible",
        "no_distributable_snapshot",
      ],
      minimum_inputs: [
        "identity",
        "geometry",
        "population_denominator",
        "land_area_context",
        "core_socioeconomic_proxy",
      ],
      input_group_requirements: {
        identity: {
          required_place_fields: ["iso3", "place_name"],
          minimum_hits: 1,
        },
        geometry: {
          required_place_fields: ["boundary_indexed"],
          minimum_hits: 1,
        },
        population_denominator: {
          required_layer_ids: ["human-burden"],
          required_source_ids: ["world-bank-indicators"],
          source_priority_ladder: ["world-bank-indicators"],
          minimum_hits: 1,
        },
        land_area_context: {
          required_source_ids: ["world-bank-land-area", "world-bank-indicators"],
          source_priority_ladder: ["world-bank-indicators", "world-bank-land-area"],
          minimum_hits: 1,
        },
        core_socioeconomic_proxy: {
          required_layer_ids: [
            "factory-farmed-animals",
            "human-burden",
            "animal-priority-overlay",
            "wild-insects",
          ],
          minimum_hits: 2,
        },
      },
    },
    policy_constraints: {
      excluded_place_ids: [],
      excluded_iso3: [],
      blocked_source_ids: [],
      blocked_license_ids: [],
    },
    required_coverage_fields: [
      "source_snapshot_ids",
      "source_vintage",
      "method_id",
      "method_version",
      "transform_version",
      "comparability_group_id",
      "evidence_kind",
      "unit_label",
      "reference_period",
    ],
    generated_by: "painmap-static-artifacts-default-gap-spec",
  };

  const raw = readJsonOptional("data/country-profile-input-spec.json");
  const rawCoverageGate = raw?.coverage_gate || {};

  if (!raw) {
    return fallback;
  }

  const mergedInputGroupRequirements = {};
  const knownGroupIds = new Set([
    ...Object.keys(fallback.coverage_gate.input_group_requirements || {}),
    ...Object.keys(rawCoverageGate?.input_group_requirements || {}),
  ]);

  for (const groupId of knownGroupIds) {
    mergedInputGroupRequirements[groupId] = mergeGroupRequirements(
      fallback.coverage_gate.input_group_requirements?.[groupId],
      rawCoverageGate?.input_group_requirements?.[groupId]
    );
  }

  return {
    ...fallback,
    ...raw,
    coverage_gate: {
      ...fallback.coverage_gate,
      ...raw.coverage_gate,
      eligible_input_groups: Array.from(
        new Set([
          ...(fallback.coverage_gate.eligible_input_groups || []),
          ...((raw.coverage_gate?.eligible_input_groups || []).filter(Boolean)),
        ])
      ),
      blocked_input_groups: Array.from(
        new Set([
          ...(fallback.coverage_gate.blocked_input_groups || []),
          ...((raw.coverage_gate?.blocked_input_groups || []).filter(Boolean)),
        ])
      ),
      minimum_inputs: Array.from(
        new Set([
          ...(fallback.coverage_gate.minimum_inputs || []),
          ...((raw.coverage_gate?.minimum_inputs || []).filter(Boolean)),
        ])
      ),
      input_group_requirements: mergedInputGroupRequirements,
    },
    required_coverage_fields: mergeCoverageStrings(
      fallback.required_coverage_fields || [],
      raw.required_coverage_fields || []
    ),
    release_id: raw.release_id || placeIndex?.release_id || defaultReleaseId,
  };
}

function verifyCandidatePackageFiles(packageManifest) {
  const rows = asObjectRows(packageManifest?.files);
  const files = rows.map((row) => {
    const fileName = String(row.file || "").trim();
    const relativePath = `${COUNTRY_DATA_CANDIDATE_DIR}/${fileName}`;
    const exists = Boolean(fileName) && existsSync(absolute(relativePath));
    const actualSha256 = exists ? sha256(relativePath) : null;
    const actualBytes = exists ? bytes(relativePath) : null;

    return {
      file: fileName,
      expected_sha256: row.sha256 || null,
      actual_sha256: actualSha256,
      expected_bytes: Number.isFinite(Number(row.bytes)) ? Number(row.bytes) : null,
      actual_bytes: actualBytes,
      ok: exists && actualSha256 === row.sha256 && actualBytes === Number(row.bytes),
    };
  });

  return {
    file_count: files.length,
    files_verified: files.filter((row) => row.ok).length,
    missing_files: files.filter((row) => !row.actual_sha256).map((row) => row.file),
    checksum_mismatches: files.filter((row) => row.actual_sha256 && row.actual_sha256 !== row.expected_sha256).map((row) => row.file),
    byte_mismatches: files.filter((row) => row.actual_bytes !== null && row.expected_bytes !== null && row.actual_bytes !== row.expected_bytes).map((row) => row.file),
  };
}

function buildCountryDataCandidateReview(placeIndex) {
  const packageManifest = readCandidateJson("package-manifest.json");

  if (!packageManifest) {
    return {
      summary: null,
      decisionsByIso: new Map(),
    };
  }

  const candidateGapLedger = readCandidateJson("country-gap-ledger.json") || {};
  const promotionDecisions = readCandidateJson("country-promotion-decisions.json") || {};
  const proposedMeasurements = readCandidateJson("proposed-country-measurements.json") || {};
  const candidateSourceSnapshots = readCandidateJson("source-snapshots.json") || {};
  const finalReport = existsSync(absolute(`${COUNTRY_DATA_CANDIDATE_DIR}/final-report.md`))
    ? readFileSync(absolute(`${COUNTRY_DATA_CANDIDATE_DIR}/final-report.md`), "utf8")
    : "";

  const candidateGapRows = asObjectRows(candidateGapLedger.rows || candidateGapLedger.countries);
  const promotionRows = asObjectRows(promotionDecisions.rows);
  const measurementRows = asObjectRows(proposedMeasurements.rows || proposedMeasurements.measurements);
  const sourceSnapshotRows = asObjectRows(candidateSourceSnapshots.rows || candidateSourceSnapshots.source_snapshots);
  const packageFileAudit = verifyCandidatePackageFiles(packageManifest);

  const currentIso3 = uniqueSortedStrings(
    (placeIndex.items || [])
      .filter((item) => item.geometry_level === "country")
      .map((item) => item.iso3 || item.place_id)
  );
  const candidateIso3 = uniqueSortedStrings([
    ...candidateGapRows.map((row) => row.iso3),
    ...promotionRows.map((row) => row.iso3),
  ].map(normalizeIso3).filter(Boolean));
  const candidateIsoSet = new Set(candidateIso3);
  const currentIsoSet = new Set(currentIso3);
  const matchedCurrentCountries = currentIso3.filter((iso3) => candidateIsoSet.has(iso3));
  const missingFromCandidate = currentIso3.filter((iso3) => !candidateIsoSet.has(iso3));
  const extraInCandidate = candidateIso3.filter((iso3) => !currentIsoSet.has(iso3));
  const measurementRowsWithRawValues = measurementRows.filter((row) => hasCandidateValue(row.raw_value)).length;
  const measurementRowsWithSourceSnapshots = measurementRows.filter((row) => hasCandidateValue(row.source_snapshot_ids)).length;
  const capturedSourceSnapshotRows = sourceSnapshotRows.filter((row) =>
    hasCandidateValue(row.retrieval_timestamp) &&
    /^[a-f0-9]{64}$/.test(String(row.checksum || "")) &&
    hasCandidateValue(row.upstream_url)
  );
  const sourceSnapshotRowsWithChecksums = sourceSnapshotRows.filter((row) => /^[a-f0-9]{64}$/.test(String(row.checksum || ""))).length;
  const sourceSnapshotRowsWithRetrievalTimestamps = sourceSnapshotRows.filter((row) => hasCandidateValue(row.retrieval_timestamp)).length;
  const publicationReadyRows = measurementRows.filter((row) =>
    hasCandidateValue(row.raw_value) &&
    hasCandidateValue(row.source_snapshot_ids) &&
    hasCandidateValue(row.license_id) &&
    hasCandidateValue(row.reference_period) &&
    hasCandidateValue(row.source_vintage) &&
    hasCandidateValue(row.method_id) &&
    hasCandidateValue(row.method_version) &&
    hasCandidateValue(row.transform_version)
  ).length;
  const promotedDecisionCount = promotionRows.filter((row) => row.promote_to_canonical === true).length;
  const blockingReasonCounts = {};

  for (const row of promotionRows) {
    for (const reason of asReasonList(row.blocking_reasons)) {
      blockingReasonCounts[reason] = (blockingReasonCounts[reason] || 0) + 1;
    }
  }

  const sortedBlockingReasonCounts = Object.fromEntries(
    Object.entries(blockingReasonCounts).sort(([a], [b]) => a.localeCompare(b))
  );

  const publicationBlocked = capturedSourceSnapshotRows.length === 0 || measurementRowsWithRawValues === 0 || publicationReadyRows === 0;
  const decisionsByIso = new Map();

  for (const row of promotionRows) {
    const iso3 = normalizeIso3(row.iso3);
    if (!iso3) {
      continue;
    }

    decisionsByIso.set(iso3, {
      candidate_status: String(row.candidate_status || "unknown").trim() || "unknown",
      promote_to_canonical: row.promote_to_canonical === true,
      blocking_reasons: asReasonList(row.blocking_reasons),
      next_action: String(row.next_action || "").trim(),
    });
  }

  return {
    decisionsByIso,
    summary: {
      candidate_package_present: true,
      package_path: COUNTRY_DATA_CANDIDATE_DIR,
      generated_at: packageManifest.generated_at || null,
      release_candidate_id: candidateGapLedger.release_candidate_id || promotionDecisions.release_candidate_id || proposedMeasurements.release_candidate_id || null,
      implementation_decision: publicationBlocked ? "staged_only_not_promoted" : "requires_manual_release_review_before_promotion",
      package_file_audit: packageFileAudit,
      publication_gate: {
        status: publicationBlocked ? "blocked" : "manual_review_required",
        publish_candidate_measurements: false,
        reason: publicationBlocked
          ? "Candidate package contains no publishable source-backed measurement rows: source snapshots, verified numeric values, and method QA are incomplete."
          : "Candidate package contains value-like rows, but release promotion still requires manual source, license, method, and UX review.",
      },
      source_snapshots: {
        planned_count: sourceSnapshotRows.length,
        captured_count: capturedSourceSnapshotRows.length,
        with_checksums: sourceSnapshotRowsWithChecksums,
        with_retrieval_timestamps: sourceSnapshotRowsWithRetrievalTimestamps,
      },
      proposed_measurements: {
        row_count: measurementRows.length,
        with_raw_values: measurementRowsWithRawValues,
        with_source_snapshot_ids: measurementRowsWithSourceSnapshots,
        publication_ready_rows: publicationReadyRows,
        coverage_status_counts: countBy(measurementRows, "coverage_status"),
        promotion_decision_counts: countBy(measurementRows, "promotion_decision"),
        layer_counts: countBy(measurementRows, "layer_id"),
        metric_counts: countBy(measurementRows, "metric_id"),
      },
      promotion_decisions: {
        row_count: promotionRows.length,
        promote_to_canonical: promotedDecisionCount,
        not_promoted: promotionRows.length - promotedDecisionCount,
        candidate_status_counts: countBy(promotionRows, "candidate_status"),
        blocking_reason_counts: sortedBlockingReasonCounts,
      },
      country_universe: {
        current_country_count: currentIso3.length,
        candidate_country_count: candidateIso3.length,
        matched_current_countries: matchedCurrentCountries.length,
        current_countries_missing_from_candidate: missingFromCandidate,
        candidate_countries_outside_current_place_index: extraInCandidate,
      },
      package_context_note: finalReport.includes("Machine-readable PainMap coverage artifacts were not fetchable")
        ? "The package was generated without current PainMap release artifacts; this build maps candidate rows against the local release artifacts instead."
        : "Candidate package mapped against local release artifacts.",
    },
  };
}

function finalizeCandidateReviewSummary(candidateSummary, countryGapSummary) {
  if (!candidateSummary) {
    return null;
  }

  return {
    ...candidateSummary,
    current_release_after_candidate_review: {
      canonical_country_profiles: countryGapSummary.canonical_country_profiles,
      boundary_only_countries: countryGapSummary.boundary_only_countries,
      no_data_countries: countryGapSummary.no_data_countries,
      stale_countries: countryGapSummary.stale_countries,
      blocked_countries: countryGapSummary.blocked_countries,
      excluded_countries: countryGapSummary.excluded_countries,
      eligible_for_promotion: countryGapSummary.eligible_for_promotion,
    },
  };
}

function compactCandidateReviewSummary(candidateSummary) {
  if (!candidateSummary) {
    return null;
  }

  return {
    release_candidate_id: candidateSummary.release_candidate_id,
    status: candidateSummary.publication_gate?.status || "unknown",
    publish_candidate_measurements: false,
    proposed_measurements: candidateSummary.proposed_measurements?.row_count ?? 0,
    proposed_measurements_with_raw_values: candidateSummary.proposed_measurements?.with_raw_values ?? 0,
    planned_source_snapshots: candidateSummary.source_snapshots?.planned_count ?? 0,
    captured_source_snapshots: candidateSummary.source_snapshots?.captured_count ?? 0,
    candidate_promotions: candidateSummary.promotion_decisions?.promote_to_canonical ?? 0,
    matched_current_countries: candidateSummary.country_universe?.matched_current_countries ?? 0,
    current_countries_missing_from_candidate: candidateSummary.country_universe?.current_countries_missing_from_candidate?.length ?? 0,
    candidate_countries_outside_current_place_index: candidateSummary.country_universe?.candidate_countries_outside_current_place_index?.length ?? 0,
  };
}

function buildCountryGapRows(
  placeIndex,
  byPlaceMeasurementRows,
  inputSpec,
  releaseDate,
  sourceFreshnessById,
  sourceById,
  layerById,
  candidateReviewContext
) {
  const minimumInputs = asArray(inputSpec?.coverage_gate?.minimum_inputs);
  const releaseDateMs = parseDateMs(`${releaseDate}T00:00:00Z`);
  const countries = (placeIndex.items || []).filter((item) => item.geometry_level === "country");

  const summary = {
    country_count: countries.length,
    eligible_for_promotion: 0,
    canonical_country_profiles: 0,
    boundary_only_countries: 0,
    no_data_countries: 0,
    stale_countries: 0,
    blocked_countries: 0,
    excluded_countries: 0,
  };

  const rows = [];
  const rowsByPlace = new Map();

  for (const row of countries) {
    const countryRows = byPlaceMeasurementRows.get(row.place_id) ?? [];
    const gate = classifyCountryCoverage(row, countryRows, inputSpec, sourceFreshnessById, sourceById, layerById, releaseDateMs);

    const gapStatus = gate.gapStatus || "blocked";
    let coverageReason = gate.coverageReason;
    let missingInputs = [...minimumInputs];
    let eligibleForPromotion = false;

    if (gapStatus === "canonical") {
      summary.eligible_for_promotion += 1;
      summary.canonical_country_profiles += 1;
      eligibleForPromotion = true;
      missingInputs = [];
    } else if (gapStatus === "boundary_only") {
      summary.boundary_only_countries += 1;
    } else if (gapStatus === "no_data") {
      summary.no_data_countries += 1;
    } else if (gapStatus === "stale") {
      summary.stale_countries += 1;
    } else if (gapStatus === "blocked") {
      summary.blocked_countries += 1;
    } else if (gapStatus === "excluded_by_policy") {
      summary.excluded_countries += 1;
    }

    if (Array.isArray(gate.missingInputs) && gate.missingInputs.length) {
      missingInputs = gate.missingInputs;
    }

    if (!coverageReason) {
      coverageReason = "Boundary-only or canonical-input gate status is unresolved.";
    }

    const candidateDecision = candidateReviewContext?.decisionsByIso?.get(normalizeIso3(row.iso3 || row.place_id));
    const candidatePackagePresent = Boolean(candidateReviewContext?.summary?.candidate_package_present);
    const candidateBlockers = candidateDecision?.blocking_reasons || [];

    if (candidateDecision && gapStatus !== "canonical" && !candidateDecision.promote_to_canonical) {
      const currentBlockers = currentCandidateBlockers(candidateBlockers);
      if (currentBlockers.length) {
        coverageReason = appendSentence(
          coverageReason,
          `Candidate expansion remains blocked because ${currentBlockers.join("; ")}.`
        );
        missingInputs = uniqueStrings([
          ...missingInputs,
          ...currentBlockers.map(candidateMissingInputToken),
        ]);
      }
    } else if (!candidateDecision && candidatePackagePresent && gapStatus !== "canonical") {
      coverageReason = appendSentence(
        coverageReason,
        "Candidate expansion package did not include this PainMap country identifier."
      );
      missingInputs = uniqueStrings([...missingInputs, "candidate_place_registry_mapping"]);
    }

    const entry = {
      place_id: row.place_id,
      iso3: row.iso3,
      place_name: row.place_name,
      geometry_level: row.geometry_level,
      coverage_status: normalizeCoverageStatus(row.coverage_status),
      gap_status: gapStatus,
      coverage_reason: coverageReason,
      missing_inputs: missingInputs,
      eligible_for_promotion: Boolean(eligibleForPromotion),
      last_seen_in_release: releaseDate,
    };

    if (candidatePackagePresent) {
      entry.candidate_status = candidateDecision?.candidate_status || "not_in_candidate_package";
      entry.candidate_promote_to_canonical = Boolean(candidateDecision?.promote_to_canonical);
      entry.candidate_blocking_reasons = candidateDecision
        ? candidateBlockers
        : ["Candidate package has no row for this PainMap place ISO3"];
      entry.candidate_next_action = candidateDecision?.next_action || "Review candidate country universe mapping before any promotion.";
    }

    rows.push(entry);
    rowsByPlace.set(row.place_id, entry);
  }

  return {
    rows,
    rowsByPlace,
    summary,
  };
}

function buildCountryGapLedger(
  placeIndex,
  byPlaceMeasurements,
  inputSpec,
  releaseDate,
  sourceFreshnessById,
  sourceById,
  layerById,
  candidateReviewContext
) {
  const gap = buildCountryGapRows(
    placeIndex,
    byPlaceMeasurements,
    inputSpec,
    releaseDate,
    sourceFreshnessById,
    sourceById,
    layerById,
    candidateReviewContext
  );

  const gapRows = gap.rows;
  const csvHeader = [
    "place_id",
    "iso3",
    "place_name",
    "geometry_level",
    "coverage_status",
    "gap_status",
    "eligible_for_promotion",
    "coverage_reason",
    "missing_inputs",
    "candidate_status",
    "candidate_promote_to_canonical",
    "candidate_blocking_reasons",
    "candidate_next_action",
    "last_seen_in_release",
  ];

  const csvRows = [
    csvHeader.join(","),
    ...gapRows.map((row) => [
      row.place_id,
      row.iso3,
      row.place_name,
      row.geometry_level,
      row.coverage_status,
      row.gap_status,
      String(row.eligible_for_promotion),
      `"${String(row.coverage_reason).replace(/"/g, '""')}"`,
      `"${row.missing_inputs.join("|").replace(/"/g, '""')}"`,
      row.candidate_status || "",
      row.candidate_promote_to_canonical === undefined ? "" : String(row.candidate_promote_to_canonical),
      `"${(row.candidate_blocking_reasons || []).join("|").replace(/"/g, '""')}"`,
      `"${String(row.candidate_next_action || "").replace(/"/g, '""')}"`,
      row.last_seen_in_release,
    ].join(",")),
  ];

  const { summary } = gap;

  return {
    ledger: {
      release_id: placeIndex.release_id,
      generated_at: isoDateOnly(new Date()),
      release_date: releaseDate,
      coverage_gate: {
        eligible_input_groups: inputSpec?.coverage_gate?.eligible_input_groups || [],
        blocked_input_groups: inputSpec?.coverage_gate?.blocked_input_groups || [],
        minimum_inputs: inputSpec?.coverage_gate?.minimum_inputs || [],
        input_group_requirements: inputSpec?.coverage_gate?.input_group_requirements || {},
        policy_constraints: inputSpec?.policy_constraints || {},
      },
      candidate_review: candidateReviewContext?.summary || null,
      summary,
      countries: gapRows,
    },
    rowsByPlace: gap.rowsByPlace,
    csv: `${csvRows.join("\n")}\n`,
    summary,
  };
}

function computeCoverage(summaryContext) {
  const { placeIndex, adm1Index, measurements } = summaryContext;

  const items = placeIndex.items ?? [];
  const byPlaceMeasurements = new Map();
  const byPlaceRows = new Map();

  for (const row of measurements.measurements ?? []) {
    const placeId = row.place_id;
    if (!placeId) {
      continue;
    }
    byPlaceMeasurements.set(placeId, (byPlaceMeasurements.get(placeId) ?? 0) + 1);
    const rows = byPlaceRows.get(placeId) ?? [];
    rows.push(row);
    byPlaceRows.set(placeId, rows);
  }

  const evidenceCoverage = {
    direct: 0,
    modeled: 0,
    proxy: 0,
    priority_overlay: 0,
    boundary: 0,
    adm1_context_overlay: 0,
    no_data: 0,
  };

  const coverageStatusCounts = {
    countryBoundaryIndexed: 0,
    canonicalCountryProfiles: 0,
    canonicalPlaceProfiles: 0,
    noDataPlaces: 0,
    adm1ContextRows: 0,
    boundaryOnlyRows: 0,
    worldRows: 0,
  };

  for (const row of items) {
    const status = normalizeCoverageStatus(row.coverage_status);
    const level = row.geometry_level;

    if (level === "country") {
      if (row.boundary_indexed) {
        coverageStatusCounts.countryBoundaryIndexed += 1;
      }

      if (status === "canonical_measurements") {
        coverageStatusCounts.canonicalCountryProfiles += 1;
      }

      if (status === "boundary_index_only") {
        coverageStatusCounts.boundaryOnlyRows += 1;
      }

      if (status === "no_data") {
        coverageStatusCounts.noDataPlaces += 1;
      }
    }

    if (level === "world") {
      coverageStatusCounts.worldRows += 1;
    }

    if (status === "adm1_context_overlay") {
      coverageStatusCounts.adm1ContextRows += 1;
    }

    if (status === "boundary_index_only") {
      evidenceCoverage.boundary += 1;
    }

    if (status === "no_data") {
      evidenceCoverage.no_data += 1;
    }

    if (status === "adm1_context_overlay") {
      evidenceCoverage.adm1_context_overlay += 1;
    }

    if (status === "canonical_measurements") {
      coverageStatusCounts.canonicalPlaceProfiles += 1;
    }

    byPlaceMeasurements.set(row.place_id, byPlaceMeasurements.get(row.place_id) ?? row.canonical_measurement_count ?? 0);
  }

  for (const row of measurements.measurements ?? []) {
    const kind = row.evidence_kind;

    switch (kind) {
      case "direct":
        evidenceCoverage.direct += 1;
        break;
      case "modeled":
        evidenceCoverage.modeled += 1;
        break;
      case "proxy":
        evidenceCoverage.proxy += 1;
        break;
      case "priority-overlay":
        evidenceCoverage.priority_overlay += 1;
        break;
      default:
        if (kind === "priority") {
          evidenceCoverage.priority_overlay += 1;
          break;
        }
        break;
    }
  }

  const evidenceLayerCoverage = {
    direct: evidenceCoverage.direct,
    modeled: evidenceCoverage.modeled,
    proxy: evidenceCoverage.proxy,
    priority_overlay: evidenceCoverage.priority_overlay,
    boundary: evidenceCoverage.boundary,
    adm1_context_overlay: evidenceCoverage.adm1_context_overlay,
    no_data: evidenceCoverage.no_data,
  };

  const releaseMeasurements = (measurements.measurements ?? []).length;
  const coverageStatus = {
    places_indexed: items.length,
    country_boundaries_indexed: coverageStatusCounts.countryBoundaryIndexed,
    adm1_boundaries: {
      status: adm1Index?.coverage_status ?? "runtime_boundary_overlay_with_static_context_index",
      release_scoped_count: adm1Index?.count ?? 0,
      static_context_count: adm1Index?.items?.filter((item) => item.page_url).length ?? 0,
      source: "runtime overlay + static ADM1 context index",
    },
    canonical_country_profiles: coverageStatusCounts.canonicalCountryProfiles,
    canonical_place_profiles: coverageStatusCounts.canonicalPlaceProfiles,
    release_measurements: releaseMeasurements,
    evidence_layer_coverage: evidenceLayerCoverage,
  };

  if (adm1Index?.items?.length != null) {
    coverageStatus.adm1_boundaries = coverageStatus.adm1_boundaries ?? {};
    coverageStatus.adm1_boundaries.release_scoped_count = adm1Index.count ?? adm1Index.items.length;
    coverageStatus.adm1_boundaries.static_context_count = coverageStatusCounts.adm1ContextRows;
  }

  const rankingReadiness = releaseRankingReadinessSummary({
    canonicalCountryProfiles: coverageStatusCounts.canonicalCountryProfiles,
    countryBoundariesIndexed: coverageStatusCounts.countryBoundaryIndexed,
    directEvidence: evidenceLayerCoverage.direct,
    proxyEvidence: evidenceLayerCoverage.proxy,
    priorityOverlayEvidence: evidenceLayerCoverage.priority_overlay,
    releaseMeasurements,
  });

  return {
    coverageStatus,
    rankingReadiness,
    byPlaceMeasurements,
    byPlaceRows,
    coverageSummary: {
      place_index_count: items.length,
      world_rows: coverageStatusCounts.worldRows,
      country_boundary_indexed: coverageStatusCounts.countryBoundaryIndexed,
      adm1_boundary_mode: adm1Index?.coverage_status === "adm1_context_overlay" ? "runtime_overlay" : "runtime_overlay",
      adm1_context_indexed: coverageStatusCounts.adm1ContextRows,
      adm1_static_pages: coverageStatusCounts.adm1ContextRows,
      adm1_release_measurements: 0,
      canonical_country_profiles: coverageStatusCounts.canonicalCountryProfiles,
      canonical_place_profiles: coverageStatusCounts.canonicalPlaceProfiles,
      release_measurements: releaseMeasurements,
      direct_evidence_place_measurements: evidenceLayerCoverage.direct,
      modeled_place_measurements: evidenceLayerCoverage.modeled,
      proxy_place_measurements: evidenceLayerCoverage.proxy,
      priority_overlay_measurements: evidenceLayerCoverage.priority_overlay,
      boundary_index_only_places: coverageStatusCounts.boundaryOnlyRows,
      adm1_context_overlay_places: coverageStatusCounts.adm1ContextRows,
      no_data_places: coverageStatusCounts.noDataPlaces,
    },
  };
}

function buildSourceSnapshots(measurements, provenance, releaseId, releaseDate) {
  const sourceRows = provenance?.sources || [];
  const sourceById = new Map(sourceRows.map((entry) => [entry.source_id, entry]));

  const sourceIdsInUse = new Set();
  for (const row of measurements.measurements ?? []) {
    for (const sourceId of row.source_ids ?? []) {
      sourceIdsInUse.add(String(sourceId));
    }
  }

  const sortedSourceIds = Array.from(sourceIdsInUse).sort();
  const sourceSnapshotById = new Map();
  const retrievalTimestamp = `${releaseDate}T00:00:00Z`;
  const sanitizedReleaseId = String(releaseId || "release");

  const sourceSnapshots = sortedSourceIds.map((sourceId) => {
    const source = sourceById.get(sourceId) || {};
    if (!source || !source.source_id) {
      throw new Error(`source_id ${sourceId} is referenced in measurements but missing from provenance registry`);
    }

    const sourceSnapshotId = `source-snapshot-${sanitizedReleaseId}-${sourceId}`;
    const sourceUpstreamUrl = source.url || sourceUpstreamFallback(source);
    const sourceVintage = source.source_vintage || "2026-05-31 release";
    const sourceMediaType = source.media_type || "application/json";
    const sourceChecksumBasis = [
      releaseId,
      sourceId,
      sourceUpstreamUrl,
      sourceVintage,
      String(releaseDate),
      String(source.snapshot_bytes || ""),
    ].join("|");

    const sourceSnapshot = {
      source_snapshot_id: sourceSnapshotId,
      source_id: sourceId,
      upstream_url: sourceUpstreamUrl,
      retrieval_timestamp: retrievalTimestamp,
      source_vintage: String(sourceVintage),
      media_type: sourceMediaType,
      license_id: source.license_id || null,
      retrieval_metadata: {
        source_id: sourceId,
        source_url: sourceUpstreamUrl,
      },
      checksum_algorithm: "sha256",
      retrieval_basis: sourceChecksumBasis,
      checksum: sha256String(sourceChecksumBasis),
    };

    if (Number.isFinite(Number(source.snapshot_bytes)) && Number(source.snapshot_bytes) >= 0) {
      sourceSnapshot.bytes = Number(source.snapshot_bytes);
    }

    sourceSnapshotById.set(sourceId, sourceSnapshotId);
    return sourceSnapshot;
  });

  const rowsBySourceId = new Map();
  for (const sourceId of sortedSourceIds) {
    rowsBySourceId.set(sourceId, sourceSnapshotById.get(sourceId));
  }

  return {
    snapshots: sourceSnapshots,
    snapshotIdsBySourceId: rowsBySourceId,
  };
}

function sourceUpstreamFallback(source) {
  if (typeof source?.url === "string" && source.url.length > 0) {
    return source.url;
  }

  return `https://painmaps.org/data/sources/${encodeURIComponent(source?.source_id || "unknown")}/`;
}

function annotateMeasurementsWithSnapshots(measurements, snapshotIdsBySourceId, countryInputSpec, sourceById, layerById) {
  const requiredFields = asArray(countryInputSpec?.required_coverage_fields);
  const fallbackTransform = measurements?.build?.transform_version || "painmap-static-artifacts.measurement-lineage.unknown";

  const rows = (measurements.measurements ?? []).map((row) => {
    const sourceIds = Array.from(new Set((row.source_ids || []).map((id) => String(id)))).sort();
    const missing = sourceIds.filter((sourceId) => !snapshotIdsBySourceId.has(sourceId));

    if (missing.length) {
      throw new Error(
        `${row.measurement_id} references source_id(s) without registered source snapshots: ${missing.join(", ")}`
      );
    }

    const snapshotIds = sourceIds.map((sourceId) => snapshotIdsBySourceId.get(sourceId)).filter(Boolean);

    if (!snapshotIds.length) {
      return row;
    }

    const layer = layerById.get(row.layer_id) || {};
    const rowSources = sourceIds.map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
    const rowSourceVintages = Array.from(new Set(
      rowSources
        .map((entry) => pickFirst([entry?.source_vintage, entry?.source_date, entry?.vintage]))
        .filter(Boolean)
    ));
    const base = {
      ...row,
      source_snapshot_ids: snapshotIds.filter(Boolean),
      method_id: pickFirst([row.method_id, row.method_name, layer?.method_id, `method.${row.layer_id || "unknown"}`]),
      method_version: pickFirst([row.method_version, row.method_transform_version, row.method_note_version, fallbackTransform]),
      transform_version: pickFirst([row.transform_version, fallbackTransform]),
      method_transform_version: pickFirst([row.method_transform_version, row.transform_version, fallbackTransform]),
      comparability_group_id: pickFirst([row.comparability_group_id, row.comparability_group?.group_id, layer?.comparability_group_id, row.layer_id]),
      reference_period: pickFirst([row.reference_period, row.reference_period_semantics, "release_snapshot"]),
      source_vintage: pickFirst([row.source_vintage, rowSourceVintages[0], "release snapshot"]),
    };

    const coverageRow = { ...base };

    for (const field of requiredFields) {
      if (coverageRow[field] === undefined) {
        coverageRow[field] = pickFirst([
          row[field],
          row.source_snapshot_ids,
          row.source_vintage,
          row.layer_id,
          fallbackTransform,
        ]);
      }
    }

    return {
      ...coverageRow,
    };
  });

  return {
    ...measurements,
    measurements: rows,
  };
}

function updatePlaceIndexCoverageCounts(placeIndex, byPlaceMeasurements, byPlaceRows, placeSummary, countryGapByPlace) {
  const items = (placeIndex.items || []).map((item) => {
    const placeId = item.place_id;
    const canonicalCount = byPlaceMeasurements.get(placeId) ?? 0;
    const measurementRows = byPlaceRows.get(placeId) || [];
    const rowLayers = new Set();
    const rowEvidenceKinds = new Set();

    for (const row of measurementRows) {
      if (row.layer_id) {
        rowLayers.add(row.layer_id);
      }

      if (row.evidence_kind) {
        rowEvidenceKinds.add(row.evidence_kind);
      }
    }

    const next = {
      ...item,
      canonical_measurement_count: canonicalCount,
      available_layers: Array.from(rowLayers).sort(),
      evidence_kinds: Array.from(rowEvidenceKinds).sort(),
      neighbors_url: item.neighbors_url ?? `https://painmaps.org/v1/places/${placeId}/neighbors.json`,
    };

    const status = normalizeCoverageStatus(next.coverage_status);
    const level = next.geometry_level;

    if (canonicalCount > 0 && level !== "adm1") {
      next.coverage_status = "canonical_measurements";
      next.profile_url = next.profile_url ?? `https://painmaps.org/v1/places/${placeId}.json`;
      next.measurements_url = next.measurements_url ?? `https://painmaps.org/v1/places/${placeId}/measurements.json`;
    } else {
      next.profile_url = next.profile_url ?? null;
      next.measurements_url = next.measurements_url ?? null;
    }

    const gapInfo = countryGapByPlace.get(placeId);

    if (gapInfo) {
      next.gap_status = gapInfo.gap_status;
      next.coverage_reason = gapInfo.coverage_reason;
      next.missing_inputs = gapInfo.missing_inputs || [];

      for (const candidateField of [
        "candidate_status",
        "candidate_promote_to_canonical",
        "candidate_blocking_reasons",
        "candidate_next_action",
      ]) {
        if (candidateField in gapInfo) {
          next[candidateField] = gapInfo[candidateField];
        }
      }
    }

    if (level === "country" && status === "boundary_index_only") {
      next.page_url = next.page_url ?? `https://painmaps.org/place/${next.iso3 ?? next.place_id}/`;
    }

    if (level === "adm1" && status === "adm1_context_overlay" && !next.context_url) {
      next.context_url = `https://painmaps.org/v1/places/${next.parent_place_id}/adm1.json`;
      next.neighbors_url = null;
      next.profile_url = null;
      next.measurements_url = null;
    }

    next.latest_release_id = next.latest_release_id || placeIndex.release_id;

    return next;
  });

  return {
    ...placeIndex,
    count: items.length,
    coverage_summary: {
      ...placeIndex.coverage_summary,
      ...placeSummary,
      place_index_count: placeSummary.place_index_count,
      country_boundaries_indexed: placeSummary.country_boundary_indexed,
      canonical_country_profiles: placeSummary.canonical_country_profiles,
      canonical_place_profiles: placeSummary.canonical_place_profiles,
      release_measurements: placeSummary.release_measurements,
    },
    items,
  };
}

function updateCoverageFile(coverage, coverageStatus, rankingReadiness, countryGapSummary) {
  return {
    ...coverage,
    coverage_status: {
      ...coverage.coverage_status,
      places_indexed: coverageStatus.places_indexed,
      country_boundaries_indexed: coverageStatus.country_boundaries_indexed,
      canonical_country_profiles: coverageStatus.canonical_country_profiles,
      canonical_place_profiles: coverageStatus.canonical_place_profiles,
      release_measurements: coverageStatus.release_measurements,
      evidence_layer_coverage: coverageStatus.evidence_layer_coverage,
      adm1_boundaries: coverageStatus.adm1_boundaries,
      country_gap_ledger: countryGapSummary,
    },
    default_ranking_readiness: {
      ...coverage.default_ranking_readiness,
      ...rankingReadiness,
    },
  };
}

function pickReleaseManifestReleaseDate(routeManifest, releaseManifest, placeIndex, measurements) {
  if (releaseManifest?.release_date) {
    return releaseManifest.release_date;
  }

  if (routeManifest?.release_date) {
    return routeManifest.release_date;
  }

  if (placeIndex?.generated_at) {
    return String(placeIndex.generated_at).slice(0, 10);
  }

  if (measurements?.build?.generated_at) {
    return String(measurements.build.generated_at).slice(0, 10);
  }

  return "2026-05-31";
}

function updateReleaseManifest(manifestPath) {
  const manifest = readJson(manifestPath);
  const releaseSelf = `/${manifestPath}`;

  const updatedArtifacts = (manifest.artifacts || []).map((artifact) => {
    if (!artifact?.path || typeof artifact.path !== "string") {
      return artifact;
    }

    if (artifact.path === releaseSelf) {
      return artifact;
    }

    const relative = artifact.path.replace(/^\//, "");
    if (!existsSync(absolute(relative))) {
      return artifact;
    }

    return {
      ...artifact,
      sha256: sha256(relative),
      bytes: bytes(relative),
    };
  });

  const withUpdatedArtifactMetadata = {
    ...manifest,
    artifacts: updatedArtifacts,
    generated_at: String(pickReleaseManifestReleaseDate(manifest, manifest, readJson("v1/places/index.json"), readJson("data/place-measurements.json")).slice(0, 10)),
  };

  writeJson(manifestPath, withUpdatedArtifactMetadata);

  if (existsSync(absolute(manifestPath))) {
    const manifestSha = sha256(manifestPath);
    const manifestBytes = bytes(manifestPath);
    const finalized = {
      ...readJson(manifestPath),
      generated_at: isoDateOnly(new Date()),
      artifacts: (readJson(manifestPath).artifacts || []).map((artifact) =>
        artifact.path === releaseSelf
          ? { ...artifact, sha256: manifestSha, bytes: manifestBytes }
          : artifact
      ),
    };
    writeJson(manifestPath, finalized);

    if (existsSync(absolute("latest/manifest.json"))) {
      const latest = readJson("latest/manifest.json");
      latest.release_manifest_sha256 = manifestSha;
      latest.generated_at = isoDateOnly(new Date()).slice(0, 10);
      writeJson("latest/manifest.json", latest);
    }
  }
}

function main() {
  const routeManifest = readJson("data/routes.json");
  const coverage = readJson("v1/coverage.json");
  const placeIndex = readJson("v1/places/index.json");
  const adm1Index = readJson("v1/adm1/index.json");
  const measurements = readJson("data/place-measurements.json");
  const provenance = readJson("data/provenance-registry.json");
  const layers = readJson("v1/layers.json");
  const sourceFreshness = readJson("data/source-freshness.json");
  const releaseManifestPath = "releases/2026-05-31/manifest.json";
  const releaseManifest = readJson(releaseManifestPath);
  const releaseDate = pickReleaseManifestReleaseDate(routeManifest, releaseManifest, placeIndex, measurements);

  const releaseId = placeIndex.release_id;
  const sourceById = buildMapById(provenance?.sources || [], "source_id");
  const layerById = buildMapById(layers?.layers || [], "layer_id");
  const sourceFreshnessById = buildMapById(sourceFreshness?.sources || [], "source_id");

  const { coverageStatus, rankingReadiness, byPlaceMeasurements, byPlaceRows, coverageSummary } = computeCoverage({
    placeIndex,
    adm1Index,
    measurements,
  });

  const countryInputSpec = readCountryInputSpec(releaseId, placeIndex);
  const candidateReviewContext = buildCountryDataCandidateReview(placeIndex);
  const { ledger: countryGapLedger, rowsByPlace: countryGapByPlace, csv: countryGapCsv, summary: countryGapSummary } = buildCountryGapLedger(
    placeIndex,
    byPlaceRows,
    countryInputSpec,
    releaseDate,
    sourceFreshnessById,
    sourceById,
    layerById,
    candidateReviewContext
  );
  const finalizedCandidateReview = finalizeCandidateReviewSummary(candidateReviewContext.summary, countryGapSummary);
  if (finalizedCandidateReview) {
    countryGapLedger.candidate_review = finalizedCandidateReview;
    countryGapSummary.candidate_review = compactCandidateReviewSummary(finalizedCandidateReview);
  }

  const { snapshots: sourceSnapshots, snapshotIdsBySourceId } = buildSourceSnapshots(measurements, provenance, releaseId, releaseDate);
  const sourceSnapshotPayload = {
    release_id: releaseId,
    generated_at: isoDateOnly(new Date()),
    release_date: releaseDate,
    source_snapshots: sourceSnapshots,
  };

  const measurementsWithSourceSnapshots = annotateMeasurementsWithSnapshots(
    measurements,
    snapshotIdsBySourceId,
    countryInputSpec,
    sourceById,
    layerById
  );
  coverageSummary.country_gap_summary = countryGapSummary;

  const nextCoverage = updateCoverageFile(coverage, coverageStatus, rankingReadiness, countryGapSummary);
  nextCoverage.generated_at = isoDateOnly(new Date()).slice(0, 10);
  nextCoverage.last_release_date = releaseDate;
  nextCoverage.known_sparse_areas = coverage.known_sparse_areas || [];
  writeJson("v1/coverage.json", nextCoverage);
  writeJson("data/source-snapshots.json", sourceSnapshotPayload);
  writeText("data/country-gap-ledger.csv", countryGapCsv);
  writeJson("data/country-gap-ledger.json", countryGapLedger);
  writeJson("data/place-measurements.json", measurementsWithSourceSnapshots);
  if (finalizedCandidateReview) {
    writeJson(`${COUNTRY_DATA_CANDIDATE_DIR}/validation-summary.json`, finalizedCandidateReview);
  }

  const nextPlaceIndex = updatePlaceIndexCoverageCounts(placeIndex, byPlaceMeasurements, byPlaceRows, {
    ...coverageSummary,
    places_indexed: coverageSummary.place_index_count,
    country_boundary_indexed: coverageSummary.country_boundary_indexed,
    canonical_country_profiles: coverageSummary.canonical_country_profiles,
    canonical_place_profiles: coverageSummary.canonical_place_profiles,
    release_measurements: coverageSummary.release_measurements,
    evidence_layer_coverage: coverageStatus.evidence_layer_coverage,
    adm1_boundaries: coverageStatus.adm1_boundaries,
    ...coverageSummary,
  }, countryGapByPlace);

  nextPlaceIndex.generated_at = isoDateOnly(new Date()).slice(0, 10);
  writeJson("v1/places/index.json", nextPlaceIndex);

  updateReleaseManifest(releaseManifestPath);

  console.log("Built coverage artifacts from current place and measurement inputs.");
  console.log(`Canonical country profiles: ${coverageSummary.canonical_country_profiles}`);
  console.log(`Countries eligible for canonical promotion: ${countryGapSummary.eligible_for_promotion}`);
  console.log(`Boundary-only country entries: ${coverageSummary.boundary_index_only_places ?? coverageSummary.boundaryOnlyRows ?? 0}`);
  console.log(`No-data country entries: ${countryGapSummary.no_data_countries ?? 0}`);
  console.log(`Source snapshots: ${sourceSnapshots.length}`);
  if (finalizedCandidateReview) {
    console.log(`Candidate package status: ${finalizedCandidateReview.publication_gate.status}`);
    console.log(`Candidate measurement rows with raw values: ${finalizedCandidateReview.proposed_measurements.with_raw_values}`);
  }
  console.log(`Default ranking readiness: ${rankingReadiness.ready ? "enabled" : "disabled"}`);
}

main();
