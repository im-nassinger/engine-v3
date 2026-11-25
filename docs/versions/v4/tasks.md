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
- [x] 18. Try point: try the whole of v4: the new events (hits, destroyed, a variable changes, custom events), Fire custom event and Wait, the component value check, string and boolean variables on any entity with Flip, and the shortcut list with `?`

### v4 fix 4: the trigger card as Scratch blocks

Planned in [fix-4-scratch-triggers.md](fix-4-scratch-triggers.md), confirmed by the owner (2026-11-24). Every task also needs `npm run check` to pass.

- [x] 19. The rules in the requirements and the glossary
  - Read: versions/v4/fix-4-scratch-triggers.md, requirements/triggers/triggers.md, glossary.md, requirements/README.md
  - Done when: the glossary has *Enabled* and lists Repeat and cooldown as dropped; triggers.md has no Repeat, the Wait rule says the run switching its own trigger off goes on, the event reads "when other starts touching this", and Change value names *Enabled*; workspace.md and tokens.md say 344 px; rejected.md has the two rows; `node tools/check-docs.js` and `node tools/check-sources.js` pass
- [x] 20. Repeat leaves the saved trigger
  - Read: versions/v4/fix-4-scratch-triggers.md#1-repeat-goes-logic, architecture/core-model/triggers.md
  - Done when: `Trigger` has no `repeat`; `parseTrigger` ignores a saved one; a saved trigger has no `repeat`; `TriggerRepeats`, the Repeat menu and their uses are gone; unit tests cover a trigger saved with and without `repeat`
- [x] 21. A switched-off trigger in play
  - Read: versions/v4/fix-4-scratch-triggers.md#2-a-switched-off-trigger-in-play-logic, architecture/triggers-in-play.md
  - Done when: `TriggerPhase` drops a fresh firing whose trigger is off when reached, and runs a resumed one; `runHeadless` tests show a resting spike hurts once for two touches in one tick and again after the wait, a once-per-run trigger fires once and a trigger switched off by another trigger during its rest stays off
- [x] 22. The block model
  - Read: versions/v4/fix-4-scratch-triggers.md#4-the-card-becomes-blocks-look, design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks
  - Done when: the editor's model gives each trigger its blocks (kind, icon, words and value boxes, the If's two bars only when it has checks) and its gaps, with no gap outside the If; Set's value box shows its path (`Transform › Position`, `Triggers › Timed door › Enabled`); the add menu's entries come from it (the check group, then the actions); unit tests cover a trigger with and without checks, a Wait, a missing entity and an unset part
- [x] 23. The blocks on screen
  - Read: design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks, design/mockups/triggers.html
  - Done when: the Triggers card draws each trigger as the mockup's Scratch blocks (colours, icons, teeth, the ring, menus, number ovals, the unit menu), every value box opens fix 2's picker or box, the × removes a block, the Entity inspector is 344 px; browser tests cover drawing, editing a value and removing; a screenshot beside the mockup's matches
- [x] 24. Adding a block on hover
  - Read: design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks (Adding a block anywhere), design/mockups/triggers.html
  - Done when: the bands, cursors, 200 ms wait, 400 ms open and close, the still hovered block, the scroll to a clipped slot, the empty strip and the glide back work as in the mockup; clicking a slot opens the add menu and adds the block there, one undo step; a check added with no If wraps every action in one; browser tests cover each
- [x] 25. The script box's scrollbars and fades
  - Read: design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks, design/mockups/triggers.html
  - Done when: the script scrolls sideways under thin overlay bars that can be dragged, and fades with the grain where blocks are hidden, only on those edges; browser tests cover both
- [x] 26. Journeys and close fix 4's docs
  - Read: versions/v4/fix-4-scratch-triggers.md#docs-to-update-when-its-built, versions/v4/tasks.md#tasks
  - Done when: the Playwright journeys that make or edit triggers pass with the blocks in three browsers; the speed tests still meet their targets; every doc in "Docs to update" is updated; fixes.md row 4 says built
- [x] 27. Try point: make a coin, a door that opens on a custom event, and a spike that rests 1 second, all with the Scratch blocks, and say how the card feels

### v4 fixes 9 to 13: the last asks before v5

Planned in [fixes-9-to-13-plan.md](fixes-9-to-13-plan.md), confirmed by the owner (2026-11-25). Every task also needs `npm run check` to pass, and each pick made while building goes in decisions.md.

