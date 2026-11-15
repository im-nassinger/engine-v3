// Checks the docs follow their own rules:
//   1. every doc opens with an H1 and then "## TL;DR"
//   2. no doc is longer than 300 lines
//   3. every relative link points to a file that exists
//   4. in docs/requirements, every "###" feature heading ends in its version
//      (· v1, · v2, · v3, · v4 or · Later) and is closed by a "Source:" line
//   5. dropped words (the glossary's "Dropped words" table) are used nowhere
//      except glossary.md and rejected.md. Naming one inside "double quotes" or
//      `backticks` is fine: that is talking about the word, not using it.
//
// Run from the project root: node tools/check-docs.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const docsDir = path.join(root, "docs");
const MAX_LINES = 300;

// Dropped words that are also ordinary English ("the rules", "an error message").
// Only a person can tell the dropped meaning from the ordinary one, so these
// are not checked.
const ORDINARY_WORDS = new Set([
  "rule", "data", "message", "item", "object", "template", "anchor",
  "layer (physics)", "action (for keys)", "full screen (camera mode)",
]);
// Where a dropped word is part of an agreed name.
const ALLOWED_PHRASES = ["sprite sheet"];

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

function droppedWords() {
  const glossary = fs.readFileSync(path.join(docsDir, "glossary.md"), "utf8");
  const table = glossary.split("## Dropped words")[1] || "";
  const words = [];
  for (const line of table.split("\n")) {
    if (!line.startsWith("| ") || line.startsWith("| Don't say") || line.startsWith("|---")) continue;
    const cell = line.split("|")[1];
    for (const raw of cell.split(",")) {
      const word = raw.trim().replace(/`/g, "").toLowerCase();
      if (word && !ORDINARY_WORDS.has(word)) words.push(word.replace(/ file$/, ""));
    }
  }
  return words;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const problems = [];
// The runner writes docs/runner/status.md while it runs. It isn't in git, and its
// events quote the sessions' own words, so it isn't held to these rules.
const runnerStatusFile = path.join(docsDir, "runner", "status.md");
const files = [...markdownFiles(docsDir), path.join(root, "CLAUDE.md")].filter(
  (file) => fs.existsSync(file) && file !== runnerStatusFile,
);
const dropped = droppedWords().map((word) => ({
  word,
  // A leading dot (".level") can't use \b on its left side.
  pattern: new RegExp(`${/^\w/.test(word) ? "\\b" : ""}${escapeRegExp(word)}s?\\b`, "i"),
}));

for (const file of files) {
  const name = path.relative(root, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const isDoc = file.startsWith(docsDir);
  const isRequirement = file.startsWith(path.join(docsDir, "requirements"));
  const mayUseDroppedWords = ["glossary.md", "rejected.md"].includes(path.basename(file));

  if (isDoc) {
    const content = lines.filter((line) => line.trim() !== "");
    if (!content[0] || !content[0].startsWith("# ")) problems.push(`${name}: doesn't start with an H1`);
    if (content[1] !== "## TL;DR") problems.push(`${name}: no "## TL;DR" right under the title`);
    const length = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
    if (length > MAX_LINES) problems.push(`${name}: ${length} lines, over ${MAX_LINES}`);
  }

  let openFeature = null;
  lines.forEach((line, index) => {
    const where = `${name}:${index + 1}`;

    for (const match of line.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) problems.push(`${where}: broken link ${match[1]}`);
    }

    if (isRequirement) {
      if (/^#{1,3} /.test(line) && openFeature) {
        problems.push(`${openFeature.where}: "${openFeature.title}" has no Source: line`);
        openFeature = null;
      }
      if (line.startsWith("### ")) {
        if (!/ · (v1|v2|v3|v4|Later)$/.test(line)) problems.push(`${where}: heading doesn't end in · v1, · v2, · v3, · v4 or · Later`);
        openFeature = { where, title: line.slice(4) };
      }
      if (line.startsWith("Source: ")) openFeature = null;
    }

    if (!mayUseDroppedWords) {
      let text = line.toLowerCase().replace(/"[^"]*"/g, "").replace(/`[^`]*`/g, "");
      for (const phrase of ALLOWED_PHRASES) text = text.split(phrase).join("");
      for (const { word, pattern } of dropped) {
        if (pattern.test(text)) problems.push(`${where}: dropped word "${word}"`);
      }
    }
  });
  if (openFeature) problems.push(`${openFeature.where}: "${openFeature.title}" has no Source: line`);
}

if (problems.length > 0) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} problem(s) in ${files.length} files.`);
  process.exit(1);
}
console.log(`OK: ${files.length} files.`);
