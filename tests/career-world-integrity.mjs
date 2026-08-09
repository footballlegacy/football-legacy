import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const careerRoot = path.join(root, "career-mode");
const errors = [];
const warnings = [];
const metrics = {};

function fail(scope, message, detail = null) {
  errors.push({ scope, message, detail });
}

function warn(scope, message, detail = null) {
  warnings.push({ scope, message, detail });
}

function present(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function duplicateValues(rows) {
  const counts = new Map();
  for (const value of rows.filter(present)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
}

function localStorageStub() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  };
}

const documentStub = {
  body: { classList: { add() {}, remove() {}, toggle() {} }, dataset: {}, appendChild() {} },
  head: { appendChild() {} },
  documentElement: { style: { setProperty() {} } },
  createElement: tag => ({
    tagName: String(tag).toUpperCase(), style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {}, addEventListener() {}, remove() {}, setAttribute() {}, click() {},
    getContext: () => null,
  }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
};

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
  Promise,
  Map,
  Set,
  URL,
  URLSearchParams,
  TextEncoder,
  TextDecoder,
  performance,
  document: documentStub,
  navigator: { userAgent: "Football Legacy integrity audit" },
  location: { href: "", search: "" },
  localStorage: localStorageStub(),
  sessionStorage: localStorageStub(),
  addEventListener() {},
  removeEventListener() {},
  confirm: () => true,
  alert() {},
});
context.window = context;
context.globalThis = context;

const html = fs.readFileSync(path.join(careerRoot, "game.html"), "utf8");
const sources = [...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(match => match[1].split("?")[0])
  .filter(source => source.startsWith("js/"));
const gameIndex = sources.indexOf("js/game.js");
const runtimeSources = sources.slice(0, gameIndex + 1).filter(source => !source.endsWith("save.js"));

for (const source of runtimeSources) {
  const filename = path.join(careerRoot, source);
  try {
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename, timeout: 10_000 });
  } catch (error) {
    fail("module-load", `Could not load ${source}`, error.stack || error.message);
  }
}

function auditCatalogues() {
  const database = context.FLClubDatabase;
  if (!database) return fail("catalogue", "Club database did not load");
  const allClubs = [...database.english, ...database.world];
  metrics.catalogueEnglishClubs = database.english.length;
  metrics.catalogueWorldClubs = database.world.length;
  metrics.catalogueTotalClubs = allClubs.length;
  for (const field of ["reference", "name", "founded", "currentStrength", "prestige", "league", "tier"]) {
    const missing = allClubs.filter(row => !present(row[field]));
    if (missing.length) fail("club-catalogue", `${missing.length} clubs lack ${field}`, missing.slice(0, 12).map(row => row.name || row.reference));
  }
  for (const [label, rows] of [["English", database.english], ["world", database.world]]) {
    const duplicateIds = duplicateValues(rows.map(row => row.id));
    const duplicateNames = duplicateValues(rows.map(row => row.name));
    if (duplicateIds.length) fail("club-catalogue", `${label} catalogue has duplicate IDs`, duplicateIds.slice(0, 20));
    if (duplicateNames.length) warn("club-catalogue", `${label} catalogue has duplicate fictional names`, duplicateNames.slice(0, 20));
  }

  const timeline = context.FLTimelineData?.legendArchetypes || [];
  const pyramid = context.FLPyramidData?.legendArchetypes || [];
  const combined = [...timeline, ...pyramid];
  const unique = new Map(combined.map(row => [row.id, row]));
  metrics.iconicArchetypesTimeline = timeline.length;
  metrics.iconicArchetypesPyramid = pyramid.length;
  metrics.iconicArchetypesUnique = unique.size;
  if (unique.size < 100) fail("iconic-players", `Only ${unique.size} distinct iconic archetypes exist; requirement is at least 100`);
  const labels = combined.map(row => String(row.label || "").toLowerCase());
  const probableDuplicateLabels = duplicateValues(labels);
  if (probableDuplicateLabels.length) warn("iconic-players", "Some iconic archetypes repeat the same label", probableDuplicateLabels);
  for (const row of unique.values()) {
    for (const field of ["id", "triggerYear", "nationality", "position", "label", "ability", "ceiling", "traits"]) {
      if (!present(row[field]) || (field === "traits" && !Array.isArray(row.traits))) fail("iconic-players", `${row.id || "Unnamed archetype"} lacks ${field}`);
    }
  }
}

