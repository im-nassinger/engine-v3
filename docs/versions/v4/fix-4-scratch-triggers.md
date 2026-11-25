# v4 fix 4: the trigger card as Scratch blocks

## TL;DR

The owner picked **Scratch** from the [trigger card mockup](../../design/mockups/triggers.html) (2026-11-24, row 4 of [fixes.md](fixes.md)). This is the plan it was built from (built 2026-11-25, tasks 19 to 26). Its look and the rules settled over the mockup's rounds are in [controls.md](../../design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks); this file doesn't repeat them.

- **Mostly a new way to draw the same trigger.** A Scratch trigger is still When, one If, a flat Do list: the `Trigger` type keeps `when`, `checks` and `actions`, and `ActionRunner` keeps running the actions top to bottom, stopping at a Wait. Nothing nests, so play needs no "run a chain of blocks with scopes".
- **The logic changes in two places:** Repeat goes (a trigger rests by switching itself off with blocks, and once per run becomes one block), and a fresh firing of a trigger that is off by the time it runs is dropped. Old levels aren't converted (owner, 2026-11-24).
- **New words:** *Enabled*, the trigger's on/off value as Set shows it (`Triggers › Timed door › Enabled`), and "when **other** starts touching this".
- **Five points the owner confirmed** (2026-11-24: "I agree with all your points"), below, each Claude's recommendation.
- **Built by the orchestrator**, unlike fixes 1 to 3: it is about nine sessions of work. Its tasks are 19 to 27 in [tasks.md](tasks.md).

## The owner's words

> The trigger card is "ugly and convoluted".

> "we have a winner: lets do the scratch one."

## Confirmed by the owner

Each one changes a requirement or an owner rule, so Claude asked rather than taking it under the standing yes. **The owner agreed to all five (2026-11-24).**

