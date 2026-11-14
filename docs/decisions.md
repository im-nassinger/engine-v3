# Decisions

## TL;DR

Project-level choices and why: starting over, how the requirements were settled, how versions were set, and how these docs are organised. **What the game does is not decided here.** Those decisions are in [requirements/](requirements/README.md), each with its reason and source, and what was decided against is in [rejected.md](rejected.md).

## 2026-11-13: Start over from scratch

The first attempt (`~/projects/ecs-game`) reached Stage 3 of 13, but the owner was unhappy with the code. The project starts again with no code from it. Only the functional requirements were carried over.

The old technical design, implementation plan and stage notes stay in the old project. Its implementation choices worth a second look are listed at the end of [tech-notes.md](tech-notes.md).

## 2026-11-13: The requirements were settled in a 12-round review

The carried-over requirements were 12 big topic files. The owner reviewed them in 12 rounds of yes/no questions, and each round could change or override an earlier one. That left three layers that disagreed: the topic files, a list of 82 accepted decisions, and the 12 rounds. The rule for reading them: **a later layer always wins**, and a later round wins over an earlier one.

The review also produced the [principles](principles.md): each is something the owner corrected more than once.

## 2026-11-13: Versions were set in a separate scope review

Versions are never decided inside a requirement. One scope review went through 117 features with a proposed version and reason for each, and the owner accepted every pick. **v1 is the smallest thing that can be tested.** The result is [scope.md](scope.md).

## 2026-11-13: Clean docs in a new project

The three layers were rewritten into one set of docs in `~/projects/engine-v3`, a fresh git repo. `~/projects/ecs-game-v2` (GitHub: `im-nassinger/engine-v2`) is the source and is left as it is.

What the owner asked for: docs that a person or a future AI session can read and trust, as few files as possible with nothing important lost, no file too big to read in full, high level first and detail after, a TL;DR on every file, and a version and a reason on every requirement.

How the docs do it:

- **Rewritten, not patched.** Each topic was written again from the old file plus every decision that touched it, in today's words.
- **Eight topics instead of twelve:** editor, drawing, assets, physics, camera, triggers, scripts, play and save. A small topic is one file, a bigger one is a folder with a README.
- **Every feature heading carries its version**, and every feature ends in a `Source:` line, so a rule can be traced back to the review.
- **One place per fact.** Other files link to a rule instead of repeating it.
- **What isn't a requirement has its own file:** [rejected.md](rejected.md) for what was decided against, [requirements/later.md](requirements/later.md) for features not designed yet, [tech-notes.md](tech-notes.md) for what the old research learned about browsers, Box2D and Lua.
- **Two scripts check the docs.** `tools/check-docs.js` checks the form. `tools/check-sources.js` proves that every review decision and scope id is cited somewhere, so nothing was lost in the rewrite. That proof is finished: it keeps running only so a citation isn't deleted by accident. Decisions made after the review are cited as `owner: <date>`, which it doesn't read.

Where this differs from the earlier plan (`docs-cleanup-plan.md` in the old project): `scope.md` was kept as the one-page list of every feature, the technical notes are one file instead of one per topic, and a small topic is a single file instead of a folder.

## Still to decide

- **The architecture and the stack.** Nothing is chosen. The requirements name a few things the owner did choose along the way: Box2D v3, Lua 5.4 and the Monaco editor.
- **The features without a version** and the other open questions, listed in [progress.md](progress.md).
