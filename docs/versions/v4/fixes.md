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
| 4 | The trigger card is "ugly and convoluted"; after the [mockup](../../design/mockups/triggers.html)'s rounds: "we have a winner: lets do the scratch one." | **Built** (2026-11-25), by the orchestrator in tasks 19 to 26 of [tasks.md](tasks.md); task 27 is the owner's try. The card is Scratch blocks: an event block, one If wrapping the actions, blocks added from hover slots and removed with an ×. Repeat is gone (a trigger rests or fires once per run by setting its own *Enabled*), a fresh firing of a trigger switched off before it runs is dropped, the event says "other", and the Entity inspector is 344 px wide. The look is in [controls.md](../../design/controls.md#v4-fix-4-the-trigger-card-as-scratch-blocks), the plan and the five points the owner confirmed in [fix-4-scratch-triggers.md](fix-4-scratch-triggers.md), the picks made while building in [decisions.md](../../decisions.md) |

## 2026-11-25

| # | The owner's words | State |
|---|---|---|
| 6 | "remove that ugly border from the selects on the scratch blocks"; a labelled head for the trigger's name and enabled, "the first one" of four options; "clicking the icon of a scratch block should open the replace menu, the same as when the user right clicks the block and clicks replace. and resize the entity inspector and entities viewer both to 360px." | **Built** (2026-11-25). See [controls.md](../../design/controls.md#v4-fix-6-labelled-head-and-icon-menu) |
| 5 | Hovering a value box should close the slot (it already did; the owner's copy was older). Then: "make it so the element with all the scratch components have a minimum height that fits around 4 blocks, and a max height to fit 10 blocks. and remove that yellow warning "doesnt run until every yellow part is set.". and make it so all the selects of the scratch blocks have maximum rounded borders, like pills … and pick better colors for the selects and selects with no values. and add a context menu when the user right clicks a scratch block, with the options: Replace, Delete. … this way the When block … select will be used only to change it's own value (ex: from starts to stops) and not allow the user to use it to change the whole block itself." | **Built** (2026-11-25). See [controls.md](../../design/controls.md#v4-fix-5-the-blocks-after-the-owners-try); the picks made in [decisions.md](../../decisions.md) |

