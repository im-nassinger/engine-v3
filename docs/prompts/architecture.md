# Task: propose the code architecture for engine-v3

## TL;DR

Decide how engine-v3 is built (the stack, layers, folders, classes, data flow, performance and an implementation order) from the requirements and the other docs, and write it as `.md` files under `docs/proposals/architecture/` for the owner to review. Classes and OOP, clean and readable code. TypeScript, Vite, React, PixiJS and Box2D v3 are fixed. Don't read code from earlier attempts. Outline first and wait for the owner, then write.

## Context

engine-v3 is a 2D physics game with a level editor, for the browser. The repo holds only docs so far: the functional requirements, the scope and its versions (v1 to v4), a glossary, principles, rejected ideas and technical notes. There is no code. The requirements are finished. Your job is the next step: decide how the game is built, and write that down so it can be implemented.

**The goal:** when an implementation session starts, every important decision is already made. It shouldn't have to choose a folder layout, a module boundary, a class shape, a library, a file format or a data flow. It reads your docs and writes code. Anything you leave vague becomes a decision someone makes in a hurry, and that's how the first attempt went wrong.

**Lessons from the first attempt.** The owner abandoned the first attempt because its code was poor. It was built mostly from loose functions. **This time the code is object-oriented: most things are classes**, with clear responsibilities, contracts and constructor injection. The folder structure and the code must be clean and easy to read.

**Don't read any code from earlier attempts**, in `~/projects/ecs-game`, `~/projects/ecs-game-v2` or anywhere else. Its quality is poor and it would pull your design toward it. Everything worth keeping is already in this repo's docs, and `docs/tech-notes.md` has the technical lessons.

## Read first

1. Load the skills `working-with-me`, `clean-architecture`, `typescript-style` and `react-component-structure`. Follow them for every decision: dependency direction, module boundaries, naming, file size, folder layout, components. Where the code would break one of their rules, change the design.
2. `CLAUDE.md`, then `docs/README.md`, `docs/progress.md`, `docs/overview.md`, `docs/principles.md`, `docs/glossary.md`, `docs/scope.md`, `docs/rejected.md`, `docs/decisions.md` and `docs/tech-notes.md`.
3. Every topic under `docs/requirements/`: the README first, then the files. Read v1 in full. For v2 and v3, read enough to know which seams the v1 design must leave open.

## Already decided

These are facts. Don't propose alternatives to them.

| Part | Choice |
|---|---|
| Language | TypeScript |
| Build tool | Vite |
| UI | React |
| Rendering | PixiJS |
| Physics | Box2D v3, through wasm |

Everything else is open for you to recommend. That includes state management, the test runner, linting, how Lua 5.4 and Monaco are brought in, the storage library, and anything you find the design needs. Mark each one as a recommendation. Name exact package versions for both the fixed choices and your recommendations.

## What to decide

Base every decision on the requirements and the other docs. Give each one a short *Why*, tied to a requirement, a principle or a tech note where you can.

- **The layers and the dependency direction:** what the core rules are (entities, components, the level, the simulation), and what counts as a detail (React, PixiJS, Box2D, the DOM, browser storage, the clock). The core never imports a detail.
- **The folder structure:** the whole `src/` tree down to the folders, with a one-line purpose for each folder and the rule for what goes where. Also where tests go.
- **The core model as classes:** entities, components, the level and the World entity. How a component declares its fields, using the field metadata in the tech notes. How ids work. How a component is added, removed, copied and saved. Show the main classes and interfaces as short TypeScript skeletons with signatures and no bodies. Every name comes from the glossary, and component class names end in `Component`.
- **The editor:** commands and undo, selection, tools, the Inspector and its fields, Layers panel order, the clipboard, keyboard shortcuts.
- **React and the core:** how React components read core state and learn that it changed. How the PixiJS level view and the React panels share the screen without React owning the level.
- **The simulation:** the fixed 60-tick step, determinism (seed, clock, event order), the separation the requirements ask for between the game and the editor ("scripts can't freeze the editor"), and how test play makes its play copy of the level.
- **The adapters:** one contract each, implemented in its own module, for physics (Box2D), rendering (PixiJS), audio, storage and input, and later Lua.
- **Performance:** culling (draw and update only what is on screen), and the other optimizations the speed targets in the requirements and tech notes need, such as the spatial index for hit testing, caching derived values like bounds and hidden state, batching draws, and a virtualised Layers panel. Say which ones v1 builds, and which only need a place left for them.
- **Persistence:** the level file and project file formats, the physics version each level file records, loading, saving, import checks, and browser storage.
- **Errors and messages:** how failures move through the layers and reach the user, following the requirements' rules on messages.
- **Testing:** what gets unit tests, how the determinism test works, and what needs a browser.
- **Implementation order:** a draft `plan.md` for v1, in small stages that can each be tested on their own, each one listing the docs it implements.

**Scope.** Design v1 completely. For v2 and v3, design only the seams v1 must leave so they fit later without rewrites, such as where triggers, scripts and the Lua host plug in. Follow "Don't plan for what is certainly later": nothing for v4.

## Rules

- **Never invent a requirement.** If the architecture needs an answer the requirements don't give, write it as an open question with your suggested answer. Don't decide it silently. The open questions in `docs/progress.md` are still open: say which ones block which part of the design.
- **Requirements say what; your docs say how.** Never change a requirement to make the design easier. If you think a requirement should change, add it to the open questions file with the reason.
- **Use the glossary's words exactly.** If you need a new word (an architecture term such as "command" or "adapter" counts), list it in `glossary-additions.md` with its meaning. Don't edit `docs/glossary.md`.
- **Plain, concise writing.** Each file opens with a `## TL;DR` under its title and stays under a few hundred lines. Split a long topic into a folder with a README. Prefer tables, short lists, and small code skeletons over prose.
- **Reuse before adding.** No pattern, layer or abstraction without a reason the requirements give. Fewer concepts beat more, in the code just as in the game.

## Where to write

Put **every new file under `docs/proposals/architecture/`**, so the owner can read the whole proposal before anything moves into the main docs. Start with a `README.md` that lists each file with a one-line description and gives the reading order. Add one row for the folder to `docs/proposals/README.md`. Don't change any other doc.

Suggested files (merge, split or rename them as the content needs):
`README.md`, `stack.md`, `layers-and-folders.md`, `core-model.md`, `editor.md`, `ui.md`, `simulation.md`, `adapters.md`, `performance.md`, `persistence.md`, `errors.md`, `testing.md`, `plan.md`, `glossary-additions.md`, `open-questions.md`.

## How to work

1. **First, before writing any file:** reply with a short outline. List the files you'll write, the ten or so biggest decisions in one line each, and the questions you need the owner to answer. Wait for the owner's answer.
2. Then write the files. After that, run `node tools/check-docs.js` and fix anything it reports.
3. Commit with a clear message. Never add a `Co-Authored-By` line or any other Claude attribution, and never push.
4. End with a short summary: what you decided, and what waits for the owner.
