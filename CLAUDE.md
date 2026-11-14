# engine-v3

A 2D physics game with a level editor, for the browser. **There is no code yet:** this repo holds the functional requirements and the scope. The architecture comes next.

Start at `docs/README.md`, then `docs/progress.md`.

## Rules for working here

- **Use the glossary's words exactly** (`docs/glossary.md`), and never a dropped word. One word, one meaning. If a new word is needed, add it to the glossary first.
- **Before proposing anything**, read `docs/principles.md` and check `docs/rejected.md`.
- **Never invent a requirement, a version or a reason.** What the owner hasn't decided goes in a "Not in the scope review" table or in the open questions of `docs/progress.md`.
- **Requirements say what the game does, not how it is built.** Notes on how go in `docs/tech-notes.md`.
- A requirement file follows the format in `docs/requirements/README.md`: a version on every feature heading, a `Source:` line under every feature.
- After changing docs, run `node tools/check-docs.js` and `node tools/check-sources.js`.
- `~/projects/ecs-game-v2` is the read-only source these docs were written from. Never change it.
