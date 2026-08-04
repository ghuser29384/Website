from pathlib import Path

script_path = Path('script.js')
index_path = Path('index.html')
check_path = Path('scripts/check-static-site.mjs')
script = script_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')
check = check_path.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old, new, 1)

script = replace_once(
    script,
    '  const rankingDisabledForGlobal = !isCountryView && !rankingReady;\n',
    '  const rankingDisabled = !rankingReady;\n',
    'ranking readiness variable',
)
script = replace_once(
    script,
    '    globeModeSelect.value = state.globeMode;\n',
    '''    globeModeSelect.value = state.globeMode;
    globeModeSelect.disabled = rankingDisabled;
    globeModeSelect.setAttribute("aria-disabled", String(rankingDisabled));
    globeModeSelect.title = rankingDisabled
      ? "Cause-mode controls are disabled until the active release passes its ranking-readiness gate."
      : "Choose the visible atlas cause context.";
    globeModeSelect.setAttribute(
      "aria-label",
      rankingDisabled
        ? "Cause-mode selector is disabled while release ranking-readiness gates are active"
        : "Atlas cause mode"
    );
''',
    'globe selector gate',
)
script = script.replace('rankingDisabledForGlobal', 'rankingDisabled')
if 'rankingDisabledForGlobal' in script:
    raise SystemExit('rankingDisabledForGlobal remains after replacement')
script = replace_once(
    script,
    'Global ranking is disabled in coverage-first mode. Select a country to use country-scoped ranking controls.',
    'Ranking controls are disabled until the active release passes its ranking-readiness gate.',
    'country ranking bypass copy',
)
script = replace_once(
    script,
    'Ranking mode selector is disabled while release coverage gates are active',
    'Ranking mode selector is disabled while release ranking-readiness gates are active',
    'ranking aria copy',
)
script = replace_once(
    script,
    '  if (globeModeCopy) {\n    globeModeCopy.textContent = !isCountryView\n',
    '''  if (globeModeCopy) {
    globeModeCopy.textContent = rankingDisabled
      ? "Cause rankings are unavailable because the active release does not pass its ranking-readiness gate. The atlas remains available for coverage, provenance, and place-context inspection."
      : !isCountryView
''',
    'globe copy gate',
)
script = replace_once(
    script,
    '  if (humanSectionLabel) {\n    humanSectionLabel.textContent = isProvinceView\n',
    '  if (humanSectionLabel) {\n    humanSectionLabel.textContent = rankingDisabled\n      ? "Cause ranking unavailable for this release"\n      : isProvinceView\n',
    'human label gate',
)
script = replace_once(
    script,
    '  if (animalSectionLabel) {\n    animalSectionLabel.textContent = state.selectedCountry\n',
    '  if (animalSectionLabel) {\n    animalSectionLabel.textContent = rankingDisabled\n      ? "Animal cause ranking unavailable"\n      : state.selectedCountry\n',
    'animal label gate',
)
script = replace_once(
    script,
    '  if (rankingCopy) {\n    if (!isCountryView) {\n      rankingCopy.textContent = rankingModes[state.rankingMode].copy;\n',
    '''  if (rankingCopy) {
    if (rankingDisabled) {
      const reason = releaseRankingReadinessReason(state.releaseCoverage);
      rankingCopy.textContent = `Ranking controls are unavailable for this release: ${reason} The map and tables remain available for coverage and provenance inspection.`;
    } else if (!isCountryView) {
      rankingCopy.textContent = rankingModes[state.rankingMode].copy;
''',
    'ranking copy gate',
)
script = replace_once(
    script,
    'function renderIssues(country) {\n',
    '''function renderIssues(country) {
  if (!releaseRankingReadiness(state.releaseCoverage)) {
    const reason = releaseRankingReadinessReason(state.releaseCoverage);
    renderIssueStatus(
      "Cause ranking unavailable",
      `The active release does not pass its ranking-readiness gate: ${reason} Use place search, coverage status, source metadata, and event evidence without treating the current context rows as a ranked comparison.`
    );
    return;
  }

''',
    'human issue guard',
)
script = replace_once(
    script,
    'function renderAnimalIssues(country) {\n',
    '''function renderAnimalIssues(country) {
  if (!releaseRankingReadiness(state.releaseCoverage)) {
    const reason = releaseRankingReadinessReason(state.releaseCoverage);
    renderAnimalIssueStatus(
      "Animal ranking unavailable",
      `The active release does not pass its ranking-readiness gate: ${reason} Event-level animal-pain evidence remains available below without converting sparse proxy context into a cause ranking.`
    );
    return;
  }

''',
    'animal issue guard',
)
script = replace_once(
    script,
    '  selectionFootnote.textContent = `${boundarySource}${issueSource}${animalSource} Current ordering: ${rankingLabel(state.rankingMode)}.`;\n',
    '''  if (releaseRankingReadiness(state.releaseCoverage)) {
    selectionFootnote.textContent = `${boundarySource}${issueSource}${animalSource} Current ordering: ${rankingLabel(state.rankingMode)}.`;
  } else {
    const reason = releaseRankingReadinessReason(state.releaseCoverage);
    selectionSummary.textContent = `${provinceNameLabel || name} is selected for coverage, provenance, and place-context inspection. Cause rankings are unavailable because the active release does not pass its ranking-readiness gate.`;
    selectionFootnote.textContent = `${boundarySource} The live context sources remain labeled separately from the frozen release. Ranking gate: ${reason}`;
  }
''',
    'selected-place copy gate',
)

