# v4 tasks

## TL;DR

The tasks that build v4 (the rest of the triggers, string and boolean variables on any entity, the shortcut list), in the orchestrator's format: each fits one session, has a **Done when** the session can check, and names what it must **Read**. They follow the [architecture](architecture.md): the mockup and the Box2D facts first, then variables, the trigger model and its card, the game's side (contacts, Destroyed and custom events, variable changes, Wait, the value check), determinism, the shortcut list, and the closing tests and docs. **One Try point, at the end**, so the build runs through the night (owner, 2026-11-22: "later when I wake up I'll test it"). Every task also needs `npm run check` to pass. Written under the owner's go-ahead (2026-11-22).

## Tasks

- [x] 1. The v4 mockup
  - Read: versions/v4/design.md, versions/v3/design.md, design/controls.md, design/tokens.md, design/mockups/v3.html
  - Done when: `design/mockups/v4.html` draws, from v3's mockup and tokens, the shortcut sheet (searchable, with a working filter), a trigger card with each new When, the component value check, Fire custom event and Wait with its line, the variable menu's two groups, and the Variables card with its type menu; it is linked from `design/mockups/index.html`; the rules are written into a "v4" section of `design/controls.md`, marked (standing yes, 2026-11-22); `node tools/check-docs.js` passes
- [x] 2. Box2D's contact facts
  - Read: versions/v4/architecture.md#triggers-in-play, tech-notes.md, architecture/adapters.md#physics
  - Done when: `box2dFacts.test.ts` checks, on the real Box2D 3.2 build: contact begin and end events between two solid shapes, only on shapes with contact events switched on (one side or both); the end event when a touching shape or body is destroyed; what happens when a touching body falls asleep; two shapes of one body touching a third; what each shows is written in tech-notes.md, and any rule in versions/v4/architecture.md it contradicts is corrected there, with the change listed in decisions.md
- [x] 3. Variables of three types, on any entity
  - Read: versions/v4/architecture.md#variables, requirements/triggers/variables-and-inputs.md#string-and-boolean-variables-on-any-entity--v4, versions/v4/design.md, design/controls.md
  - Done when: `VariableFieldType` holds a number, a string (at most 1,000 characters) or a boolean, typed by its JSON value, and a v3 level reads and writes back byte for byte; the VariablesComponent is allowed on any entity and in every Add Component menu; the Variables card's rows have the type menu (one step, resetting the value) and a number field, a text field or a checkbox as the design draws; Node and browser tests pass
- [x] 4. The trigger model's new kinds
  - Read: versions/v4/architecture.md#the-trigger, architecture/core-model/triggers.md, requirements/triggers/triggers.md
  - Done when: the types in versions/v4/architecture.md#the-trigger are in `core/fields/trigger/`; `parseTrigger`, `normalizeTrigger`, `copyTrigger` and `mapTriggerEntities` handle every new kind and read v3's forms unchanged (a v3 level reads and writes back byte for byte); `triggerProblems` gives `wrongType`, `reservedName`, the unset parts and unknown own variables; `changeableValues` offers own variables with their ops (Flip for booleans, Set only for strings); `readableValues` and `CustomEventNames` exist; `triggerName` names the new Whens; Node tests cover every new kind
