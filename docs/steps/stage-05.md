# Stage 5 in steps: Editing without a mouse

## TL;DR

Written under the standing yes (2026-11-15), and all eleven built on 2026-11-15. Each step ends with its tests, `npm run check` and a commit. The choices behind them are in [editor/README.md](../architecture/editor/README.md#stage-5s-choices).

| # | Step | Module | Ends with |
|---|---|---|---|
| 1 | These steps, and the choices in [editor/README.md](../architecture/editor/README.md#stage-5s-choices) | `docs/` | `node tools/check-docs.js` passes |
| 2 | `Clock` and `Timer` with `ManualClock` and `ManualTimer`; `StatusText`; `DerivedCaches`, the four caches in one object | `editor/time`, `editor/status`, `core/derived` | A status text clears after 4 seconds of fake time, and a newer one restarts the 4 seconds |
| 3 | `Selection` and `CurrentGroup`, both following the level | `editor/selection`, `editor/session` | Selecting a parent drops its children; the World stays alone; a removed entity leaves the selection; a removed current group falls back to its nearest parent; `restore` lands in the nearest group that still exists |
| 4 | `SetValueChange`, `SetSwitchChange`, `RenameLevelChange`, `MoveEntityChange` | `editor/history` | Each change's apply and revert give back the level exactly, values cloned |
| 5 | `LevelReader.readSubtree`; `AddEntitiesChange`, `RemoveEntitiesChange` | `core/level-data`, `editor/history` | Removing a group with skewed children and undoing it gives back the same ids, values and order; a damaged subtree is refused |
| 6 | `EditTransaction`, `History` (512, joining within 1 second), `LevelEditor` | `editor/history` | A refused or throwing command leaves the level as before; a command that changes nothing makes no step; the 513th step drops the oldest; a new step clears redo; undo restores the selection and the current group |
| 7 | `OpenLevel`, `EditorSession`, `EditorCommand`, `CommandRegistry`, `outcomeText`; the Undo, Redo and Select all commands | `editor/session`, `editor/commands`, `editor/status` | Undo and Redo say what they did; Select all takes the current group's children without the World and the camera |
| 8 | Delete (with the joints attached), Hide or show, renaming an entity, renaming the level | `editor/commands` | Every command passes the run, undo, redo round trip; Delete with the camera says `Camera kept`; a name is trimmed and an empty one keeps the old |
| 9 | Group, Ungroup, Go into group; the smallest `EntityNamer` for "Group N" | `editor/commands` | Grouping and ungrouping keep every entity's place on screen, skew included; `Draw order changed` when it did; going 257 deep is refused; the round trip |
| 10 | The View commands: Zoom in, Zoom out, 100%, Whole level, Selection (F), Camera frame (Shift+3), and the four switches | `editor/commands` | F fits the selection, or the whole level with nothing selected; the switches flip `ViewSettings`; none makes a step |
| 11 | The docs: what the build showed, `progress.md` | `docs/` | `node tools/check-docs.js` passes |