index = replace_once(
    index,
    '<select id="globe-mode" class="ranking-select">',
    '<select id="globe-mode" class="ranking-select" disabled aria-disabled="true" title="Cause-mode controls are disabled until the active release passes its ranking-readiness gate.">',
    'static globe selector',
)
index = replace_once(
    index,
    '<select id="ranking-mode" class="ranking-select">',
    '<select id="ranking-mode" class="ranking-select" disabled aria-disabled="true" title="Ranking controls are disabled until the active release passes its ranking-readiness gate.">',
    'static ranking selector',
)
index = replace_once(
    index,
    'Compare country-level suffering or death burdens while keeping the animal pain research visualizations and\n              dataset pages connected to the same source registry.',
    'Cause rankings are unavailable until the active release passes its ranking-readiness gate. The atlas remains\n              available for coverage, provenance, and place-context inspection.',
    'static globe copy',
)
index = replace_once(
    index,
    'These controls affect the atlas ranking layer. Use the table equivalents and dataset pages to audit the\n              same values without relying on the map.',
    'Ranking controls are disabled for this release. Use the coverage table, source metadata, and event evidence\n              without treating sparse context rows as a ranked comparison.',
    'static ranking copy',
)
index = replace_once(index, 'Whole-world top 10 across humans and animals', 'Cause ranking unavailable for this release', 'human heading')
index = replace_once(index, 'Animal suffering causes', 'Animal cause ranking unavailable', 'animal heading')
index = replace_once(
    index,
    'Search or select a place to inspect broader human and animal suffering burdens with source, method,\n            vintage, and uncertainty metadata beside the visible rankings.',
    'Search or select a place to inspect coverage, source, method, vintage, and uncertainty context. Cause\n            rankings remain unavailable until the active release passes its ranking-readiness gate.',
    'static selection summary',
)
index = replace_once(
    index,
    '''This panel is the place-first atlas layer. Human rankings combine recurring EA priorities with broader World
            Bank burden indicators. Animal cards use country slaughter, aquaculture, land-area wild estimates, and a
            Wild Animal Initiative direct insect benchmark plus Rethink Priorities sentience and welfare-range
            distributions as burden proxies rather than full moral-weight outputs.''',
    '''This panel is the place-first atlas context layer. Boundary, proxy, and priority-overlay rows remain distinct
            from direct evidence, and the active release does not currently authorize a global, country, or province cause
            ranking. Event-level animal-pain evidence remains available below with its own source and uncertainty fields.''',
    'static footnote',
)

anchor = 'expectPattern("index.html", read("index.html"), /id="release-mode-live"/, "live release mode tab");\n'
addition = r'''expectPattern(
  "index.html",
  read("index.html"),
  /id="globe-mode"[^>]*disabled[^>]*aria-disabled="true"/,
  "disabled static cause-mode control"
);
expectPattern(
  "index.html",
  read("index.html"),
  /id="ranking-mode"[^>]*disabled[^>]*aria-disabled="true"/,
  "disabled static ranking-mode control"
);
expectPattern(
  "script.js",
  read("script.js"),
  /const rankingDisabled = !rankingReady;/,
  "release-wide ranking-readiness control gate"
);
expectPattern(
  "script.js",
  read("script.js"),
  /function renderIssues\(country\) \{[\s\S]*?if \(!releaseRankingReadiness\(state\.releaseCoverage\)\)/,
  "human issue ranking fail-closed gate"
);
expectPattern(
  "script.js",
  read("script.js"),
  /function renderAnimalIssues\(country\) \{[\s\S]*?if \(!releaseRankingReadiness\(state\.releaseCoverage\)\)/,
  "animal issue ranking fail-closed gate"
);
if (read("script.js").includes("Select a country to use country-scoped ranking controls")) {
  failures.push("script.js must not imply that country-scoped cause rankings bypass release ranking readiness");
}
'''
check = replace_once(check, anchor, anchor + addition, 'static assertions')

script_path.write_text(script, encoding='utf-8', newline='\n')
index_path.write_text(index, encoding='utf-8', newline='\n')
check_path.write_text(check, encoding='utf-8', newline='\n')
print('patched')
