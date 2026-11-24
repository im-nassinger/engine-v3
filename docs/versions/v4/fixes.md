# v4 fixes

## TL;DR

What the owner asked to change while trying v4, in their words, and what became of each. Built straight away in the session the owner asked, not as orchestrator tasks, as v3's [fixes](../v3/fixes.md) were.

## 2026-11-23

| # | The owner's words | State |
|---|---|---|
| 1 | "it should broadcast down on the entity tree... so if you dispatch it to the world, every entity should be able to detect it." | **Built** (2026-11-23). A custom event fired on an entity is heard by it and everything inside it, parents first, top row first, each entity once per Fire. See [custom events](../../requirements/triggers/triggers.md#custom-events--v4) |
| 2 | "I need your help to improve the UX of the triggers. some things are not good, some things look convoluted. … field types (vectors) … don't have proper UI components … the user should also have a easy way to be able to pick a entity by clicking instead of being forced to pick from a giant select. and the select shoud look exactly like the entities viewer entity list looks, with hierarchy. … lots of texts are not easy to understand … `'Transform position\nTransform position x\nTransform position y'` this looks horrible. first the user should select the component and then the property." The owner then approved Claude's plan with its recommended defaults. | **Built** (2026-11-23). The entity picker (the Entities viewer's tree, a search, the target icon, a dropped row) for every trigger entity word and every entity field; Change value's value menu by component, then value, a vector once and added whole; the entity before the value in the sentence; the Entity inspector's own boxes for numbers (with units), vectors, colours and Fills; Add check and Add action items each saying what they do, Add action in groups; plainer words. Also fixed: Rotation and a Fill couldn't be typed, a camera's Follow couldn't be set, and a tag's value menu was empty in a level with no tag. See [controls.md](../../design/controls.md#v4-fixes-the-trigger-cards-pickers-and-boxes) |
| 3 | "this whole trigger thing is looking very convoluted and bad. we need to simplify it as much as possible, making it easier to understand/use." Then: "maybe this "sensor" toggle shouldn't exist", and "push seems unnecessary, since we can simply add a vector to its velocity." | **Built** (2026-11-23). The When menu from 12 events to 6, the Sensor setting removed (format version 2 upgrades old levels), the If checks merged into one value check, Push replaced by adding to Body › Velocity. The plan is in [fix-3-simpler-triggers.md](fix-3-simpler-triggers.md); the picks made while building are in [decisions.md](../../decisions.md) |

## 2026-11-24

| # | The owner's words | State |
|---|---|---|
| 4 | The trigger card is "ugly and convoluted"; after the [mockup](../../design/mockups/triggers.html)'s rounds: "we have a winner: lets do the scratch one." | **Planned, not built** (2026-11-24). The card becomes Scratch blocks; the look is in [controls.md](../../design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks), the build plan, five points for the owner to confirm and its tasks in [fix-4-scratch-triggers.md](fix-4-scratch-triggers.md). Built by the orchestrator, since it is about nine sessions of work |