- [x] 28. Fix 11: the pen closes a path ended on its first point
  - Read: bugs.md#the-pen-doesnt-close-a-path-ended-on-its-first-point, versions/v4/fixes.md
  - Done when: with snapping on and off, a press within the close ring, or one that snaps onto the first point, closes the path (from 3 points on) and it gets its fill; the cause found is written in bugs.md with the fix, the bug marked fixed; browser tests pin both cases; fixes.md row 11 says fixed
- [ ] 29. Fix 9 and fix 13: the tag group and "other"
  - Read: requirements/triggers/triggers.md#when-if-do--v3, requirements/triggers/triggers.md#events--v3, design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks
  - Done when: the target menu always shows "Every entity tagged", with one greyed line saying how to add a tag when the level has none; no text a creator sees, no requirement and no code comment says "something starts touching" (the Trigger tool's trigger, the sentences, the variables-and-inputs example all say "other"); browser tests cover the empty and filled tag group; fixes.md rows 9 and 13 say built
- [ ] 30. Fix 10, the logic: multiply, divide and variables as values
  - Read: requirements/triggers/triggers.md#multiply-divide-and-variables-in-every-value-box--v4, architecture/core-model/triggers.md, architecture/triggers-in-play.md
  - Done when: Change value has Multiply and Divide (numbers, and a vector by one number; dividing by 0 leaves the value); every value box's value can be a variable of its type (level's or the target's own), saved, loaded and read when the block runs; unit tests cover saving and loading, and `runHeadless` tests cover multiply, divide, divide by 0 and a variable read at run time in Change value, the If, Wait and Fire custom event
- [ ] 31. Fix 10, the blocks: Multiply, Divide and the variable picks
  - Read: requirements/triggers/triggers.md#multiply-divide-and-variables-in-every-value-box--v4, design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks
  - Done when: Change value's menu offers Multiply and Divide; every value box in every block offers the variables of its type, grouped as the variable menu groups them, and shows a chosen variable by name; a vector or colour box offers none; browser tests cover picking a variable in each block kind and switching back to a typed value; fixes.md row 10 says built
- [ ] 32. Fix 12, the rules: lengths in metres
  - Read: requirements/editor/workspace.md#lengths-in-metres--v4, requirements/physics/bodies.md, glossary.md, requirements/README.md
  - Done when: every requirement that says 50 px per metre or gives a length, speed or grid size in pixels says it in metres (the grid size's range and steps included, chosen under the standing yes); the glossary has *Pixels per metre*; architecture/ says where the scale lives; `node tools/check-docs.js` and `node tools/check-sources.js` pass
- [ ] 33. Fix 12, the physics: pixels per metre as a World setting
  - Read: requirements/editor/workspace.md#lengths-in-metres--v4, architecture/README.md, tech-notes.md
  - Done when: the World's PhysicsWorldComponent has *Pixels per metre*, default 100, saved in the level and not changeable during play; the fixed `Units.PIXELS_PER_METRE` is gone and the physics, masses and test play use the World's value; a new level's grid is 100 px; old levels aren't converted; unit and `runHeadless` tests show a body falls the same in metres at 50 and 100 px per metre
- [ ] 34. Fix 12, the editor: every length in metres
  - Read: requirements/editor/workspace.md#lengths-in-metres--v4, design/controls.md
  - Done when: ☰ offers Metres and Pixels, metres by default, saved in the browser; every length the editor shows or takes (the Entity inspector's boxes, the grid size, speeds in m/s, the trigger blocks' boxes, the debug box, rulers and size labels) is in the chosen unit, typed values converted back exactly; browser tests cover both units in the Entity inspector, the grid size and a trigger block; fixes.md row 12 says built
- [ ] 35. Journeys and close fixes 9 to 13's docs
  - Read: versions/v4/fixes-9-to-13-plan.md, versions/v4/tasks.md#tasks
  - Done when: the Playwright journeys pass in three browsers with the new units; the speed tests still meet their targets; architecture/ and design/ match what was built; progress.md says fixes 9 to 13 are built and waiting for the owner's try
- [ ] 36. Try point: draw a closed path with the pen, target a tag in an empty level, double a coin count with Multiply, use a variable in a Wait, and move things in metres, and say how it feels
