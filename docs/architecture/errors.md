# Errors and what the user sees

## TL;DR

**Expected problems are return values, not exceptions:** a refused move, a paste over a limit, a damaged file, a failed save. Each part returns a typed outcome with a reason, and the editor turns the reason into the sentence the requirements ask for. **The user sees each problem in exactly one of five places:** a note on a card (editor message), the status bar's left slot (status text), a field's own red outline, a dialog for questions and refused imports, or the Play bar for a run that ended badly. **Unexpected exceptions are bugs:** they are never swallowed, a broken panel shows a small notice without touching the level, and the saved level is never at risk because saves are all or nothing.

## Kinds of problem

| Kind | Example | Comes back as | The user sees |
|---|---|---|---|
| A rule refuses | Moving a group into its own child; deleting the camera | `{ kind: 'refused', reason }` from a command | Status text: "The camera can't be deleted" |
| Part of a command is skipped | Delete with the camera selected | `{ kind: 'done', skipped }` | Status text: "Camera kept" |
| A question first | New, Import, a move that changes which body an entity belongs to | `{ kind: 'needsConfirmation', question, confirm }` | A dialog |
| A setup that may not work | A SurfaceComponent with no ShapeComponent; a joint pointing at a deleted entity | An `EditorMessage` from a rule | A note on the card |
| A typed value that can't be used | `abc` in a number field; scale 0 | `ValueInputResult` | Red outline and a line under the field |
| A typed value out of range | 150 in a 0 to 100 field | Clamped, with a note | "Max is 100" under the field, briefly |
| Untrusted data is bad | A damaged import, a paste of something else | `ReadRefusal` | Import: a dialog with a plain message. Paste: status text |
| Over a limit | A paste past 100,000 entities | `{ reason: 'overLimit', limit, max }` | The message names the limit: "A level holds at most 100,000 entities" |
| A detail fails | IndexedDB full; no storage in a private window | `SaveState` `failed` | The message pill until a save works, and a level-wide warning |
| A run fails | The worker stops answering or throws | `PlaySession` state `ended` with a reason | A message on the Play bar, one click from the editor |
| Something goes wrong in play without stopping the run (v3) | The chain limit, an unknown input, a Restart in the first second, a value fixed in play | A `PlayWarning` in the tick report, once per run | The message pill, until the Console comes in v5 ([triggers-in-play.md](triggers-in-play.md#the-report-the-mirror-and-the-end)) |
| A bug | An exception nobody expected | An exception | Below |

## Where the sentences come from

- **core returns reasons, never sentences.** `MoveOutcome`, `ReadRefusal` and field parse problems are codes with data (`{ reason: 'overLimit', limit: 'entities', max: 100000 }`).
- **editor writes the sentences**, close to the rule they explain, in plain words from the glossary. The requirements give many of them exactly ("Stop to edit", "Nothing to paste", "This group is locked", "Scale can't be 0") and those are copied word for word.
- **ui only shows them.** It never builds a message from parts.
- There is one language. Translations were left out on purpose, so there is no string table.

## Rules the requirements set, and where each is kept

| Rule | Kept by |
|---|---|
| Editor messages never block saving or Play | `EditorMessages` is read only by the UI |
| A command that fails changes nothing and makes no step | `EditTransaction` rolls back, see [history](editor/history.md) |
| Import is all or nothing, with a plain message per case | `LevelReader` refusals, mapped to sentences in `editor/saving` |
| A failed save is never silent, and Export still works | `Autosave` sets `failed`; export doesn't use storage |
| Nothing is deleted when saving fails | Autosave only ever writes the whole record in one transaction |
| A game that stops responding ends the run with a message | `Watchdog`, see [simulation.md](simulation.md) |
| A trigger with unset parts doesn't run, and a missing target only skips its part (v3) | `triggerProblems`, read by the Entity inspector and the game alike ([core-model/triggers.md](core-model/triggers.md#the-trigger)) |
| A missing file doesn't stop a run (v5) | The simulation skips the use and adds a Console line |
| Script errors stay in the Console (v5), never as editor messages | `ScriptEngine` errors go to the run's Console lines |
| A disabled button still says why | `Availability` carries a reason, shown in the tooltip |

## The status text

```typescript
export class StatusText {
    static readonly showMs = 4_000;

    readonly version: VersionCounter;

    constructor(timer: Timer);
    show(text: string): void;               // replaces what is there, clears after 4 seconds
    get current(): string | undefined;      // undefined: the message pill shows nothing of it
}
```

Every command's outcome passes through one place, `CommandRunner`, which shows `skipped` and `refused` as status text and `needsConfirmation` as a dialog. Commands never call the UI.

## Bugs

- **Never swallowed.** No empty `catch`. A `catch` exists only where something useful happens: a retry, a fallback, a message.
- **Each panel has a React error boundary.** A panel that throws while drawing shows "This panel hit a problem. Your level is safe." with a Reload button, and the rest of the editor keeps working. The level view's adapter catches errors in its own frame callback the same way and stops drawing until reload.
- **An exception inside a command** rolls its transaction back and is rethrown, so the level stays as it was and the bug still surfaces.
- **The saved level is never at risk:** a save writes a full, checked `level.json` or nothing.
- `window` `error` and `unhandledrejection` are logged to the browser console. Sending reports anywhere is not planned: there is no server before Later.
