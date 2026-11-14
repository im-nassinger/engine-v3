# Camera and the screen

## TL;DR

What the player sees. There is exactly one camera, an entity with a CameraComponent, and the entities inside it stay fixed on the screen. **v1:** one camera in Fixed size that follows an entity with smoothing and stops at the level bounds. **v2:** following a tag, and entities inside the camera, for a score or timer. **v3:** Fill window, the FlexComponent (the one layout system, also for placing things against the screen's edges), follow offset, dead zone and look-ahead, HUD mode, zoom during play, and camera shake. **Later:** parallax and more cameras. Core rules: there are no anchors, "HUD" is not a kind of entity, and the camera never rotates.

## The camera

### One camera · v1

- A level has exactly one camera: an entity with a TransformComponent and a CameraComponent. New levels start with it.
- It can't be deleted or duplicated, and a second one can't be added. It always sits directly inside the World.
- In the Layers panel it is an ordinary row. Where it sits changes nothing, because what is inside the camera is always drawn over the level.
- The editor's own view is separate. Panning or zooming the editor never changes the camera.
- The camera's position is the centre of what it shows. The default camera is **1920×1080**.
- A new level's camera starts at the level's origin, which is the middle of the level bounds. *Why: the World's rectangle is centred on the origin (owner: 2026-11-13).*
- In the level view the camera shows as a frame of what players will see. Clicking inside the frame goes through to the level behind it. Clicking its edge selects the camera.
- **Dragging a corner of the frame keeps its proportions, so it only zooms.** Width and height are typed in the CameraComponent. *Why: a corner drag that changed the shape would quietly change what players see.*
- **The camera never rotates**, in the editor or in play, and doesn't turn with what it follows.
- The camera can hold tags, triggers and scripts.
- **The camera has an eye icon like every row.** Hiding it hides everything inside the camera, in the editor and in play. *Why: hiding applies to children for every entity, so the camera is not a special case.*
- The window's size never reaches the game, and scripts can't read it. Camera modes only change what is visible.
- "Camera frame" in the View menu hides the frame.

Source: round 1: C4; round 5: 02 2.15; round 7: 07 2.1, 07 2.7, 07 2.15, BND2; round 8: CA1, VW1; old: CM-01 to CM-10, CM-17 to CM-21, CM-58, CM-97; owner: 2026-11-13

### Fixed size · v1

- The camera shows exactly its own box. Every player sees the same area.
- If the window has different proportions, **black bars** fill the rest. The view is centred and scaled to fit.
- New levels start in Fixed size until v3.
- *Why v1: it is the only camera mode until Fill window. Positions inside the camera are then always the same, so a score stays in its corner without any layout.*

Source: scope CM3; round 7: 07 2.2, 07 2.12; old: CM-11, CM-83; owner: 2026-11-13

### Fill window · v3

- The same height as the camera's box, and wider windows see more of the level sideways.
- **There is no limit on how wide.** Black bars only appear where the view would go past the level bounds. *Why: the owner rejected a 21:9 cap.*
- A window narrower than the camera's box keeps the whole box and gets bars above and below. Nothing the creator framed is ever cut off.
- From v3, new levels start in Fill window. *Why: a browser window is rarely exactly 16:9, so Fixed size shows bars for most players.*
- What is inside the camera scales with the window's height, the same as the level, so it keeps its size on every screen.
- Scripts and triggers work only with the camera's own box, never the wider view. An enemy that wakes when it enters the camera's box behaves the same on every screen.
- *Why v3: on a wider window a score placed in the corner would no longer be in the corner. That needs the FlexComponent, so the two go together.*

Source: scope CM4; round 1: D48, D49, D55; round 2: O10; round 7: 07 2.2, 07 2.12; old: CM-12, CM-14, CM-16, CM-18, CM-82

### Follow an entity · v1

- The CameraComponent has a follow target: an entity, picked like any entity field.
- **Smoothing** is one value for both directions: roughly how long the camera takes to catch up, in seconds. 0 locks the camera to the target. *Why one value: the owner rejected separate values per direction.*
- When play starts the camera is already on its target, with no opening pan.
- **The camera stops at the level bounds, slowing down gently.** It always ends up inside. Moves made by scripts are limited too.
- The limit uses the view the player really has, so a wide window never sees past the bounds.
- If the level is smaller than the view in one direction, the camera centres on the bounds in that direction and doesn't scroll.
- Follow tracks the target's origin. Any entity can be the target, also one inside a group. A hidden target is still followed.
- If the target is destroyed, the camera holds its last position.
- Deleting the target in the editor shows the `missing entity` warning on the field.
- **There is no special player.** To start a level somewhere else, move the entity the camera follows.

Source: scope CM1; round 1: D52; round 7: 07 2.4, 07 2.5; round 9: 11 2.5; old: CM-29, CM-34, CM-39, CM-40, CM-43 to CM-48

### Follow a tag · v2

- **The follow target can be a tag instead of an entity.** The camera follows the entity with that tag that is highest in the Layers panel.
- Example: the target is the tag `player`. When the level spawns `player.entity`, the camera finds it at once, with no script.
- Levels saved with an entity as the target keep working.
- *Why v2: a spawned player doesn't exist in the editor, so it can't be picked as an entity. Spawning is v2 (owner: 2026-11-13).*

Source: owner: 2026-11-13

### Offset, dead zone, look-ahead · v3

- **Offset:** added to the target's position, in level pixels. It doesn't turn with the target.
- **Dead zone** (width and height): the camera stays still while the target is inside this box. A box as tall as a normal jump keeps jumps from moving the camera.
- **Look-ahead** (seconds, sideways only): the camera leads the target by its sideways speed times this value.
- While the camera is selected, the dead zone shows as a dashed box inside the frame.

Source: scope CM2; round 1: D53; round 7: 07 2.4; old: CM-32, CM-35, CM-36, CM-24

### Zoom during play · v3

- Zoom goes from 0.1 to 10. Higher is closer. It can change during play, with Change value like any other value.
- Zoom never affects what is inside the camera, and never affects physics.
- Zoom scales around the camera's centre, then the bounds apply, so zooming out near a wall can shift the camera.

Source: scope CM8; round 7: 07 2.8; old: CM-59 to CM-62

### Camera control from triggers and scripts · v3

- Triggers and scripts can make the camera follow something else, move, zoom, shake, jump to its target, or change its limits.
- What is a value is changed with Change value: the follow target, zoom, offset, smoothing, dead zone, look-ahead. Scripts change the same values through the Lua API.
- **Camera shake** is the one camera action, because no value can do it: a strength, a duration and a fade-out. It is only visual, scripts never see it, and it isn't limited by the bounds.
- A camera pan in a cutscene is a sequence: move, wait, zoom, wait, follow again. No timeline feature is needed.
- Restarting the level returns the camera to how it started.
- Camera moves ignore the game speed, so a pan still finishes during slow motion. Pause in test play stops everything, shake included.

Source: scope CM9; round 7: 07 2.6; round 9: 09 2.4b; old: CM-50 to CM-57

## Inside the camera

### Entities inside the camera stay on the screen · v2

- **An entity inside the camera stays fixed on the screen during play.** This is how a score or a timer is made.
- **"HUD" is not a kind of entity**, only a short name for the entities inside the camera. The editor says "inside the camera". *Why: they are regular entities. The only difference is their parent.*
- Any entity can go inside the camera, with any component. Groups nest as usual. There is no separate interface system.
- **Physics and joints don't run inside the camera, and those cards show a warning.** *Why a warning and not a rule: inside the camera, positions are screen positions, and physics works in level positions. A warning explains it.*
- Triggers inside the camera work for clicks, hover, keys, timers and custom events. Touch events never fire there.
- What is inside the camera is drawn above the level, and below the end window and pause menu.
- Moving an entity into or out of the camera keeps it where it appears, like any move between groups.
- Until Flex in v3 you place these entities by hand. With Fixed size their positions are the same on every screen.
- In the level view, single clicks pass through the entities inside the camera, so they never block the level. Double-click the camera's frame, or select them in the Layers panel, to reach them.
- Something that moves with the view and touches the level, such as a wall that chases the player, can't be inside the camera. Make it a Kinematic body that the camera follows.
- *Why v2: its reason is a score or a timer, which need variables.*

Source: scope CM6; round 1: C4, D18; round 7: 07 2.14; round 8: HUD1, HUD2; old: CM-69, CM-70, CM-74, CM-75, CM-92 to CM-96; owner: 2026-11-13

### The FlexComponent · v3

- **There are no anchors. Flex is the one layout system.** A FlexComponent keeps an entity's children arranged, in the editor and in play.
- Its settings use CSS names: **direction** (row or column), **justify content**, **align items**, **gap**, **padding**.
- **The camera's box is the screen**, so a FlexComponent on the camera lays out its children against the screen's edges.
- The Flex card shows a **3×3 picker** (top left to bottom right). It only sets justify content and align items. It is not a second system.
- Flex uses each child's shape as its size. For text that is its box.
- Flex is a lasting arrangement, for menus and lists. The align and spread buttons are one-off tidying for things that stay free afterwards, like platforms. Both use the same layout code.
- *Why: Flex reaches all nine spots, so one layout system is enough. The picker makes the common case one click without adding a second system.*

Source: scope CM5; round 4: FX1; round 9: AN2; round 1: D50; round 7: TX2

### HUD mode · v3

- Double-clicking the camera's frame goes into the camera, like going into a group. The level is dimmed, and Esc goes back.
- While inside, drawing tools create entities inside the camera, and paste lands there.
- Editing there is at the camera's own size, whatever the camera's zoom or the editor's zoom.
- Before v3 you still go into the camera the same way, without the dimming.

Source: scope CM7; round 7: 07 2.10; old: CM-71 to CM-73

## Later

### Parallax · Later

- Not in v1 and not decided. The old draft put a parallax setting on a group, with a speed factor per direction and repeating contents.

Source: round 7: 07 2.9; decisions: D56; old: CM-63 to CM-68

### More than one camera · Later

- Only one camera in the first version. Split screen and picture-in-picture are not planned.
- What a second camera is usually for can be done with one: cutscene shots by moving and zooming, room-by-room views by changing the camera's limits, two characters on screen by following a helper entity placed between them.

Source: round 7: 07 2.15; old: CM-97

## Small features

Small features from the old draft and review that the scope review never asked about. The owner gave each its version in round 7 of the architecture review.

| Feature | Rule | Version |
|---|---|---|
| Safety margin | However soft the smoothing, the target is never allowed within 10% of the view's edge. A teleport far away becomes a cut, not a long pan | v1 |
| Follow each direction separately | Switch following sideways or up and down off, for fixed-height side-scrollers | v3 |
| Follow style presets | Platformer, Free, Vehicle, Locked. They only fill in values. The review dropped presets on other components | Later |
| Limits other than the level bounds | A trigger or script replaces the camera's limits with the bounds of any shape, then restores them. This gives room-by-room cameras | v3 |
| View through camera | The level view becomes a read-only preview of what players see, at a chosen window shape | v3 |
| Bar colour | The colour of the bars, black by default | v3 |
| View size list | A dropdown of common sizes (16:9, 16:10, 4:3, 1:1, 9:16), all 1080 high, plus custom from 160 to 7680 | v3 |

Source: old: CM-13, CM-22, CM-25 to CM-28, CM-30, CM-31, CM-33, CM-37, CM-38, CM-49, CM-83; owner: 2026-11-14
