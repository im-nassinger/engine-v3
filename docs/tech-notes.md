# Technical notes

## TL;DR

Facts and warnings for the architecture work, collected from the old research. **These are not requirements and not decisions.** They are what the earlier attempt learned about browsers, Box2D and Lua that the new design should know. First a few facts the owner settled, then notes grouped by topic, then the first attempt's implementation choices at the end. Notes that named the old code's own parts were dropped, and anything a later decision made untrue was removed.

## Settled by the owner

- **Box2D v3 and Lua both run in the browser with wasm.** No proof is needed. (owner, 2026-11-13)
- **The first attempt used box2d-wasm 7.0.0, which is Box2D v2.4.1.** That is why the physics notes below were written against v2.4. Stage 13 rechecked them against Box2D 3.2, and each says what it showed.
- **Box2D v3 has its own recording and replay support.** Whether it helps the game is looked at later, not now. See replays in [later.md](requirements/later.md).

## Editor

- **Reserved keys.** Chrome doesn't deliver Ctrl+N, T, W or tab switching to pages. Safari has a similar list. An installed app would get these keys. The Keyboard Lock API is experimental and aimed at full screen, so nothing should rely on it. The reserved list comes from a 2016 post and needs a real check in each browser.
- **Matching keys.** Use physical key codes for Shift+digit, because Shift+1 gives a different character per layout, and the typed character for `?` and `+`. Test on a US layout, the Brazilian ABNT2 layout and one layout that uses AltGr heavily.
- **Key and wheel handlers** must run early and be non-passive to stop browser defaults. Alt key-up and middle-button down need their own handling. Whether Alt+drag is safe on Linux window managers is untested.
- **Clipboard.** Prefer the `copy`, `cut` and `paste` events, which need no permission. The async clipboard read is permission-based and differs by browser. Custom clipboard formats vary, so carry the data as tagged text as a fallback. Treat pasted data as untrusted.
- **Leave prompt.** Add the `beforeunload` listener only while something is unsaved, and write on `visibilitychange`. A browser storage write may not finish during unload, which is why the prompt still matters.
- **Undo history.** Steps need a label, a key for joining runs (arrow moves, field edits), and the group the user was inside. Deleted files stay in memory while history can restore them, so history may need a byte limit as well as the 512-step limit.
- **Field metadata.** Each field needs a unit, a display scale (such as radians to degrees), precision, a slider range, a description, and its component's menu section.
- **Scrubbing.** Pointer capture is enough. Pointer Lock would allow endless scrubbing but shows a browser banner.
- **Cursors.** Rotated resize cursors must be generated, because CSS has only eight fixed directions.
- **Sharp drawing.** The canvas must follow `devicePixelRatio` and watch its container size so browser zoom stays sharp. Pinch arrives as Ctrl+wheel in some browsers.
- **Limits far from the origin.** The zoom limits, pan margin and any position limit should be checked against how Box2D behaves far from the origin. **3.2:** a box rests the same 200,000 px from the origin as at it; see far from the origin under physics.
- **Swipe back.** `overscroll-behavior` stops scroll chaining, but its effect on swipe navigation at the page root isn't documented. Test on a Mac.
- **Hit testing and hover** need a spatial index over level bounds to meet the speed targets. Bounds are derived, so a move must invalidate a subtree cheaply.
- **Hide and lock from parents** are derived by walking up the tree. Cache per subtree. The play copy must carry the hidden state so play draws the same thing.
- **Entities viewer.** A fixed row height allows a virtualised list. Virtualisation plus drag and drop is where hand-made trees tend to break, so prototype both together at 10,000 rows. Browser find can't see off-screen rows, which is one reason for the panel's own search.
- **Vite's dev server can keep a half-saved file.** A file being written can be empty for a moment. If the dev server reads it then, it can keep serving the empty copy until the file changes again. On 2026-11-18 it kept an empty `EditorShell.css` for 14 hours, so the islands stacked down the page while the code was fine. A test with a page open broke it on 9 of 25 saves that wrote the file empty first. With `server.watch.awaitWriteFinish` it broke on none. A fresh `npm run dev` always serves the real file. See [tooling.md](architecture/tooling.md#the-folders-and-the-page).
- **Order keys.** If draw order uses fractional keys, repeated inserts between the same neighbours run out of precision. Rebalance quietly, outside undo.
- **Negative scale** must be allowed (mirroring, Flip). Polygon winding and joint limits need a rule under mirroring.

