// The safety check: nothing private may reach a public repo. Every file git tracks
// or would add is searched for home-folder paths, email addresses, tokens, keys
// and webhooks, and for the owner's private words (such as their real name).
//
// The private words live outside the repo, one per line, in
// ~/.config/engine-v3/private-words, so the words themselves are never committed.
// Without that file, only the patterns are checked (as in CI).
//
// Taken from the orchestrator's safety check (src/safety/ in that project).
// Run from the project root: node tools/check-safety.js
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PRIVATE_WORDS_FILE = path.join(os.homedir(), ".config", "engine-v3", "private-words");

const PATTERNS = [
  { kind: "home-folder path", regex: /\/(?:home|Users)\/[A-Za-z_][A-Za-z0-9_.-]*/g },
  { kind: "email", regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
  { kind: "Discord webhook", regex: /discord(?:app)?\.com\/api\/webhooks\/\d+/g },
  { kind: "GitHub token", regex: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}/g },
  { kind: "Anthropic key", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { kind: "AWS key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "private key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

// Commits use GitHub's no-reply address, and tools name their own no-reply addresses.
const ALLOWED_EMAIL_ENDINGS = ["@users.noreply.github.com", "noreply@anthropic.com", "@example.com"];

function repoFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    encoding: "utf8",
  });
  return output.split("\0").filter((file) => file !== "" && fs.existsSync(file));
}

function privateWords() {
  if (!fs.existsSync(PRIVATE_WORDS_FILE)) return [];
  return fs
    .readFileSync(PRIVATE_WORDS_FILE, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((word) => word !== "" && !word.startsWith("#"));
}

function isAllowedEmail(email) {
  const lowerCase = email.toLowerCase();
  return ALLOWED_EMAIL_ENDINGS.some((ending) => lowerCase.endsWith(ending));
}

function findPrivateDetails(text, words) {
  const details = [];
  for (const [index, line] of text.split("\n").entries()) {
    const lineNumber = index + 1;
    for (const { kind, regex } of PATTERNS) {
      for (const match of line.matchAll(regex)) {
        if (kind === "email" && isAllowedEmail(match[0])) continue;
        details.push({ lineNumber, kind, text: match[0] });
      }
    }
    const lowerCaseLine = line.toLowerCase();
    for (const word of words) {
      if (lowerCaseLine.includes(word.toLowerCase())) details.push({ lineNumber, kind: "private word", text: word });
    }
  }
  return details;
}

const words = privateWords();
const files = repoFiles();
let found = 0;

for (const file of files) {
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) continue;
  for (const detail of findPrivateDetails(bytes.toString("utf8"), words)) {
    console.log(`${file}:${detail.lineNumber}: ${detail.kind}: ${detail.text}`);
    found += 1;
  }
}

if (found > 0) {
  console.log(`Safety check failed: ${found} private detail(s) found.`);
  process.exitCode = 1;
} else {
  console.log(`Safety check passed: ${files.length} files, ${words.length} private words.`);
}
