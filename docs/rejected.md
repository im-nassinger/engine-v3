# Rejected and left out

## TL;DR

What we decided against, and why. **Check here before proposing something**: an idea on this page needs a new reason to come back. Two parts: ideas the owner rejected or replaced in the review, and things left out on purpose. **This file is a draft**: it covers the editor, drawing and assets topics. Physics, camera, triggers, scripts and play-and-save still have to be added (see [progress.md](progress.md)).

## Rejected or replaced in the review

| Idea | What we do instead | Why |
|---|---|---|
| Prefabs | `.entity` files | If something is just a file, it stays a file |
| Behaviours | Builtin `.lua` scripts | Same reason |
| A built-in player | A builtin `.entity` file anyone could rebuild | There is no special player |
| Checkpoints | Nothing, in v1 or later, for now. A full save state could be added later | The owner's decision |
| Soft respawn, lives, a fall limit | Nothing. Lives are up to the creator | The game decides nothing the creator should |
| A script that watches a variable | The trigger event "a variable changes" | One fewer builtin script |
| Automatic text such as `Coins: {coins}` | A text entity with the builtin Show Variable script | Keeps it out of the engine |
| "Extract assets" on an `.entity` file | Packages: an explicit Export package command | One file type must not behave two ways |
| Original hero art | Kenney art | Free to use, so no trademark check of our own |
| Spawning by name | Spawning by path | Two files can hold entities with the same name. No two files share a path |
| Music and Sound effects groups, base volume on the asset | One kind of audio, settings on each "Play sound" | Simpler, and assets are raw files |
| An ImageComponent, image opacity, "Add hitbox" | A shape with an image fill | Everything known about shapes works on images for free |
| A separate tool for editing points, and tools for each shape | Double-click with Select, one Shape tool | The owner wanted fewer tools |
| Ctrl+click for the deepest entity | Alt+click for the next entity underneath | One key is enough |
| "Select same type" and "Select same tag" | Select all and Invert only | Dropped by the owner |
| A selection box that needs entities fully inside | It selects anything it touches | The owner's change |
| Duplicate with an offset | The copy sits on top of the original | The owner's change |
| A polygon that crosses itself is refused | It is allowed, and every enclosed area is filled and collides | Both work, and it keeps "what you see is what collides" |
| Copy style and Paste style | Copy value and Copy component on any field or card | Colours stop being a special case |
| Adding a partner component automatically | A note on the card with a button | Nothing happens behind the user's back |
| Body chips, joint badges and script badges in Layers rows | One row is one entity: name, eye, lock | Joints are their own rows |
| A "Problems" tab | Editor messages on the card, listed from the status bar | One name and look for every note |
| Version history, named versions | Nothing. Ctrl+S exports the project file | Rejected by the owner |
| A 12-font list | Inter, then Lora, JetBrains Mono and Roboto Mono | The owner's list |

## Left out on purpose

Not planned for any version. Each would need its own review.

**Editor:** free docking and floating panels, a light theme, custom shortcuts, an interface scale setting, a command palette, guides dragged from rulers, Inspector search, branching undo, undo history that survives a reload, touch and tablet editing, keyboard-only editing of the level view, translations, editing one level in several windows, skew handles, rotating each selected entity around its own centre, per-pixel clicking on images, thumbnails in Layers rows, batch rename, saved selection sets, lasso selection.

**Drawing:** union and subtract of shapes (a group with a body already merges shapes, and subtract needs holes), polygons with holes, dashed outlines, outlines drawn inside or outside the edge, rich text, text on a path, fonts uploaded by users, a radius per corner, star, arc and pie tools, a polygon that updates by itself when its path changes, collision that follows the outer edge of a thick outline (it follows the centre), joining two paths into one, brushes and arrowheads, shared named styles, group opacity.

**Assets:** a sound component, a music setting on the World, positional sound, nine-slice images, drawing pixels, sound editing beyond trim, loading files from web addresses, wall jump, ladders, dash and crush detection in the builtin platformer script, local multiplayer.