## Drawing and text

- **Fill and outline as tagged values**, such as `{ kind: "solid", color }`, so gradients and image fills need no format change.
- **Rounded rectangles** have more than 8 points, so they go through the same splitting as any polygon. The splits are internal and add no seams.
- **Self-crossing polygons.** A polygon library must cut the outline at its crossings before the convex split. Check how the renderer fills a self-crossing closed path: fills based on ear clipping may show artefacts.
- **Bad polygon input.** Treat a point lying on an edge, and duplicate points, as errors. Godot users report convex decomposition failing on exactly these.
- **Lines in Box2D.** Chains assume no self-crossing for their ghost collision handling, and points very close together cause problems. Clean lines up before they reach physics. **3.2:** the game builds lines from segments, not chains, so this no longer applies; chain points 0.2 px apart still held a body (`box2dFacts.test.ts`).
- **Converted polygons are stored results**, so how the points are sampled can't affect determinism.
- **Sharp text.** Text drawn as a bitmap blurs when scaled above 1. Editor zoom, camera zoom and group scale all count, so text must be redrawn at its real size or drawn another way. Text that a script changes every tick needs a speed test.
- **Text can't be measured off the main thread**, which is one reason a text has a rectangle as its box.
- **Fonts** must be hosted with the game and loaded before the first draw and before any measuring.
- **Typing on the level** can be a DOM text area placed with the entity's matrix, which gives accent keys and input methods for free.
- **Eyedropper.** Sampling the level view needs a pixel read from the renderer, not the browser's eyedropper, whose support varies.
- **Dashes.** PixiJS has no dash option for outlines, so dashes would mean building dash geometry that follows curves. This is why dashes were left out.
- **PixiJS 8.23's gradients, tried in v2 task 3.** A `FillGradient` with `textureSpace: 'local'` maps 0 to 1 onto the bounds of **each traced shape** in one `fill`, not of the whole fill: two rectangles filled together each got the whole gradient. And with its default `clamp-to-edge`, a linear gradient whose start-to-end goes up and right, or down and left, is **mirrored**: PixiJS swaps the ends on each axis it runs backwards along and then reverses the colours, which only undoes a swap on both axes or one axis of a straight gradient. So `PixiFill` makes each gradient once in a unit space (linear 0 to 1 along x, radial centred in the unit square), switches it to `global`, builds it at once, and sets its `transform` to a matrix from the entity's box just before each `fill`: `toFillStyle` keeps that matrix object with the fill, so one shared `FillGradient` serves entities of any size. `transform` and `buildGradient` are public in the types but marked internal, so an upgrade of PixiJS must rerun `GradientDrawing.browser.test.ts`. A gradient's texture is 256 pixels across (radial 256 × 256), drawn with the canvas's own gradient, so a see-through stop blends with what is behind as expected; the tests allow 6 steps of 255. The pixel tests pass in Chromium, Firefox and WebKit.
- **Font download size.** The target for bundled fonts was under 1 MB with Latin subsets. Not measured.

## Assets, sound and spawning

- **Import safety.** Read an image's size from its header before decoding it, on import and on level load, to stop decompression bombs. Levels are untrusted input.
- **Clipboard quirks.** Screenshots paste with blank file names, some browsers list one image twice, and Firefox returns only the first of several files.
- **Storage errors** from the browser must surface as messages, never as a silent failed save.
- **Deleted files** stay in memory for undo during the session. Cap this or drop the oldest if memory grows.
- **Is a sound still playing?** A script's answer must be worked out from ticks and the file's length, never from the real audio state. Real audio may be blocked, late or unsupported, and asking it would break determinism.
- **Decoded sound is big.** Web Audio decodes whole files into float samples: about 21 MB per stereo minute. Long sounds should stream through a media element instead, at the cost of exact loop points. This is why the old draft streamed sounds over 60 seconds.
- **Autoplay.** Resume the audio context inside the Play click.
- **OGG in Safari** needs testing. Sources disagree on support. If it fails, drop OGG or convert on import.
- **Avoid `PannerNode`** for any later positional sound: reports describe distorted audio in Chrome. A stereo panner and gain are enough for 2D.
- **Image scaling mode.** In PixiJS v8 smooth or sharp scaling is set on the texture, so using both for one image needs a second texture.
- **Tiled and smooth images** can bleed at the edges. Clamp or extrude at load.
- **Spawn refusal must be deterministic:** count waiting spawns when the call is made, not when they are applied.
- **Split polygons ahead of time** for every `.entity` file, so spawning does no polygon splitting during a tick.
- **Preload** every image an `.entity` file uses when Play starts, or spawned art pops in.
- **Moving a Kinematic body along a path:** set its velocity to (next point minus position) divided by the tick length, don't teleport it, so contacts stay valid. Path sampling must use only arithmetic and square roots, so every computer gets the same result.
- **Speed limit.** Box2D caps movement per step, about 6,000 px/s at 60 ticks per second and 50 px per metre. Setting ranges stay below this. **Not so in 3.2:** there is no fixed cap per step; the world's `maximumLinearSpeed` (400 m/s by default) holds speed, and the adapter sets it to 6,000 px/s (`box2dFacts.test.ts`).
- **Ground contacts.** A Box2D contact can exist without touching, so use its touching state. **Holds in 3.2**, and Box2D filters for it: a contact 1 px apart exists, but sends no begin event and isn't in `b2Body_GetContactData` (`box2dFacts.test.ts`).
- **Order of custom events.** Define a stable delivery order, and whether an event fired inside a handler arrives in the same tick. The 32-step limit for trigger chains should cover events fired by scripts too.
- **Jump feel.** The platformer defaults come from Celeste's published values (0.1 s of grace, 0.65 air control) scaled to 1080p, and from the idea of falling faster than rising.

