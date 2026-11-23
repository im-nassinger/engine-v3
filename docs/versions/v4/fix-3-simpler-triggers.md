# v4 fix 3: simpler triggers

## TL;DR

The owner found triggers convoluted, with too many options that overlap (2026-11-23). Agreed in that session, **not built yet**:
- **When:** 12 events become 6.
- **If:** 3 checks become 1.
- **Do:** 8 actions become 7, since Push goes.
- **The Sensor setting goes:** a SurfaceComponent means solid, and no Surface means things pass through.

The next session builds this as a fix, in the session, the way fixes 1 and 2 were, and updates every doc it changes. Row 3 in [fixes.md](fixes.md) tracks it.

## The owner's words

> "lets improve the triggers UX. I noticed that it has lots of "when" options. but some of them look unnecessary. "something starts touching this" and "this hits something", whats the difference? and why do we need a "the last entity with a tag is gone"? and the "this is destroyed" also looks unnecessary... in summary: this whole trigger thing is looking very convoluted and bad. we need to simplify it as much as possible, making it easier to understand/use."

> "maybe this "sensor" toggle shouldn't exist, and our engine should automatically handle it when appropriate"

> "on the "Do" part, "push" seems unnecessary, since we can simply add a vector to its velocity. this kinds of things. check what else can be simplified"

## 1. When: 12 events become 6

| New event | Replaces |
|---|---|
| something **starts / stops** touching this | "something starts touching this", "something stops touching this", "this hits something" |
| a **key or input** is pressed / released / held | "a key is…" and "an input is…" |
| **after / every** N seconds | "after some time" and "every few seconds" |
| the level starts | same |
| a variable changes | same |
| this gets a custom event | same |

- **starts / stops**, **key / input** and **after / every** are clickable words in the sentence, the way **pressed / released / held** already is. The menu holds 6 options, and the rest is chosen in place.
- **Touching covers solid and pass-through things alike.** A bump between two solid surfaces and an overlap with a pass-through entity are the same event. *Why: whether an entity bumps or overlaps already follows from whether it has a Surface. With two events you can pick the wrong one, nothing fires, and you can't tell why. The owner weighed keeping two ("overlaps" and "collides") and chose one (owner, 2026-11-23).*
- **Solid hits now also get "stops touching"**, which "this hits something" never had.
- **"the last entity with a tag is gone" is dropped.** The "collect every coin" goal is built with a variable instead: each coin adds 1 to `coins`, and the World has "When coins becomes 10 or more, Win". The cost: adding an 11th coin means changing the 10 (owner, 2026-11-23).
- **"this is destroyed" is dropped.** Only a Destroy action sets it off, and the trigger holding that action can do the rest itself (owner, 2026-11-23). It can come back when breaking joints (Later) need it, since a joint breaking is being destroyed (see [rejected.md](../../rejected.md), "A joint broke event").

## 2. Touching and the Sensor setting

The rule, as the user sees it:
- **A SurfaceComponent means solid.** Things bump into it.
- **No SurfaceComponent means things pass through.**
- **A touch trigger works on either.**

How the engine does it:
- **The Sensor checkbox is removed from the SurfaceComponent.** *Why: to a user, "no Surface" and "a sensor" both mean "things pass through". The only difference was noticing touches, and the engine can work that out from the triggers (owner, 2026-11-23).*
- **A shape with no Surface becomes a Box2D sensor in play** when its entity, or a group above it, has a touch trigger. Later, in v5, a script listening for touches counts too. Otherwise it stays out of the physics world, as now. No component is added, so nothing happens behind the user's back. The sensor exists only inside the engine.
- **A solid shape with a touch trigger stays solid.** The engine turns on its `enableContactEvents` (for solid-on-solid hits) and its `enableSensorEvents` (so sensors see it).
- **`TouchLedger` and `ContactLedger` become one ledger** that turns both kinds of Box2D report into "starts touching" and "stops touching". It counts once per trigger owner and touching entity, as both do now.
- **Both sides hear a touch.** A solid player with a touch trigger, walking into a pass-through coin, fires too, with the coin as `other`. Today only the sensor's side fires.
- **Limits that stay, all Box2D's own rules:**
  - Two pass-through entities never notice each other, because two sensors don't.
  - A pass-through entity with no touch trigger isn't in physics, so nothing notices it. That's how plain decoration should behave.
  - At least one Dynamic body is needed for a touch.
- **Why sensors are still used inside the engine:** Box2D only reports a hit between solid shapes while it pushes them apart. Noticing without pushing needs a sensor. The pre-solve callback could cancel the push, but it would call into JavaScript for every touching pair on every tick.
- **The trigger card's "Needs a Surface to notice touching. [Add Surface as sensor]" note goes away.**
- **The Trigger tool** makes a rectangle shape with a TriggerComponent ("When something starts touching this") and no SurfaceComponent.

## 3. If: 3 checks become 1

