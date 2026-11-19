# Before v2

## TL;DR

Changes the owner asked for that must be built **after v1's 18 stages and before v2 starts**. They are planned as stage 18 of [plan.md](plan.md), in [steps/stage-18.md](steps/stage-18.md) (2026-11-17); each step writes its change into the requirements and the architecture as it builds it. **All ten are built** (2026-11-17), so stage 18 is done and nothing of v2 has started. This is the one place these changes are listed.

## The list

| # | Change | Asked | State |
|---|---|---|---|
| 1 | **Resizing changes the scale**, not the shape's values. Polygons and lines lose Width and Height | owner, 2026-11-16 | **Built** on 2026-11-17, steps 7 and 8 |
| 2 | **Z and X rotate the selection and the Shape tool's preview**, Shift+Z and Shift+X by 10° | owner, 2026-11-16 and 2026-11-17 | **Built** on 2026-11-17, steps 10 and 11 |
| 3 | **Ctrl+Shift while resizing resizes from the centre** | owner, 2026-11-16 | **Built** on 2026-11-17, step 9 |
| 4 | **The Joint tool says why an entity can't take a joint** | owner, 2026-11-16 | **Built** on 2026-11-17, step 5 |
| 5 | **Unstyled joints are invisible in play**, joint icons included | owner, 2026-11-17 | **Built** on 2026-11-17, step 4 |
| 6 | **+ zooms in without Shift**, as - zooms out | owner, 2026-11-17 | **Built** on 2026-11-17, step 3 |
| 7 | **Shift+T plays and stops** | owner, 2026-11-17 | **Built** on 2026-11-17, step 6 |
| 8 | **W, A, S and D resize the selection and the Shape tool's preview**, changing the shape's values | owner, 2026-11-17 | **Built** on 2026-11-17, steps 12 and 13, with Claude's picks for the owner to change |
| 9 | **No part of the editor is covered by another**: find every case and fix it | owner, 2026-11-17 | **Built** on 2026-11-17, steps 14 and 15 |
| 10 | **"Let connected objects collide" has no description** | owner, 2026-11-17 | **Built** on 2026-11-17, step 2 |

## 1. Resizing changes the scale

The owner decided:

- Polygons and lines have no Width or Height, only their points.
- Resizing any shape with the handles changes its TransformComponent (its scale), never its shape values (width, height, radius, points).
- The code must be changed to match before v2 starts.

Outlines: with resizing changing the scale, an uneven resize stretches the outline unevenly. The owner asked whether this can be a setting on the StyleComponent. Claude's answer was yes, a checkbox that, when off, keeps the outline's width whatever the scale. Its name, its default and whether it ignores a parent group's scale were left open, and are decided under the standing yes (2026-11-17), for the owner to change:

- **It is called "Scale outline"**, a checkbox on the StyleComponent under the outline's width.
- **Off by default.** *Why: the owner's worry was an uneven resize stretching the outline, and W, A, S and D keep the outline's width too ([8](#8-w-a-s-and-d-resize)), so by default the handles and the keys agree.* A level saved before the checkbox reads with it off.
- **It covers only the entity's own scale.** With it off, the outline is as wide as its width says, measured in the parent's space, however the entity's own TransformComponent scales it. A scaled group still stretches everything inside it, outlines included, as "Width and height, not scale" says ("like a picture"). *Why: that rule is the owner's (round 1: D21), and ignoring a group's scale would override it.*
- **Shift no longer multiplies the outline's width.** A proportional resize is an even scale, so the outline follows the checkbox like any other resize.

To update once that's settled: `requirements/drawing.md` ("Width and height, not scale", now "Resizing changes the scale"), `requirements/editor/selection.md`, `architecture/core-model/components-and-fields.md`, `architecture/editor/selection-and-tools.md` (`EntityResize`, the readout), `architecture/core-model/geometry.md` (outline bounds), `glossary.md`, `scope.md`, `decisions.md`, and a stage before v2 in `plan.md`. The World keeps resizing its rectangle, because its TransformComponent is fixed.

**Built** (2026-11-17, steps 7 and 8): a polygon or line shows only its Points in the Entity inspector, and the StyleComponent has the Scale outline checkbox, off by default, with a level saved before it reading it off. With it off the drawing is traced through the entity's own scale and skew and the outline drawn at its own width; bounds and hit areas leave the same stretch out. The handles write only the TransformComponent's scale and position, never width, height, radius, points or the outline's width; a circle's scale stays even by taking the larger stretch, and the readout and the 1 px rule measure the size the shape is drawn at. The World still resizes its rectangle from its centre. Tests cover each kind keeping its values, the checkbox on and off on a shape scaled 3 by 1, and an old level read.

## 2. Rotating with Z and X

The owner's words: Z and X rotate the entities; Shift+Z or Shift+X rotate them 10°. Then (2026-11-17): Z and X rotate both while creating a shape and once it exists and is selected, just like W, A, S and D for resizing ([8](#8-w-a-s-and-d-resize)).

To build, matching the arrow keys' nudges (*proposal*, Claude's picks, for the owner to change):

- **Z turns counter-clockwise, X clockwise**, as Z sits left of X.
- **Z or X alone turns 1°**, as an arrow moves 1 px and Shift+arrow 10 px.
- A run of presses within 1 s is one step in the undo history, like a run of arrows. The step reads `Rotate <name>`.
- Each selected entity turns around its own bounds' centre, as the Select tool's rotate drag does, until v3 turns several entities around the selection box's centre. Locked entities, the World and the camera are skipped with the skip rule's status text.
- Ctrl+Z and Ctrl+X stay Undo and Cut.
- **With the Shape tool, Z and X turn the preview** around its centre, by the same steps, and the shape is made at that rotation (its TransformComponent's rotation).

To update when planned: `requirements/editor/selection.md` (Handles and arrow keys), `requirements/drawing.md` (the Shape tool), `scope.md` (SE2), `architecture/editor/selection-and-tools.md` and `clipboard-and-shortcuts.md`, and the main menu's command list.

**Built** (2026-11-17, steps 10 and 11): Z and X turn the selection, each entity around its own box's centre through the rotate drag's own code, a run of presses one `Rotate` step, with the World and the camera skipped. With the Shape tool they turn the preview, and the shape is made at that rotation; a turned drag is measured along its own sides, and a polygon's or line's placed points turn with it. The main menu's command list is unchanged: the turns have no menu place, as the nudges have none. Tests cover the run, undo and redo, the skip rule's texts, each kind made turned, a mirrored group and Ctrl+Z and Ctrl+X staying Undo and Cut.

## 3. Ctrl+Shift resizes from the centre

The owner's words: holding Ctrl and Shift while resizing resizes from the centre.

Today Shift keeps proportions, Alt resizes from the centre and Ctrl turns snapping off. *Why it matters: on Linux with GNOME, Alt+drag moves the window, so Alt can't reach the page there.*

The two questions left open are decided under the standing yes (2026-11-17), for the owner to change:

- **Ctrl+Shift only resizes from the centre.** It neither keeps proportions nor turns snapping off: the pair means one thing, not the sum of Ctrl and Shift. *Why: the owner asked for Ctrl+Shift to mean "from the centre", and a third meaning on the same keys would make it the only way to get the other two.*
- **Alt stays a second way**, for the handles and the Shape tool's drawing, where the system lets it reach the page. Alt+Shift resizes from the centre keeping proportions, as today. *Why: Alt works on Windows and macOS, and taking it away would change what works there for no gain.*
- **The Shape tool's drawing follows:** Ctrl+Shift draws from the centre, as Alt does.

To update when planned: the resizing row of the keys table in `requirements/editor/selection.md`, the v3 "Several entities together" rule there, `architecture/editor/selection-and-tools.md` (`ResizeState`), and the Shape tool's keys if drawing follows.

**Built** (2026-11-17, step 9): one function, `sizingModifiers`, reads Ctrl+Shift as Alt for the Select tool's handles and the Shape tool's rectangle and circle, so both tools share the rule. Ctrl+Shift+Alt is from the centre only too. A polygon's or line's points still read Ctrl and Shift as before, since placing a point is not resizing. Tests cover Ctrl+Shift, Alt, Alt+Shift and Ctrl alone on a handle and while drawing, and Ctrl+Shift pressed during a drag.

## 4. The Joint tool says why an entity can't take a joint

The problem the owner found: clicking an entity with no physics with the Joint tool seems to do nothing. The click shows "Nothing with physics here" as the status text, but it is small, far from the mouse, and doesn't say which entity or why.

To build:

- **The preview's label gives the reason before the click**, when the mouse is over an entity the tool skips: "Platform has no BodyComponent", "Platform is hidden", "Platform is locked". The click still does nothing, and the status text repeats the same reason.
- **A Rope or Spring's second click on an entity the tool skips is refused** with the same reason. Today it counts as empty space and pins that end to the background, making a joint the user didn't mean.
- No fix button in the preview: the preview can't be clicked, and a fix button belongs in an editor message on the card.

To update when planned: "The Joint tool" in `requirements/physics/joints.md` (the skip and hint rules), `architecture/editor/selection-and-tools.md` if it describes the Joint tool's preview, and `JointTool.ts` with its tests.

**Built** (2026-11-17, step 5): the hit test can now reach hidden and locked entities when asked, and the Joint tool names the frontmost entity it skips, with no body to use there, in the label and the status text, and refuses a second end on it. A body under the mouse still wins over a skipped entity, and joints are skipped without a reason. Tests cover each reason before and on the click, for a Hinge and for a first and a second end.

## 5. Unstyled joints are invisible in play

The problem the owner found: during test play, joints are drawn even when they have no StyleComponent.

The requirement already says this ("Joints have no special drawing in play. An unstyled joint is invisible, like any entity", `requirements/physics/joints.md`), so this is the build not matching it. The likely cause: `JointIconOverlay` checks only the Joint icons switch, not whether the level is playing.

To build:

- **During play, no joint icon or ring is drawn.** A Rope or Spring with a StyleComponent shows through its path, as JO5 says; every other joint shows nothing.
- After Stop, the joint icons come back as the Joint icons switch says.
- A Playwright test plays a level with an unstyled Hinge and a styled Rope, and checks only the Rope is drawn.

To update when planned: `JointIconOverlay.ts` and `PixiLevelView.ts` with their tests, `architecture/adapters.md` if it says what the overlays draw in play, and the editor-only drawing line of "Play and Stop" in `requirements/play-and-save/test-play.md`.

**Built** (2026-11-17, step 4): the cause was as guessed. `PixiLevelView` clears `JointIconOverlay` while it shows the level through the camera, whatever the Joint icons switch says, and draws the icons again after Stop. A selected joint's ring was already hidden in play, with the rest of the selection. A browser test and a Playwright test in three browsers check it; the Playwright test also showed a Rope's own icon covered the middle of its styled path.

## 6. + zooms in without Shift

The problem the owner found: - zooms out, but + zooms in only with Shift held.

Why: `ZoomInCommand` listens for the typed character `+` and for Ctrl+=. On most keyboards, US and ABNT2 included, + is Shift on the = key, so the key alone types `=`, which nothing listens for.

To build:

- **The = key alone zooms in**, as - alone zooms out, so the key that holds + works with or without Shift. The numpad's + and - keep working.
- Ctrl+= and Ctrl+- stay.

To update when planned: the zoom row of `requirements/editor/shortcuts.md`, `ZoomInCommand.ts` and its tests, and `architecture/editor/clipboard-and-shortcuts.md` if it lists the zoom keys.

**Built** (2026-11-17, step 3): Zoom in's keys are +, = and Ctrl+=; the menu still shows +. On a German keyboard Shift+0 types =, so a chord that names its key now wins over one found by the typed character, and Shift+0 stays 100% there.

## 7. Shift+T plays and stops

The owner's words: to play or stop a level, the T key should be used. Then Ctrl+T, which the browser keeps for a new tab and never gives the page (see the keys left to the browser in `requirements/editor/shortcuts.md`), so the owner settled on Shift+T.

To build:

- **Shift+T plays, and stops while playing**, wherever the editor's single-letter keys work. In a text field or the code editor, it types a T.
- **During play, Shift+T always stops the run**, even once the game reads keys from v2: the editor takes it before the game, so a level can't use Shift+T as an input. *Why: the owner chose one key for both; a plain T stays free for levels.*
- **Ctrl+Enter stays** as the second way (*proposal*, Claude's pick, for the owner to change), since it is the one that works from inside a field or the code editor.
- The Play button's tooltip and the main menu show Shift+T.

To update when planned: the Play row of `requirements/editor/shortcuts.md`, "Ctrl+Enter starts and stops" in `requirements/play-and-save/test-play.md`, `requirements/triggers/variables-and-inputs.md` (Shift+T is not a key a level can use), `architecture/editor/clipboard-and-shortcuts.md` (the Play row), the Play command's shortcuts and its tests.

**Built** (2026-11-17, step 6): Play or Stop's keys are Shift+T, then Ctrl+Enter, so the menu, the Play button's tooltip and the Play bar's Stop show Shift+T. A command's shortcut can now have its own scope, so Shift+T works where the single-letter keys do while Ctrl+Enter still works everywhere. Unit tests cover each focus place and play, and a Playwright test in three browsers plays and stops with Shift+T and types a T in the level's name.

## 8. W, A, S and D resize

The owner's words: W, A, S and D resize shapes, as the Shape tool's preview keys in `requirements/drawing.md` do (scope DR4, v3), but for existing entities too: a rectangle's width and height, a circle's radius, a polygon's points. They change the shape's values, as that rule does. Z and X work the same way for rotating ([2](#2-rotating-with-z-and-x)).

This brings DR4 forward from v3 to before v2, and widens it to the selection.

**This differs from [1](#1-resizing-changes-the-scale) on purpose:** dragging a handle changes the scale, while these keys change the shape's values, so an outline keeps its width when resized with the keys (owner, 2026-11-17).

To build (*proposal*, Claude's picks, for the owner to change):

- **D wider, A narrower, W taller, S shorter**, 1 px per press, Shift 10 px, the same steps as the arrow keys. *Since 2026-11-19 Shift is one grid step (owner).* With the Shape tool, they change the preview, centred on the mouse, as DR4 says; with the Select tool, every selected entity.
- **Each shape keeps its own centre** and grows along its own axes, so a rotated rectangle gets longer along its own width.
- **A rectangle** changes its width or height. **A circle** grows with D and W and shrinks with A and S, its radius by half a step, so its width changes as a rectangle's would. **A polygon or line** spreads its points out from its bounds' centre, or pulls them in, so its bounds grow by one step; W and S do nothing on a flat line.
- Sizes stop at the shape's smallest value; a press that changes nothing changes nothing.
- A run of presses within 1 s is one step in the undo history, like a run of arrows. The step reads `Resize <name>`.
- Entities without a ShapeComponent, locked entities, the World and the camera are skipped with the skip rule's status text.
- **No grid step.** DR4 says Ctrl+Shift moves one grid step, but the browser keeps Ctrl+Shift+W (close the window), so W couldn't do it. Snapping still applies to the handles.

- **Shift+S is 10 px shorter.** It was "Snapping to entities on or off" in v3 (`requirements/editor/shortcuts.md`); that gets another key when v3 plans it (owner, 2026-11-17).

To update when planned: "W, A, S, D set the preview size" in `requirements/drawing.md` (its version and the selection), `requirements/editor/selection.md` (Handles and arrow keys), `requirements/editor/shortcuts.md` (the new rows and Shift+S), `scope.md` (DR4), `architecture/editor/selection-and-tools.md` and `clipboard-and-shortcuts.md`, and the main menu's command list.

**Built** (2026-11-17, steps 12 and 13): W, A, S and D resize the selected shapes' values, a run one `Resize` step, with the World and the camera skipped. With the Shape tool they size the preview, centred on the mouse and along its turned sides: a rectangle's or circle's size is remembered for the next click, a polygon's or line's placed points spread from their middle, and a drag in progress keeps the mouse's size. Sizing the preview makes no undo step.

## 9. Nothing in the editor is covered

The problem the owner found: many parts of the editor don't show in full, because other parts cover them. There are many, so finding them is part of the work: the owner gave no list.

To build:

- **Find every case.** Open each menu, submenu, tooltip, popup, dropdown, colour picker, options strip, hint and editor message, over each panel and near each edge of the window, at the five window sizes and in the three browsers the layout checks already use. Write each case found in the stage's steps.
- **A Playwright check proves it**: for each one open, the browser's topmost element at its corners and centre is that element or inside it, and it lies inside the window. It joins the layout checks, so a new case fails CI.
- **One stacking order for the whole editor** (*proposal*, Claude's pick, for the owner to change): the layers, from the level view up to tooltips, are named once in the shared CSS, and every component uses those names instead of its own numbers. *Why: a number picked in one component is how one part ends up under another.*

To update when planned: `architecture/ui.md` (the stacking order), the layout checks in `architecture/tooling.md` or wherever they are described, and each component's CSS that sets its own stacking.

**Built** (2026-11-17, steps 14 and 15): the cover check, `tests/e2e/layout/covered.spec.ts`, found 8 cases and now passes in three browsers at the five sizes, with no `fixme` left. One stacking order of four tokens, `--stack-floating`, `--stack-popup`, `--stack-tooltip` and `--stack-dialog`, is named in `theme.css`, and the panels set none, so the Tools panel no longer covers the main menu. Menus, submenus, tooltips and the save state's explanation are placed in the window rather than in their panel: each opens on its own side when it has room, on the other when only that has, and slides to stay inside the window. The options strip floats over the panels, so at 200% it reaches over the Entities viewer instead of going under it. Written in [ui.md](architecture/ui.md#styles), [tokens.md](design/tokens.md#spacing-corners-shadows) and [performance.md](architecture/performance.md).

## 10. "Let connected objects collide" has no description

The owner's words: just call it "Let connected objects collide". The name is enough, and the description under it ("Lets the two bodies bump into each other.") goes. *Why: in a ragdoll the description led the owner to expect limbs joined through other limbs to stop colliding too, and they don't: the setting covers the joint's two bodies only. Ragdolls are for the collision grid in v3 (`requirements/physics/world.md`).*

To update when planned: "Settings of each joint" in `requirements/physics/joints.md`, `jointSchema.ts` and its tests.

**Built** (2026-11-17, step 2): the setting has no description, a field's description became optional for it, and the Entity inspector shows no tooltip on its label.