## Physics and joints

**These notes were written against Box2D v2.4.1.** Stage 13 rechecked each one against Box2D 3.2 (`box2d3-wasm` 6.0.0), with a small test against the real build in `src/adapters/box2d/box2dFacts.test.ts` unless another test is named. Each note ends with what that showed. Stage 14 rechecked the joint notes the same way, in `src/adapters/box2d/box2dJointFacts.test.ts`.

| Limit | Box2D value | At 50 px per metre |
|---|---|---|
| Moving shapes (advice, not checked) | 0.1 to 10 m | 5 to 500 px |
| Static shapes "without trouble" (advice, not checked) | up to 50 m | 2,500 px |
| Most movement per step | 2 m in v2.4.1; **none in 3.2**, only `maximumLinearSpeed`, 400 m/s by default | 6,000 px/s, set by the adapter |
| Most rotation per step | 90° in v2.4.1; **45° in 3.2** | 2,700 °/s, 7.5 turns per second |
| Polygon skin | 0.01 m in v2.4.1; **none in 3.2** (radius 0) | 0.5 px; a box rests within 0.01 px |

- **Degenerate polygons.** In v2.4.1 a polygon with under 3 usable points silently became a 2×2 m box. Shapes too small to collide must be skipped before they reach physics. **3.2:** `b2ComputeHull` gives an empty hull instead, and the adapter skips it. It welds points closer than 0.25 px (its slop) and drops a point within 0.5 px of the line through its neighbours, so a piece thinner than 0.5 px has no hull, even a long one; a triangle with 1 px sides is kept. Skipping before physics still holds.
- **Two-sided lines.** Chains were one-sided in v2.4.1. Options were two chains in opposite directions, or plain two-sided edges. Chain points must be more than 0.25 px apart, and chains can't cross themselves. **3.2:** chains are still one-sided, holding a body only on the right of the way they were drawn, so the adapter uses segments, which collide from both sides (`Box2dPhysicsWorld.surfaces.test.ts`). box2d3-wasm's chain definition also needs its two ghost points set, or the chain is refused.
- **Zero mass.** A Dynamic body with no mass may hang motionless. Give it an explicit 1 kg. **Holds in 3.2:** it has mass 0 and never moves (`box2dFacts.test.ts`); the adapter gives it 1 kg.
- **Sensor mass.** Give sensors density 0 when building bodies. **Holds in 3.2:** a sensor with density 1 adds 1 kg per m² (`box2dFacts.test.ts`); the adapter gives sensors density 0.
- **Changing gravity** only stores the value. Wake every body explicitly. **Holds in 3.2:** a sleeping body stays asleep and still (`box2dFacts.test.ts`); the adapter wakes every body.
- **One-way platforms** aren't a Box2D feature. Keep the pass or block decision per pair of bodies, not per pair of surfaces, make it when contact begins, keep it stable, and send no events for passing contacts. Allow a small tolerance for bodies at rest.
- **Mass and centre of mass in the editor** must come from shared geometry code, not from the physics engine, and must match what play produces.
- **Level bound walls** can be static surfaces that collide with everything.
- **Game speed.** Scale the time step, keeping 60 ticks per second. 2× gives 1/30 s, the coarsest step Box2D's docs suggest. Determinism holds because the step comes from level state.
- **Far from the origin.** Float precision at 2,000 m is about 0.1 mm, well below Box2D's slop, so ±100,000 px is safe. **Holds in 3.2:** a box rests on the ground 4,000 m (200,000 px) out within 0.01 px of where it rests at the origin (`box2dFacts.test.ts`).
- **Circles scaled unevenly** need more than 8 sides to roll smoothly, so several convex pieces. Pin the side count, because it affects determinism.
- **Joint ends.** Box2D measures angles of body B against body A and keeps slider and wheel axes in body A's frame. Decide the mapping of fields A and B once. An empty end maps to the ground body. **Holds in 3.2:** a Hinge's angle is body B's turn against body A (`box2dJointFacts.test.ts`). Each end is now a frame on its body, and a slider's or wheel's axis is the x axis of body A's frame, as the definitions have no axis of their own. The adapter makes field A Box2D's body B, so A turns against B, and puts the start angle in B's frame so a placed Hinge reads 0 and its limits count from there (`Box2dPhysicsWorld.hinge.test.ts`).
- **Clockwise.** Box2D's counter-clockwise positive reads as clockwise on screen when y points down. **Confirmed in 3.2:** a positive spin turns a body's x axis towards +y, downwards on screen (`box2dFacts.test.ts`).
- **Rod, Rope, Spring** are one distance joint: Rod sets min and max to the length, Rope sets no stiffness and only a max, Spring sets a rest length with stiffness and damping. **Changed in 3.2:** the distance joint is rigid unless its spring is on, so a Rod is the default, a Rope turns the spring on with 0 bounces per second and a limit from 0 to its length, and a Spring turns the spring on without a limit (`box2dJointFacts.test.ts`).
- **Stiffness.** Users enter bounces per second and a 0 to 1 damping. Converting needs the bodies' mass, and is plain arithmetic. Box2D advises staying under a quarter of the step rate, hence the cap of 15. **Simpler in 3.2:** Box2D takes bounces per second (`hertz`) and the damping ratio itself, so no mass is needed: 2 bounces per second turn a 1 kg and a 4 kg weight back on the same steps (`box2dJointFacts.test.ts`). The cap of 15 is advice, not checked.
- **Resistance** is a motor at speed 0 with a small strength, so a real motor replaces it. **Holds in 3.2:** Resistance slows a spinning wheel, and does nothing while Motor is on (`Box2dPhysicsWorld.hinge.test.ts`).
- **Limits must include zero**, or the joint lurches at the start. The editor guarantees it, and import must clamp it. **Holds in 3.2:** a Hinge limited to 30° to 60° jumps past 15° in its first step and sits at 30° after ten (`box2dJointFacts.test.ts`).
- **Skip joints that do nothing:** both ends on one body (Box2D asserts they differ), or neither end able to move. **3.2 doesn't stop either:** the release build has no asserts, so a joint with both ends on one body is made and stepped without an error, and so is one between two Static bodies (`box2dJointFacts.test.ts`). The game must skip both itself; `createJoint` refuses one body at both ends.
- **Breaking.** Compare the joint's reaction force against the limit after the physics step and before queued destroys. Only check joints with Breakable on. **New in 3.2:** a joint has a force and a torque threshold, off by default (the largest float), and going past one sends a joint event after the step, carrying the joint's user data, while the joint stays (`box2dJointFacts.test.ts`). Breaking is v3; it can read those events instead of comparing forces itself.
- **Disabling a joint** doesn't exist in Box2D. Disconnect means destroy. **Holds in 3.2:** a joint has no switch, only its spring, limit and motor do (`box2dJointFacts.test.ts`). Destroying a body destroys its joints, and their ids then read as not valid (`box2dJointFacts.test.ts`), so `destroyJoint` checks first.
- **Scaling a group with joints.** For uneven scale use the geometric mean for distances. A mirrored parent shows in the sign of the matrix determinant. Not a Box2D fact: the game's own `PhysicsSceneBuilder` does this before Box2D sees the joint (stage 14, step 5).
- **Editor mass estimates** for warnings come from area and density, since the editor doesn't run physics.