function auditAssetsAndPages() {
  const pages = fs.readdirSync(careerRoot).filter(name => name.endsWith(".html"));
  let checkedReferences = 0;
  for (const page of pages) {
    const pagePath = path.join(careerRoot, page);
    const markup = fs.readFileSync(pagePath, "utf8");
    for (const match of markup.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const reference = match[1].split(/[?#]/)[0];
      if (!reference || /^(?:https?:|data:|mailto:|javascript:|#)/i.test(reference)) continue;
      checkedReferences++;
      const target = path.resolve(path.dirname(pagePath), reference);
      if (!fs.existsSync(target)) fail("assets", `${page} references a missing file`, reference);
    }
  }
  const portraits = context.FLRealPortraitCatalog?.assets || [];
  metrics.htmlAssetReferencesChecked = checkedReferences;
  metrics.portraitAssetsDeclared = portraits.length;
  let missingPortraits = 0;
  for (const portrait of portraits) {
    const target = path.join(careerRoot, portrait.path || "");
    if (!portrait.path || !fs.existsSync(target)) {
      missingPortraits++;
      if (missingPortraits <= 20) fail("portraits", `Portrait catalogue entry ${portrait.id || "unknown"} is missing its file`, portrait.path);
    }
  }
  metrics.portraitAssetsMissing = missingPortraits;
}

function auditNumbers(value, route = "game", seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => auditNumbers(item, `${route}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "number" && !Number.isFinite(child)) fail("invalid-number", `${route}.${key} is ${String(child)}`);
    else auditNumbers(child, `${route}.${key}`, seen);
  }
}

function auditSeasonRows(game) {
  let rows = 0;
  for (const club of game.clubs || []) {
    for (const row of club.seasonHistory || []) {
      rows++;
      for (const field of ["season", "played", "won", "drawn", "lost", "gf", "ga"]) {
        if (!present(row[field])) fail("club-history", `${club.name} has a season row without ${field}`, row);
      }
      const played = Number(row.played);
      const decided = Number(row.won) + Number(row.drawn) + Number(row.lost);
      if (Number.isFinite(played) && Number.isFinite(decided) && played !== decided) {
        fail("club-history", `${club.name} ${row.season}: played ${played} but W+D+L is ${decided}`);
      }
    }
  }
  return rows;
}

function collectPlayers(game) {
  const rows = [];
  for (const club of game.clubs || []) for (const player of club.players || []) rows.push({ player, club, source: "English club" });
  for (const player of game.freeAgents || []) rows.push({ player, club: null, source: "free agent" });
  for (const player of game.retiredPlayers || []) rows.push({ player, club: null, source: "retired" });
  for (const player of game.deceasedPlayers || []) rows.push({ player, club: null, source: "deceased" });
  for (const player of game.globalPlayers || []) rows.push({ player, club: null, source: "global prospect" });
  for (const player of game.worldFootball?.retiredPlayers || []) rows.push({ player, club: null, source: "world retired" });
  try {
    for (const found of context.FLWorldFootball?.players?.(game) || []) rows.push({ player: found.p, club: found.c, source: "world club" });
  } catch (error) {
    fail("world-players", "World player catalogue could not be read", error.stack || error.message);
  }
  return rows;
}

function auditPlayers(game, year) {
  const allRows = collectPlayers(game);
  const byId = new Map();
  for (const row of allRows) {
    const id = row.player?.id;
    if (!present(id) || !byId.has(id)) byId.set(id || Symbol("missing-player-id"), row);
    else {
      const existing = byId.get(id);
      if (existing.player?.name !== row.player?.name || existing.player?.nationality !== row.player?.nationality || existing.player?.position !== row.player?.position) {
        fail("players", `Conflicting copies exist for player ID ${id}`, { first: existing.player, second: row.player });
      }
      if (existing.source === "global prospect" && row.source !== "global prospect") byId.set(id, row);
    }
  }
  const rows = [...byId.values()];
  metrics[`players${year}`] = rows.length;
  let seasonRows = 0;
  let clubHistoryRows = 0;
  let iconicPlayers = 0;
  const activeSources = new Set(["English club", "world club", "free agent", "global prospect"]);
  for (const { player, club, source } of rows) {
    if (!player || typeof player !== "object") {
      fail("players", `Invalid ${source} player record`);
      continue;
    }
    for (const field of ["id", "name", "position", "nationality"]) {
      if (!present(player[field])) fail("players", `${source} player lacks ${field}`, { club: club?.name, player: player.name || player.id });
    }
    if (activeSources.has(source) || source === "world retired") {
      for (const field of ["age", "ability", "potential", "ceiling"]) {
        if (!Number.isFinite(Number(player[field]))) fail("players", `${player.name} lacks numeric ${field}`, { source, value: player[field] });
      }
    }
    if (activeSources.has(source)) {
      for (const field of ["appearances", "starts", "subApps", "minutes", "goals", "assists", "yellowCards", "redCards", "cleanSheets", "conceded", "playerOfMatch"]) {
        if (!Number.isFinite(Number(player[field]))) fail("player-stats", `${player.name} lacks numeric ${field}`, { source, value: player[field] });
      }
      for (const field of ["appearances", "goals", "assists", "cleanSheets"]) {
        if (!Number.isFinite(Number(player.careerTotals?.[field]))) fail("player-career-totals", `${player.name} lacks career total ${field}`, { source, value: player.careerTotals?.[field] });
      }
    }
    if (source === "free agent" && present(player.clubId)) fail("free-agents", `${player.name} is a free agent but still has clubId ${player.clubId}`);
    if (club && player.clubId !== club.id) fail("players", `${player.name} belongs to ${club.name} but has clubId ${player.clubId || "empty"}`);
    for (const season of Array.isArray(player.seasonHistory) ? player.seasonHistory : []) {
      seasonRows++;
      for (const field of ["season", "club", "apps", "goals", "assists"]) {
        if (!present(season[field])) fail("player-season-history", `${player.name} has a season row without ${field}`, season);
      }
      for (const field of ["apps", "goals", "assists", "cleanSheets"]) {
        if (!Number.isFinite(Number(season[field] ?? 0)) || Number(season[field] ?? 0) < 0) fail("player-season-history", `${player.name} has invalid season ${field}`, season);
      }
    }
    clubHistoryRows += Array.isArray(player.clubHistory) ? player.clubHistory.length : 0;
    if (player.legendArchetype) iconicPlayers++;
  }
  metrics[`playerSeasonRows${year}`] = seasonRows;
  metrics[`playerClubHistoryRows${year}`] = clubHistoryRows;
  metrics[`generatedIconicPlayers${year}`] = iconicPlayers;
  const generatedArchetypes = game.worldState?.generatedArchetypes || [];
  metrics[`generatedIconicArchetypes${year}`] = generatedArchetypes.length;
  const expectedArchetypes = new Set([
    ...(context.FLTimelineData?.legendArchetypes || []),
    ...(context.FLPyramidData?.legendArchetypes || []),
  ].filter(row => Number(row.triggerYear) <= year).map(row => row.id));
  const missingArchetypes = [...expectedArchetypes].filter(id => !generatedArchetypes.includes(id));
  if (missingArchetypes.length) fail("iconic-players", `${missingArchetypes.length} iconic archetypes due by ${year} were never generated`, missingArchetypes.slice(0, 30));
  if (year >= 1950 && seasonRows === 0) fail("player-history", `No player season-history rows exist in ${year}`);
  if (year >= 1950 && clubHistoryRows === 0) fail("player-history", `No player club-history rows exist in ${year}`);
}

function auditManagers(game, year) {
  const managers = game.managerArchive || [];
  metrics[`managerArchive${year}`] = managers.length;
  const duplicateIds = duplicateValues(managers.map(row => row.id));
  if (duplicateIds.length) fail("managers", `${duplicateIds.length} duplicate manager archive IDs at ${year}`, duplicateIds.slice(0, 25));
  const currentClubIds = managers.map(row => row.currentClubId).filter(present);
  const multipleIncumbents = duplicateValues(currentClubIds);
  if (multipleIncumbents.length) fail("managers", "Multiple archived managers claim the same current club", multipleIncumbents.slice(0, 25));
  for (const manager of managers) {
    const name = manager.name || `${manager.firstName || ""} ${manager.lastName || ""}`.trim();
    if (!present(manager.id) || !present(name)) fail("managers", "Manager archive record lacks identity", manager);
    if (manager.record) {
      const played = Number(manager.record.played || 0);
      const decided = Number(manager.record.won || 0) + Number(manager.record.drawn || 0) + Number(manager.record.lost || 0);
      if (played !== decided) fail("managers", `${name}: played ${played} but W+D+L is ${decided}`);
    }
  }
  if (year >= 1950 && managers.length === 0) fail("managers", `No manager history exists in ${year}`);
  const vacancies = game.careerSystems?.jobs?.vacancies || [];
  metrics[`managerVacancies${year}`] = vacancies.length;
  const pool = game.careerSystems?.jobs?.managerPool || [];
  const available = pool.filter(manager => manager.status === "available");
  metrics[`availableManagerPool${year}`] = available.length;
  if (available.length < 20) fail("manager-pool", `Only ${available.length} available managers exist in ${year}`);
  for (const manager of available) {
    for (const field of ["id", "name", "age", "nationality", "style", "temperament", "preferredFormation", "ability", "reputation", "availableSince", "previousClub", "experience"]) {
      if (!present(manager[field])) fail("manager-pool", `${manager.name || manager.id || "Manager"} lacks ${field}`);
    }
    const record = manager.experience || {};
    if (Number(record.played || 0) !== Number(record.won || 0) + Number(record.drawn || 0) + Number(record.lost || 0)) {
      fail("manager-pool", `${manager.name}: experience played does not equal W+D+L`, record);
    }
  }
  if (available.length && context.FLCareerSystems?.jobsView) {
    let markup = "";
    try { markup = context.FLCareerSystems.jobsView(game); }
    catch (error) { fail("manager-ui", `Manager Jobs page crashed while rendering ${year}`, error.stack || error.message); }
    if (markup && !markup.includes("UNEMPLOYED MANAGER MARKET")) fail("manager-ui", "The persistent manager pool is not shown on the Manager Jobs page");
    if (markup && !markup.includes(available[0].name)) fail("manager-ui", "The Manager Jobs page does not render available manager identities");
    for (const heading of ["Formation", "Record", "Win %", "Last club", "Available because"]) {
      if (markup && !markup.includes(heading)) fail("manager-ui", `Manager market table lacks ${heading}`);
    }
  }
}

function auditSaveRoundTrip(game, year) {
  let restored;
  try { restored = JSON.parse(JSON.stringify(game)); }
  catch (error) { return fail("save-load", `The ${year} career cannot be serialised`, error.stack || error.message); }
  try {
    context.FLHistoryIntegrity?.migrate?.(restored);
    context.FLCareerSystems?.ensure?.(restored);
    context.FLTimeline?.ensure?.(restored);
  } catch (error) {
    return fail("save-load", `The ${year} career crashed during post-load migration`, error.stack || error.message);
  }
  const checks = [
    ["clubs", game.clubs?.length || 0, restored.clubs?.length || 0],
    ["free agents", game.freeAgents?.length || 0, restored.freeAgents?.length || 0],
    ["generated iconic archetypes", game.worldState?.generatedArchetypes?.length || 0, restored.worldState?.generatedArchetypes?.length || 0],
    ["available managers", game.careerSystems?.jobs?.managerPool?.filter(m => m.status === "available").length || 0, restored.careerSystems?.jobs?.managerPool?.filter(m => m.status === "available").length || 0],
  ];
  for (const [label, before, after] of checks) if (before !== after) fail("save-load", `${year} ${label} changed after save/load (${before} to ${after})`);
  metrics[`saveRoundTripBytes${year}`] = JSON.stringify(restored).length;
}

async function auditEra(year) {
  if (!context.FLGame?.createStartYear) return fail("runtime", "FLGame.createStartYear is unavailable");
  console.log(`Generating and auditing ${year}...`);
  const selected = context.FLData?.clubs?.[0];
  const manager = { firstName: "Integrity", lastName: "Tester", age: 38, nationality: "English", birthplace: "England", managementStyle: "Balanced", temperament: "Measured" };
  const started = performance.now();
  let game;
  try {
    game = await context.FLGame.createStartYear(manager, selected, year);
  } catch (error) {
    fail("runtime", `Career creation crashed for ${year}`, error.stack || error.message);
    return;
  }
  metrics[`simulationMs${year}`] = Math.round(performance.now() - started);
  metrics[`clubs${year}`] = game.clubs?.length || 0;
  metrics[`freeAgents${year}`] = game.freeAgents?.length || 0;
  if (year >= 1950 && (game.freeAgents?.length || 0) < 12) fail("free-agents", `Only ${game.freeAgents?.length || 0} free agents exist in ${year}`);
  metrics[`clubSeasonRows${year}`] = auditSeasonRows(game);
  const duplicateClubIds = duplicateValues((game.clubs || []).map(row => row.id));
  if (duplicateClubIds.length) fail("clubs", `${duplicateClubIds.length} duplicate club IDs in ${year}`, duplicateClubIds.slice(0, 25));
  for (const club of game.clubs || []) {
    for (const field of ["id", "name", "founded", "location"]) {
      if (!present(club[field])) fail("clubs", `${club.name || club.id || "Unnamed club"} lacks ${field}`);
    }
    for (const field of ["played", "won", "drawn", "lost", "gf", "ga", "points"]) {
      if (!Number.isFinite(Number(club[field] ?? 0))) fail("clubs", `${club.name} has invalid ${field}`, club[field]);
    }
  }
  auditPlayers(game, year);
  auditManagers(game, year);
  auditSaveRoundTrip(game, year);
  auditNumbers(game);
  console.log(`Finished ${year} in ${metrics[`simulationMs${year}`]}ms`);
}

auditAssetsAndPages();
auditCatalogues();
const requestedYears = process.argv.slice(2).map(Number).filter(year => Number.isInteger(year) && year >= 1888 && year <= 2026);
for (const year of requestedYears.length ? requestedYears : [1888, 1950, 2000, 2026]) await auditEra(year);

const report = {
  generatedAt: new Date().toISOString(),
  root,
  metrics,
  summary: { errors: errors.length, warnings: warnings.length },
  errors,
  warnings,
};
const reportPath = path.join(root, "tests", "career-world-integrity-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
console.log(`Report: ${reportPath}`);
if (errors.length) process.exitCode = 1;
