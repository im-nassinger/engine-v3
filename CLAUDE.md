# engine-v3

A 2D physics game with a level editor, for the browser. The requirements, the scope and the architecture are approved (2026-11-14). The work goes stage by stage through `docs/plan.md`; `docs/progress.md` says which stage is current.

Start at `docs/README.md`, then `docs/progress.md`.

## Rules for working here

- **Use the glossary's words exactly** (`docs/glossary.md`), and never a dropped word. One word, one meaning. If a new word is needed, add it to the glossary first.
- **Before proposing anything**, read `docs/principles.md` and check `docs/rejected.md`.
- **The owner's standing yes (2026-11-14):** the important decisions are made, so Claude decides the smaller questions itself and keeps building without waiting. Each such decision is written where it belongs, with its reason, marked `(standing yes, <date>)`, and listed in `docs/decisions.md` so the owner can review it later. Never invent a reason, and never silently override an owner decision: if one can't be built as written, pick the closest fix, record it the same way, and say so in `docs/progress.md`.
- **Requirements say what the game does, not how it is built.** How it is built goes in `docs/architecture/` (the approved design); facts and warnings about browsers, Box2D and Lua go in `docs/tech-notes.md`.
- A requirement file follows the format in `docs/requirements/README.md`: a version on every feature heading, a `Source:` line under every feature.
- **No folder holds files with different jobs.** When a folder you add to starts mixing them, split it into subfolders, one per area, whatever the number of files. See `docs/architecture/parts-and-folders.md`.
- **Run `npm run check` before every commit.** It runs the type checks, ESLint, Prettier's check, dependency-cruiser, the unit and guard tests, the safety check (`tools/check-safety.js`) and `tools/check-docs.js`. See `docs/architecture/tooling.md`.
- After changing docs, also run `node tools/check-sources.js` (it reads `~/projects/ecs-game-v2`, so it isn't in `npm run check`).
- `~/projects/ecs-game-v2` is the read-only source these docs were written from. Never change it.
