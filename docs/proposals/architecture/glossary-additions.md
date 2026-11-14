# Glossary additions

## TL;DR

New words this proposal uses, each with one meaning, waiting for the owner's approval before they move into [glossary.md](../../glossary.md). The first nine were approved in review card AR6 (owner, 2026-11-13); the rest appeared while writing and are proposed here. Words the requirements avoid on purpose stay avoided: "action" belongs to triggers, "message" is not used for custom events, "layer" is not used for the parts of the code, and "event" alone means a game event.

## Approved in review (AR6)

| Word | Meaning |
|---|---|
| Command | What a menu entry or a shortcut runs, such as Group or Delete. The requirements already use the word this way. |
| Change | One undoable edit to the level, which can apply itself and revert itself. A command makes one or more changes. |
| History step | One entry in the undo history: the changes one command made, with a label such as "Move 3 entities". |
| Contract | A small TypeScript type that the game's rules declare and some other class fulfils, such as `PhysicsWorld`. |
| Adapter | A class that fulfils a contract using a library or the browser, such as the Box2D adapter. |
| Worker | A browser thread that runs code away from the page, so a long computation never freezes the editor. |
| Play copy | The copy of the level that test play runs. Stop throws it away. |
| Schema | The list of fields a component type declares once: each field's type, label, unit, range, default and whether it can change during play. |
| Current group | The group you are inside: double-click goes in, Esc goes up. |

## Proposed while writing

| Word | Meaning |
|---|---|
| Part (of the code) | One of the five top folders of `src`: core, editor, adapters, ui, app. Used instead of "layer". |
| Module | A folder directly under a part, with one `index.ts` that other modules import from. |
| Composition root | The one place that builds the concrete classes and connects them: the editor page, the game worker, the import worker. |
| Open level | The level open in the editor, together with its history, selection, current group and caches. New and Import replace it. |
| Game worker | The worker that runs the play copy during test play. |
| Play mirror | The editor page's own copy of the running level, updated from tick reports and drawn by the level view. |
| Tick report | What the game worker sends back after running ticks: the bodies that moved, entities removed, the camera's position. |
| Collision piece | One convex part of a shape, at most 8 points, as handed to the physics engine and drawn by the physics view. |
| Value type | A class that knows how to check, store, copy and compare one kind of value. Every field type is a value type the Inspector can show. |
| Change signal | The notice a class sends when its state changed, so caches, the level view and panels can update. Not a game event. |
| Derived cache | A value worked out from the level and kept until something it depends on changes, such as an entity's bounds. |
| Status text | The short result the status bar's left slot shows for 4 seconds, such as "Undid: Move 3 entities". |
| Browser event | Something the browser reports to the page, such as a key press or a paste. Never a game event. |
| Body pose | A body's position and angle during play, as the physics engine reports it. |