**`box2d3-wasm` 6.0.0 (Box2D 3.2) as found in stage 13** (2026-11-16). Step 4 rechecked the v2.4 notes above one by one (2026-11-16).

- **Loading.** `box2d3-wasm/compat`'s factory fetches its `.wasm` beside the module with `import.meta.url`. It loads with no options in Node and in Vitest's Chromium, Firefox and WebKit.
- **Who frees what.** An object a binding *function* returns (`b2World_GetBodyEvents`, `GetMoveEvent`, `b2Body_GetPosition`, `new b2Vec2`) is a fresh copy in wasm memory and must be `delete()`d, or it leaks. An object read from a *field* (`moveEvent.transform`, `transform.p`, `bodyDef.motionLocks`, `bodyDef.rotation`) is a view into its parent: deleting it frees the parent's memory and crashes later with "memory access out of bounds". Write fields through the view and delete only the parent.
- **`b2MakeRot` and `b2Rot_GetAngle` are approximations**, off by up to about 0.03° at 30°. The adapter builds a rotation's cosine and sine with `DeterministicMath.sinCos` and reads the angle back with `DeterministicMath.atan2`. Box2D still stores 32-bit floats, so a 30° angle comes back as 30.0000004°.
- **A Dynamic body with no surfaces has no mass and never moves**, even under gravity. `b2Body_SetMassData` with 1 kg makes it fall.
- **A Kinematic body with no speed is still reported as moved** in the body events while awake, at the same pose.
- **The body events** list only bodies that moved in the last step, Static bodies never, and a body that has fallen asleep stops appearing. `b2World_SetGravity` doesn't wake a sleeping body.
- **The default world** has gravity `0, -10`, `maximumLinearSpeed` 400 m/s and sleeping on.
- **Spin is held to 45° a step**, 2,700 °/s at 60 steps a second, whatever the sub-steps or the body's size. A body set spinning at 9,000 °/s turns at 2,699.9998 °/s after one step. There is no setting for it. (`Box2dPhysicsWorld.surfaces.test.ts`)
- **`maximumLinearSpeed`** holds speed exactly, keeping the direction: 120 m/s gives 6,000 px/s.
- **Shape ids are plain values**, not wasm objects: `b2CreatePolygonShape` and the others return something with no `delete()`.
- **`b2ComputeHull` takes a plain array of `{ x, y }`**, and gives a hull with `count` 0 for fewer than 3 usable points. `b2MakePolygon(hull, 0)` then makes the polygon; the hull's order doesn't matter.
- **Segments never collide with segments**, so a line on a falling body passes through a Static line. A segment collides from both sides, whichever way it was drawn.
- **A box comes to rest within 0.01 px** of the Static box under it: polygons have no skin (`box2dFacts.test.ts`).

