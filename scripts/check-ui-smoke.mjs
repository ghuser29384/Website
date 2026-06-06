import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = readJson("data/ui-smoke.json");
const css = read("styles.css");
const failures = [];

function absolute(file) {
  return path.join(root, file);
}

function read(file) {
  return readFileSync(absolute(file), "utf8");
}

function readJson(file) {
  return JSON.parse(readFileSync(absolute(file), "utf8"));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function attrValue(tag, attr) {
  const match = tag.match(new RegExp(`(?:^|\\s)${escapeRegExp(attr)}="([^"]*)"`, "i"));
  return match?.[1] ?? "";
}

function stripTags(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function idsIn(html) {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
}

function idSet(html) {
  return new Set(idsIn(html));
}

function startTagForId(html, id) {
  return html.match(new RegExp(`<([a-zA-Z0-9-]+)\\b[^>]*\\sid="${escapeRegExp(id)}"[^>]*>`, "i"))?.[0] ?? "";
}

function hasClass(html, className) {
  return [...html.matchAll(/\bclass="([^"]+)"/gi)].some((match) => match[1].split(/\s+/).includes(className));
}

function classHasCssRule(className) {
  return new RegExp(`\\.${escapeRegExp(className)}(?:\\b|[\\s,{.:#>+~\\[])`).test(css);
}

function countMatches(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function assertAccessibleInlineElements(file, html) {
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const tag = match[0];
    const href = attrValue(tag, "href");
    const label = attrValue(tag, "aria-label") || stripTags(match[2]);

    if (!href) {
      fail(file, "link is missing href");
    }

    if (!label) {
      fail(file, `link to ${href || "(missing href)"} has no accessible name`);
    }
  }

  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const tag = match[0];
    const label = attrValue(tag, "aria-label") || attrValue(tag, "aria-labelledby") || stripTags(match[2]);

    if (!label) {
      fail(file, "button has no accessible name");
    }
  }

  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    const type = attrValue(tag, "type").toLowerCase();
    const id = attrValue(tag, "id");
    const hasHiddenType = type === "hidden";
    const hasAccessibleName =
      attrValue(tag, "aria-label") ||
      attrValue(tag, "aria-labelledby") ||
      (id && new RegExp(`<label\\b[^>]*\\bfor="${escapeRegExp(id)}"`, "i").test(html));

    if (!hasHiddenType && !hasAccessibleName) {
      fail(file, `input ${id || "(without id)"} has no accessible name`);
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];

    if (!/\balt="/i.test(tag)) {
      fail(file, "image is missing alt text");
    }
  }
}

function assertAriaReferences(file, html) {
  const ids = idSet(html);

  for (const match of html.matchAll(/\b(aria-(?:controls|describedby|labelledby|owns|activedescendant))="([^"]+)"/g)) {
    const attr = match[1];
    const tokens = match[2].split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      if (!ids.has(token)) {
        fail(file, `${attr} references missing id ${token}`);
      }
    }
  }
}

function assertSectionLabels(file, html) {
  const ids = idSet(html);

  for (const match of html.matchAll(/<section\b[^>]*\baria-labelledby="([^"]+)"[^>]*>/gi)) {
    for (const token of match[1].split(/\s+/).filter(Boolean)) {
      if (!ids.has(token)) {
        fail(file, `section aria-labelledby references missing id ${token}`);
      }
    }
  }
}

function assertUniqueIds(file, html) {
  const seen = new Set();

  for (const id of idsIn(html)) {
    if (seen.has(id)) {
      fail(file, `duplicate id ${id}`);
    }

    seen.add(id);
  }
}

