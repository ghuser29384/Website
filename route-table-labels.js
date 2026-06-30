const ROUTE_TABLE_LABEL_CLASS = "route-table-labeled";
let routeTableHydrateQueued = false;

function normalizeRouteCellLabel(value) {
  return String(value || "").trim() || "";
}

function hydrateRouteTableLabels(root) {
  const tables = (root || document).querySelectorAll("table.route-table");
  for (const table of tables) {
    if (!table.classList.contains(ROUTE_TABLE_LABEL_CLASS)) {
      table.classList.add(ROUTE_TABLE_LABEL_CLASS);
    }

    const headerCells = Array.from(table.querySelectorAll("thead th, thead td")).map((cell) =>
      normalizeRouteCellLabel(cell.textContent)
    );

    if (!headerCells.length) {
      continue;
    }

    const bodyRows = table.querySelectorAll("tbody tr");
    const rows = Array.from(bodyRows.length ? bodyRows : table.querySelectorAll("tr"));

    for (const row of rows) {
      const cells = Array.from(row.children);
      for (const [index, cell] of cells.entries()) {
        if (!cell || cell.getAttribute("data-label")) {
          continue;
        }

        const label = normalizeRouteCellLabel(headerCells[index]);
        if (label) {
          cell.setAttribute("data-label", label);
        } else {
          cell.setAttribute("data-label", `Column ${index + 1}`);
        }
      }
    }
  }
}

function queueHydrateRouteTableLabels(root) {
  if (routeTableHydrateQueued) {
    return;
  }

  routeTableHydrateQueued = true;
  const hydrateNow = () => {
    routeTableHydrateQueued = false;
    hydrateRouteTableLabels(root || document);
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(hydrateNow);
    return;
  }

  setTimeout(hydrateNow, 0);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    queueHydrateRouteTableLabels(document);
  });
} else {
  queueHydrateRouteTableLabels(document);
}

if (typeof MutationObserver !== "undefined") {
  const observedRoot = document.documentElement || document;
  const observer = new MutationObserver(() => {
    queueHydrateRouteTableLabels(document);
  });
  observer.observe(observedRoot, {
    childList: true,
    subtree: true,
  });
}