## Camera

- **Two camera positions.** The game keeps a logical camera, limited using the camera's own box. This is what scripts read, so it is the same on every computer. The drawing side derives the shown camera by limiting again to the real window and adding shake. The shown view always contains the camera's own box.
- **Follow runs with the game**, after physics, so scripts read a deterministic position. Draw the camera interpolated the same way as entities, or a followed body jitters.
- **Entities inside the camera** need their own drawing layer outside the level view's pan and zoom, drawn last.
- **Mouse input.** Level positions of the mouse use the real window and are recorded as input. A player with a wide window can click things outside the camera's own box. It is an input, so it doesn't break determinism.
- **Time.** Camera moves count ticks, not scaled time. Shake runs on the drawing side, so it must stop on Pause.
- **Sharpness.** Level and screen content scale with the window. Text and vectors should be redrawn at the final size after a resize or a big zoom.
- **Text that changes often** (a score) should be written only when the value changes.
- **Parallax**, if it comes, is drawing-side only, which is why parallax content can't be clicked or collide.

## Triggers

- **Counting touches.** Counts must be kept per trigger owner and per touching entity, not per pair of shapes, because one entity may be built from several shapes.
- **Box2D facts behind the rules (v2.4):** sensors make no contact points, and a contact forms only if one body is Dynamic. Contact begin happens inside the step. Contact end can happen outside it when a body is destroyed, so those must be queued for the next round of events. **3.2** (`box2dFacts.test.ts`): a sensor makes no contact, and a contact still forms only if one body is Dynamic, but **a sensor sees bodies of every type**, Static and Kinematic too, from its first step. Both the sensor and the visitor need `enableSensorEvents`, off by default, as are contact events. Destroying a body sends its contact ends and sensor ends with the next step's events, not at once, so Box2D does the queueing.
- **Sensor events in 3.2** (`box2dFacts.test.ts`, task 1 of v3). Each is read from `b2World_GetSensorEvents` after the step and names two shape ids, `sensorShapeId` and `visitorShapeId`, each `{ index1, world0, generation }`.
  - **Begin and end come in the step that changes the overlap, never a step late.** A Kinematic or a Dynamic visitor crossing a Static sensor sends one begin in the step its edge meets the sensor's (edges just meeting count) and one end in the step they part.
  - **A Dynamic visitor is never skipped:** at the 6,000 px/s cap it crosses a 1 px sensor between two steps and still sends a begin in that step and an end in the next. **A Kinematic visitor is checked only where each step leaves it**, so at the same speed it sends nothing. The requirement says so in [bodies.md](requirements/physics/bodies.md#sensors-and-touching--v3).
  - **A destroyed shape's end names a shape that is gone.** Destroying the visitor's body, or the sensor's, sends the end with the next step's events, but by then `b2Shape_IsValid` is false, so its user data and body can't be read. The freed slot is reused by the next shape, with a new `generation`. The adapter must keep its own table from the whole id to the entity, and drop an entry only once its ends have arrived.
  - **There is no way to switch a surface between sensor and solid**: `b2Shape_IsSensor` reads it, nothing sets it. The surface must be destroyed and made again; the old shape's ends and the new one's begins then come in the same next step.
  - **`b2Shape_EnableSensorEvents(sensor, false)`** sends the sensor's ends with the next step, and turning it on again sends its begins.
- **Contact events between solid shapes in 3.2** (`box2dFacts.test.ts`, task 2 of v4). Each is read from `b2World_GetContactEvents` after the step and names two shape ids, `shapeIdA` and `shapeIdB`, in Box2D's own order (not by which one moved), so a reader must look at both.
  - **Begin and end come in the step that changes the touching**, as with sensors: a box dropped on the ground sends one begin in the step it lands and one end in the step it is moved away.
  - **One shape with `enableContactEvents` is enough**: the ground's alone or the box's alone sends the same begin and end as both; with neither, nothing. So switching them on only for the shapes with a collision trigger still hears every hit on those shapes, whatever hits them.
  - **A contact keeps the switch it began with.** Turning `b2Shape_EnableContactEvents` off on two touching shapes still sends their end when they part; turning it on while they touch sends no begin, and no end later. A shape must have its switch set when it is made, a rebuilt one too.
  - **Destroying a touching shape or its body**, on either side, sends the end with the next step's events, not at once, and by then the destroyed shape is gone (`b2Shape_IsValid` is false), as with sensors. Contact ends need the adapter's own shape table too.
  - **A touching body falling asleep sends no end**: its contact stays (it is still in its contact data), and waking it, or putting it to sleep by hand, sends nothing. So a body resting on the ground hits it once, not again each time it wakes.
  - **A sleeping body moved with `b2Body_SetTransform` stays asleep and sends its end only once woken.** The adapter's `setPose` wakes the body, so a teleport parts it in the next step. **Destroying the shape under a sleeping body wakes it** and sends the end in the next step.
  - **Two shapes of one body touching a third send a begin and an end for each shape**, in the same step. Counting per entity, as `ContactLedger` does, makes them one hit.
- **Two sensors** must be filtered in our own code. **Holds in 3.2:** two overlapping sensors each see the other: one step sends two begins, each naming the other as the visitor (`box2dFacts.test.ts`).
- **One-way platforms:** collision events must use the stored pass-or-block decision, since contact begin has already happened when a contact is disabled.
- **Clicks on entities inside the camera.** With Flex against the screen, positions there depend on the window's width, which the game never learns. The drawing side should resolve which entity was hit and send it as recorded input, with the mouse position and buttons. Replays in Happy Wheels do the same.
- **Waiting runs are game state.** They belong in the determinism check, and should be plain data.
- **One queue for custom events**, shared by triggers and scripts, first in, first out, carrying the chain depth.
- **Limits** to tune: chain 32, trigger runs per tick 1,024, waiting runs per trigger 32, 64 triggers per entity, 64 actions per trigger. Import must enforce them and refuse times and strengths that aren't finite numbers.
- **Trigger lines** for the Console should exist only in test play, in a capped buffer.
- **Tags change during play**, so "find by tag" and the "no entity with this tag is left" event need a live index, updated in a stable order.

## Scripts

- **One copy of a script per entity.** Compile a file once, then run it once per entity with a fresh environment, so memory stays low and line numbers stay right.
- **The editor has no Lua.** Checking a script's syntax and reading the variables it needs takes a separate worker, which can reuse the game's Lua build for exact error messages.
- **`__gc` and `__mode`.** Finalizers run outside any instruction counting, and weak tables make results depend on memory history. Refuse both in `setmetatable`.
- **Table order.** Tables, functions and ids used as keys hash by address, so `pairs` order repeats only if allocation is identical. `print` must behave the same in every mode for that reason.
- **Read-only library tables** must be frozen for real: a proxy can still be written through `rawset`.
- **A hung game.** The watchdog must ignore hidden-tab throttling and debugger pauses.
- **Old size limits, as starting values:** 32 MB of Lua memory per level, 256 KB per script and 4 MB per level, 5,000 Console lines.
- **Monaco replaces CodeMirror**, so the old notes about CodeMirror's Lua mode and key bindings no longer apply. Ctrl+Enter must still reach Play from inside the editor.

## Test play

- **Messages between the editor and the game.** Beyond pause, step and stop, the editor needs to send: speed, restart, which View menu switches are on, which entity the Entity inspector watches, and a click to resolve into an entity. The game sends back: numbers for the performance view, shapes for the debug views, the watched entity's values, variable values and "the run ended".
- **Clock.** The speed menu and a player slowing the game scale how often ticks run, never the tick itself. Stamp each input with the tick it applied to: that log is the record of a run. How timers behave in a hidden tab's worker is undocumented, so pause when hidden and don't depend on it.
- **Restart.** Rebuild from the prepared copy with a fresh Lua state, physics world, id counter and random stream. Resetting in place risks leaking state into a run. Keeping the prepared level and a spare worker ready makes Restart fast.
- **First Play.** Loading the Lua and Box2D wasm files on the first Play is slow. Preload them when the editor opens.
- **A hung game.** The watchdog must be off during pause and while the tab is hidden, and must ignore a late heartbeat when the page itself was asleep (a laptop waking up). Naming the script that hung needs shared memory, which needs cross-origin isolation headers (to verify). The old draft ended a run after 5 seconds without a response, with a note after 2.
- **Drawing between ticks.** Entities need a "snap" flag for teleports, spawns and the first tick, so they aren't drawn sliding. Convert the mouse position with the camera that was actually drawn.
- **What a run starts from.** The seed, the clock time and the kept variables' values go together in the start message. All of them belong in any later replay record.
- **Run end.** Win, Lose and Restart are applied at the end of the tick, so a tick always completes.
- **Sound.** Pause suspends the audio output. Browsers block sound until a click or key press: pressing Play counts, Esc doesn't, and a gamepad button may not. The old draft therefore held a player's run until sound could start.
- **Keys.** Match on physical key codes. The API that gives a key's label for the user's layout is Chrome-family only, so plan a US-label fallback. Poll gamepads on the page, not in the worker.
- **Frozen pages.** Browsers can freeze or discard hidden pages with no event. Both are safe, because a run holds no unsaved work.
- **A long stall.** The old draft dropped the backlog after a stall of more than 0.25 seconds, so the game continues from where it was instead of racing to catch up.
- **Full screen.** Esc, tab switching and Alt+Tab all end it, and going back needs a click.
- **Without a GPU, Chromium draws a 1280×720 level view in about 28 ms.** Found on 2026-11-17: a page that draws every frame then runs at about 36 frames a second, its `page.evaluate` waits about 30 ms, and a one-pixel Playwright screenshot about 240 ms, against 37 ms when nothing is drawn. Firefox and WebKit stay at 60. So the level view draws only when something on it changed, also during play.
- **A page that never waits for an animation frame gets no worker messages.** Found in stage 17 (2026-11-17): in Chromium drawing without a GPU, as on CI, a loop that waits only on `setTimeout` gets the game worker's answers late and in bursts, and soon not at all, so the watchdog ends the run. Waiting for `requestAnimationFrame` each frame lets them in. The editor's frames come from `requestAnimationFrame`, so only a test that runs frames on its own clock must wait for one too (`tests/performance/testPlay.browser.test.ts`).
- **Without a GPU, reading one pixel back after a frame of 1,000 moving crates takes about 110 ms** (2026-11-17, this laptop with SwiftShader on 4 cores; on CI the frames came about 0.35 s apart). The session sends at most 4 ticks a frame, so there test play runs at about a sixth of its speed, and a speed test's tick count is held to what its frames allow.

## Saving and files

Browser storage as checked in October 2026:

| Browser | Space for one site | Asking to keep data | Private window |
|---|---|---|---|
| Chromium | About 60% of the disk | Decided silently, from signs such as visits, install or bookmark. Can be asked again | A memory pool, about 1 GB on a 16 GB computer |
| Firefox | The smaller of 10% of the disk or 10 GiB | Asks the user | Works since about Firefox 115 |
| Safari 17+ | About 60% of the disk | Decided silently | Not documented. Don't rely on it |

- **Deleting is all or nothing per site.** The browser removes a whole site's data at once, least recently used first, and skips sites it agreed to keep.
- **Safari's 7-day rule.** With tracking prevention on, data is deleted if the site had no interaction in the last 7 days of Safari use. Whether `persist()` exempts a site is implied but not stated. Test it.
- **Space left can't be read.** `estimate()` hides the real quota in Chrome. Show only what the game itself uses. A quota error on write is the only real signal, and its name differs between browsers, so test all three.
- **Private windows can't be detected reliably**, so the game shouldn't try.
- **One address.** Saved levels belong to the exact website address. `localhost` and a staging address are separate stores. This is why the address is chosen before public launch.
- **Save writes.** Use strict durability, or a save may be lost on a power cut. A save started while the page unloads may not finish, so the timed saves are the guarantee, plus a save when the tab is hidden.
- **Save cost.** Store each file once by hash. If full saves make the editor stutter, write only what changed.
- **Firefox's `persist()` asks the user** and its promise stays pending until they answer (seen in stage 12's browser tests, 2026-11-16). Never await it before anything else.
- **Reading a dropped `File` is real I/O.** `file.arrayBuffer()` can take many event-loop turns, longest in WebKit on CI's slow machines (a browser test that waited ten timer turns failed there, 2026-11-16). Tests wait for the outcome with `vi.waitFor`, never a fixed number of turns.
- **Playwright's Firefox fires a file input's `cancel` before the `change` that carries `setFiles`'s file**, with Playwright's round trip in between, so a picker that answers the first of the two gives nothing (2026-11-16). It is the test tool's doing, not Firefox's with a person at the dialog, so `BrowserFilePicker` is left as it is and the Playwright tests import by dropping the file.
- **WebKit's downloads turn spaces into `_`** in the name Playwright reports: the page's `Untitled level.editable` arrives as `Untitled_level.editable` (2026-11-16). Tests accept both.
- **One tab, the newest.** Web Locks: one exclusive lock for the level, `ifAvailable` to find it free, a `BroadcastChannel` to ask the holder to let go, and `steal: true` after 3 s. A stolen lock's `request()` promise rejects with `AbortError` in the tab that held it, which is how that tab learns. `steal` can't be combined with `ifAvailable` or `signal`. A `BroadcastChannel` never delivers to the object that posted, but does to another one of the same name in the same page, which is how the browser tests play two tabs. Whether a crashed tab releases its lock is only implied by the spec.
- **Import in a worker**, to keep the page responsive and contain hostile files. Decode images only after the checks pass. Zip bombs must be refused without freezing the page.
- **Reading the variables a script needs** means running the script in a throwaway Lua state on load. Lua can't run only the top of a file, so every top-level line runs, `on(...)` calls included: that state needs stand-ins for the Lua API that do nothing. It also needs the same safety as play, which is why importing a level counts as running untrusted code.
- **Never roll back a shipped file format version.** Saved levels would become unreadable. Roll forward.
- **Offline.** An editor that opens offline needs a service worker. That brings old open tabs after an update: a tab that finds a level saved by a newer version should offer Reload, not an error.
- **Read a level with a memory bound.** The 256 MB limit counts the unpacked size, so import stops unpacking as soon as it passes the limit.
- **A content security policy for the game's worker** was planned for the first release, as a backstop if a script ever escapes.

## From the first attempt's code

Implementation choices the first attempt made, worth reconsidering when the new design is written:

- Trigonometry done in plain arithmetic, so results match on every computer.
- Hosting on Cloudflare static assets, because GitHub Pages can't set headers by path.
- A separate path for drawing oversized text at maximum zoom.
- Antialiasing always on.
- A spare worker kept ready, so Restart takes about 300 ms.
- Checking x86 against ARM with a test page on a phone before each release.
