// The "nothing lost" check. Every decision in the old project must be cited in the
// new docs: in a "Source:" line of a requirement, or in the Source column of
// docs/rejected.md.
//
// Checked: every row id of review-decisions/round-*.md (as round + id, because some
// ids were used in two rounds), every D number of 00-decisions.md, and every scope
// id of review/scope.js.
//
// Run from the project root: node tools/check-sources.js [path to ecs-game-v2]
// The old project is read-only source material, so this only works while it exists.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const docsDir = path.join(root, "docs");
const oldRoot = path.resolve(process.argv[2] || path.join(root, "..", "ecs-game-v2"));
const oldRequirements = path.join(oldRoot, "docs", "requirements");

// "01 2.2, 2.3" means "01 2.2" and "01 2.3": a bare section number takes the
// file number of the id before it.
function splitIds(text) {
  const ids = [];
  let filePrefix = "";
  for (const raw of text.split(",")) {
    const id = raw.trim().replace(/\.$/, "");
    if (!id) continue;
    const section = id.match(/^(\d\d) \S+$/);
    if (section) filePrefix = section[1];
    const isBareSection = /^\d+\.\d/.test(id) && filePrefix;
    ids.push(isBareSection ? `${filePrefix} ${id}` : id);
  }
  return ids;
}

function tableRows(file) {
  return fs.readFileSync(file, "utf8").split("\n")
    .filter((line) => line.startsWith("| "))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells[0] && !/^-+$/.test(cells[0]));
}

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

// What must be cited.
const required = [];
const roundFiles = fs.readdirSync(path.join(oldRequirements, "review-decisions"))
  .filter((name) => /^round-\d+\.md$/.test(name));
for (const name of roundFiles) {
  const round = Number(name.match(/\d+/)[0]);
  for (const cells of tableRows(path.join(oldRequirements, "review-decisions", name))) {
    if (cells[0] === "Id") continue;
    for (const id of splitIds(cells[0])) required.push({ key: `round ${round}: ${id}`, round, id });
  }
}
for (const cells of tableRows(path.join(oldRequirements, "00-decisions.md"))) {
  if (/^\d+$/.test(cells[0])) required.push({ key: `decisions: D${cells[0]}`, id: `D${cells[0]}` });
}
const scope = {};
vm.createContext(scope);
vm.runInContext(`${fs.readFileSync(path.join(oldRoot, "review", "scope.js"), "utf8")}\nthis.ITEMS = ITEMS;`, scope);
for (const [, items] of scope.ITEMS) {
  for (const item of items) required.push({ key: `scope ${item[0]}`, id: item[0] });
}

// What is cited.
const cited = new Set();
const citedDecisions = new Set();
function readSource(text) {
  for (const part of text.split(";")) {
    const segment = part.trim();
    const round = segment.match(/^round (\d+): (.*)$/);
    if (round) {
      for (const id of splitIds(round[2])) {
        cited.add(`round ${round[1]}: ${id}`);
        if (/^D\d+$/.test(id)) citedDecisions.add(id);
      }
      continue;
    }
    const decisions = segment.match(/^decisions: (.*)$/);
    if (decisions) {
      for (const id of splitIds(decisions[1])) citedDecisions.add(id);
      continue;
    }
    const scopeIds = segment.match(/^scope (.*)$/);
    if (scopeIds) for (const id of splitIds(scopeIds[1])) cited.add(`scope ${id}`);
  }
}
for (const file of markdownFiles(docsDir)) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("Source: ")) readSource(line.slice("Source: ".length));
  }
}
for (const cells of tableRows(path.join(docsDir, "rejected.md"))) readSource(cells[cells.length - 1]);

const missing = required.filter((item) => {
  if (item.key.startsWith("decisions: ")) return !citedDecisions.has(item.id);
  return !cited.has(item.key);
});

// A citation that matches nothing in the old project is probably a typo.
const known = new Set(required.map((item) => item.key));
const unknown = [...cited].filter((key) => !known.has(key));
const unknownDecisions = [...citedDecisions].filter((id) => !known.has(`decisions: ${id}`));

if (missing.length > 0) {
  console.log(`Not cited anywhere (${missing.length}):`);
  for (const item of missing) console.log(`  ${item.key}`);
}
if (unknown.length + unknownDecisions.length > 0) {
  console.log(`Cited, but not in the old project (${unknown.length + unknownDecisions.length}):`);
  for (const key of unknown) console.log(`  ${key}`);
  for (const id of unknownDecisions) console.log(`  decisions: ${id}`);
}
if (missing.length + unknown.length + unknownDecisions.length === 0) {
  console.log(`OK: ${required.length} decisions and scope ids are all cited.`);
} else {
  process.exit(1);
}
