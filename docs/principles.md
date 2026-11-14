# Principles

## TL;DR

The rules every requirement follows, and the rules for proposing a change. They came out of the 12 review rounds: each one is something the owner corrected more than once. **Read this before proposing anything.** The short version: everything is an entity with components, fewer concepts beat more, no special cases, nothing happens behind the user's back, and v1 is the smallest thing that can be tested.

## Design principles

| Principle | What it means | Example from the review |
|---|---|---|
| **Everything is an entity with components** | Each feature is a component or a setting on one, never a separate kind of thing | Physics is a BodyComponent, a joint is an entity with a JointComponent |
| **Fewer concepts** | If something is just a file, it stays a file | No "behaviour" and no "prefab": only `.lua` and `.entity` files. An image is a shape with an image fill |
| **Component names end in `Component`** | | AssetComponent, TriggerComponent, NameComponent |
| **New components need a strong reason** | Prefer a setting on an existing component over a new component for one case | One-way is a SurfaceComponent setting, not a component |
| **One component of each type per entity** | A component that needs several of something holds a list | One TriggerComponent with a list of triggers, one ScriptComponent with a list of `.lua` files |
| **No special cases** | A rule or list for one kind of entity should be a general one | A joint is an ordinary entity, and breaking is being destroyed. The Used by list, not a "list of its joints" |
| **Only what is selected moves or copies** | Nothing is dragged or copied along because it is connected | Moving a wheel doesn't move its hinge |
| **Nothing happens behind the user's back** | No hidden packing, no partner components added on their own. Show a note with a button instead | "Needs a ShapeComponent to draw anything. [Add ShapeComponent]" |
| **One row = one entity** | The Layers panel shows the tree and nothing else | Joints aren't shown inside another entity's row |
| **The order you see is the order things run** | Triggers and scripts run in Layers panel order | Drag a row to change when it runs |
| **Assets are raw files** | Settings never live on the asset. They live where it is used | Volume is on the "Play sound" action, tiling on the image fill |
| **One place decides what hits what** | The collision grid on the World. No second collision system beside it | Nothing extra for ragdolls: give the parts the right tags |
| **If it's data, change it with Change value** | Trigger actions only exist for what no component value can do | Teleporting is changing the Transform |
| **One layout system** | Flex places things, also against the screen | No anchors. The 3×3 picker only sets Flex values |
| **Triggers and scripts share one list of events** | Same names in both. Scripts listen with `on()` | `on("touched", ...)` matches "When touched" |
| **Handles, not references, in Lua** | Scripts work with entity and component ids through functions | `spawn(path)` returns an id |
| **Use common names** | Prefer the names Box2D, CSS and other engines use over invented ones, so tutorials and the Lua API match | Fixed rotation, linear damping, restitution, justify content |
| **One word, one meaning** | A glossary word must mean exactly its glossary meaning | "Group" is never a collision group. "Grid" alone is the editor's grid |
| **There is no special player** | No feature assumes one | To start somewhere else, move the entity the camera follows |
| **The game decides nothing the creator should** | | No lives system, no title card |
| **Determinism is a tested requirement** | The same level, seed, inputs and clock time give the same run on any computer | Touching is detected by the physics engine, not a second system |
| **v1 is the smallest thing that can be tested** | Versions are decided in the scope review, not inside a requirement | v1 holds one level at a time, opens straight on the editor, and has no logic: you build a level and watch it run |
| **Don't plan for what is certainly later** | Publishing, accounts, moderation, replays, sprite sheets, animations, parallax are not designed now | |

## Rules for proposing a change

The owner rejected questions that broke these. They apply to any new requirement, question or doc.

- **No made-up words.** Every word must be in the [glossary](glossary.md). "Mouse trigger" and "HUD entity" were rejected as invented shorthand.
- **Say what you're proposing and what problem it solves.** Start from the problem, then the proposal, then one example. "Sending messages" with no context was rejected.
- **Reuse before adding.** Before proposing a new component, setting or action, check whether something already agreed does it. The owner caught five of these: the collision grid already handles ragdolls, tags can be the collision categories, Flex can replace anchors, teleporting is just changing a value, a joint breaking is just being destroyed.
- **Describe what the user does and sees.** Say which button, what happens, and why someone would want it. A list of numbers with no picture ("pause, step 1 or 10 ticks, 0.1× to 4×") was the worst-rated question.
- **Never slip in a feature.** A new feature gets its own question. "Shapes a script draws" appeared inside a debugging question and was rejected.
- **Rewrite, don't patch.** When a decision changes an older text, rewrite the text from the decision. A patched question read as a contradiction.
- **One recommendation, not a menu.** Answer "help me think" with one recommendation, its trade-off, and an example.
- **Keep each question small.** One decision, a short line, and a detail with one example.
- **Check [rejected.md](rejected.md) first.** If an idea is there, it needs a new reason to come back.

Source: `review-decisions/README.md` and `review-process.md` in ecs-game-v2.