| # | Question | Decided | Why |
|---|---|---|---|
| A | Once per run, Repeat's other choice: how is it drawn? | **Repeat goes entirely.** Once per run becomes a first block "set this `Triggers › <trigger> › Enabled` to false", with nothing switching it back. | Resting already works this way (owner, 2026-11-24), so one idea covers both, and the card loses its last setting outside the blocks. The one difference: another trigger can switch it on again, which once per run couldn't. That reads as a feature. |
| B | "When **other** starts touching this" in the game, not "something" | **Yes**, in the When menu, the event block, the requirement and the tests. | The mockup settled on it, and `other` is the word the If and the actions already use for the same entity, so the event names it once. |
| C | A block before or after the If (the mockup's hover slots open one there) | **No such block.** With an If, there are no slots above or below it: the top third of the If's top bar and the bottom third of its bottom bar act like a middle. The event block's bottom third opens the If's first inner slot. | "The If wraps the whole Do list" (controls.md) stays true, and play keeps one flat list. A block outside the If would need a second action list, or nested scopes, in the saved trigger and the runner. |
| D | How a check is added, since the card has no Add button but the slots (owner) | **The slot's menu has a check group at its top: "if … (a value)".** With no If, it wraps every action in a new If. With one, it adds the check joined by "and". Removing the last check removes the If. | One kind of add button stays one (owner, 2026-11-24), and a trigger without checks draws no empty If. |
| E | The Entity inspector 344 px wide, not 300 (mockup) | **Yes:** `--entity-inspector` becomes 344 px, and the workspace requirement says so. | Scratch's longest lines fit with no sideways scroll; at 300 px they need 42 px more. |

## What stays

- **The saved trigger, except Repeat.** `when`, `checks` and `actions` keep their shapes, so no level's event, check or action needs converting.
- **The runner.** `ActionRunner`, `WaitingRuns`, `checksPass` and `PlayValueWriter` keep their rules: actions in order, a Wait hands the rest to `WaitingRuns`, a resumed run doesn't ask its checks again.
- **The editing logic.** `TriggerEdits`, `TriggerChoices`, the pickers and boxes of fix 2 (the entity picker, the value menu by component, the x and y boxes) and every edit being one undo step. The blocks are a new view over them.
- **The trigger's head:** its name, its on/off switch, its `…` menu, dragging triggers to reorder.

## What changes

### 1. Repeat goes (logic)

- **`Trigger` loses `repeat`**, and `TriggerRepeats` goes. `PlayTriggers.hear` and `TriggerPhase` stop asking it.
- **Old levels aren't converted** (owner, 2026-11-24: "you don't need to deal with old levels"). `parseTrigger` ignores a saved `repeat`, and `savedTrigger` stops writing it.
- **The Repeat menu leaves the card.**

### 2. A switched-off trigger in play (logic)

- **The run that switches its own trigger off keeps going.** Today's code already does this: `PlayValueWriter.switchTrigger` cancels the runs in `WaitingRuns`, and the run doing the switching isn't in it yet. A resumed run doesn't ask whether its trigger is on. The plan pins it with tests and writes it into the requirement. *Why: owner's yes, 2026-11-24; otherwise the run can't switch it back on.*
- **Switching a trigger off from anywhere else still cancels all its waiting runs**, a resting run included, so the trigger stays off. Removing its entity still cancels them too.
- **New: a fresh firing is dropped when its trigger is off by the time `TriggerPhase` reaches it** (standing yes, 2026-11-24). Today `hear` checks `on` when the event is heard, and the cooldown then dropped a second firing in the same tick. Without the cooldown, two enemies touching a resting spike in one tick would both be hurt, though its first run switched it off. A resumed run isn't dropped. *Why: "the order you see is the order things run": once a block switched it off, the trigger is off for what comes after it.*

### 3. The word *Enabled*

- **In the glossary first:** "Enabled: a trigger's on/off value, as Set and the check name it (`Triggers › Timed door › Enabled`). Set to false, the trigger hears no event; its waiting runs are cancelled, except the run that set it." The requirement's "a trigger's on or off" becomes *Enabled* where it names the value.
- **`valueNames`** labels `triggerOn` as `Triggers › <trigger name> › Enabled`. The data keeps `triggerOn` and `on`.

### 4. The card becomes blocks (look)

Everything in [controls.md](../../design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks) and drawn in the mockup, built in React under `src/ui/entity-inspector/.../TriggerCard/`:

- **A block model** in `src/editor/entity-inspector/triggers/` (so it is unit-tested without React): the trigger as a list of blocks (the event, the If's top bar with its checks, each action, the If's bottom bar), each with its kind (colour), icon, value boxes, and the gaps between them where a slot can open. It replaces the sections and rows of `TriggerCardModel`, and is made from today's `TriggerSentence` words, so the pickers stay the same.
- **The blocks:** the colours per kind, the icon first, the teeth and the 2 px ring in the trigger's colour, menus darkened by a quarter, numbers as white ovals, a time's unit as a menu holding "seconds" only for now.
- **Hover slots:** the three bands, the cursors, the 200 ms wait, the 400 ms open (move apart, then fade in), the hovered block never moving, the smooth scroll to show a clipped slot, the empty strip and the 400 ms glide back. Clicking a slot opens the add menu: the check group (D), then the actions.
- **The script box:** overlay scrollbars, and the eased, grainy fade where blocks are hidden past an edge.
- **Removing a block:** an × at the block's right end while the mouse is on its middle band, as today's rows have (standing yes, 2026-11-24). *Why: the mockup has no way to remove, the middle band opens no slot, and the × is the card's way today.* Dragging blocks to reorder is left for later.
- **Missing and unset parts** keep fix 2's warnings, in the value box.

### 5. The wider Entity inspector

`--entity-inspector` 344 px in [tokens.md](../../design/tokens.md) and the code, and the starting size in [workspace.md](../../requirements/editor/workspace.md) (E).

## Saved levels

- Not converted (owner, 2026-11-24). A saved `repeat` is ignored, so an old cooldown simply stops; the rest of the level reads as before.

## Where the code is

| Part | Where |
|---|---|
| The `Trigger` type, reading, copying | `src/core/fields/trigger/` (`Trigger.ts`, `parseTrigger.ts`, `normalizeTrigger.ts`, `copyTrigger.ts`) |
| Repeat in play | `src/core/simulation/triggers/TriggerRepeats.ts`, `PlayTriggers.ts`, `src/core/simulation/phases/TriggerPhase.ts` |
| Switching off, waiting runs | `src/core/simulation/actions/PlayValueWriter.ts` (`switchTrigger`), `src/core/simulation/triggers/WaitingRuns.ts` |
| The card's model and words | `src/editor/entity-inspector/triggers/` (`TriggerCardModel.ts`, `TriggerSentence.ts`, `TriggerChoices.ts`, `valueNames.ts`) |
| The card on screen | `src/ui/entity-inspector/EntityInspector/EntityInspectorCard/TriggerCard/` |
| The reference look and motion | [design/mockups/triggers.html](../../design/mockups/triggers.html), function `scratch()` and its hover code |

## Docs to update when it's built

- [requirements/triggers/triggers.md](../../requirements/triggers/triggers.md): Repeat goes, the Wait rule (2), *Enabled*, "other" in the event.
- [glossary.md](../../glossary.md): *Enabled* added; "Repeat, cooldown" moved to the dropped words with the reason.
- [requirements/editor/workspace.md](../../requirements/editor/workspace.md) and [design/tokens.md](../../design/tokens.md): 344 px.
- [architecture/core-model/triggers.md](../../architecture/core-model/triggers.md) and [triggers-in-play.md](../../architecture/triggers-in-play.md): the type without Repeat, the conversion, the dropped fresh firing.
- [design/controls.md](../../design/controls.md): fix 4 marked built, "To settle" emptied, C and D written into the rules.
- [rejected.md](../../rejected.md): Repeat as a setting; a block outside the If.
- [fixes.md](fixes.md) row 4, [progress.md](../../progress.md), [decisions.md](../../decisions.md).

## Tasks

Tasks 19 to 27 of [tasks.md](tasks.md), in the orchestrator's format.
