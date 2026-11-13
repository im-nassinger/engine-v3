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
