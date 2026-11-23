# v4 fixes

## TL;DR

What the owner asked to change while trying v4, in their words, and what became of each. Built straight away in the session the owner asked, not as orchestrator tasks, as v3's [fixes](../v3/fixes.md) were.

## 2026-11-23

| # | The owner's words | State |
|---|---|---|
| 1 | "it should broadcast down on the entity tree... so if you dispatch it to the world, every entity should be able to detect it." | **Built** (2026-11-23). A custom event fired on an entity is heard by it and everything inside it, parents first, top row first, each entity once per Fire. See [custom events](../../requirements/triggers/triggers.md#custom-events--v4) |