function assertRequiredRouteContract(route) {
  const file = route.file;

  if (!existsSync(absolute(file))) {
    fail(file, `missing route file for ${route.path}`);
    return;
  }

  const html = read(file);
  const ids = idSet(html);

  if (!/^<!doctype html>/i.test(html)) {
    fail(file, "missing doctype");
  }

  if (!/<html\b[^>]*\blang="en"/i.test(html)) {
    fail(file, "html element must declare lang=en");
  }

  if (!html.includes(`<title>${route.expected_title}</title>`)) {
    fail(file, `title mismatch for ${route.path}`);
  }

  if (!html.includes(`<link rel="canonical" href="${route.expected_canonical}">`)) {
    fail(file, `canonical mismatch for ${route.path}`);
  }

  if (!/<link\b[^>]*rel="stylesheet"[^>]*integrity="sha384-[^"]+"[^>]*crossorigin="anonymous"/i.test(html)) {
    fail(file, "stylesheet must include SRI and crossorigin");
  }

  if (!/<a\b[^>]*class="skip-link"[^>]*href="#main-content"/i.test(html)) {
    fail(file, "missing skip link to #main-content");
  }

  if (countMatches(html, /<main\b[^>]*\bid="main-content"[^>]*>/gi) !== 1) {
    fail(file, "must contain exactly one #main-content main landmark");
  }

  if (countMatches(html, /<h1\b/gi) !== 1) {
    fail(file, "must contain exactly one h1");
  }

  if (!/<header\b[^>]*class="site-header"[^>]*aria-label="Primary navigation"/i.test(html)) {
    fail(file, "missing labeled primary header");
  }

  if (!/<nav\b[^>]*class="site-nav"[^>]*aria-label="Site sections"/i.test(html)) {
    fail(file, "missing labeled site navigation");
  }

  if (route.requires_breadcrumb && !/<nav\b[^>]*class="breadcrumbs"[^>]*aria-label="Breadcrumb"/i.test(html)) {
    fail(file, "missing breadcrumb navigation");
  }

  for (const id of route.accessibility?.required_ids ?? []) {
    if (!ids.has(id)) {
      fail(file, `missing required id ${id}`);
    }
  }

  for (const id of route.accessibility?.required_live_region_ids ?? []) {
    const tag = startTagForId(html, id);

    if (!tag) {
      fail(file, `missing live region ${id}`);
    } else if (!/\baria-live="/i.test(tag) && !/\brole="status"/i.test(tag)) {
      fail(file, `live region ${id} must use aria-live or role=status`);
    }
  }

  for (const requirement of route.accessibility?.required_roles ?? []) {
    const tag = startTagForId(html, requirement.id);

    if (!tag) {
      fail(file, `missing role target ${requirement.id}`);
    } else if (attrValue(tag, "role") !== requirement.role) {
      fail(file, `${requirement.id} must use role=${requirement.role}`);
    }
  }

  for (const relationship of route.accessibility?.control_relationships ?? []) {
    const tag = startTagForId(html, relationship.controller_id);

    if (!tag) {
      fail(file, `missing controller ${relationship.controller_id}`);
    } else if (attrValue(tag, "aria-controls") !== relationship.controls_id) {
      fail(file, `${relationship.controller_id} must aria-controls ${relationship.controls_id}`);
    }
  }

  for (const className of route.visual_contract?.required_components ?? []) {
    if (!hasClass(html, className)) {
      fail(file, `missing visual component class ${className}`);
    }

    if (!classHasCssRule(className)) {
      fail(file, `styles.css missing rule for visual component ${className}`);
    }
  }

  for (const text of route.visual_contract?.required_text ?? []) {
    if (!html.includes(text)) {
      fail(file, `missing visual contract text: ${text}`);
    }
  }

  assertUniqueIds(file, html);
  assertAriaReferences(file, html);
  assertSectionLabels(file, html);
  assertAccessibleInlineElements(file, html);
}

if (manifest.release_id !== "2026-05-31.atlas.2") {
  failures.push("data/ui-smoke.json release_id mismatch");
}

if (!Array.isArray(manifest.routes) || manifest.routes.length < 8) {
  failures.push("data/ui-smoke.json must include the core route smoke set");
}

for (const route of manifest.routes ?? []) {
  assertRequiredRouteContract(route);
}

if (failures.length) {
  console.error("UI smoke check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`UI smoke check passed for ${manifest.routes.length} routes.`);
