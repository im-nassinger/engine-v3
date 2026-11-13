# Technical notes

## TL;DR

Facts and warnings for the architecture work, collected from the old research. **These are not requirements and not decisions.** They are what the earlier attempt learned about browsers, Box2D and Lua that the new design should know. Grouped by topic. Notes that named the old code's own parts were dropped, and anything a later decision made untrue was removed.

## Editor

- **Reserved keys.** Chrome doesn't deliver Ctrl+N, T, W or tab switching to pages. Safari has a similar list. An installed app would get these keys. The Keyboard Lock API is experimental and aimed at full screen, so nothing should rely on it. The reserved list comes from a 2016 post and needs a real check in each browser.
- **Matching keys.** Use physical key codes for Shift+digit, because Shift+1 gives a different character per layout, and the typed character for `?` and `+`. Test on a US layout, the Brazilian ABNT2 layout and one layout that uses AltGr heavily.
- **Key and wheel handlers** must run early and be non-passive to stop browser defaults. Alt key-up and middle-button down need their own handling. Whether Alt+drag is safe on Linux window managers is untested.
- **Clipboard.** Prefer the `copy`, `cut` and `paste` events, which need no permission. The async clipboard read is permission-based and differs by browser. Custom clipboard formats vary, so carry the data as tagged text as a fallback. Treat pasted data as untrusted.
- **Leave prompt.** Add the `beforeunload` listener only while something is unsaved, and write on `visibilitychange`. A browser storage write may not finish during unload, which is why the prompt still matters.
- **Undo history.** Steps need a label, a key for joining runs (arrow moves, field edits), and the group the user was inside. Deleted files stay in memory while history can restore them, so history may need a byte limit as well as the 500-step limit.
- **Field metadata.** Each field needs a unit, a display scale (such as radians to degrees), precision, a slider range, a description, and its component's menu section.
- **Scrubbing.** Pointer capture is enough. Pointer Lock would allow endless scrubbing but shows a browser banner.
- **Cursors.** Rotated resize cursors must be generated, because CSS has only eight fixed directions.
- **Sharp drawing.** The canvas must follow `devicePixelRatio` and watch its container size so browser zoom stays sharp. Pinch arrives as Ctrl+wheel in some browsers.
- **Limits far from the origin.** The zoom limits, pan margin and any position limit should be checked against how Box2D behaves far from the origin.
- **Swipe back.** `overscroll-behavior` stops scroll chaining, but its effect on swipe navigation at the page root isn't documented. Test on a Mac.
- **Hit testing and hover** need a spatial index over level bounds to meet the speed targets. Bounds are derived, so a move must invalidate a subtree cheaply.
- **Hide and lock from parents** are derived by walking up the tree. Cache per subtree. The play copy must carry the hidden state so play draws the same thing.
- **Layers panel.** A fixed row height allows a virtualised list. Virtualisation plus drag and drop is where hand-made trees tend to break, so prototype both together at 10,000 rows. Browser find can't see off-screen rows, which is one reason for the panel's own search.
- **Order keys.** If draw order uses fractional keys, repeated inserts between the same neighbours run out of precision. Rebalance quietly, outside undo.
- **Negative scale** must be allowed (mirroring, Flip). Polygon winding and joint limits need a rule under mirroring.

## Drawing and text

- **Fill and outline as tagged values**, such as `{ kind: "solid", color }`, so gradients and image fills need no format change.
- **Rounded rectangles** have more than 8 points, so they go through the same splitting as any polygon. The splits are internal and add no seams.
- **Self-crossing polygons.** A polygon library must cut the outline at its crossings before the convex split. Check how the renderer fills a self-crossing closed path: fills based on ear clipping may show artefacts.
- **Bad polygon input.** Treat a point lying on an edge, and duplicate points, as errors. Godot users report convex decomposition failing on exactly these.
- **Lines in Box2D.** Chains assume no self-crossing for their ghost collision handling, and points very close together cause problems. Clean lines up before they reach physics.
- **Converted polygons are stored results**, so how the points are sampled can't affect determinism.
- **Sharp text.** Text drawn as a bitmap blurs when scaled above 1. Editor zoom, camera zoom and group scale all count, so text must be redrawn at its real size or drawn another way. Text that a script changes every tick needs a speed test.
- **Text can't be measured off the main thread**, which is one reason a text has a rectangle as its box.
- **Fonts** must be hosted with the game and loaded before the first draw and before any measuring.
- **Typing on the level** can be a DOM text area placed with the entity's matrix, which gives accent keys and input methods for free.
- **Eyedropper.** Sampling the level view needs a pixel read from the renderer, not the browser's eyedropper, whose support varies.
- **Dashes.** PixiJS has no dash option for outlines, so dashes would mean building dash geometry that follows curves. This is why dashes were left out.
- **Font download size.** The target for bundled fonts was under 1 MB with Latin subsets. Not measured.