- "an entity has a tag", "a variable's value" and "a component value" become one check, **"a value"**, which uses the same target and value picker as Change value. Tags are the TagsComponent's value and variables are the VariablesComponent's, so all three were already checks of a value.
- It still reads naturally per kind: "If other has the tag player", "If coins is 10 or more", "If this Body › Speed is more than 200". The tag rule stays: the tag may be on `other` or any group above it.
- *Why: If and Do then mirror each other, "check a value" and "change a value", with one picker (Claude's proposal, owner agreed 2026-11-23).*

## 4. Do: Push goes

- **Push is removed.** "Add 0, -500 to this Body › Velocity" does the same, because Push ignored mass and changed velocity directly. *Why: if it's data, change it with Change value (owner, 2026-11-23).*
- **Body › Velocity becomes a value Change value can set, add to and subtract from**, as a vector in px/s. Today it can only be read, in the value check.
- Lost: "push away from / towards `this` at a strength". Scripts cover it from v5. If it's missed, it can come back as a way to fill a vector, not as an action.
- **Kept:** change a value, destroy, fire a custom event, wait, win, lose, restart the level. Each does something no value can.
- **Repeat** stays as it is.

## Saved levels

Old levels must load. Convert each trigger as it is read (`parseTrigger.ts` / `normalizeTrigger.ts`):

| Saved | Becomes |
|---|---|
| `touched`, `untouched`, `collision` | touching, starts / stops |
| `key`, `input` | key or input |
| `after`, `every` | the timer event |
| `tagLeft`, `destroyed` | an unset When (the card shows "pick an event"), keeping the trigger's If and Do |
| `hasTag`, `compare`, `compareValue` checks | the value check |
| `push` with a fixed kick | Change value: add the kick to the target's Body › Velocity |
| `push` away / towards | dropped, with the trigger's other actions kept |
| A SurfaceComponent with Sensor ticked | the SurfaceComponent removed |

## Where the code is

- Event, check and action kinds: `src/core/fields/trigger/Trigger.ts`, read and written by `parseTrigger.ts`, `normalizeTrigger.ts` and `copyTrigger.ts` beside it.
- The menus and words: `src/editor/entity-inspector/triggers/TriggerChoices.ts`, `TriggerSentence.ts` and `freshParts.ts`.
- Touch and hit counting: `src/core/simulation/triggers/TouchLedger.ts` and `ContactLedger.ts`. Events reach triggers in `src/core/simulation/phases/EventPhase.ts` and `TriggerPhase.ts`.
- Which shapes are sensors: `src/core/physics/scene/PhysicsSceneBuilder.ts`, `src/adapters/box2d/ShapeTable.ts`, and `SurfaceValues.ts` (the `sensor` field).
- Actions: `src/core/simulation/actions/ActionRunner.ts` (Push), `PlayValueWriter.ts` (Change value), `checksPass.ts` (checks).
- Values a trigger may change or read: `src/core/triggers/model/changeableValues.ts` and `readableValues.ts`.
- Problems shown on the card: `src/core/triggers/model/triggerProblems.ts`.
- The Trigger tool: `src/editor/commands/draw/createTrigger.ts`.
- Event names shared with scripts: `src/core/triggers/model/reservedEventNames.ts`.

## Docs to update when it's built

- [requirements/triggers/triggers.md](../../requirements/triggers/triggers.md): Events, More events, "No entity with this tag is left", If checks, Checking a component value, Actions (Push), the Trigger tool.
- [requirements/physics/bodies.md](../../requirements/physics/bodies.md): the Sensor setting, Sensors and touching, the warning "A Dynamic body whose surfaces are all sensors".
- [requirements/physics/world.md](../../requirements/physics/world.md): the collision grid's sentences about sensors.
- [requirements/scripts/lua-api.md](../../requirements/scripts/lua-api.md): the event list (`collision`, `destroyed`, `no_entity_with_tag_left` go; `touched` covers hits) and `push()`. Scripts keep matching trigger events.
- [glossary.md](../../glossary.md): Sensor (now an engine word only), Collision (event), Touched, Push, Destroyed, and the dropped words in its dropped list.
- [design/controls.md](../../design/controls.md): the When menu, the Add check menu and the Add action groups.
- [rejected.md](../../rejected.md): a row each for the Sensor setting, the separate collision event, "No entity with this tag is left", Destroyed and Push.
- [scope.md](../../scope.md), [decisions.md](../../decisions.md), [architecture/triggers-in-play.md](../../architecture/triggers-in-play.md), [architecture/core-model/triggers.md](../../architecture/core-model/triggers.md), and [progress.md](../../progress.md).
- Tests and journeys that use the removed events, checks or Push, such as `TriggerCardModel.test.ts`, `TriggerCardModel.newKinds.test.ts`, `runHeadless.events.test.ts`, the v3 and v4 journeys, and the 1,000 touch and 1,000 collision speed tests, which become one.
