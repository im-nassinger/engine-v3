# v3 tasks

## TL;DR

The tasks that build v3 (logic without code), in the orchestrator's format: each fits one session, has a **Done when** the session can check, and names what it must **Read**. They follow the [architecture](architecture.md): the Box2D facts first, then the four components and their cards, the trigger model and its card, the Trigger tool, the game's side (physics, inputs, events, actions, the end and Restart), and the closing tests and docs. **One Try point, at the end**, so the build runs through the night without waiting (the owner, 2026-11-22: "once I wake up, I will test v3"). Every task also needs `npm run check` to pass. Written under the owner's go-ahead (2026-11-22).

## Tasks

- [x] 1. Box2D's sensor facts
  - Read: versions/v3/architecture.md#tests, tech-notes.md, architecture/adapters.md
  - Done when: `box2dFacts.test.ts` checks, on the real Box2D 3.2 build, sensor begin and end events, a sensor on a Static body with a Kinematic visitor, a sensor on a Static body with a Dynamic visitor, the end event when the visiting body is destroyed, and two overlapping sensors; what each shows is written in tech-notes.md, and any rule in versions/v3/architecture.md it contradicts is corrected there, with the change listed in decisions.md
- [x] 2. The TagsComponent and the tags field
  - Read: versions/v3/architecture.md#the-components, versions/v3/architecture.md#the-field-types, requirements/triggers/triggers.md#the-tagscomponent--v3, design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window, design/mockups/v3.html
  - Done when: `TagsFieldType` (parse, normalize to lowercase words of letters, digits and `_`, 1 to 32 characters, no repeats) and `TagsComponent` (card 11) are registered; `LevelTags` lists every tag in the level; `TagsField` adds a tag with Enter, removes one with its ×, and offers the level's matching tags as the design draws; each change is one step; Node and browser tests pass; a level with tags saves and reads back