- [x] 5. The trigger card's model for v4
  - Read: versions/v4/architecture.md#the-trigger-card, versions/v4/design.md, design/controls.md, design/mockups/v4.html
  - Done when: `TriggerChoices`, `TriggerSentence` and `TriggerCardModel` give the new Whens with the "becomes" part, the component value check with its value menu (components, then number values and vector axes, then a body's Speed and Velocity x and y), Fire custom event with its name suggestions and optional number, Wait, Flip and Set-only for strings, and the variable menu's two groups with each item's type; the compare words and the value field follow the variable's type; every edit is one step with its label; Node tests pass
- [x] 6. The trigger card on screen for v4
  - Read: versions/v4/design.md, design/controls.md, design/mockups/v4.html
  - Done when: `TriggerCard` draws everything task 5 gives as the mockup does: the new rows and menus, the variable menu's groups with the type word, a text field or true or false choice for strings and booleans, the line under a Wait; browser tests in Chromium, Firefox and WebKit click through making "When this gets `open`: wait 2 s, flip door_open" from nothing
- [x] 7. Contact events and velocity in the physics world
  - Read: versions/v4/architecture.md#triggers-in-play, architecture/adapters.md#physics, tech-notes.md
  - Done when: the physics contract has `contactEvents()` after `step()` with the two entities (named from the adapter's own shape table, as sensor events are) and `velocity(body)`; contact events are switched on only for the shapes a run asks for; `NoPhysicsEngine` and the test fakes follow; tests on the real build pass
- [x] 8. The collision event
  - Read: versions/v4/architecture.md#triggers-in-play, requirements/triggers/triggers.md#more-events--v4, architecture/triggers-in-play.md
  - Done when: `ContactLedger` counts per hit entity and hitting entity and fires collision once per entity hit, groups hearing their parts and parts of one group filtered out; `TriggerIndex` gives the shapes that need contact events at the start of a run; `EventPhase` lists collision after no longer touched; `runHeadless` tests cover a ball hitting a wall, a two-shape body hitting once, a group's trigger, and a hit after the two parted
- [x] 9. Destroyed and custom events
  - Read: versions/v4/architecture.md#triggers-in-play, requirements/triggers/triggers.md#more-events--v4, requirements/triggers/triggers.md#custom-events--v4, requirements/triggers/triggers.md#fire-custom-event-and-wait--v4
  - Done when: Destroy adds one Destroyed event per newly marked entity, heard in the same tick while the entity still exists; Fire custom event adds one event per target with `other` the sender, heard in the same tick through `ChainedEvents` within the 32 steps; `TriggerIndex` keeps custom triggers by name; `runHeadless` tests cover a destroyed group, a Destroyed trigger changing a variable, a button firing `open` on a tagged door, a name nobody hears, and a chain stopping at 32
- [x] 10. Variable changes and every entity's variables in play
  - Read: versions/v4/architecture.md#triggers-in-play, requirements/triggers/triggers.md#more-events--v4, requirements/triggers/variables-and-inputs.md#string-and-boolean-variables-on-any-entity--v4
  - Done when: `PlayValueWriter` writes own variables of any type and Flip; the compare check reads the level's or the target's own variable and compares strings and booleans with is and is not; `VariableWatch` fires "a variable changes" on change, and "becomes" only when its condition turns true; the level's variables are heard by every entity, own ones only by their entity; the report and `PlayMirror` show changed own variables; `runHeadless` tests cover each rule
- [x] 11. Wait and waiting runs
  - Read: versions/v4/architecture.md#triggers-in-play, requirements/triggers/triggers.md#fire-custom-event-and-wait--v4, requirements/triggers/triggers.md#small-features
  - Done when: `ActionRunner` stops at a Wait and `WaitingRuns` resumes the rest when due, in whole ticks, in the architecture's order, after timers in `EventPhase`, without asking checks or Repeat again; two firings during one wait both run; switching the trigger off or removing its entity cancels its runs; the 33rd waiting run is dropped with the play warning `tooManyWaitingRuns`, shown in the message pill; Restart starts empty; `runHeadless` tests cover each rule
- [x] 12. The component value check in play
  - Read: versions/v4/architecture.md#triggers-in-play, requirements/triggers/triggers.md#checking-a-component-value--v4
  - Done when: `checksPass` reads a target's number value, a vector's axis, or a body's live speed or velocity from `velocity(body)`; a tagged target passes when any tagged entity passes; a target without the value is false; `runHeadless` tests cover "If this BodyComponent speed is more than 200" on a falling ball
- [x] 13. The determinism levels for v4
  - Read: versions/v4/architecture.md#determinism, architecture/testing.md#the-determinism-test
  - Done when: `stateHash` adds every entity's variables and the waiting runs as the architecture says; `trigger-doors` and `trigger-hits` are built with recorded inputs and their hashes recorded; the older levels' hashes are unchanged, or their change is explained in decisions.md
- [x] 14. The shortcut catalog and its search
  - Read: versions/v4/architecture.md#the-shortcut-list, requirements/editor/workspace.md#the-searchable-list-of-shortcuts--v4, requirements/editor/shortcuts.md
  - Done when: `ShortcutCatalog` lists every shortcut in `ShortcutMap` and the commands, with its name, area and keys as the platform shows them (Cmd and Option on a Mac), plus the mouse shortcuts as fixed rows; `ShortcutSearch` filters by name words and key text, ignoring case and order; a Node test fails if a shortcut in `ShortcutMap` is missing from the catalog
- [x] 15. The shortcut sheet and the tooltips
  - Read: versions/v4/architecture.md#the-shortcut-list, versions/v4/design.md, design/controls.md, design/mockups/v4.html
  - Done when: `ShortcutSheet` draws the catalog as the mockup does; `?` (by its character) and Help › Shortcuts in the main menu open and close it, its search takes focus and typing there reaches no editor shortcut, Esc closes it, and it stays open while the level is edited; a browser test checks every icon button has a tooltip with its name, and its shortcut when its command has one; browser tests pass in three browsers
- [x] 16. v4's journeys and speed test
  - Read: versions/v4/architecture.md#tests, architecture/testing.md, architecture/performance.md
  - Done when: Playwright journeys in three browsers pass: a button that fires `open` on a door, which waits 2 s and flips `door_open`; a ball that hits a wall, the wall destroyed and adding 1 to `score`, "When score becomes 3 or more" winning; a boolean and a string variable on an entity edited, saved and read back; the shortcut sheet opened with `?`, searched and closed; the speed test of 1,000 collision triggers meets test play's targets, its numbers written in performance.md
- [x] 17. Close v4's docs
  - Read: versions/README.md#closing-a-version, versions/v3/architecture.md
  - Done when: v4's lasting parts are moved into architecture/ as v3's were, with `versions/v4/architecture.md` left as the record with a table of where each part went; the glossary has every new word; progress.md says v4 is built and waits for the owner's try; `node tools/check-sources.js` passes
- [ ] 18. Try point: try the whole of v4: the new events (hits, destroyed, a variable changes, custom events), Fire custom event and Wait, the component value check, string and boolean variables on any entity with Flip, and the shortcut list with `?`