- [x] 3. The VariablesComponent
  - Read: versions/v3/architecture.md#the-components, versions/v3/architecture.md#the-field-types, requirements/triggers/variables-and-inputs.md#variables--v3, design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window
  - Done when: `VariableFieldType` (a unique name and a number) and `VariablesComponent` (card 12, World only in v3, in the World's Add Component menu, refused on other entities with the reason) are registered; the card shows one row per variable with an × and an Add variable row, as the design draws; each change is one step; tests pass
- [x] 4. Keys, the InputComponent and a new level's five inputs
  - Read: versions/v3/architecture.md#the-components, versions/v3/architecture.md#the-field-types, requirements/triggers/variables-and-inputs.md#raw-keys-and-inputs--v3, design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window
  - Done when: `KeyCodes` names each `KeyboardEvent.code` (`W`, `Left arrow`) and refuses the keys that can't be bound; `InputFieldType` and `InputComponent` (card 13, World only, not in the Add Component menu) are registered; a new level's World has `left`, `right`, `up`, `down` and `jump` with their keys, in `LevelWriter.newLevel.json`; a World without one shows the note "No inputs. [Add the five inputs]", whose fix is one step; an input's keys are changed by pressing a key; tests pass
- [x] 5. The trigger model in core
  - Read: versions/v3/architecture.md#the-trigger, versions/v3/architecture.md#the-field-types, requirements/triggers/triggers.md
  - Done when: the `Trigger` types, `TriggerFieldType` (unset parts as null, ids unique and never reused in a component), `triggerName`, `triggerProblems` and `changeableValues` are in `core/triggers/model/` with Node tests for every When, Check, Action and Repeat kind; `TriggerComponent` (card 15, any entity) is registered; field types may give `mapEntities`, which `TriggerFieldType` and `ListFieldType` implement and `IdRemapping` and the missing-entity rule use, with tests that copying and pasting triggers keeps their links as the requirement says
- [x] 6. The trigger card's model
  - Read: versions/v3/architecture.md#the-trigger-card, design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window, design/mockups/v3.html
  - Done when: `TriggerCardModel`, `TriggerSentence` and `TriggerChoices` are in `editor/entity-inspector/triggers/` and give, for any trigger, the head and the four sections of rows the mockup shows, each word set, unset or greyed with its choices; every edit (pick a word, add or remove a row, switch, rename, duplicate, delete, reorder) is one step with its label; `TouchNeedsSurfaceRule` and `TriggerCantRunRule` give their notes, the first with its one-step fix; Node tests pass
- [x] 7. The trigger card on screen
  - Read: versions/v3/architecture.md#the-trigger-card, design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window, design/mockups/v3.html
  - Done when: `TriggerCard` draws the model as the design says: each trigger a block with its head, When, If, Do and Repeat as titled sections of one-sentence rows, underlined words that open a menu or a number field, yellow unset words, struck-through `other`, Add check and Add action rows, × on hover, the notes, and + Add trigger; browser tests in Chromium, Firefox and WebKit click through making a trigger from nothing
- [x] 8. The Trigger tool
  - Read: versions/v3/architecture.md#the-trigger-tool, requirements/triggers/triggers.md#the-trigger-tool--v3, design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window, design/level-view.md#v3-shapes-with-no-style
  - Done when: `TriggerTool` is key 6 with its button, icon and tooltip; it draws a rectangle like the Shape tool, and `createTrigger` makes the entity the architecture lists in one step, then returns to Select with it selected; `UnstyledShapeOverlay` draws any shape with no StyleComponent as a dashed edge with a bolt, in the editor only; tests pass
- [x] 9. The physics world for triggers
  - Read: versions/v3/architecture.md#actions, versions/v3/architecture.md#the-tick-from-v3, architecture/adapters.md, tech-notes.md
  - Done when: the `PhysicsWorld` contract and `Box2dPhysicsWorld` give the sensor begin and end events after `step()` with the two entities, and `setPose`, `addVelocity`, `setSurfaceSettings` and `setMotor`; `NoPhysicsEngine` and the test fakes follow; tests on the real build pass
- [x] 10. Inputs reach the game
  - Read: versions/v3/architecture.md#the-tick-from-v3, versions/v3/architecture.md#keys-during-play, requirements/triggers/variables-and-inputs.md#raw-keys-and-inputs--v3
  - Done when: `HeldKeys` also keeps the keys pressed since the last batch; each tick's inputs carry the keys held and pressed; `InputPhase` builds `InputState` (each key and input pressed, released or held, a press shorter than a tick counted once, two keys on one input held until both are up); `KeyboardInput` stops the browser's default only for the keys the level uses; tests pass, the determinism test included
- [x] 11. Events
  - Read: versions/v3/architecture.md#the-tick-from-v3, versions/v3/architecture.md#performance, requirements/triggers/triggers.md#events--v3, requirements/triggers/triggers.md#order-and-limits--v3, requirements/physics/bodies.md#sensors-and-touching--v3
  - Done when: `EventPhase`, `TouchLedger`, `TriggerTimers` and `TriggerIndex` list each tick's events in the architecture's order: level start, keys and inputs, timers, touched and no longer touched (once per touching entity, groups hearing their parts, two sensors filtered), and "no entity with this tag is left"; Repeat drops firings that come too soon; Node tests with `runHeadless` cover each event
- [ ] 12. Checks and actions
  - Read: versions/v3/architecture.md#actions, requirements/triggers/triggers.md#if-checks--v3, requirements/triggers/triggers.md#actions--v3, requirements/triggers/triggers.md#order-and-limits--v3
  - Done when: `TriggerPhase`, `ActionRunner` and `PlayValueWriter` run checks and actions on their targets in Entities viewer order: Change value (variables, any value `changeableValues` offers, tags, a trigger's on/off, physics told when it owns the value), Destroy at the end of the tick, Push ignoring mass, Win, Lose and Restart recorded with the first one winning; triggers with problems don't run, a missing target is skipped; the chain limit of 32 with one warning; Node tests pass
- [ ] 13. The run's end, changed values and warnings on the page
  - Read: versions/v3/architecture.md#the-report-the-mirror-and-the-end, requirements/play-and-save/test-play.md#win-and-lose-the-end-window--v3, design/controls.md#v3-triggers-tags-variables-inputs-and-the-end-window
  - Done when: `TickReport` carries `changes`, `end` and `warnings`; `PlayMirror` applies the changes so they show; Win or Lose puts the run in `ended`, the Play bar reads ENDED and `EndWindow` shows the title, the time as `m:ss.hh`, Leave (Stop) and Restart, as the design draws; warnings show once each in the message pill; tests pass
- [ ] 14. Restart
  - Read: versions/v3/architecture.md#the-report-the-mirror-and-the-end, requirements/triggers/triggers.md#order-and-limits--v3
  - Done when: the Restart action and the end window's Restart start a new run from the kept `LevelData` in the same worker, with the same clock time, and the mirror starts again; everything the requirement lists is reset; a Restart action in a run's first second is ignored with a warning; tests pass
- [ ] 15. The determinism levels for triggers
  - Read: versions/v3/architecture.md#determinism, architecture/testing.md
  - Done when: `trigger-coins`, `trigger-timers` and `trigger-touch-groups` are built with recorded inputs, the variables are part of `stateHash`, their hashes are recorded, and the older levels' hashes are unchanged or their change is explained in decisions.md
- [ ] 16. v3's journeys and speed test
  - Read: versions/v3/architecture.md#tests, versions/v3/architecture.md#performance, architecture/testing.md, architecture/performance.md
  - Done when: Playwright journeys in three browsers pass: draw a trigger with the Trigger tool, make it Win when touched by `player`, play, roll a tagged ball into it, see the end window, Restart, Leave; a key trigger pushing a body; the World's variables and inputs edited, saved and read back; the speed test of 1,000 touch triggers meets the targets, its numbers written in performance.md
- [ ] 17. Close v3's docs
  - Read: versions/README.md#closing-a-version, versions/v2/architecture.md
  - Done when: v3's lasting parts are moved into architecture/ as v2's were, with `versions/v3/architecture.md` left as the record with a table of where each part went; the glossary has every new word; progress.md says v3 is built and waits for the owner's try; `node tools/check-sources.js` passes
- [ ] 18. Try point: try the whole of v3: the Trigger tool, the trigger card, tags, the World's variables and inputs, triggers firing in test play, Win, Lose and Restart
